# Green Hill — Supabase production checklist

Green Hill is a single-admin CMS. Visitors read published public opportunities
and submit enquiries; one admin account manages everything.

**Status 2026-09-26:** the production project exists (organisation *Green Hill
Lombok*, project *green-hill-lombok*, region Singapore), all 19 migrations are
applied, the admin exists, and the live end-to-end run passed 64/64 (§10).
Open items: the production domain (not confirmed), the Vercel project, and
email delivery for password resets (§4). Hosting is Vercel (decided).

Legend:

- **LOCAL VERIFIED**: proven on a real Postgres 16 (PGlite) with every migration
  applied, by `src/test/security/database-security.test.ts` (`npm test`), or by
  the app's own tests.
- **REQUIRES REAL SUPABASE VERIFICATION**: depends on Supabase services
  (Auth, the storage server, dashboard settings) that cannot be run locally.

---

## 1. Project

- [ ] Create a **new, dedicated** Supabase project for Green Hill. Never reuse
      the inherited Ukon Estate project or its keys.
- [ ] Region close to the audience (e.g. Singapore).
- [ ] Record the project URL and the `anon` key. The `service_role` key never
      goes into the website or the repository.

## 2. Migrations

- [ ] Apply every file in `supabase/migrations/` in filename order
      (`supabase db push`, or paste them in order into the SQL editor).
      LOCAL VERIFIED and APPLIED TO PRODUCTION (2026-09-26): all 19 apply
      cleanly in order; the last three are `20260929_green_hill_remove_ukon_legacy.sql`,
      `20260930_green_hill_api_grants.sql`, `20261001_green_hill_trigger_function_privileges.sql`.
- [ ] Confirm in the SQL editor:
      ```sql
      select id, public, file_size_limit, allowed_mime_types
      from storage.buckets where id in ('opportunity-media', 'property-images', 'opportunity-files', 'site-media');
      -- expect: opportunity-media public = false; property-images, opportunity-files and site-media public = true
      select conname from pg_constraint where conname in (
        'properties_media_matches_visibility', 'site_content_published_media_public', 'notes_publishable');
      -- expect three rows
      ```
      REQUIRES REAL SUPABASE VERIFICATION (Supabase's own `storage.buckets`
      table has more columns than the local stand-in).

## 3. First (and only) admin

- [ ] Auth → Users → **Add user**: Reece's email and a strong password
      (“Auto confirm” on).
- [ ] SQL editor, as the project owner:
      ```sql
      insert into public.user_profiles (id, role)
      values ('<auth user uuid>', 'admin')
      on conflict (id) do update set role = 'admin';
      ```
- [ ] Sign in at `https://<domain>/en/admin/login`. Expect the Overview.
      REQUIRES REAL SUPABASE VERIFICATION.

### Users & Admins (more admins, from the admin itself)

- [ ] Apply `20261005_green_hill_admin_users.sql` (`npx supabase db push`).
      Adds admin-only functions (`admin_list_users`, `admin_find_user`,
      `admin_save_profile`, `admin_set_access`) and a trigger that keeps at
      least one admin. No tables or columns change.
- [ ] Deploy the invitation service: `npx supabase functions deploy admin-users`.
      Supabase gives it the service key at run time; never put that key in
      Vercel or any `VITE_` variable.
- [ ] Admin → Relationships → Users & Admins lists both admins.
- [ ] “Add admin” sends an invitation only if email delivery works: the
      built-in mailer reaches only members of the Supabase organisation and a
      few emails per hour. For anyone else, set up custom SMTP first
      (Authentication → Emails → SMTP Settings).

## 4. Auth configuration

- [ ] Auth → Providers → Email: **disable “Allow new users to sign up”**.
      Without this anyone can create an account through the API. An account
      that is not the admin can still do nothing extra (LOCAL VERIFIED), but
      there is no reason to allow it.
- [ ] Disable every other provider (Google, magic link sign-ups, …).
- [ ] Auth → URL configuration:
      - Site URL: `https://<production domain>`
      - Redirect URLs: `https://<production domain>/*/auth/update-password`,
        `https://<production domain>/*/auth/callback`
- [ ] Password reset from the admin login screen reaches
      `/<lang>/auth/update-password` and the new password works.
- [ ] Optional: enable MFA for the admin account.
- [ ] **Email delivery.** The project has no custom SMTP. Supabase's built-in
      mailer only delivers to members of the Supabase organisation (and only a
      few emails per hour). Before Reece can receive a password-reset email,
      either invite Reece's address to the *Green Hill Lombok* organisation or
      configure custom SMTP (Auth → SMTP settings).

Done on 2026-09-26 (via `supabase/config.toml`, pushed with `supabase config push`):
sign-ups disabled (`disable_signup: true`; a sign-up attempt returns
`signup_disabled`), email/password sign-in on, phone and every external
provider off, password minimum 12 characters with lower/upper case and
digits. Site URL is `http://localhost:8080` with `http://localhost:8080/**`
allowed until the domain exists; then set both to the domain.

## 5. Row level security (database)

| Check | Status |
|---|---|
| Visitors and signed-in non-admins read only `public` + `available/reserved/sold` opportunities, also when asking for a draft/private/archived id directly | LOCAL VERIFIED |
| They cannot insert, update or delete opportunities | LOCAL VERIFIED |
| They can submit an enquiry (`submit_enquiry`) but cannot read, list or insert enquiries or history | LOCAL VERIFIED |
| A public enquiry pointing at a private opportunity is stored without it | LOCAL VERIFIED |
| `private_opportunity_count()` returns a number only | LOCAL VERIFIED |
| Inherited marketplace / seller / partner / analytics functions are not callable (`permission denied`) | LOCAL VERIFIED |
| `is_admin()` is false for everyone except the admin; a user cannot create their own admin profile | LOCAL VERIFIED |
| Admin reads everything, updates, deletes drafts only; legacy statuses rejected | LOCAL VERIFIED |
| IDR source price stored exactly | LOCAL VERIFIED |
| The same checks against the real project (see §9) | REQUIRES REAL SUPABASE VERIFICATION |

## 6. Storage and private media

Model: every upload goes to the **private** `opportunity-media` bucket
(`images/…`, `documents/…`). Only while an opportunity is public **and**
available/reserved/sold are its photographs copied to the **public**
`property-images` bucket; the copies are deleted on unpublish, archive or move
to private. Brochures and masterplans are never public. The admin sees private
files through signed links that expire after an hour.

| Check | Status |
|---|---|
| Storage policies: only the admin can list, read, sign, upload, replace or delete in either bucket | LOCAL VERIFIED (RLS on `storage.objects`) |
| Retired seller upload policies removed | LOCAL VERIFIED |
| Database refuses a non-public record that points at the public bucket, and a public live record with a private reference | LOCAL VERIFIED |
| Publish copies photos to public; unpublish/archive/private removes them; removed or replaced photos lose their public copy; shared copies are kept; documents stay private | LOCAL VERIFIED (repository tests with an in-memory Supabase client) |
| Admin displays private photos through signed links | LOCAL VERIFIED (component test) |
| `https://<ref>.supabase.co/storage/v1/object/public/opportunity-media/<path>` returns **400/404** (bucket is private) | REQUIRES REAL SUPABASE VERIFICATION |
| A published photo's public URL loads; after unpublishing, the same URL returns 404 | REQUIRES REAL SUPABASE VERIFICATION |
| Cross-bucket `copy` works with the admin session | REQUIRES REAL SUPABASE VERIFICATION |
| Signed links open for the admin and expire | REQUIRES REAL SUPABASE VERIFICATION |
| Uploads over 25 MB or of other file types are refused by the bucket | REQUIRES REAL SUPABASE VERIFICATION |

### Website content and Notes (Phase 7A)

Content images and Note images are uploaded privately (`opportunity-media`,
folder `content/`). Publishing a page or a note copies the images it uses to
the public `site-media` bucket; unpublishing a note, replacing an image or
restoring the original removes the public copy. Drafts never reach visitors:
`site_content` and `notes` only return published rows to anyone but the admin.

| Check | Status |
|---|---|
| Visitors and non-admins read only published content and notes; cannot write, call `save_content_draft`/`publish_content`, or upload to `site-media` | LOCAL VERIFIED (database security test) |
| Stale draft save refused (page changed elsewhere) | LOCAL VERIFIED |
| Published content or a published note cannot point at a private file | LOCAL VERIFIED (constraints) |
| Edit → save → reload → preview → publish, draft invisible, locales, image upload/replace/remove, notes publish/unpublish | LOCAL VERIFIED (browser QA, local preview) |
| Preview shows draft images through signed links for the admin only | REQUIRES REAL SUPABASE VERIFICATION |
| A published content image loads from `/object/public/site-media/…`; after replacing it, the old URL returns 404 | REQUIRES REAL SUPABASE VERIFICATION |

Known limitation: removing a photograph or document leaves the original in the
private bucket (not reachable by anyone but the admin). A later housekeeping
job can delete unreferenced private files.

## 7. Environment variables (hosting provider)

- [ ] `VITE_SUPABASE_URL=https://<ref>.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY=<anon key>`
- [ ] `VITE_SITE_URL=https://<production domain>` — absolute social image,
      sitemap.xml and the robots.txt sitemap line (skipped when unset).
- [ ] `VITE_MAPBOX_ACCESS_TOKEN=<Green Hill Mapbox public token>` — maps on
      the memo and in the admin (the map is hidden without it).
- [ ] `VITE_GA4_MEASUREMENT_ID=G-…` and `VITE_META_PIXEL_ID=…` — only after
      Green Hill has decided on cookie consent (see the handover document).
      Nothing loads without them.
- [ ] Nothing else. Never set a service-role key in a `VITE_` variable: it
      would be shipped to every browser.
- [ ] Rebuild and redeploy after setting them (Vite reads them at build time).
- [ ] With both set, the local preview mode and `/invoice` do not exist in the
      production build. LOCAL VERIFIED (production bundle contains neither).

- [ ] `VITE_DEMO_OPPORTUNITIES` is **not** set on the production site
      (it only matters without a database, and a real site has one).
- [ ] Link previews are served by `middleware.ts` on Vercel from the same
      three `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_SITE_URL`
      variables; nothing else to configure. Verify with step 18.

## 8. Production URL

- [ ] Custom domain on the hosting provider, HTTPS enforced.
- [ ] SPA fallback: every path serves `index.html` (so `/en/admin`,
      `/en/property/<slug>` load directly).
- [ ] Same domain entered in Supabase Auth URL configuration (§4).
- [ ] `/en/admin` pages send `noindex` (done in the app; confirm in the page
      source). Optionally also `X-Robots-Tag: noindex` for `/*/admin*`.

## 9. Real verification run (do this once everything above is set)

Use two browsers: one signed in as the admin, one private window (visitor).

1. Admin: create an opportunity with 2 photos and a brochure PDF, save as draft.
2. Visitor: open `/en/properties` → it is not listed. Open `/en/property/<id>`
   → not found.
3. Visitor: in the browser console, run
   `fetch('<VITE_SUPABASE_URL>/rest/v1/properties?select=title,status,visibility', {headers:{apikey:'<anon key>'}}).then(r=>r.json())`
   → only public available/reserved/sold rows.
4. Admin: copy a photo's signed link from the editor (open it in a new tab).
   Visitor: open the same path under `/object/public/opportunity-media/…`
   → refused.
5. Admin: publish. Visitor: the memo shows both photos (URLs under
   `/object/public/property-images/`). The brochure is not linked anywhere.
6. Admin: unpublish. Visitor: the memo is gone and the photo URLs from step 5
   return 404.
7. Admin: publish again, then **Move to private**. Visitor: memo gone, photo
   URLs 404; `/en/private` shows the count only.
8. Visitor: submit the Green Hill Private form → WhatsApp opens. Admin: the
   enquiry appears under Enquiries and Private.
9. Visitor (console): `…/rest/v1/enquiries?select=*` → `[]`.
10. Create a second auth user in the dashboard (not admin). Sign in with it at
    `/en/admin/login` → “This account does not have admin access”; its API
    calls return nothing extra.
    Delete that user afterwards.
11. Admin: save `IDR 1,000,000,000`, reload, save again → unchanged.
12. Admin: make a private opportunity, switch on "Present as a teaser", show
    only the brochure. Visitor: `/en/private` lists it; `/en/private/<ref>`
    shows "South Lombok" and "Price on Request", no area, price, developer
    or map; the brochure downloads. Console:
    `fetch('<url>/rest/v1/rpc/private_teaser', {method:'POST', headers:{apikey:'<anon>','Content-Type':'application/json'}, body:JSON.stringify({p_key:'<ref>'})}).then(r=>r.json())`
    → no hidden field, no `memorandum_url`, no `verification_notes`.
13. Visitor: "Request investment memorandum" → fill the qualification form →
    WhatsApp opens. Admin: the enquiry shows the investor profile and the
    opportunity.
14. Admin: upload an investment memorandum PDF. Visitor: its path under
    `/object/public/opportunity-files/` → not found.

15. Admin: Content → Homepage, change the headline, wait for “Draft saved”.
    Visitor: the homepage is unchanged. Console:
    `fetch('<url>/rest/v1/site_content?select=*', {headers:{apikey:'<anon>'}}).then(r=>r.json())`
    → only `status: "published"` rows.
16. Admin: Preview (draft shown), then Publish. Visitor: reload → the new
    headline. Replace a hero photograph and publish: the image URL is under
    `/object/public/site-media/`. Restore the original and publish: that URL
    returns 404.
17. Admin: write a Note with a cover photograph, save as draft. Visitor:
    `/en/intelligence/<address>` → not found; console
    `…/rest/v1/notes?select=slug,status` → no drafts. Publish → visible.
    Unpublish → gone, and the cover URL under `site-media` returns 404.

18. Link previews (after the domain is live): paste a public page, an
    opportunity and a published note into the Facebook Sharing Debugger and
    the LinkedIn Post Inspector, and send one in WhatsApp → each shows its
    own published title, description and image. `/en/admin` and a private
    teaser show the static site-wide preview. `curl -A "WhatsApp/2" https://<domain>/en/about`
    returns the About title; `curl https://<domain>/en/about` (a browser user
    agent) returns the unchanged app shell.
19. Direct loading: open `/en/admin`, `/en/properties`, `/en/property/<slug>`,
    `/en/private`, `/en/intelligence` in a fresh tab → each loads (SPA
    fallback). `curl -I https://<domain>/en/admin` shows
    `X-Robots-Tag: noindex, nofollow`.

Only when every step passes: production security is verified.

## 10. Results log

| Date | Step(s) | Result | By |
|---|---|---|---|
| 2026-09-26 | Local gate: 142 tests, TypeScript, build; public QA 95/95; admin QA 49/49; CMS QA 53/53; 7B coverage 21/21; production bundle scans (no local store, demo data, invoice or service-role key) | PASS | developer |
| 2026-09-26 | Migrations: all 19 applied (local = remote, no duplicates after renaming `20260222_properties_rls` → `20260223_properties_rls`; `db push --dry-run` has nothing pending) | PASS | developer |
| 2026-09-26 | Found and fixed on the real project: tables were not exposed to the Data API (new-project default) → `20260930_green_hill_api_grants.sql`; `poi_cache` had RLS off → admin-only; trigger functions callable over RPC → `20261001_…`; legacy Ukon schema removed → `20260929_…` | PASS | developer |
| 2026-09-26 | Supabase security advisor: only the five intended public functions remain as warnings (`submit_enquiry`, `private_teaser(s)`, `private_opportunity_count`, `is_admin`) | PASS | developer |
| 2026-09-26 | Storage: exactly `opportunity-media` (private), `property-images`, `opportunity-files`, `site-media` (public); admin-only write policies; anonymous and non-admin uploads refused | PASS | developer |
| 2026-09-26 | Admin: one auth user (Reece, confirmed, no password yet — he sets it via "Forgot password"), `user_profiles.role = 'admin'`, `is_admin()` true for him and false for visitors | PASS | developer |
| 2026-09-26 | Live end-to-end run against the production project (production build, 64 checks): public site in 4 languages with honest empty states; opportunity draft/preview/publish/reserved/sold/private/teaser/archive/restore; exact IDR price; private media private, signed links working and expiring, public copies created and removed; content draft invisible, preview, publish, SEO, image publish/replace; Notes draft/publish/unpublish; enquiry via public form → WhatsApp, stored, status and note by admin, unreadable by visitors; non-admin refused everywhere; sign-out | 64/64 PASS | developer |
| 2026-09-26 | Deleted/unpublished public images stop being served after ~60 s (Supabase CDN invalidation window, measured) | NOTED | developer |
| 2026-09-26 | All QA records, files and the temporary non-admin account removed afterwards; production holds only Reece's admin profile | PASS | developer |
| 2026-09-26 | Admin acceptance against the brief (docs/green-hill-admin-acceptance.md): 73 requirements, 70 PASS, 3 NOT V1; live acceptance 48/48, live end-to-end 64/65 (one slow first load, re-checked PASS), description and nearby places live PASS | PASS | developer |
| 2026-09-26 | Fixed on production: visitors could read internal opportunity columns (`verification_notes`, memorandum path) → `20261003`/`20261004`; "from"/range prices → `20261002`. 22 migrations, local = remote | PASS | developer |
| — | Domain, Vercel deployment, password-reset email, link previews (steps 18–19) | NOT RUN: domain not confirmed, Vercel project not created, no SMTP | — |
