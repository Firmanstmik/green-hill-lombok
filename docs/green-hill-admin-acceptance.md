# Green Hill — admin / CMS acceptance (brief-based)

Source of truth: `docs/Green_Hill_Lombok_Full_Website_Brief_Firman.pdf`.
Run on 2026-09-26 against the **production Supabase project** with the
production build, as the real admin (one-time session, no password) and as a
visitor. Every QA record was removed afterwards (production holds only the
admin profile).

**PASS** means Reece can do it in the admin UI, it is stored in the database,
secured by RLS/grants, and correct on the public site. **NOT V1** means the
brief itself places it after launch.

## Matrix

| # | Requirement (brief §) | Admin UI | DB | Public output | Security | Result |
|---|---|---|---|---|---|---|
| 1 | Add opportunity (§10) | Opportunities → Add | `properties` | — | admin-only insert (RLS) | PASS |
| 2 | Edit (§10) | 7-step editor | same row, stable id | updates live memo | admin-only update | PASS |
| 3 | Save draft, no duplicate on double save | Save draft / Ctrl+S | one row | invisible | drafts unreadable by visitors | PASS |
| 4 | Preview | Preview (real memo) | — | never published | — | PASS |
| 5 | Publish / unpublish | Review → Publish; menu | `status`, `published_at` kept on edits | appears / disappears | public copies created / removed | PASS |
| 6 | Archive / restore (§10) | menu | `status`, `archived_at` | hidden | — | PASS |
| 7 | Available / Reserved / Sold (§10) | Status choice, menu | `status` | status on memo and card | — | PASS |
| 8 | Featured (§10), 3–6 on homepage (§4) | menu / switch; count in Content → Homepage | `featured` | homepage selection | — | PASS |
| 9 | Public / Private (§10) | "Where should this opportunity appear?" | `visibility` | private never listed | RLS | PASS |
| 10 | Stable id, slug, `published_at` | — | — | links keep working | — | PASS |
| 11 | Title, reference GH-… (§23) | Basics | `title`, `listing_code` | memo | — | PASS |
| 12 | Opportunity type: Land, Villa, Development, Off-plan, Private Investment (§5) | Basics | `type` | card badge | — | PASS |
| 13 | Location, area, region, exact address (§6, §10) | Location | `region`, `area`, `address` | memo, card | teaser hides exact location | PASS |
| 14 | Coordinates / map (§6, §10) | Location | `latitude`, `longitude` | map on memo (needs Mapbox token) | teaser map switch | PASS (token to set) |
| 15 | Relevant distances (§6) | Location → Find nearby places | `nearby_amenities`, `poi_cache` (admin only) | "Nearby" on memo | cache admin-only | PASS |
| 16 | Land size; hectares + m² (§10, §19) | Specifications (live "= 9.2 ha") | `land_size`, `m2` | "9.2 ha · 92,000 m²" on memo and card | — | PASS (fixed) |
| 17 | Tenure / title, lease term (§10) | Specifications | `ownership`, `lease_years` | memo **and card** | teaser switch | PASS (fixed: card) |
| 18 | Zoning (§6, §10) | Specifications | `zoning` | memo | — | PASS |
| 19 | Road access, utilities (§6) | Location | `road_access`, `utilities` | memo | teaser hides road access with location | PASS |
| 20 | Development status / potential (§6, §23) | Specifications / Story | columns | memo + concepts note | — | PASS |
| 21 | Description (§10) | Story (rich text) | `description_json` | memo paragraphs | — | PASS |
| 22 | Why Green Hill Likes It (§6, §10) | Story | `why_green_hill` | memo section | — | PASS |
| 23 | Private investment thesis: scarcity, location, surrounding development, entry price, scale, potential use, long-term; facts vs concepts; no ROI (§20) | Story (private label + guidance) | `why_green_hill`, `development_potential`, internal `verification_notes` | "Why Green Hill is looking at this" | notes never public | PASS (fixed: guidance) |
| 24 | Seller / developer name (§18) | "Developer / landowner name" | `developer_name` | memo; teaser switch | — | PASS (fixed: wording) |
| 25 | Gallery 1–8, primary, reorder, alt, upload, replace, remove (§10) | Media | `images`, `image_alt` | memo gallery, card | private until published; public copies only while live | PASS |
| 26 | Video / drone footage (§6, §10) | Media → Video | `video_url` | embedded on memo | — | PASS |
| 27 | Brochure PDF (§10) | Media → upload + "Offer it for download" | private until offered | download link | public copy only when offered | PASS |
| 28 | Masterplan (§10) | Media → upload + switch | same | download when offered | same | PASS |
| 29 | Investment memorandum PDF upload, protected, delivered after qualification (§22, §23 Output B) | Media → upload; "Open" gives a signed link | private file; path not readable by visitors | never public | signed links expire | PASS |
| 30 | SEO title / description (§10) | SEO step | columns | page title / meta | — | PASS |
| 31 | Social sharing image (§10) | SEO step | `og_image` | og:image; link previews (Vercel middleware) | — | PASS |
| 32 | Price or Price on Request (§10) | Basics | `price_on_request`, `price_amount` | memo / cards | — | PASS |
| 33 | IDR / USD / GBP source currency; IDR primary; conversions labelled approximate; source never overwritten (§10, §11) | Basics (+ live approximations) | `price_amount` + `price_currency` exactly as entered | "≈" for conversions, exact price stated | — | PASS |
| 34 | Investment value: POA, "from USD X", a range, or fully disclosed (§17) | Basics → "How the price reads" | `price_display`, `price_amount_max` (checked range) | "From …", "… – …" | teaser carries them only when price is disclosed | PASS (fixed: new) |
| 35 | Green Hill Private teaser page (§16, §17) | "Present as a teaser" | `private_teaser` | `/private/<ref>` | server-built `private_teaser()` | PASS |
| 36 | Disclosure: price, exact location, map, masterplan, developer, tenure, documents (§18) | switches | `disclosure` | only switched-on fields | hidden fields never leave the database | PASS |
| 37 | No leaks via API, page source, network, predictable or document URLs (§18) | teaser explanation lists what is always shown | column grants | — | internal columns refused to visitors | PASS (fixed: column leak) |
| 38 | Scale shown in hectares and m² (§19) | — | — | teaser and memo | — | PASS |
| 39 | Request investment memorandum CTA (§21) | — | — | teaser CTA → qualification | — | PASS |
| 40 | Qualification form: name, company, country, email, WhatsApp, capital, investor type, interests, timeframe, message (§21) | Enquiries sheet shows all | `enquiries` columns | form | insert only via `submit_enquiry` | PASS |
| 41 | Capital bands USD 100k–250k … 10m+ (§21) | — | `budget` | form | — | PASS |
| 42 | Investor types (§21) | — | `investor_type` | form | — | PASS |
| 43 | Private interests (§21) | — | `interests` | form | — | PASS |
| 44 | Private enquiries in the same CRM, qualified before information is released (§21) | Enquiries: status Qualified, opportunity linked | `source = private`, `opportunity_id` | — | — | PASS |
| 45 | Standard enquiry: name, email, WhatsApp, country, budget, type, objective, timeframe, message (§9) | Enquiries sheet | columns | investor form | visitors cannot read | PASS |
| 46 | Budget bands under £50k … £1m+ (§9) | — | `budget` | form | — | PASS |
| 47 | Interests: land … not sure yet (§9) | — | `interests` | form | — | PASS |
| 48 | Objectives: capital growth … combination (§9) | — | `objective` | form | — | PASS |
| 49 | CRM statuses New → Completed (§9) | status buttons (+ Closed) | `status` | — | admin only | PASS |
| 50 | Notes against each investor (§9) | "Add a private note" | `enquiry_activity` | — | admin only | PASS |
| 51 | Stored in admin, not only by email (§9) | Enquiries | `enquiries` | — | RLS | PASS |
| 52 | WhatsApp prefilled with the opportunity name (§11) | — | — | "Talk to Reece" / memorandum request | — | PASS |
| 53 | Homepage content (§3, §4) | Content → Homepage | `site_content` | homepage | drafts invisible | PASS |
| 54 | About / Reece (§2, §3) | Content → About | same | about | same | PASS |
| 55 | Why Lombok (§7) | Content → Why Lombok | same | page | same | PASS |
| 56 | Buying in Lombok topics + disclaimer (§7) | Content → Buying | same | page | same | PASS |
| 57 | Green Hill Private page (§16) | Content → Green Hill Private | same | page | same | PASS |
| 58 | Footer / contact / site settings | Content → Footer & contact, Settings → Site settings | same | every page | validated values | PASS |
| 59 | SEO / social defaults (§27 core SEO) | Settings → SEO & social | same | defaults | robots in code | PASS |
| 60 | Notes: create, edit, draft, publish, unpublish, image, SEO, slug, status (§8) | Editorial → Notes | `notes` | Notes pages | drafts invisible | PASS |
| 61 | Translations EN / ID / NL / ES with "Needs translation" | language tabs + counts | per-locale rows | 4 languages | — | PASS |
| 62 | Draft → preview → publish → restore | every content page | draft/published rows | — | — | PASS |
| 63 | GA4 and Meta Pixel support (§10, §27) | Settings → Integrations (status only) | env variables | loads only when set | IDs pending consent decision | PASS (not yet configured) |
| 64 | No secrets in the frontend | — | — | bundle scan: no service-role or secret key | — | PASS |
| 65 | Visitors: no edit, no private, no drafts, no enquiries, no private documents, no uploads | — | — | — | API tested directly | PASS |
| 66 | Non-admin account cannot use the admin or the data | — | — | — | API tested directly | PASS |
| 67 | Admin terminology: no agent, seller, buyer, rental, marketplace | — | — | — | — | PASS (fixed: "seller") |
| 68 | Mobile-usable admin (375 px) | all admin screens | — | — | — | PASS (fixed: document row) |
| 69 | No fake metrics, ROI, counts, demo inventory in production | Overview shows real counts only | ROI/rental columns removed | demo compiled out | — | PASS |
| 70 | Data architecture ready for website + memorandum (§23: title, reference, public/private, location, coordinates, area, price, price/are, tenure, zoning, access, utilities, description, Green Hill view, thesis, development potential, risks, photos, drone video, boundary image, masterplan, maps, documents) | existing fields (risks → verification notes; boundary/maps as photos; price/are derivable) | yes | Output A only marked-public fields | Output B uploaded PDF | PASS |
| 71 | Automatic memorandum PDF generator (§22–23) | — | — | — | — | NOT V1 ("Do not build a complicated automatic PDF generator in V1") |
| 72 | Digital deal room `/private/GH-003` with token (§24) | — | — | — | — | NOT V1 ("does not need to be in the initial launch") |
| 73 | Richer CRM, marketing automation, deeper analytics, Notes/Instagram expansion (§8, §27 Phase 2) | — | — | — | — | NOT V1 (Phase 2) |

## Fixed during this audit

1. **Security:** visitors could read `verification_notes`, the memorandum
   path and internal ids of public opportunities through the API (row level
   security limits rows, not columns). Now refused; the site selects an
   explicit column list (`20261003`, `20261004`).
2. **§17 price forms:** "from" and range added (`20261002`), in the admin,
   the memo, the cards, the teaser (only when the price is disclosed) and the
   admin review.
3. **§5 cards:** tenure shown; **§19** hectares on cards and while typing.
4. **Teaser clarity:** the admin now states what a teaser always shows and
   what only appears when switched on.
5. **§20 thesis guidance** for private opportunities.
6. **Terminology:** "Developer / landowner" (admin and memo, 4 languages).
7. **Mobile:** document rows wrap at 375 px.

## Evidence

- Unit + database tests: 158/158 (49 database security checks on all 22 migrations).
- Live acceptance (production project, admin UI): 48/48.
- Live end-to-end (production project): 64/65; the one miss (empty collection
  text after a slow first load) re-checked and passing.
- Live: description editor → memo; nearby places lookup (4 places stored).
- Public site, 4 languages + 404 (demo build): 95/95.
- TypeScript and build pass; lint: 24 inherited errors, none new.
