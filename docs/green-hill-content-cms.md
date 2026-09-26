# Green Hill — content CMS (Phase 7A)

Reece edits the **words and photographs** of the website. The **design and
layout stay in code**. This is deliberately not a page builder: every page has
a fixed Green Hill content model (sections and fields), defined in one file.

## 1. How it works

| Piece | Where |
|---|---|
| Content model: pages → sections → fields and image slots | `src/content/schema.ts` |
| Shipped copy and images, shown as the starting point ("Restore original") | `src/content/originals.ts` (admin only) |
| Public loader (published rows; drafts only in admin preview) | `src/content/ContentContext.tsx` |
| Public hooks (`useContentImage`, `useContentText`, `useContactSettings`, `useNotesArticles`, `useCmsPageSeo`) | `src/content/hooks.ts` |
| Admin editor model (overrides, autosave, conflicts, validation, translations) | `src/admin/content/useContentEditor.ts` |
| Admin screens | `src/admin/content/*`, `src/admin/pages/NotesPage.tsx`, `src/admin/pages/NoteEditorPage.tsx` |
| Repository contract (same for local preview and Supabase) | `src/admin/data/repository.ts`, `supabaseRepository.ts`, `localStore.ts` |
| Database | `supabase/migrations/20260927_green_hill_content.sql` |

**Fields are the site's own copy keys.** A field such as `hero.headline` is
the key the page already uses. `t()` in `LanguageContext` first looks for a
published value for the visitor's language, then falls back to the approved
translation file. Nothing changes on the site until Reece publishes, and an
unset field always shows the approved copy. Keys starting with `cms.` have no
shipped copy (for example the extra Buying topics or page SEO titles); they
appear only once filled in.

**Only differences are stored.** Typing the original text back, clearing a
field that has approved copy, or "Restore original" removes the override.

## 2. What Reece can edit

| Admin | Public page | Sections |
|---|---|---|
| Content → Homepage | `/:lang` | Hero (label, headline, phone headline, supporting line, buttons, founder note, 3 chapter names and photographs with focal point and description); Reece's introduction (+ portrait); Selected opportunities (wording, how many: 3–6; *which* ones = "Featured" in Opportunities); Green Hill Private teaser (+ photo); Why Lombok & buying (+ photo); Closing invitation (+ photo); Search & sharing |
| Content → About / Reece | `/:lang/about` | Introduction (background photograph; the cut-out portrait stays fixed), story, place, relationships, how Green Hill works, on the ground, closing, Search & sharing |
| Content → Why Lombok | `/:lang/why-lombok` | Introduction, the place, South Lombok & its development, access & airport, beaches/surf/lifestyle, longer view, closing + **disclaimer (required)**, Search & sharing |
| Content → Buying in Lombok | `/:lang/buying-in-lombok` | Introduction + **disclaimer (required)**; topics 1–4 (ownership, due diligence, zoning, process) and 7 optional topics (freehold vs leasehold, PT PMA, notaries, road access, costs & taxes, permits, off-plan) that appear once titled; closing; Search & sharing |
| Content → Green Hill Private | `/:lang/private` | Introduction, who it is for, why private, opportunities wording, relationship-led process, enquiry & closing, Search & sharing. Private opportunities themselves are **not** edited here and are never exposed. |
| Content → Opportunities page | `/:lang/properties` + every opportunity page | Introduction and hero photograph, collection wording and empty state, closing invitation, Search & sharing; shared wording on every opportunity page (labels, **required** concepts note, contact panel, WhatsApp message template with `{title}` and `{reference}`) |
| Content → Notes page | `/:lang/intelligence` | Introduction (main and background photographs), featured note, journal (+ photograph), perspective, themes, latest notes, continue exploring, closing, end-of-note wording, Search & sharing |
| Content → Enquiry page | `/:lang/enquire` | Investor and Private variants, WhatsApp line, Search & sharing. The form's questions stay fixed. |
| Content → Footer & contact | every page | Footer description, brand line, badge, location, copyright, footer photograph |
| Settings → Site settings | every page | Contact name, business email, WhatsApp number, Instagram, WhatsApp opening message (per language). Validated; invalid values are refused and the site keeps the last good value. |
| Settings → SEO & social | every page | Site-wide default title, description and sharing image; links to each page's own Search & sharing section. Robots rules stay in code (no "noindex" switch, on purpose). |
| Editorial → Notes | `/:lang/intelligence` | Create, edit, draft, publish, unpublish, archive, delete draft. Title, summary, standfirst, parts (heading, text, pull quote, photograph + description + caption), cover photograph + description, author, date, topic, lead note, page address, search title/description per language, sharing image. |

Opportunities keep their own 7-step editor (now with plain-language labels:
"Public page address", "Where should this opportunity appear?", "Title on
Google", "Original page address (canonical link)").

Settings → Site settings also holds **Reece's portrait in contact sections**
(Why Lombok, Green Hill Private, the Opportunities page and every opportunity
page). The full route-by-route coverage is in
`docs/green-hill-content-coverage-matrix.md`.

## 3. Draft, preview, publish

- **Save**: every change autosaves as a *draft* after 1.5 s ("Saving… /
  Draft saved / Unsaved changes"). Leaving with unsaved changes warns.
- **Preview**: opens the real public page with `?cms-preview=1` inside the
  admin. The database only returns drafts to the admin, so the flag reveals
  nothing to anyone else. Draft images are shown through signed links.
  Previewing never publishes.
- **Publish**: validates first (required fields such as disclaimers and
  contact details, valid email/WhatsApp/https links, number ranges, lengths).
  Then the page's draft replaces what visitors see, in one database function.
- **Discard changes**: deletes the draft; the website is unaffected.
- **Stale overwrite protection**: every save carries the draft version it
  started from. If the page was changed in another tab or device, the save is
  refused ("changed somewhere else") and nothing is overwritten.
- **No cross-page contamination**: each page is its own record (`page_key`);
  a save or publish touches only that page.

Notes: a draft note autosaves. A published note changes only when Reece
presses "Save changes" (publishing rules are checked again).

## 4. Translations (EN / ID / NL / ES)

- One set of fields with a **language switcher**, not four copies.
- English is the main version. Other languages keep their approved
  translation until changed.
- When an English text is changed and a language has no edit of its own, the
  field shows **"Needs translation"** (with the new English text), and the
  language tab shows a count. The Content list and Overview show the totals.
- No machine translation. Visitors never see raw keys: an untranslated field
  shows the approved translation; an untranslated note falls back to English.
- Contact details, numbers and images are shared by all languages.

## 5. Images

- Upload (JPEG/PNG/WebP, compressed to WebP), replace, restore original,
  description (alt text, per language), focal point for cropped images.
- Uploads go to the **private** bucket (`opportunity-media/content/…`).
  Publishing copies the images a page or note uses to the **public**
  `site-media` bucket; replaced, restored or unpublished images lose their
  public copy. There is no uncontrolled public upload: only the admin can
  write to any bucket, and the database refuses published content or a
  published note that points at a private file.
- Local preview (no database) stores small data-URL images in the browser.

## 6. Database

`20260927_green_hill_content.sql`:

- `site_content (page_key, locale, status, fields, media, …)`, one row per
  page × language (`*` = shared values and images) × draft/published.
  RLS: visitors read `published` rows only; the admin (`is_admin()`) does
  everything. Size limit per row.
- `save_content_draft(page, rows, expected_version)` and
  `publish_content(page, media)`: `SECURITY INVOKER`, refuse non-admins,
  not executable by `anon`.
- `notes`: one row per note with translations as JSON. RLS: visitors read
  published notes only. A published note must have an English title and date
  and no private images (constraint).
- `site-media` bucket (public, images only); admin-only storage policies.

`20260928_green_hill_content_pages.sql` only widens the allowed page keys
(`opportunities`, `notes`, `enquire`).

Covered by `src/test/security/database-security.test.ts` (real Postgres via
PGlite) and `src/admin/content/content.test.ts`.

## 7. Security model (unchanged principles)

- One admin role, decided by the database (`is_admin()`), never by the browser.
- Local preview mode exists only in development builds without Supabase; the
  production bundle contains no local store.
- No secrets in the client or in this document; Settings → Integrations shows
  only whether a service is configured.
- Drafts, private opportunities, verification notes and private media are
  never readable by visitors.

## 8. Adding a field later (developer)

1. Add the key to the translation files (`src/lib/i18n/translations/*.json`)
   if it has approved copy, and use it with `t()` in the page, or use a
   `cms.` key read with `useContentText`.
2. Add a `FieldDef` to the right section in `src/content/schema.ts`.
3. For an image, add a `MediaDef` slot, read it with `useContentImage(slot,
   fallback, altKey)` and add the shipped image to `ORIGINAL_MEDIA`.

No database change is needed: content is stored per key.
