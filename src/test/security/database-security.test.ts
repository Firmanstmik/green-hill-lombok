// @vitest-environment node
/**
 * Database security regression checks.
 *
 * Applies every migration in supabase/migrations, in order, to a real Postgres
 * (PGlite, Postgres compiled to WebAssembly) with minimal stand-ins for what
 * Supabase provides: the anon/authenticated roles, auth.uid() and the
 * storage.buckets/objects tables. Then checks row level security as a visitor,
 * as a signed-in account that is not the admin, and as the admin.
 *
 * This proves the SQL. It does not replace checking the real Supabase project
 * (Auth settings, the storage server's public URL handling): see
 * supabase/PRODUCTION_CHECKLIST.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { teaserFromRow } from '@/lib/privateTeasers';

const MIGRATIONS = path.resolve(process.cwd(), 'supabase/migrations');
const ADMIN = '00000000-0000-0000-0000-00000000000a';
const USER = '00000000-0000-0000-0000-00000000000b';
const PUBLIC_PREFIX = 'https://example.supabase.co/storage/v1/object/public/property-images/';

let db: PGlite;
const ids: Record<string, string> = {};

async function setup() {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;

    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
      $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

    CREATE SCHEMA storage;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated;
    CREATE TABLE storage.buckets (
      id TEXT PRIMARY KEY, name TEXT, public BOOLEAN,
      file_size_limit BIGINT, allowed_mime_types TEXT[]
    );
    CREATE TABLE storage.objects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE sql IMMUTABLE AS
      $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    GRANT EXECUTE ON FUNCTION storage.foldername(TEXT) TO anon, authenticated;
    GRANT ALL ON storage.objects, storage.buckets TO anon, authenticated;

    CREATE PUBLICATION supabase_realtime;
    INSERT INTO auth.users VALUES ('${ADMIN}', 'admin@example.com'), ('${USER}', 'someone@example.com');
  `);

  for (const file of fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    // PGlite ships without pgcrypto; gen_random_uuid() is built in since Postgres 13.
    const sql = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g, '');
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`${file}: ${(error as Error).message}`);
    }
  }

  // Seed as the database owner.
  await db.exec(`
    INSERT INTO public.user_profiles (id, role) VALUES ('${ADMIN}', 'admin');
    INSERT INTO public.properties (title, status, visibility, images) VALUES
      ('Public available', 'available', 'public', '["${PUBLIC_PREFIX}pa.webp"]'),
      ('Public reserved',  'reserved',  'public', '[]'),
      ('Public sold',      'sold',      'public', '[]'),
      ('Public draft',     'draft',     'public', '["private-media:images/draft.webp"]'),
      ('Public archived',  'archived',  'public', '[]'),
      ('Private available','available', 'private','["private-media:images/private.webp"]'),
      ('Private reserved', 'reserved',  'private','[]');
    INSERT INTO public.properties (
      title, listing_code, status, visibility, private_teaser, disclosure, region, area, address,
      latitude, longitude, price_amount, price_currency, price_on_request, developer_name, ownership,
      memorandum_url, verification_notes, images, brochure_url, masterplan_url
    ) VALUES
      ('Private teaser', 'GH-LOM-009', 'available', 'private', true,
       '{"price": false, "location": false, "map": true, "developer": false, "tenure": false, "brochure": true}',
       'South Lombok', 'Are Guling', 'Jl. Secret 1', -8.9, 116.2, 25000000000, 'IDR', false, 'Hidden Developer', 'Freehold',
       'private-media:documents/memo.pdf', 'Title still to verify', '["${PUBLIC_PREFIX}teaser.webp"]',
       'https://example.supabase.co/storage/v1/object/public/opportunity-files/brochure.pdf',
       'private-media:documents/masterplan.pdf'),
      ('Private teaser draft', 'GH-LOM-010', 'draft', 'private', true, '{"price": true, "location": true}',
       'South Lombok', 'Tampah', 'Jl. Draft 2', NULL, NULL, NULL, 'IDR', true, NULL, NULL,
       NULL, NULL, '["private-media:images/teaser-draft.webp"]', NULL, NULL);
    INSERT INTO public.site_content (page_key, locale, status, fields, media) VALUES
      ('home', 'en', 'published', '{"hero.subheadline": "Published line"}', '{}'),
      ('home', '*', 'published', '{}', '{"home.founder.portrait": {"url": "https://example.supabase.co/storage/v1/object/public/site-media/f.webp"}}'),
      ('home', 'en', 'draft', '{"hero.subheadline": "SECRET draft line"}', '{}');
    INSERT INTO public.notes (slug, status, published_on, translations) VALUES
      ('published-note', 'published', '2026-09-01', '{"en": {"title": "Published note", "sections": []}}'),
      ('draft-note', 'draft', NULL, '{"en": {"title": "SECRET draft note", "sections": []}}');
    INSERT INTO storage.objects (bucket_id, name) VALUES
      ('property-images', 'pa.webp'),
      ('opportunity-media', 'images/pa.webp'),
      ('opportunity-media', 'images/draft.webp'),
      ('opportunity-media', 'images/private.webp'),
      ('opportunity-media', 'documents/brochure.pdf');
  `);
  const rows = await db.query<{ id: string; title: string }>('SELECT id, title FROM public.properties');
  for (const row of rows.rows) ids[row.title] = row.id;
}

/** Runs `fn` as a role inside a transaction that is always rolled back. */
async function as<T>(role: 'anon' | 'authenticated', sub: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let result: T | undefined;
  await db
    .transaction(async (tx) => {
      await tx.exec(`SET LOCAL ROLE ${role}`);
      await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [sub ?? '']);
      result = await fn(tx);
      await tx.rollback();
    })
    .catch((error: Error) => {
      if (!/rollback/i.test(error.message)) throw error;
    });
  return result as T;
}

type Attempt = { ok: boolean; rows: Record<string, unknown>[]; affected: number; error?: string };

async function attempt(tx: Transaction, sql: string, params: unknown[] = []): Promise<Attempt> {
  await tx.exec('SAVEPOINT s');
  try {
    const result = await tx.query<Record<string, unknown>>(sql, params);
    await tx.exec('RELEASE SAVEPOINT s');
    return { ok: true, rows: result.rows, affected: result.affectedRows ?? 0 };
  } catch (error) {
    await tx.exec('ROLLBACK TO SAVEPOINT s');
    return { ok: false, rows: [], affected: 0, error: (error as Error).message };
  }
}

const titles = (rows: Record<string, unknown>[]) => rows.map((row) => String(row.title)).sort();

beforeAll(setup, 60_000);
afterAll(async () => {
  await db?.close();
});

describe.each([
  ['a visitor', 'anon' as const, null],
  ['a signed-in non-admin', 'authenticated' as const, USER],
])('database security for %s', (_who, role, sub) => {
  it('reads only public available, reserved and sold opportunities', async () => {
    await as(role, sub, async (tx) => {
      const all = await attempt(tx, 'SELECT title FROM public.properties');
      expect(titles(all.rows)).toEqual(['Public available', 'Public reserved', 'Public sold']);
      for (const hidden of ['Private available', 'Public draft', 'Public archived']) {
        const direct = await attempt(tx, 'SELECT title FROM public.properties WHERE id = $1', [ids[hidden]]);
        expect(direct.rows, hidden).toHaveLength(0);
      }
    });
  });

  it('cannot change opportunities', async () => {
    await as(role, sub, async (tx) => {
      expect((await attempt(tx, `INSERT INTO public.properties (title, status) VALUES ('x', 'draft')`)).ok).toBe(false);
      expect((await attempt(tx, `UPDATE public.properties SET title = 'changed'`)).affected).toBe(0);
      expect((await attempt(tx, 'DELETE FROM public.properties')).affected).toBe(0);
    });
  });

  it('can submit an enquiry but never read enquiries back', async () => {
    await as(role, sub, async (tx) => {
      const submitted = await attempt(
        tx,
        `SELECT public.submit_enquiry('Ana', 'ana@example.com', NULL, 'NL', 'Land', 'Hello', 'private', $1) AS id`,
        [ids['Private available']],
      );
      expect(submitted.ok).toBe(true);
      expect((await attempt(tx, 'SELECT * FROM public.enquiries')).rows).toHaveLength(0);
      expect((await attempt(tx, 'SELECT * FROM public.enquiry_activity')).rows).toHaveLength(0);
      expect((await attempt(tx, `INSERT INTO public.enquiries (name, email) VALUES ('x', 'x@example.com')`)).ok).toBe(false);
    });
  });

  it('learns only how many private opportunities exist', async () => {
    await as(role, sub, async (tx) => {
      const count = await attempt(tx, 'SELECT public.private_opportunity_count() AS n');
      expect(count.rows[0]?.n).toBe(3);
    });
  });

  it('cannot use the inherited marketplace functions', async () => {
    await as(role, sub, async (tx) => {
      for (const sql of [
        `SELECT public.send_first_message('${ids['Private available']}', 'hi')`,
        'SELECT * FROM public.get_conversations_for_user()',
        `SELECT public.increment_property_views('${ids['Private available']}')`,
        `SELECT * FROM public.get_seller_profile_for_property('${ADMIN}')`,
        'SELECT * FROM public.get_seller_profiles_admin()',
        'SELECT * FROM public.get_partnership_applications_admin()',
      ]) {
        const result = await attempt(tx, sql);
        expect(result.ok, sql).toBe(false);
        expect(result.error).toMatch(/permission denied/);
      }
      expect((await attempt(tx, 'SELECT * FROM public.listing_analytics')).rows).toHaveLength(0);
    });
  });

  it('cannot list, read, sign or write any opportunity media', async () => {
    await as(role, sub, async (tx) => {
      // Signing a URL and downloading through the API both need SELECT on the object.
      const privateMedia = await attempt(tx, `SELECT name FROM storage.objects WHERE bucket_id = 'opportunity-media'`);
      expect(privateMedia.rows).toHaveLength(0);
      const publicListing = await attempt(tx, `SELECT name FROM storage.objects WHERE bucket_id = 'property-images'`);
      expect(publicListing.rows).toHaveLength(0);
      for (const bucket of ['opportunity-media', 'property-images']) {
        const upload = await attempt(tx, `INSERT INTO storage.objects (bucket_id, name) VALUES ($1, 'x.webp')`, [bucket]);
        expect(upload.ok, bucket).toBe(false);
        expect((await attempt(tx, 'DELETE FROM storage.objects WHERE bucket_id = $1', [bucket])).affected).toBe(0);
      }
    });
  });

  if (sub) {
    it('cannot make itself admin or use the retired seller upload bucket', async () => {
      await as(role, sub, async (tx) => {
        expect((await attempt(tx, `SELECT public.is_admin() AS a`)).rows[0]?.a).toBe(false);
        expect((await attempt(tx, `INSERT INTO public.user_profiles (id, role) VALUES ($1, 'admin')`, [sub])).ok).toBe(false);
        const seller = await attempt(tx, `INSERT INTO storage.objects (bucket_id, name) VALUES ('seller-profile-images', $1)`, [
          `${sub}/avatar.png`,
        ]);
        expect(seller.ok).toBe(false);
      });
    });
  }
});

describe.each([
  ['a visitor', 'anon' as const, null],
  ['a signed-in non-admin', 'authenticated' as const, USER],
])('site content and notes for %s', (_who, role, sub) => {
  it('reads published content only, never drafts', async () => {
    await as(role, sub, async (tx) => {
      const rows = await attempt(tx, 'SELECT page_key, locale, status, fields FROM public.site_content');
      expect(rows.rows.every((r) => r.status === 'published')).toBe(true);
      expect(JSON.stringify(rows.rows)).not.toContain('SECRET');
      expect(JSON.stringify(rows.rows)).toContain('Published line');
      const notes = await attempt(tx, 'SELECT slug, status, translations FROM public.notes');
      expect(notes.rows.map((r) => r.slug)).toEqual(['published-note']);
    });
  });

  it('cannot write content or notes, or use the admin functions', async () => {
    await as(role, sub, async (tx) => {
      expect((await attempt(tx, `INSERT INTO public.site_content (page_key, locale, status) VALUES ('about', 'en', 'published')`)).ok).toBe(false);
      expect((await attempt(tx, `UPDATE public.site_content SET fields = '{"x": "y"}'`)).affected).toBe(0);
      expect((await attempt(tx, 'DELETE FROM public.site_content')).affected).toBe(0);
      expect((await attempt(tx, `INSERT INTO public.notes (slug) VALUES ('mine')`)).ok).toBe(false);
      expect((await attempt(tx, `UPDATE public.notes SET author = 'x'`)).affected).toBe(0);
      const save = await attempt(tx, `SELECT public.save_content_draft('home', '[]'::jsonb, NULL)`);
      expect(save.ok).toBe(false);
      const publish = await attempt(tx, `SELECT public.publish_content('home', '{}'::jsonb)`);
      expect(publish.ok).toBe(false);
      const upload = await attempt(tx, `INSERT INTO storage.objects (bucket_id, name) VALUES ('site-media', 'x.webp')`);
      expect(upload.ok).toBe(false);
    });
  });
});

describe('site content workflow for the admin', () => {
  it('saves drafts, refuses a stale save, and publishes without leaving a draft', async () => {
    await as('authenticated', ADMIN, async (tx) => {
      const first = await attempt(
        tx,
        `SELECT public.save_content_draft('about', $1::jsonb, NULL) AS v`,
        [JSON.stringify([{ locale: 'en', fields: { 'about.page.hero.lead': 'Draft lead' } }, { locale: '*', fields: {}, media: { 'about.hero.portrait': { url: 'private-media:content/a.webp' } } }])],
      );
      expect(first.ok, first.error).toBe(true);
      const version = first.rows[0].v;
      const stale = await attempt(tx, `SELECT public.save_content_draft('about', '[]'::jsonb, NULL)`);
      expect(stale.ok).toBe(false);
      expect(stale.error).toMatch(/changed somewhere else/);
      const second = await attempt(
        tx,
        `SELECT public.save_content_draft('about', $1::jsonb, $2) AS v`,
        [JSON.stringify([{ locale: 'en', fields: { 'about.page.hero.lead': 'Second lead' } }]), version],
      );
      expect(second.ok, second.error).toBe(true);

      // Publishing with a private reference is refused by the database.
      const leak = await attempt(tx, `SELECT public.publish_content('about', '{"about.hero.portrait": {"url": "private-media:content/a.webp"}}'::jsonb)`);
      expect(leak.ok).toBe(false);

      const ok = await attempt(
        tx,
        `SELECT public.publish_content('about', '{"about.hero.portrait": {"url": "https://example.supabase.co/storage/v1/object/public/site-media/a.webp"}}'::jsonb)`,
      );
      expect(ok.ok, ok.error).toBe(true);
      const rows = await attempt(tx, `SELECT locale, status, fields, media FROM public.site_content WHERE page_key = 'about' ORDER BY locale`);
      expect(rows.rows.map((r) => r.status)).toEqual(['published', 'published']);
      expect(rows.rows.find((r) => r.locale === 'en')?.fields).toEqual({ 'about.page.hero.lead': 'Second lead' });
    });
  });

  it('accepts the Opportunities, Notes and Enquiry pages and refuses unknown page keys', async () => {
    await as('authenticated', ADMIN, async (tx) => {
      for (const page of ['opportunities', 'notes', 'enquire']) {
        const saved = await attempt(tx, `SELECT public.save_content_draft($1, '[]'::jsonb, NULL)`, [page]);
        expect(saved.ok, `${page}: ${saved.error}`).toBe(true);
      }
      const bogus = await attempt(tx, `SELECT public.save_content_draft('layout', '[]'::jsonb, NULL)`);
      expect(bogus.ok).toBe(false);
    });
  });

  it('only publishes a note that is complete and uses public images', async () => {
    await as('authenticated', ADMIN, async (tx) => {
      const noTitle = await attempt(tx, `INSERT INTO public.notes (slug, status, published_on, translations) VALUES ('a', 'published', '2026-09-01', '{"en": {"title": ""}}')`);
      expect(noTitle.ok).toBe(false);
      const noDate = await attempt(tx, `INSERT INTO public.notes (slug, status, translations) VALUES ('b', 'published', '{"en": {"title": "B"}}')`);
      expect(noDate.ok).toBe(false);
      const privateCover = await attempt(
        tx,
        `INSERT INTO public.notes (slug, status, published_on, cover_image, translations) VALUES ('c', 'published', '2026-09-01', 'private-media:content/c.webp', '{"en": {"title": "C"}}')`,
      );
      expect(privateCover.ok).toBe(false);
      const good = await attempt(
        tx,
        `INSERT INTO public.notes (slug, status, published_on, translations) VALUES ('d', 'published', '2026-09-01', '{"en": {"title": "D"}}')`,
      );
      expect(good.ok, good.error).toBe(true);
      const draftWithPrivate = await attempt(
        tx,
        `INSERT INTO public.notes (slug, cover_image, translations) VALUES ('e', 'private-media:content/e.webp', '{"en": {"title": "E"}}')`,
      );
      expect(draftWithPrivate.ok).toBe(true);
    });
  });
});

describe('storage buckets', () => {
  it('keeps uploads private and only published copies public', async () => {
    const buckets = await db.query<{ id: string; public: boolean }>(
      `SELECT id, public FROM storage.buckets WHERE id IN ('opportunity-media', 'property-images') ORDER BY id`,
    );
    expect(buckets.rows).toEqual([
      { id: 'opportunity-media', public: false },
      { id: 'property-images', public: true },
    ]);
    const site = await db.query<{ public: boolean }>(`SELECT public FROM storage.buckets WHERE id = 'site-media'`);
    expect(site.rows[0].public).toBe(true);
  });
});

describe.each([
  ['a visitor', 'anon' as const, null],
  ['a signed-in non-admin', 'authenticated' as const, USER],
])('Green Hill Private teasers for %s', (_who, role, sub) => {
  it('lists only live teaser opportunities', async () => {
    await as(role, sub, async (tx) => {
      const list = await attempt(tx, 'SELECT t FROM public.private_teasers() AS t');
      expect(list.rows.map((r) => (r.t as Record<string, unknown>).title)).toEqual(['Private teaser']);
      // The row itself is still not readable directly.
      expect((await attempt(tx, 'SELECT title FROM public.properties WHERE listing_code = $1', ['GH-LOM-009'])).rows).toHaveLength(0);
    });
  });

  it('sends only what Reece disclosed', async () => {
    await as(role, sub, async (tx) => {
      const one = await attempt(tx, `SELECT public.private_teaser('gh-lom-009') AS t`);
      const t = one.rows[0].t as Record<string, unknown>;
      expect(t.title).toBe('Private teaser');
      // Hidden: price, exact location, map (location hidden), developer, tenure.
      expect(t.price_amount).toBeNull();
      expect(t.price_on_request).toBe(true);
      expect(t.address).toBe('South Lombok');
      expect(t.area).toBeNull();
      expect(t.latitude).toBeNull();
      expect(t.longitude).toBeNull();
      expect(t.developer_name).toBeNull();
      expect(t.ownership).toBeNull();
      expect(t.masterplan_url).toBeNull();
      // Disclosed document is present.
      expect(t.brochure_url).toMatch(/opportunity-files\/brochure\.pdf$/);
      // Never sent at all.
      for (const secret of ['memorandum_url', 'verification_notes', 'user_id', 'updated_by', 'formatted_address', 'disclosure']) {
        expect(t, secret).not.toHaveProperty(secret);
      }
      expect(JSON.stringify(t)).not.toMatch(/Hidden Developer|Jl\. Secret|Title still to verify|memo\.pdf/);
    });
  });

  it('never returns a hidden private opportunity or a draft teaser', async () => {
    await as(role, sub, async (tx) => {
      for (const key of ['GH-LOM-010', ids['Private available'], ids['Public draft']]) {
        const r = await attempt(tx, 'SELECT public.private_teaser($1) AS t', [key]);
        expect(r.rows[0].t, key).toBeNull();
      }
    });
  });

  it('can request the memorandum for a teaser with the qualification fields', async () => {
    await as(role, sub, async (tx) => {
      const submitted = await attempt(
        tx,
        `SELECT public.submit_enquiry('Dana', 'dana@example.com', NULL, 'UAE', NULL, 'Memorandum please', 'private', $1,
           p_company => 'Family Office Ltd', p_budget => 'USD 1m–5m', p_investor_type => 'Family Office',
           p_interests => ARRAY['Land Banking', 'Hospitality'], p_timeframe => '6–12 months') AS id`,
        [ids['Private teaser']],
      );
      expect(submitted.ok, submitted.error).toBe(true);
    });
  });
});

describe('database security for the admin', () => {
  it('reads and manages every opportunity; hard delete is for drafts only', async () => {
    await as('authenticated', ADMIN, async (tx) => {
      expect((await attempt(tx, 'SELECT title FROM public.properties')).rows).toHaveLength(9);
      expect((await attempt(tx, `UPDATE public.properties SET summary = 'Edited' WHERE id = $1`, [ids['Private available']])).affected).toBe(1);
      expect((await attempt(tx, 'DELETE FROM public.properties WHERE id = $1', [ids['Private available']])).affected).toBe(0);
      expect((await attempt(tx, 'DELETE FROM public.properties WHERE id = $1', [ids['Public draft']])).affected).toBe(1);
      expect((await attempt(tx, `UPDATE public.properties SET status = 'active' WHERE id = $1`, [ids['Public sold']])).ok).toBe(false);
    });
  });

  it('keeps the IDR source price exactly', async () => {
    await as('authenticated', ADMIN, async (tx) => {
      const saved = await attempt(
        tx,
        `UPDATE public.properties SET price_amount = 1000000000, price_currency = 'IDR' WHERE id = $1
         RETURNING price_amount::text AS amount, price_currency AS currency`,
        [ids['Public sold']],
      );
      expect(saved.rows[0]).toEqual({ amount: '1000000000', currency: 'IDR' });
    });
  });

  it('manages enquiries with a recorded history', async () => {
    await as('authenticated', ADMIN, async (tx) => {
      const submitted = await attempt(
        tx,
        `SELECT public.submit_enquiry('Ben', NULL, '+62 812', NULL, NULL, NULL, 'opportunity', $1) AS id`,
        [ids['Private available']],
      );
      const id = submitted.rows[0].id as string;
      const row = await attempt(tx, 'SELECT opportunity_id, opportunity_title, status FROM public.enquiries WHERE id = $1', [id]);
      // A private opportunity is never attached from a public submission.
      expect(row.rows[0]).toEqual({ opportunity_id: null, opportunity_title: null, status: 'new' });
      expect((await attempt(tx, `UPDATE public.enquiries SET status = 'contacted' WHERE id = $1`, [id])).affected).toBe(1);
      expect((await attempt(tx, `INSERT INTO public.enquiry_activity (enquiry_id, kind, body) VALUES ($1, 'note', 'Called')`, [id])).ok).toBe(true);
      const history = await attempt(tx, 'SELECT kind FROM public.enquiry_activity WHERE enquiry_id = $1', [id]);
      expect(history.rows.map((h) => h.kind).sort()).toEqual(['created', 'note', 'status']);
    });
  });

  it('reads, uploads, replaces and removes media in both buckets', async () => {
    await as('authenticated', ADMIN, async (tx) => {
      const media = await attempt(tx, `SELECT name FROM storage.objects WHERE bucket_id = 'opportunity-media' ORDER BY name`);
      expect(media.rows.map((r) => r.name)).toEqual(['documents/brochure.pdf', 'images/draft.webp', 'images/pa.webp', 'images/private.webp']);
      for (const bucket of ['opportunity-media', 'property-images']) {
        expect((await attempt(tx, `INSERT INTO storage.objects (bucket_id, name) VALUES ($1, 'new.webp')`, [bucket])).ok).toBe(true);
        expect((await attempt(tx, `UPDATE storage.objects SET name = 'renamed.webp' WHERE bucket_id = $1 AND name = 'new.webp'`, [bucket])).affected).toBe(1);
        expect((await attempt(tx, `DELETE FROM storage.objects WHERE bucket_id = $1 AND name = 'renamed.webp'`, [bucket])).affected).toBe(1);
      }
    });
  });

  it('the development preview hides exactly what the server hides', async () => {
    const combos = [
      {},
      { price: true },
      { location: true },
      { map: true },
      { location: true, map: true, tenure: true },
      { developer: true, brochure: true, masterplan: true, price: true, location: true, map: true, tenure: true },
    ];
    for (const disclosure of combos) {
      await as('authenticated', ADMIN, async (tx) => {
        // Documents are private references here, so only the brochure copy counts as public.
        await tx.query(`UPDATE public.properties SET disclosure = $2::jsonb || '{"brochure": true}' WHERE id = $1`, [
          ids['Private teaser'],
          JSON.stringify(disclosure),
        ]);
        const raw = await tx.query<{ r: Record<string, unknown> }>('SELECT to_jsonb(p) AS r FROM public.properties p WHERE id = $1', [
          ids['Private teaser'],
        ]);
        const server = await tx.query<{ t: Record<string, unknown> }>(`SELECT public.private_teaser('GH-LOM-009') AS t`);
        expect(teaserFromRow(raw.rows[0].r), JSON.stringify(disclosure)).toEqual(server.rows[0].t);
      });
    }
  });

  it('stores the qualification fields and attaches a teaser opportunity', async () => {
    await as('authenticated', ADMIN, async (tx) => {
      const submitted = await attempt(
        tx,
        `SELECT public.submit_enquiry('Eve', 'eve@example.com', NULL, 'UK', 'Land', NULL, 'opportunity', $1,
           p_budget => '£100–250k', p_interests => ARRAY['Land', 'Land banking', ''], p_objective => 'Capital growth',
           p_timeframe => 'Within 6 months') AS id`,
        [ids['Private teaser']],
      );
      const row = await attempt(
        tx,
        'SELECT opportunity_title, budget, interests, objective, timeframe FROM public.enquiries WHERE id = $1',
        [submitted.rows[0].id],
      );
      expect(row.rows[0]).toEqual({
        opportunity_title: 'Private teaser',
        budget: '£100–250k',
        interests: ['Land', 'Land banking'],
        objective: 'Capital growth',
        timeframe: 'Within 6 months',
      });
    });
  });

  it('never lets the memorandum or a hidden document become public', async () => {
    await as('authenticated', ADMIN, async (tx) => {
      const memo = await attempt(
        tx,
        `UPDATE public.properties SET memorandum_url = 'https://example.supabase.co/storage/v1/object/public/opportunity-files/memo.pdf' WHERE id = $1`,
        [ids['Private teaser']],
      );
      expect(memo.ok).toBe(false);
      const undisclosed = await attempt(
        tx,
        `UPDATE public.properties SET disclosure = disclosure || '{"brochure": false}' WHERE id = $1`,
        [ids['Private teaser']],
      );
      expect(undisclosed.ok).toBe(false);
      const hiddenWithPublicDoc = await attempt(
        tx,
        `UPDATE public.properties SET private_teaser = false WHERE id = $1`,
        [ids['Private teaser']],
      );
      expect(hiddenWithPublicDoc.ok).toBe(false);
    });
  });

  it('refuses a private record that still points at public media, and a public one with private media', async () => {
    await as('authenticated', ADMIN, async (tx) => {
      const unpublishWithPublicCopy = await attempt(tx, `UPDATE public.properties SET status = 'draft' WHERE id = $1`, [ids['Public available']]);
      expect(unpublishWithPublicCopy.ok).toBe(false);
      expect(unpublishWithPublicCopy.error).toMatch(/properties_media_matches_visibility/);

      const makePrivateWithPublicCopy = await attempt(tx, `UPDATE public.properties SET visibility = 'private' WHERE id = $1`, [ids['Public available']]);
      expect(makePrivateWithPublicCopy.ok).toBe(false);

      const publishWithPrivateRef = await attempt(tx, `UPDATE public.properties SET status = 'available' WHERE id = $1`, [ids['Public draft']]);
      expect(publishWithPrivateRef.ok).toBe(false);

      // The admin's real flow: swap references first, then change status.
      const unpublish = await attempt(
        tx,
        `UPDATE public.properties SET status = 'draft', images = '["private-media:images/pa.webp"]' WHERE id = $1`,
        [ids['Public available']],
      );
      expect(unpublish.ok).toBe(true);
      const publish = await attempt(
        tx,
        `UPDATE public.properties SET status = 'available', images = $2::jsonb WHERE id = $1`,
        [ids['Public draft'], JSON.stringify([`${PUBLIC_PREFIX}draft.webp`])],
      );
      expect(publish.ok).toBe(true);
    });
  });
});
