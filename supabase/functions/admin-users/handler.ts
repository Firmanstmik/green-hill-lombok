/**
 * Green Hill `admin-users` Edge Function: invite a new admin.
 *
 * The only privileged step (creating the Auth account and sending the
 * invitation) uses the service key, which Supabase provides to the function
 * and which never leaves the server. Everything else runs with the caller's
 * own session, so the database decides through public.is_admin():
 *
 *   caller session -> is_admin() -> admin_find_user() -> Auth Admin API invite
 *                  -> admin_save_profile() + admin_set_access()
 *
 * No password is created, stored or returned: the invited person chooses
 * their own on /<lang>/auth/update-password.
 *
 * Kept free of Deno APIs so it can be unit-tested; index.ts wires it up.
 */

export type Env = { url: string; anonKey: string; serviceKey: string };
type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export type InviteCode =
  | 'invited'
  | 'access_granted'
  | 'already_admin'
  | 'invalid_input'
  | 'not_admin'
  | 'email_rate_limited'
  | 'email_unavailable'
  | 'invite_failed'
  | 'profile_failed';

const LANGUAGES = ['en', 'id', 'nl', 'es'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (status: number, code: InviteCode, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ ok: status < 300, code, ...extra }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function handle(request: Request, env: Env, fetchFn: Fetch = fetch): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return reply(405, 'invalid_input');

  const authorization = request.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+\S+/.test(authorization)) return reply(401, 'not_admin');

  // Calls made as the signed-in caller: the database checks is_admin() itself.
  const asCaller = (path: string, body: unknown) =>
    fetchFn(`${env.url}/rest/v1/rpc/${path}`, {
      method: 'POST',
      headers: { apikey: env.anonKey, Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const adminCheck = await asCaller('is_admin', {});
  if (!adminCheck.ok || (await readJson(adminCheck)) !== true) return reply(403, 'not_admin');

  const callerResponse = await fetchFn(`${env.url}/auth/v1/user`, {
    headers: { apikey: env.anonKey, Authorization: authorization },
  });
  const caller = (callerResponse.ok ? await readJson(callerResponse) : null) as { id?: string } | null;

  let body: { action?: string; email?: string; fullName?: string; language?: string; redirectTo?: string };
  try {
    body = await request.json();
  } catch {
    return reply(400, 'invalid_input');
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  const fullName = String(body.fullName ?? '').trim();
  const language = LANGUAGES.includes(String(body.language)) ? String(body.language) : 'en';
  if (body.action !== 'invite' || !EMAIL.test(email) || fullName.length > 120) return reply(400, 'invalid_input');

  const log = (result: InviteCode) =>
    console.log(JSON.stringify({ event: 'admin-users.invite', actor: caller?.id ?? null, target: email, result }));

  const linkProfile = async (id: string, name: string) => {
    if (name) {
      const saved = await asCaller('admin_save_profile', { p_id: id, p_full_name: name, p_preferred_language: language });
      if (!saved.ok) return false;
    }
    const access = await asCaller('admin_set_access', { p_id: id, p_enabled: true });
    return access.ok;
  };

  // Never duplicate an account: reuse the existing one if the email is known.
  const lookup = await asCaller('admin_find_user', { p_email: email });
  if (!lookup.ok) return reply(500, 'invite_failed');
  const existing = ((await readJson(lookup)) as { id: string; is_admin: boolean }[] | null)?.[0];
  if (existing?.is_admin) {
    log('already_admin');
    return reply(409, 'already_admin');
  }
  if (existing) {
    const linked = await linkProfile(existing.id, fullName);
    log(linked ? 'access_granted' : 'profile_failed');
    return linked ? reply(200, 'access_granted', { id: existing.id }) : reply(500, 'profile_failed');
  }

  const redirect = body.redirectTo ? `?redirect_to=${encodeURIComponent(body.redirectTo)}` : '';
  const invite = await fetchFn(`${env.url}/auth/v1/invite${redirect}`, {
    method: 'POST',
    headers: { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, data: fullName ? { full_name: fullName } : {} }),
  });
  const invited = (await readJson(invite)) as { id?: string; error_code?: string; code?: number; msg?: string } | null;
  if (!invite.ok || !invited?.id) {
    const code: InviteCode =
      invite.status === 429 || invited?.error_code?.startsWith('over_')
        ? 'email_rate_limited'
        : invite.status >= 500 || /email/i.test(invited?.msg ?? '')
          ? 'email_unavailable'
          : 'invite_failed';
    log(code);
    return reply(code === 'invite_failed' ? 502 : 503, code);
  }

  const linked = await linkProfile(invited.id, fullName);
  log(linked ? 'invited' : 'profile_failed');
  return linked ? reply(200, 'invited', { id: invited.id }) : reply(500, 'profile_failed', { id: invited.id });
}
