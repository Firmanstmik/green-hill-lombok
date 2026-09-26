# Green Hill — production and handover

Brief §10: *Domain, hosting, database and third-party accounts should ideally
be controlled by Green Hill. Green Hill should own source code, database and
site content/design after payment and another developer must be able to take
over later. Confirm backup/security approach and indicative recurring costs.*

This document contains **no secrets**. Every credential lives in the account
it belongs to, owned by Green Hill.

Status labels: **LOCALLY VERIFIED** (proven in this repository's tests and
browser runs) · **REQUIRES REAL SUPABASE VERIFICATION** · **NEEDS PRODUCTION
SETUP** (a Green Hill decision or account).

---

## 1. Accounts Green Hill should own

Create each in Green Hill's name, with Reece (or a Green Hill company email)
as owner and the developer invited as a member only.

| Service | Purpose | Owner | Developer access | Status |
|---|---|---|---|---|
| Domain registrar | The domain (e.g. greenhilllombok.com, not yet confirmed) | Green Hill | None needed (DNS changes via Green Hill) | NEEDS PRODUCTION SETUP |
| Hosting: **Vercel** (decided) | Serves the built site (`npm run build` → `dist/`), SPA fallback and link previews (`vercel.json`, `middleware.ts`) | Green Hill | Member | NEEDS PRODUCTION SETUP |
| Supabase: a **new, dedicated** project (region Singapore), never the inherited Ukon project or keys | Database, admin login, file storage | Green Hill (organisation owner) | Developer role | NEEDS PRODUCTION SETUP (not created yet) |
| Mapbox | Maps on the memo and in the admin | Green Hill | None (public token only) | NEEDS PRODUCTION SETUP |
| Google Analytics 4 | Visitor analytics | Green Hill | Editor | NEEDS PRODUCTION SETUP |
| Meta Business (Pixel) | Instagram/Facebook campaign measurement | Green Hill | Partner access | NEEDS PRODUCTION SETUP |
| Source code (GitHub) | This repository; the production build is on branch `green-hill-production` | Green Hill organisation | Maintainer | NEEDS PRODUCTION SETUP (transfer to a Green Hill organisation) |
| WhatsApp number | "Talk to Reece" (`src/lib/contact.ts`: +44 7810 062383) | Reece | — | In use |

## 2. Recurring services (indicative, confirm current prices)

Prices change; check each provider's pricing page when setting up. What the
site needs, at the time of writing:

- **Supabase**: a paid plan is recommended for production (daily backups,
  no project pausing). The free tier pauses inactive projects and is not
  suitable for a live business site.
- **Hosting**: a static site; the providers above have free or low-cost
  tiers that cover this traffic.
- **Domain**: annual renewal.
- **Mapbox**: usage-based with a free allowance; a small site stays within it.
- **GA4, Meta Pixel**: free.
- **Developer maintenance**: optional, by agreement.

## 3. Environment variables (set in the hosting provider)

| Variable | Needed for | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | Database connection | No (public by design) |
| `VITE_SUPABASE_ANON_KEY` | Database connection | No (public by design; RLS protects data) |
| `VITE_SITE_URL` | Absolute social image, `sitemap.xml`, `robots.txt` | No |
| `VITE_MAPBOX_ACCESS_TOKEN` | Maps | No (restrict it to the domain in Mapbox) |
| `VITE_GA4_MEASUREMENT_ID` | GA4 (only after the consent decision, §8) | No |
| `VITE_META_PIXEL_ID` | Meta Pixel (only after the consent decision, §8) | No |
| `VITE_DEMO_OPPORTUNITIES` | **Never set in production** (demo builds only; no effect once Supabase is set) | No |

The Vercel middleware reads the same `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` and `VITE_SITE_URL` at request time; no other
variable is needed for link previews.

Never put the Supabase **service-role key** in any `VITE_` variable or in the
repository: anything `VITE_` is shipped to every browser. See
`.env.example`.

## 4. Deployment (Vercel)

1. Vercel → New project → import the GitHub repository, production branch
   `green-hill-production` (or `main` once merged).
2. `vercel.json` sets: build `npm run build`, output `dist`, the SPA fallback
   (every page path serves `index.html`; files are served as they are),
   `X-Robots-Tag: noindex, nofollow` on `/:lang/admin…`, and long caching for
   hashed `/assets/`. Node 20+.
3. Set the environment variables above for **Production**, then redeploy
   (Vite reads them at build time).
4. Add the domain in Vercel → Domains and set the DNS records Vercel shows
   at the registrar. HTTPS certificates are automatic.
5. The build writes `sitemap.xml` and a `robots.txt` sitemap line only when
   `VITE_SITE_URL` is set. LOCALLY VERIFIED.
6. Routine: every push to the production branch deploys; every pull request
   gets a preview URL. Roll back from Vercel → Deployments → Promote.

## 4a. Link previews (WhatsApp, Facebook, LinkedIn)

**Decision: implemented with Vercel Routing Middleware** (`middleware.ts`,
logic in `src/lib/socialPreview.ts`).

- Link-preview bots (WhatsApp, Facebook, LinkedIn, X, Slack, Telegram…) do not
  run JavaScript. For them only, the middleware returns `index.html` with the
  **published** title, description, image and URL of the requested page:
  content pages (their Search & sharing values, then the site defaults, then
  the approved copy), public opportunities (SEO title/description, sharing or
  primary photo), published notes.
- Visitors and Google get the normal SPA, untouched. Admin, auth, teaser and
  file paths are never touched. Any error or a 2.5 s timeout falls through to
  the static site-wide preview (`public/og-image.jpg`).
- Reads only published, public data with the anon key; drafts, private
  opportunities and enquiries are never queried.
- LOCALLY VERIFIED: 13 tests (matcher, bots vs browsers, each route type,
  fallbacks, private image refused, escaping) and an end-to-end run of the
  esbuild bundle (205 KB, 50 KB gzipped). REQUIRES REAL DEPLOYMENT
  VERIFICATION: Facebook Sharing Debugger, LinkedIn Post Inspector and a
  WhatsApp message on the live domain (checklist §9, step 18).

## 5. Database and storage

Full, step-by-step setup and the real verification run:
`supabase/PRODUCTION_CHECKLIST.md`. Legacy clean-up after launch:
`docs/green-hill-database-cleanup-plan.md`.

| Protection | Status |
|---|---|
| Visitors read only public, live opportunities; drafts, archived and hidden private records are unreadable, also by exact id | LOCALLY VERIFIED |
| Green Hill Private teasers send only the fields Reece discloses; hidden fields, the memorandum and verification notes never leave the database | LOCALLY VERIFIED (SQL + parity test) |
| Enquiries are insert-only for visitors; only the admin reads them | LOCALLY VERIFIED |
| One admin role decided by the database (`is_admin()`), not by the browser | LOCALLY VERIFIED |
| Private media in a private bucket; public copies only while published; the memorandum is never public | LOCALLY VERIFIED |
| Inherited marketplace functions blocked | LOCALLY VERIFIED |
| Website content and Notes: drafts visible only to the admin; published content and notes can only use public images (`site-media`) | LOCALLY VERIFIED |
| The same on the real project, public sign-ups disabled, storage URLs behaving | REQUIRES REAL SUPABASE VERIFICATION |

## 6. Backups

- **Database**: Supabase daily backups on a paid plan; point-in-time
  recovery is an add-on for stricter needs. Before any schema change
  (for example the legacy clean-up), take a manual `pg_dump`.
- **Storage (photographs, PDFs)**: Supabase database backups do **not**
  include storage files. Keep the original photographs and PDFs in Green
  Hill's own drive, or schedule a periodic copy of the `opportunity-media`
  bucket (the private originals, including website content images under
  `content/`). The public buckets (`property-images`, `site-media`) hold
  copies that are recreated by publishing again.
- **Code**: the Git repository is the backup; tag each release.
- **Content**: page edits and Notes live in the database (`site_content`,
  `notes`) and are covered by the database backup. The approved original
  copy and translations live in the repository
  (`src/lib/i18n/translations`) and are the fallback.

## 7. Access and security routine

- **Admin account procedure**: Supabase → Auth → Users → Add user (Reece's
  email, a strong password he chooses, Auto confirm), then the one-line SQL in
  the checklist §3 sets `user_profiles.role = 'admin'`. Nobody else is given
  an account; there is no public sign-up and no other role.
- **Password reset**: "Forgot password" on `/<lang>/admin/login` emails a
  link to `/<lang>/auth/update-password` (the redirect URL must be allowed in
  Supabase Auth → URL configuration). The developer never sets or knows the
  password.
- Strong password; enable MFA in Supabase Auth if available on the plan.
- Remove developer access from Supabase, hosting and code when a contract
  ends; rotate the anon key only if it was misused (it is public by design).
- Review Supabase Auth → Users occasionally: there should be only admins.

## 8. Analytics and consent

GA4 and Meta Pixel are supported (`src/lib/analytics.ts`): page views on
every public page, `generate_lead` / `Lead` when an enquiry is sent, and
`contact` / `Contact` for WhatsApp hand-offs. Nothing loads without the IDs,
nothing loads in development, and nothing is sent from the admin.

**Decision needed (NEEDS PRODUCTION SETUP):** visitors from the UK and EU
require consent before analytics cookies are set. Options: add a consent
banner before enabling, or enable only after legal advice. The IDs should
not be set until this is decided.

## 8a. Production verification status

| Area | Status |
|---|---|
| Code, tests (142), TypeScript, build, public/admin/CMS browser QA | LOCALLY VERIFIED |
| Production bundle: no local preview store, no demo inventory, no invoice, no service-role key | LOCALLY VERIFIED |
| Link-preview middleware | LOCALLY VERIFIED (tests + bundle run) |
| Supabase project, migrations on Supabase, storage, Auth, admin account, checklist steps 1–18 | NOT RUN: the Supabase project has not been created yet |
| Domain, DNS, HTTPS, live link previews | NOT RUN: domain not confirmed, Vercel project not created |

Results of the real run are recorded in `supabase/PRODUCTION_CHECKLIST.md` §10.

## 9. What another developer needs to take over

- Access: code repository, hosting, Supabase (developer role), Mapbox.
- Read, in order: `README.md`, `supabase/PRODUCTION_CHECKLIST.md`,
  `docs/green-hill-final-completion-matrix.md`,
  `docs/green-hill-legacy-inventory.md`,
  `docs/green-hill-database-cleanup-plan.md`, `docs/green-hill-content-cms.md`,
  `docs/green-hill-content-coverage-matrix.md`, this document.
- Commands: `npm install`, `npm run dev` (local preview admin works without a
  database), `npm test` (includes the database security suite on real
  Postgres), `npm run build`.
- Architecture in one line: React + Vite static site on Vercel (plus one
  edge middleware for link previews); Supabase for data, auth and storage;
  the admin lives in `src/admin` at `/:lang/admin`; Reece's user guide to the
  CMS is `docs/green-hill-content-cms.md`.

## 10. Content Green Hill still needs to supply

- Real opportunities (6–15), photographs, drone footage, brochures,
  masterplans, investment memoranda.
- Notes from Lombok articles: Reece can now write and publish them in
  Admin → Notes (the section is ready and empty on purpose).
- More on-site photography of Reece (brief §3, §12).
- Confirmation of the production domain.
