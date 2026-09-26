# Green Hill — final completion matrix (Phase 7)

Source of truth: *Green Hill / Lombok — Full Website Build Brief* (Firman,
September 2026), sections §1–§27, read in full on 26 September 2026.
Evidence is from the repository and browser runs, not from component names.

Status values: **COMPLETE** · **PARTIAL** · **MISSING** · **BLOCKED BY
SUPABASE** · **NOT APPLICABLE** · **NEEDS CLIENT CONTENT**.
Priority: **P0** blocks production · **P1** required by the brief (Phase 1 /
launch list §27) · **P2** refinement · **P3** future (brief Phase 2).

The table records the audit state **before** Phase 7 work ("Audit") and the
state after it ("Final"). The "Gap" column says what was missing.

## A. Brand, story, founder (§1–§3, §12–§14)

| Requirement | Brief | Public UI | Admin UI | Database | Workflow | Audit | Final | Evidence | Gap | P |
|---|---|---|---|---|---|---|---|---|---|---|
| Person · Place · Opportunity positioning | §1 | Home, About, Why Lombok | — | — | — | COMPLETE | COMPLETE | Home hero "Curated property & investment opportunities in South Lombok"; founder section; Why Lombok | — | — |
| Not an estate agency / no marketplace language | §1, §13 | All pages | Admin | — | — | COMPLETE | COMPLETE | Phase 6J purge; public scan for marketplace/agent/rental words: 0 | — | — |
| Green Hill story (UK → Lombok, Are Guling, process, relationships) | §2 | About, Founder section | — | — | — | COMPLETE | COMPLETE | `about.page.story.*`, `founder.story*` | — | — |
| Reece visible, not hidden on About | §3 | Home hero quote + founder section, memo rail | — | — | — | COMPLETE | COMPLETE | Home "REECE GREEN — Founder · Investor · South Lombok"; memo "Speak with" block | — | — |
| Natural on-site photography of Reece | §3, §12 | Founder/About imagery | — | — | — | COMPLETE | COMPLETE | `src/assets/greenhill/founder/*` | More real site-visit photos over time | NEEDS REECE CONTENT (P2) |
| Primary CTAs "My Story" and "Talk to Reece"; no "Contact Agent" | §3, §11 | Hero: Explore Opportunities / Speak with Reece; "Meet Reece" | — | — | — | PARTIAL | PARTIAL | Hero uses "Speak with Reece" (approved copy), elsewhere "Talk to Reece" | Wording differs slightly from the brief; approved copy kept | P2 (copy decision) |
| Palette, typography, restraint | §12 | Global | Admin | — | — | COMPLETE | COMPLETE | Forest/ivory/gold, Prata + Jost | Manrope/Cormorant still render on 404 and password reset (Phase 6J measurement) | P2 |
| Tone: no hype, no guaranteed ROI | §13 | All copy | — | — | — | COMPLETE | COMPLETE | Copy scan: no "guaranteed", "ROI", "once-in-a-lifetime" | — | — |

## B. Homepage (§4)

| Requirement | Brief | Public UI | Admin UI | Database | Workflow | Audit | Final | Evidence | Gap | P |
|---|---|---|---|---|---|---|---|---|---|---|
| Hero: South Lombok photography, identity, positioning line | §4 | `HeroSection` | — | — | — | COMPLETE | COMPLETE | Browser screenshot | Secondary line uses approved "Selected on the ground. Considered for the long term." | — |
| Founder introduction | §4 | `FounderSection` | — | — | — | COMPLETE | COMPLETE | — | — | — |
| Selected opportunities, 3–6 featured | §4 | `SelectedOpportunities` | Featured toggle | `featured` | Admin marks featured | COMPLETE | COMPLETE | `selectCuratedOpportunities` tests | — | — |
| No fake inventory once live | §1, §5 | Home, archive, memo | — | — | — | **MISSING** | COMPLETE | Audit: with a database connected, an empty result or an error fell back to demo opportunities | Demo data must only appear when no database is configured | **P0** |
| Green Hill Private teaser | §4 | `GreenHillPrivate` | — | — | — | COMPLETE | COMPLETE | — | — | — |
| Trust / education pathway | §4 | `TrustEducation` | — | — | — | COMPLETE | COMPLETE | — | — | — |
| Final CTA: investor enquiry **or** WhatsApp | §4 | `FinalCTA` | — | — | — | PARTIAL | COMPLETE | Audit: WhatsApp only, no investor enquiry form anywhere in the standard journey | Investor enquiry form | P1 |

## C. Standard opportunities (§5, §6)

| Requirement | Brief | Public UI | Admin UI | Database | Workflow | Audit | Final | Evidence | Gap | P |
|---|---|---|---|---|---|---|---|---|---|---|
| ~6–15 curated opportunities, not a catalogue | §5 | `/properties` | Opportunities list | `properties` | — | COMPLETE | COMPLETE | Curated archive, no pagination grid | Real opportunities | NEEDS REECE CONTENT |
| Categories Land / Villas / Off-plan / Private Investments | §5 | Tabs: All, Land, Villas, Development | Types: Land, Villa, Development, Off-plan, Private Investment | `type` | — | PARTIAL | PARTIAL | Off-plan is grouped under Development publicly | Separate Off-plan tab | P2 |
| Optional location filters (Are Guling, Tampah, …) | §5 | "All locations" filter by region/area text | Region/Area fields | `region`, `area` | — | COMPLETE | COMPLETE | Filter matches area/region text | — | — |
| Cards: location, type, land size, tenure, price/POR, View Opportunity | §5 | `OpportunityCard` | — | — | — | PARTIAL | PARTIAL | Tenure not on cards | Tenure on cards | P2 |
| No rental / marketplace filters | §1 | Filters | — | — | — | COMPLETE | COMPLETE | Phase 6J; browser check | — | — |
| Memo: hero, overview, Why Green Hill Likes It | §6 | `PropertyDetail` | Story step | `why_green_hill` | — | COMPLETE | COMPLETE | — | — | — |
| Memo: location, price, size, tenure, zoning, development status | §6 | Glance rail | Basics/Land steps | columns | — | COMPLETE | COMPLETE | — | — | — |
| Memo: road access, verified utilities | §6, §23 | — | — | — | — | **MISSING** | COMPLETE | No field existed | Fields + memo rows | P1 |
| Memo: relevant distances | §6 | Nearby places list | POI editor | `nearby_amenities` | — | COMPLETE | COMPLETE | — | — | — |
| Memo: gallery, drone footage / video | §6 | Gallery, YouTube/Vimeo embed | Media step | `images`, `video_url` | — | COMPLETE | COMPLETE | Phase 6 QA | — | — |
| Memo: map where appropriate | §6 | `PropertyMap` | Coordinates | lat/lng | Needs Mapbox token | BLOCKED | NEEDS PRODUCTION SETUP | Falls back without `VITE_MAPBOX_ACCESS_TOKEN` | Token | — |
| Memo: masterplan, downloadable brochure/PDF | §6, §27 | — | Stored, never shown | `masterplan_url`, `brochure_url` | — | **MISSING** | COMPLETE | Audit: "Not yet shown on the public memo" | Per-document "show on website" + public download | P1 |
| Memo: "Interested in this opportunity? Talk directly to Reece" + WhatsApp/enquiry | §6, §11 | Close section | — | — | — | PARTIAL | COMPLETE | Audit: both CTAs went to the homepage `#contact`, WhatsApp opened with no message | WhatsApp prefilled with the opportunity + enquiry form tied to it | P1 |
| Opportunity SEO title/description + social image | §10 | Memo `<head>` | SEO step | `seo_*`, `og_image` | — | COMPLETE | COMPLETE | Phase 6 QA | — | — |

## D. Trust and education (§7, §8)

| Requirement | Brief | Public UI | Admin UI | Database | Workflow | Audit | Final | Evidence | Gap | P |
|---|---|---|---|---|---|---|---|---|---|---|
| Buying in Lombok topics (ownership, freehold/leasehold, PT PMA, DD, notaries, zoning, access, costs/taxes, permits, off-plan) | §7 | `/buying-in-lombok` | — | — | — | COMPLETE | COMPLETE | Page sections | — | — |
| "Educational, not legal advice" + independent advice | §7 | Buying page, trust section | — | — | — | COMPLETE | COMPLETE | `trust.disclaimer` | — | — |
| Why Lombok themes (South Lombok, Mandalika, airport, beaches, infrastructure, pricing, tourism thesis) | §7 | `/why-lombok` | — | — | — | COMPLETE | COMPLETE | Page sections, qualitative | — | — |
| Why Lombok: no guaranteed returns, educational note | §7 | — | — | — | — | PARTIAL | COMPLETE | Audit: no disclaimer on the page | One-line disclaimer, 4 languages | P1 |
| Notes from Lombok (future-ready, SEO) | §8 | `/intelligence`, article route | Read-only index | `notesData.ts` (code) | Content in code | COMPLETE | NEEDS CLIENT CONTENT | Empty published state by design | Reece's articles; CMS editor is brief Phase 2 | P3 |

## E. Enquiries and CRM (§9, §21)

| Requirement | Brief | Public UI | Admin UI | Database | Workflow | Audit | Final | Evidence | Gap | P |
|---|---|---|---|---|---|---|---|---|---|---|
| Investor enquiry: name, email, WhatsApp, country, budget, opportunity type, objective, timeframe, message | §9 | — | Enquiry detail | `enquiries` | Form → CRM → WhatsApp | **MISSING** | COMPLETE | Audit: no standard-journey form; table lacked budget/objective/timeframe | Form + columns + RPC | P1 |
| Budget bands (GBP), interests, objectives | §9 | — | — | — | — | MISSING | COMPLETE | — | Bands from the brief, verbatim | P1 |
| Store in admin, not only email | §9 | — | Enquiries | `enquiries` | RPC `submit_enquiry` | COMPLETE | COMPLETE | Phase 6 DB tests | — | — |
| Statuses New → Completed (+ Closed), notes per investor | §9 | — | Status control, notes | `enquiry_activity` | — | COMPLETE | COMPLETE | Admin QA | — | — |
| Private qualification: company, country, capital (USD bands), investor type, interests, timeframe | §21 | Private form had name/email/WhatsApp/type/message | — | — | — | **PARTIAL** | COMPLETE | Audit of `private.page.form.*` | Fields + columns | P1 |
| "Request Investment Memorandum" CTA | §21 | Private CTA "Request a Private Conversation" | — | — | — | PARTIAL | COMPLETE | — | CTA on private teaser pages | P1 |

## F. Admin (§10)

| Requirement | Brief | Public UI | Admin UI | Database | Workflow | Audit | Final | Evidence | Gap | P |
|---|---|---|---|---|---|---|---|---|---|---|
| Add / edit / archive | §10 | — | Editor, actions | — | — | COMPLETE | COMPLETE | Admin QA 49/49 | — | — |
| Available / Reserved / Sold, Featured, Public/Private | §10 | — | Basics, actions | — | — | COMPLETE | COMPLETE | Admin QA | — | — |
| Price or POR; IDR/USD/GBP | §10, §11 | — | Basics | `price_amount`, `price_currency` | — | COMPLETE | COMPLETE | Source price exact (tests) | — | — |
| Location, land size, tenure, zoning, description, Why Green Hill | §10 | — | Steps 02–05 | — | — | COMPLETE | COMPLETE | — | — | — |
| Gallery, video, map | §10 | — | Media, Location | — | — | COMPLETE | COMPLETE | — | — | — |
| PDF/brochure, masterplan | §10 | — | Media | private bucket | — | PARTIAL | COMPLETE | Stored privately, never publishable | "Show on website" | P1 |
| SEO title/description, social image | §10 | — | SEO step | — | — | COMPLETE | COMPLETE | — | — | — |
| GA4 + Meta Pixel support | §10, §27 | — | — | — | — | **MISSING** | NEEDS PRODUCTION SETUP | No analytics code | Env-driven loader + events; IDs from Green Hill | P1 |
| Ownership, handover, backup/security, recurring costs | §10 | — | — | — | — | MISSING | COMPLETE (document) | — | `docs/green-hill-production-handover.md` | P1 |

## G. Currency and WhatsApp (§11)

| Requirement | Brief | Public UI | Admin UI | Database | Workflow | Audit | Final | Evidence | Gap | P |
|---|---|---|---|---|---|---|---|---|---|---|
| IDR primary; USD; GBP selectively | §11 | Visitor currency selector | IDR default | source price | — | COMPLETE | COMPLETE | — | — | — |
| Conversions clearly labelled approximate | §11 | — | Admin shows "≈" | — | — | **MISSING** | COMPLETE | Audit: converted prices shown bare | "≈" marker + source price on the memo | P1 |
| WhatsApp prominent, "Talk to Reece" | §11 | Nav, dock, CTAs | — | — | — | COMPLETE | COMPLETE | — | — | — |
| Prepopulate WhatsApp with the opportunity name | §11 | Memo | — | — | — | **MISSING** | COMPLETE | Memo linked to `/#contact` | Prefilled message | P1 |

## H. Green Hill Private (§16–§21, §24)

| Requirement | Brief | Public UI | Admin UI | Database | Workflow | Audit | Final | Evidence | Gap | P |
|---|---|---|---|---|---|---|---|---|---|---|
| Separate journey, boutique investment house feel | §16, §25 | `/private` | Private workspace | — | — | COMPLETE | COMPLETE | — | — | — |
| Public investment teaser page per large opportunity | §17, §27 | Only a count | — | Private rows never readable | — | **MISSING** | COMPLETE | Private records were all-or-nothing | Teaser tier + page `/:lang/private/:ref` | P1 |
| Disclosure controls: price, exact location, map, masterplan, developer name, tenure/title, documents | §18 | — | — | — | Server-side filter | **MISSING** | COMPLETE | — | Per-opportunity switches, enforced in SQL | P1 |
| Scale shown visually (hectares + m²) | §19 | Memo shows m² | — | `land_size` | — | PARTIAL | COMPLETE | — | Hectares for ≥ 1 ha | P1 |
| Boundary overlays, topography, drone | §19 | Gallery/video | Media | — | — | PARTIAL | NEEDS REECE CONTENT | Uploads work; content not yet available | Imagery | — |
| Investment thesis ("Why Green Hill Is Looking At This") | §20 | Why Green Hill section | Story | `why_green_hill` | — | PARTIAL | COMPLETE | — | Private label + development potential (concepts subject to planning) | P1 |
| Investment Memorandum PDF upload, sent after qualification | §22, §27 | Never public | — | — | Admin opens and sends | **MISSING** | COMPLETE | — | Private document slot | P1 |
| Automatic memorandum generator | §23 | — | — | — | — | NOT APPLICABLE | NOT APPLICABLE | Brief: "do not build in V1" | — | P3 |
| Data fields for the future memorandum (access, utilities, thesis, potential, risks/verification, developer) | §23 | — | — | — | — | PARTIAL | COMPLETE | — | Columns + editor fields | P1 |
| Deal room `/private/GH-003` | §24 | — | — | — | — | NOT APPLICABLE | NOT APPLICABLE | Brief Phase 2; teaser route reserves `/private/:ref` | — | P3 |

## I. SEO, analytics, production (§10, §27)

| Requirement | Brief | Public UI | Admin UI | Database | Workflow | Audit | Final | Evidence | Gap | P |
|---|---|---|---|---|---|---|---|---|---|---|
| Core SEO: titles, descriptions, canonical | §27 | Per page | — | — | — | COMPLETE | COMPLETE | Phase 6 | — | — |
| Sitemap | §27 | — | — | — | — | MISSING | COMPLETE (when `VITE_SITE_URL` is set) | `robots.txt` had no sitemap | Build-time sitemap | P1 |
| Site-wide social image | §27 | — | — | — | — | MISSING | COMPLETE | `index.html` had no `og:image` | Default image | P1 |
| Language alternates (hreflang) | — | — | — | — | — | MISSING | P2 | — | Not required by the brief | P2 |
| Structured data | — | — | — | — | — | MISSING | P2 | — | Not required by the brief | P2 |
| Production Supabase, auth, storage | §10 | — | — | — | — | BLOCKED BY SUPABASE | NEEDS PRODUCTION SETUP | `supabase/PRODUCTION_CHECKLIST.md` | — | — |
| Domain, hosting, ownership | §10 | — | — | — | — | NEEDS PRODUCTION SETUP | NEEDS PRODUCTION SETUP | Handover doc | — | — |

## J. Out of scope by the brief

- Richer CRM, deal room, automated memorandum, deeper analytics — brief
  Phase 2 (§27): **P3**.
- Instagram integration for Notes — "can integrate" (§8): **P3**.
