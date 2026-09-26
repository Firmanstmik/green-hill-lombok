// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { handle } from '../../../supabase/functions/admin-users/handler';

const env = { url: 'https://project.supabase.co', anonKey: 'anon-key', serviceKey: 'service-key' };

type Call = { url: string; init?: RequestInit };

/** A fake Supabase: `routes` maps a path fragment to a response. */
function fakeSupabase(routes: Record<string, (call: Call) => Response>) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    const key = Object.keys(routes).find((fragment) => url.includes(fragment));
    if (!key) throw new Error(`unexpected request ${url}`);
    return routes[key](call);
  });
  return { fetchFn, calls };
}

const json = (status: number, body: unknown) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });

const invite = (body: Record<string, unknown>, token = 'caller-token') =>
  new Request('https://fn/admin-users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'invite', ...body }),
  });

const adminRoutes = (extra: Record<string, (call: Call) => Response>) => ({
  'rpc/is_admin': () => json(200, true),
  '/auth/v1/user': () => json(200, { id: 'caller-id' }),
  ...extra,
});

describe('admin-users Edge Function', () => {
  it('refuses callers without a session or without admin access, before any privileged call', async () => {
    const anonymous = fakeSupabase({});
    const noAuth = new Request('https://fn/admin-users', { method: 'POST', body: '{}' });
    expect((await handle(noAuth, env, anonymous.fetchFn)).status).toBe(401);
    expect(anonymous.calls).toHaveLength(0);

    const nonAdmin = fakeSupabase({ 'rpc/is_admin': () => json(200, false) });
    const response = await handle(invite({ email: 'new@example.com' }), env, nonAdmin.fetchFn);
    expect(response.status).toBe(403);
    expect(nonAdmin.calls.map((c) => c.url)).toEqual([`${env.url}/rest/v1/rpc/is_admin`]);
    expect(JSON.stringify(nonAdmin.calls)).not.toContain('service-key');
  });

  it('checks admin access with the caller’s own session, never the service key', async () => {
    const supabase = fakeSupabase(adminRoutes({ 'rpc/admin_find_user': () => json(200, [{ id: 'x', is_admin: true }]) }));
    await handle(invite({ email: 'reece@example.com' }), env, supabase.fetchFn);
    const check = supabase.calls[0];
    expect(check.url).toContain('rpc/is_admin');
    expect((check.init?.headers as Record<string, string>).Authorization).toBe('Bearer caller-token');
  });

  it('does not duplicate an existing admin', async () => {
    const supabase = fakeSupabase(adminRoutes({ 'rpc/admin_find_user': () => json(200, [{ id: 'reece', is_admin: true }]) }));
    const response = await handle(invite({ email: 'Reece@Example.com ' }), env, supabase.fetchFn);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, code: 'already_admin' });
    expect(supabase.calls.some((c) => c.url.includes('/auth/v1/invite'))).toBe(false);
  });

  it('gives an existing non-admin account access instead of creating a second one', async () => {
    const supabase = fakeSupabase(
      adminRoutes({
        'rpc/admin_find_user': () => json(200, [{ id: 'someone', is_admin: false }]),
        'rpc/admin_save_profile': () => json(204, null),
        'rpc/admin_set_access': () => json(204, null),
      }),
    );
    const response = await handle(invite({ email: 'someone@example.com', fullName: 'Someone' }), env, supabase.fetchFn);
    expect(await response.json()).toMatchObject({ ok: true, code: 'access_granted', id: 'someone' });
    expect(supabase.calls.some((c) => c.url.includes('/auth/v1/invite'))).toBe(false);
    const access = supabase.calls.find((c) => c.url.includes('admin_set_access'));
    expect(JSON.parse(String(access?.init?.body))).toEqual({ p_id: 'someone', p_enabled: true });
  });

  it('invites a new admin through the Admin API and links the profile as the caller', async () => {
    const supabase = fakeSupabase(
      adminRoutes({
        'rpc/admin_find_user': () => json(200, []),
        '/auth/v1/invite': () => json(200, { id: 'new-id', email: 'new@example.com' }),
        'rpc/admin_save_profile': () => json(204, null),
        'rpc/admin_set_access': () => json(204, null),
      }),
    );
    const response = await handle(
      invite({ email: 'New@Example.com', fullName: 'New Admin', language: 'nl', redirectTo: 'https://green-hill-lombok.vercel.app/en/auth/update-password' }),
      env,
      supabase.fetchFn,
    );
    expect(await response.json()).toEqual({ ok: true, code: 'invited', id: 'new-id' });

    const inviteCall = supabase.calls.find((c) => c.url.includes('/auth/v1/invite'))!;
    expect(inviteCall.url).toContain('redirect_to=https%3A%2F%2Fgreen-hill-lombok.vercel.app%2Fen%2Fauth%2Fupdate-password');
    expect((inviteCall.init?.headers as Record<string, string>).Authorization).toBe('Bearer service-key');
    const sent = JSON.parse(String(inviteCall.init?.body));
    expect(sent).toEqual({ email: 'new@example.com', data: { full_name: 'New Admin' } });
    expect(JSON.stringify(sent)).not.toMatch(/password/i);

    // Only the invite itself uses the service key; profile writes go through is_admin()-guarded functions.
    for (const call of supabase.calls.filter((c) => c.url.includes('/rest/v1/rpc/'))) {
      expect((call.init?.headers as Record<string, string>).Authorization).toBe('Bearer caller-token');
    }
    const profile = supabase.calls.find((c) => c.url.includes('admin_save_profile'));
    expect(JSON.parse(String(profile?.init?.body))).toEqual({ p_id: 'new-id', p_full_name: 'New Admin', p_preferred_language: 'nl' });
  });

  it('reports email delivery problems honestly and never claims an invitation was sent', async () => {
    for (const [status, body, code] of [
      [429, { error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' }, 'email_rate_limited'],
      [500, { msg: 'Error sending invite email' }, 'email_unavailable'],
    ] as const) {
      const supabase = fakeSupabase(
        adminRoutes({ 'rpc/admin_find_user': () => json(200, []), '/auth/v1/invite': () => json(status, body) }),
      );
      const response = await handle(invite({ email: 'new@example.com' }), env, supabase.fetchFn);
      expect(response.ok).toBe(false);
      expect(await response.json()).toMatchObject({ ok: false, code });
      expect(supabase.calls.some((c) => c.url.includes('admin_set_access'))).toBe(false);
    }
  });

  it('rejects malformed input', async () => {
    const supabase = fakeSupabase(adminRoutes({}));
    for (const body of [{ email: 'not-an-email' }, { email: 'a@b.co', fullName: 'x'.repeat(121) }]) {
      expect((await handle(invite(body), env, supabase.fetchFn)).status).toBe(400);
    }
    const wrongAction = new Request('https://fn/admin-users', {
      method: 'POST',
      headers: { Authorization: 'Bearer caller-token' },
      body: JSON.stringify({ action: 'delete', email: 'a@b.co' }),
    });
    expect((await handle(wrongAction, env, supabase.fetchFn)).status).toBe(400);
  });

  it('answers the CORS preflight', async () => {
    const response = await handle(new Request('https://fn/admin-users', { method: 'OPTIONS' }), env, vi.fn());
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
  });
});
