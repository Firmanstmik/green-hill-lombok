# Green Hill — content coverage matrix (Phase 7B)

Every public route, what it shows, where that content comes from, and whether
Reece can change it without a developer. Routes exist for each language
(`/en`, `/id`, `/nl`, `/es`); the content model is the same for all four, with
one set of fields and a language switcher in the admin.

Source of truth for routes: `src/App.tsx`. Content model: `src/content/schema.ts`.

**Legend.**
- **Sources:** CMS = Content (page wording and images); OPP = Opportunities; NOTES = Notes; SITE = Site settings (contact, footer); DEV = code.
- **Statuses:** COMPLETE = Reece can manage it. DEVELOPER CONTROLLED = deliberately in code. NEEDS REECE CONTENT = the tool is ready, the content is not.
- **Draft/Publish:** yes = drafts are invisible to visitors, with preview and publish.

## 1. Content pages

| Route | Content | Source | Editable by Reece | Media editable | SEO editable | Translation editable | Draft/Publish | Reason if developer-controlled | Status |
|---|---|---|---|---|---|---|---|---|---|
| `/:lang` Homepage | Hero (label, headline, phone headline, supporting line, buttons, founder note and name/role, 3 chapter names); Reece's introduction; selected-opportunities wording, count (3–6) and empty-state text; Private teaser (+ 4 pathway cards); Why Lombok & buying (+ 4 place cards, buying intro and 4 card texts); closing invitation (+ 3 steps) | CMS (Content → Homepage) | Yes | Yes: 3 hero photographs (focal point, description), portrait, Private photo, trust photo, 3 closing photographs | Yes (title, description, sharing image) | Yes | Yes | Layout, animation, the hero carousel mechanics | COMPLETE |
| `/:lang` Homepage: which opportunities | Selected cards | OPP ("Featured") | Yes | via Opportunities | via Opportunities | n/a | Opportunity publish | — | COMPLETE |
| `/:lang/about` | Hero (headline with tone markers, lead, 3 cards, portrait description, caption), story, place, relationships (4 names, 4 texts, 4 WhatsApp messages, door note), how Green Hill works (4 principles), what Green Hill selects (4 items), on the ground (badge, caption, 4 points, button), closing, start a conversation | CMS (Content → About / Reece) | Yes | Yes: background, story, place, ground, main approach photo, 3 principle photos | Yes | Yes | Yes | The cut-out portrait is a prepared transparent image (design) | COMPLETE |
| `/:lang/why-lombok` | Intro, place (+ gallery caption), South Lombok & development (+ 4 labels), access (+ gallery caption/note), beaches & lifestyle, longer view, from the ground (quote, attribution), closing, **required** disclaimer, buttons | CMS (Content → Why Lombok) | Yes | Yes: hero, 4 place gallery photos, 3 access gallery photos (3rd = South Lombok photo), pace, longer; Reece portrait via Site settings | Yes | Yes | Yes | — | COMPLETE |
| `/:lang/buying-in-lombok` | Intro, **required** disclaimer, topics 1–4, optional topics 5–11 (freehold/leasehold, PT PMA, notary, road access, costs & taxes, permits, off-plan), closing | CMS (Content → Buying in Lombok) | Yes | No page photographs by design | Yes | Yes | Yes | — | COMPLETE · topics 5–11 NEEDS REECE CONTENT |
| `/:lang/private` | Intro (+ caption, side label), who it is for (4 audiences), why private (4 points, photo label), private-opportunities wording, process (4 steps), start a conversation (4 prompts), enquiry & closing | CMS (Content → Green Hill Private) | Yes | Yes: hero, why photo; Reece portrait via Site settings | Yes | Yes | Yes | Audience card photographs are decorative art direction | COMPLETE |
| `/:lang/private` teasers | Teaser cards | OPP (private + "Present as a teaser", disclosure switches) | Yes | via Opportunities | n/a | n/a | Opportunity publish | Private data never leaves the database except the disclosed fields | COMPLETE |
| `/:lang/properties` | Intro, collection wording, empty-collection text and button, closing invitation | CMS (Content → Opportunities page) | Yes | Yes: hero photograph (+ description); Reece portrait via Site settings | Yes (new in 7B) | Yes | Yes | Filter labels, card labels (system UI) | COMPLETE |
| `/:lang/properties` cards | Opportunity cards | OPP | Yes | via Opportunities | — | n/a | Opportunity publish | — | COMPLETE · NEEDS REECE CONTENT (real opportunities) |
| `/:lang/property/:id` | Title, reference, type, location/area, land size, tenure, lease term, price / price on request, zoning, road access, utilities, development status, development potential, "why Green Hill likes it", gallery + primary + descriptions, video/drone, map, brochure, masterplan, SEO title/description, sharing image, canonical | OPP (7-step editor) | Yes | Yes (up to 8 photos, reorder, primary, descriptions; brochure/masterplan) | Yes (per opportunity) | Opportunity data is written once (not per language); memo labels are translated | Opportunity draft/publish | Field labels (Price, Type…) and generated sentences are system UI | COMPLETE |
| `/:lang/property/:id` shared wording | "Selected opportunity", "why Green Hill likes it" heading, **required** concepts note, contact panel wording and Reece's role, enquiry/memorandum buttons, private information note, **WhatsApp message template**, other-opportunities wording | CMS (Content → Opportunities page → "On every opportunity page") | Yes | Reece portrait via Site settings | — | Yes | Yes | — | COMPLETE |
| `/:lang/private/:ref` | Teaser: only what Reece disclosed (price, location, map, tenure, developer, brochure, masterplan) | OPP (disclosure switches) | Yes | via Opportunities | Teasers are never indexed | n/a | Opportunity publish | The memorandum and verification notes are never public | COMPLETE |
| `/:lang/intelligence` | Intro (+ caption, place), featured-note wording, journal, Green Hill perspective, "what the notes will cover" (4 themes), latest notes, continue exploring (5 links), closing, end-of-note wording | CMS (Content → Notes page) | Yes | Yes: main photograph, background photograph, journal photograph | Yes | Yes | Yes | Decorative preparation plates (art direction) | COMPLETE |
| `/:lang/intelligence` notes list | Notes | NOTES | Yes | Yes (cover, sharing image, part photos) | Yes (per note, per language) | Yes (per language, English fallback) | Yes (draft, publish, unpublish, archive) | — | COMPLETE · NEEDS REECE CONTENT (no notes yet) |
| `/:lang/intelligence/:slug` | Note: title, summary, standfirst, parts, pull quotes, photos, author, date, topic | NOTES | Yes | Yes | Yes | Yes | Yes | "Note not found" message (system) | COMPLETE |
| `/:lang/enquire` | Standard and Private variants (label, heading, intro), WhatsApp line, SEO | CMS (Content → Enquiry page, new in 7B) | Yes | Site default sharing image | Yes | Yes | Yes | The qualification questions and validation stay fixed so every enquiry arrives complete | COMPLETE |

## 2. Site-wide

| Area | Content | Source | Editable by Reece | Media | SEO | Translation | Draft/Publish | Reason if developer-controlled | Status |
|---|---|---|---|---|---|---|---|---|---|
| Contact | Contact name, email, WhatsApp, Instagram, WhatsApp opening message (per language) | SITE (Settings → Site settings) | Yes, validated | Reece's portrait in contact sections (Why Lombok, Private, Opportunities, every opportunity page) | — | Message per language | Yes | — | COMPLETE |
| Footer | Description, brand line, badge, location, short location, copyright, closing line, photo badge, 3 promises | SITE (Content → Footer & contact) | Yes | Footer photograph | — | Yes | Yes | Link columns follow the site's navigation | COMPLETE |
| Contact panel (dock) | Short brand line | SITE | Yes | — | — | Yes | Yes | Panel labels (Email, WhatsApp, Close) are UI | COMPLETE |
| SEO defaults | Site title, description, sharing image | CMS (Settings → SEO & social) | Yes | Yes | Yes | Yes | Yes | robots.txt and indexing rules are code on purpose (no accidental "noindex") | COMPLETE |
| Link previews (WhatsApp, Facebook, LinkedIn) | Title, description, image shown when a link is shared | Published CMS / opportunity / note SEO values, served to preview bots by the Vercel middleware (`middleware.ts`); static `index.html` tags as fallback | Yes (through each page's Search & sharing, the opportunity's SEO step, the note's search fields) | Yes | Yes | Yes | Published values only | — | COMPLETE locally · REQUIRES LIVE DEPLOYMENT VERIFICATION |
| Navigation & menus | Menu labels, link structure | DEV (translations) | No | — | — | Translated in code | — | Technical navigation | DEVELOPER CONTROLLED |
| Brand | "Green Hill" wordmark, logos, favicon | DEV | No | No | — | — | — | Brand identity | DEVELOPER CONTROLLED |
| `*` 404 | "Page not found" | DEV | No | — | Not indexed | Translated in code | — | System page | DEVELOPER CONTROLLED |
| Auth callback / password pages | Admin sign-in plumbing | DEV | No | — | Not indexed | — | — | System | DEVELOPER CONTROLLED |
| Redirects (`/`, `/admin`, `/:lang/network`, `/partners`, `/login`, `/dashboard`, `/account/*`) | Redirects only | DEV | — | — | — | — | — | Technical | DEVELOPER CONTROLLED |

`/invoice` exists only in development builds (the developer's invoice preview) and is not part of the site.

## 3. Images

Reece-managed (upload → save → preview → publish → replace → restore, all verified in browser QA):
every hero and section photograph with meaning (it carries a description), Reece's portraits, the
opportunity galleries, note covers and part photographs, sharing images.

Developer-controlled art direction (no description, `alt=""`): dark section backdrops
(`bg-sec-talk-to-reece`), decorative photo collages in "talk" sections outside the homepage, the
Private audience card photos, the Notes "in preparation" plates, logos and favicons. Changing them
would change the design, not the content.

## 4. Demo data

- The six opportunities in local preview are **demo seed content** (`src/data/mockData.ts`),
  copied into the browser-only local admin store on first open.
- The public site shows the demo set only when **no database is connected** and the build is
  either development or an explicit demo build (`VITE_DEMO_OPPORTUNITIES=true`).
- A build connected to Supabase never shows demo data (real records only, or honest empty states:
  "The collection is being curated…", "New opportunities are being selected…").
- A production build without a database and without the demo flag also shows the honest empty
  states (verified: 20/20 checks).
- In local preview, edits to opportunities are seen through the admin's Preview (the real memo);
  the public lists keep showing the demo set. Content and Notes edits do appear on the public pages.

## 5. Verification

| Check | Result |
|---|---|
| Unit + database security tests | 129/129 |
| Every content field key has approved copy; every image slot has an original | test |
| Public QA (4 languages, all routes, 404) | 95/95 |
| Production build without database or demo flag | 20/20 |
| Admin QA | 49/49 |
| CMS flows (edit, save, reload, preview, publish, draft invisible, locales, images, notes, conflicts) | 53/53 |
| Phase 7B coverage (Enquiry, Opportunities page, Notes page, portrait, About, Homepage, Why Lombok gallery) | 21/21 |
| Local preview reset | 4/4 |
