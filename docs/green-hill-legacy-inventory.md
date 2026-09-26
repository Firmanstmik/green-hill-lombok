# Green Hill — legacy inventory (Phase 6J)

Audit date: 26 September 2026. Baseline before cleanup: TypeScript 0 errors,
80/80 tests, build green (68 MB).

## Outcome (after the seven cleanup batches)

Every item below marked SAFE TO DELETE, ASSET LEGACY, CONTENT LEGACY or
REPLACE was carried out; each batch was followed by typecheck, tests and a
production build, all green. Build output 68 MB → 36 MB.

Decided differently from the table during cleanup:

- **Fonts (Manrope, Cormorant Garamond)**: measured in the browser. Visible
  text still renders in them on the 404 page, the password-reset page and one
  homepage label ("Explore Green Hill Private"). Removing them would change
  typography, so they stay until the owner chooses Jost/Prata for those spots.
- **Ukon navy `#0e2e50`** was also hard-coded in the CMS editors, the address
  field and the map marker; replaced with Green Hill forest `#17382e`.
- **`isValidUKCoordinates`** (`src/lib/mapbox.ts`) only ever checked world
  bounds; renamed `isValidCoordinates`. `PropertyMap` called hooks after early
  returns (rules-of-hooks); fixed.
- **Packages removed** (35): `@dnd-kit/modifiers`, `@fontsource/{dm-sans,
  fraunces,outfit,playfair-display}`, `@hookform/resolvers`,
  `@mapbox/mapbox-gl-geocoder`, 17 unused `@radix-ui/*`, `cmdk`, `date-fns`,
  `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-hook-form`,
  `react-resizable-panels`, `recharts`, `vaul`, `zod`. `vite.config.ts`
  `manualChunks` updated to match. `@tiptap/pm` kept (peer dependency).
- **Translations**: 512 unused keys removed; 519 keys remain in each of
  en/id/nl/es with identical key sets.
- **Filters**: `transactionType` (sale/rent) and the invisible "lifestyle" tag
  filter removed; `propertyType` limited to Villa/Land; old `?tt=` / `?tags=`
  links are ignored and still show the collection.

## How this was produced

- **Dependency graph** from `src/main.tsx` (static imports, `import()`, CSS
  `@import`/`url()`, `new URL(…, import.meta.url)`), plus every test file and
  every script in `scripts/`. No `import.meta.glob` is used anywhere.
- **Build scripts** read some assets with `fs`/`sharp` paths rather than
  imports; those were traced by hand (`scripts/*.mjs`).
- **Translation keys**: a key is "used" when a reachable file contains it as a
  string literal, a dotted parent of it, or a dotted template/concatenation
  prefix of it (e.g. `` `notes.page.themes.${key}` ``).
- **CSS classes**: every class selector in `src/index.css` checked against the
  reachable code (including dynamic prefixes like `` `gh-x--${v}` ``).
- **Database**: every `CREATE TABLE/FUNCTION/TRIGGER/POLICY` in
  `supabase/migrations`, and every `.from()/.rpc()/storage.from()` in `src`.

Every file marked SAFE TO DELETE is tracked in git (recoverable from HEAD).

Actions: **SAFE TO DELETE** · **KEEP — USED BY GREEN HILL** · **REPLACE THEN
DELETE** · **DATABASE LEGACY** · **ASSET LEGACY** · **CONTENT LEGACY** ·
**UNKNOWN — INVESTIGATE**

---

## A–C. Pages, routes and files

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| Account (buyer account, saved listings, search alerts, messages) | `src/pages/Account.tsx` | Ukon buyer | Not routed (`/:lang/account/*` → home) | None | SAFE TO DELETE |
| BuyerSettings | `src/pages/BuyerSettings.tsx` | Ukon buyer | Not routed | None | SAFE TO DELETE |
| Dashboard (agent/seller dashboard) | `src/pages/Dashboard.tsx` | Ukon seller | Not routed (`/:lang/dashboard` → admin) | None | SAFE TO DELETE |
| AdminDashboard (partner/seller admin) | `src/pages/AdminDashboard.tsx` | Ukon admin | Not routed (`/:lang/dashboard/admin` → admin) | None | SAFE TO DELETE |
| Agents (agent directory, mock agents, Ukon video) | `src/pages/Agents.tsx` | Ukon network | Not routed (`/:lang/network` → home) | None | SAFE TO DELETE |
| Partners (agent partner sign-up) | `src/pages/Partners.tsx` | Ukon partner | Not routed (`/:lang/partners` → home) | None | SAFE TO DELETE |
| Login (redirects home; sign-in was the old modal) | `src/pages/Login.tsx` | Ukon auth | Routed at `/:lang/login` | None (admin login is `/:lang/admin/login`) | REPLACE THEN DELETE (route → home redirect) |
| UpdatePassword | `src/pages/UpdatePassword.tsx` | Ukon auth, re-used | Routed; admin password-reset target | Yes | KEEP (rename `ukon-navy` classes) |
| AuthCallback | `src/pages/AuthCallback.tsx` | Ukon auth, re-written | Routed | Yes | KEEP (rename `ukon-navy` class) |
| Invoice (developer's invoice) | `src/pages/Invoice.tsx`, `src/invoice/*` | Green Hill build | DEV-only route + `npm run invoice:pdf` | Developer tool | KEEP (not Ukon; DEV only) |
| Vite template stylesheet | `src/App.css` | Lovable/Vite template | Unreferenced | None | SAFE TO DELETE |
| `vite-env.d.ts` | `src/vite-env.d.ts` | Vite | Ambient types (not imported, used by `tsc`) | Yes | KEEP |
| Redirects `/network`, `/partners`, `/account/*`, `/dashboard*`, `/admin/*` | `src/App.tsx` | Green Hill | Protect old URLs | Yes | KEEP (intentional redirects) |

## B. Components

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| Old property card (save/favourite, agent badge) | `src/components/PropertyCard.tsx` | Ukon | Unreachable | None | SAFE TO DELETE |
| NavLink | `src/components/NavLink.tsx` | Lovable template | Unreachable | None | SAFE TO DELETE |
| Old home sections: AboutSection (+ .css), AgentsCarousel, FeaturedProperties, ServicesSection, TestimonialsSection | `src/components/home/` | Ukon | Unreachable | None (Green Hill uses SelectedOpportunities, FounderSection, …) | SAFE TO DELETE |
| Agent directory: AgentCard, GlobalMap, NetworkModelSection, RegionSection | `src/components/agents/` | Ukon | Unreachable | None | SAFE TO DELETE |
| Old filter bar: FilterBar, MobileFilterDrawer, PriceRangeInput, RefinePanel (sale/rent tabs) | `src/components/properties/` | Ukon | Unreachable | None (Green Hill uses OpportunityFilters) | SAFE TO DELETE |
| NearbyAmenities (old memo block) | `src/components/property/NearbyAmenities.tsx` | Ukon | Unreachable | None | SAFE TO DELETE |
| UserDropdown (account menu) | `src/components/layout/UserDropdown.tsx` | Ukon | Unreachable | None | SAFE TO DELETE |
| DashboardTransition | `src/components/layout/DashboardTransition.tsx` | Ukon | Unreachable | None | SAFE TO DELETE |
| Buyer/seller auth: AuthPanel, AuthModal, SegmentedSwitch, steps/* | `src/components/auth/` | Ukon | Unreachable (unmounted Phase 6I) | None | SAFE TO DELETE |
| Messaging: BuyerMessages, ConversationList, DashboardMessages, ListingContactForm, MessageTimestamp, ThreadView | `src/components/messaging/` | Ukon | Unreachable | None | SAFE TO DELETE |
| Charts (market intelligence) | `src/components/charts/` | Ukon | Unreachable | None | SAFE TO DELETE |
| AdminGuard (user_metadata role guard) | `src/components/guards/AdminGuard.tsx` | Ukon | Unreachable | None (admin uses `is_admin()`) | SAFE TO DELETE |
| SellerSettings | `src/components/settings/SellerSettings.tsx` | Ukon | Unreachable | None | SAFE TO DELETE |
| Legacy admin: AddPropertyForm, ApplicationManagement, DatePickerField, ListingControlHeader, ListingPreview, LuxuryTabNavigation, MarketIntelligence, NumericStepper, OptimizationSuggestions, PartnerManagement, PerformanceSnapshot, PhaseIndicator, PropertyListingMenu, SortableImage, SpecificationsStep | `src/components/admin/` | Ukon | Unreachable | None | SAFE TO DELETE |
| DescriptionEditor, POIEditor | `src/components/admin/` | Ukon, re-used | Imported by the CMS editor (Story, Location steps) | Yes | KEEP (rename `ukon-*` classes) |
| AddressAutocomplete | `src/components/map/` | Ukon, re-used | CMS Location step | Yes | KEEP (rename `ukon-red` class) |
| Unused shadcn/ui primitives (41): accordion, alert, aspect-ratio, avatar, badge, breadcrumb, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, separator, sheet, sidebar, skeleton, slider, switch, table, tabs, textarea, toggle-group, toggle, use-toast, Lightbox | `src/components/ui/` | Lovable scaffolding / Ukon | Unreachable | None | SAFE TO DELETE (regenerable with the shadcn CLI) |
| Rental option in the archive filters ("All / For sale / Rent") | `src/components/properties/OpportunityFilters.tsx`, `src/hooks/useFilters.ts`, `src/types/filters.ts` | Ukon | **Reachable, visible in "More filters" on /properties** | None | REPLACE THEN DELETE (remove the sale/rent group and `transactionType`) |

## D. Hooks

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| useListingDraft (global `listing_draft` key) | `src/hooks/` | Ukon | Unreachable | None (CMS uses per-record `gh-admin-draft:<id>`) | SAFE TO DELETE |
| useMessaging | `src/hooks/` | Ukon | Unreachable | None | SAFE TO DELETE |
| useSavedListings | `src/hooks/` | Ukon | Unreachable | None | SAFE TO DELETE |
| useCompletionScore (listing "score") | `src/hooks/` | Ukon | Unreachable | None | SAFE TO DELETE |
| useCountUp, useAnimatedValue (fake stat counters) | `src/hooks/` | Ukon | Unreachable | None | SAFE TO DELETE |
| use-mobile, useScrollLock | `src/hooks/` | Scaffolding | Unreachable | None | SAFE TO DELETE |
| useFilters | `src/hooks/` | Ukon, re-used | /properties | Yes | KEEP (remove rent/transaction logic) |

## E. Services, contexts, lib

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| AI listing generation | `src/services/ai/` | Ukon | Unreachable | None | SAFE TO DELETE |
| AuthContext (buyer/agent roles from user_metadata) | `src/contexts/AuthContext.tsx` | Ukon | Unreachable (unmounted Phase 6I) | None (admin: `src/admin/AdminSession.tsx`) | SAFE TO DELETE |
| AuthPanelContext | `src/contexts/AuthPanelContext.tsx` | Ukon | Unreachable | None | SAFE TO DELETE |
| listingCodeGenerator | `src/lib/` | Ukon | Unreachable | None (CMS: `nextReference`) | SAFE TO DELETE |
| uploadProfileImage (seller-profile-images bucket) | `src/lib/` | Ukon | Unreachable | None | SAFE TO DELETE |
| country-flags | `src/lib/` | Ukon | Unreachable | None | SAFE TO DELETE |
| LanguageRouter | `src/lib/routing/` | Ukon | Unreachable | None | SAFE TO DELETE |
| POI validation schema | `src/lib/validations/poi.ts` | Ukon | Unreachable | None | SAFE TO DELETE |
| CurrencyContext storage keys `ukon_currency_preference`, `ukon_exchange_rates*` | `src/contexts/CurrencyContext.tsx` | Ukon | Reachable | Yes (the context) | REPLACE (rename keys to `greenhill_*`) |
| LanguageContext legacy key `ukon_language_preference` | `src/contexts/LanguageContext.tsx` | Ukon | Read as a fallback | No | REPLACE THEN DELETE |
| Supabase edge function `new-message-notification` | `supabase/functions/` | Ukon messaging | Not deployed to any Green Hill project | None | SAFE TO DELETE |

## F. Assets

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| Ukon logos: `Ukon Estate-02.png`, `Ukon-Estate.png`, `Ukon-Estate-icon.png` | `src/assets/` | Ukon | Unreferenced | None | ASSET LEGACY — delete |
| Ukon hero: `Ukon_Estate_Hero.avif`, `Ukon_Estate_hero-video-v2.mp4` (676 KB) | `src/assets/` | Ukon | Only the deleted Agents page | None | ASSET LEGACY — delete |
| `world-map.svg` | `src/assets/` | Ukon agent network | Unreferenced | None | ASSET LEGACY — delete |
| Agent photos (9): Afifah_Ukon, Gino_Beelt, Hendrik_Ukon, Jeroen_Egbers, Marco_Loureiro, Pak_Kumis, Paul_Wennink, Raffy_Ukon, Roselynn_Chai | `src/assets/members/` | Ukon agents | Unreferenced | None | ASSET LEGACY — delete |
| `placeholder.svg` | `public/` | Lovable template | Unreferenced | None | SAFE TO DELETE |
| Early Green Hill prototypes (12 files, **32 MB**, shipped in every build): hero-coast/hills/interior/villa.jpg, hero-living.mp4, ig-coast/hills/villa.jpg, logo-premium.png, ref-1..3.jpg | `public/greenhill/` | Green Hill (prototype) | Unreferenced | None | SAFE TO DELETE (dead weight in production) |
| Favicons (`favicon.ico`, `favicon-16…512.png`, `apple-touch-icon.png`) | `public/` | Green Hill | `index.html` | Yes | KEEP |
| `favicon.png` | `public/` | Green Hill (`scripts/build-favicons.mjs` output) | Not referenced by `index.html` | Script output | KEEP (regenerated by the script) |
| `robots.txt` | `public/` | — | Served by host | Yes | KEEP |
| Green Hill masters and unused variants: `src/assets/greenhill/source/*`, `founder/*`, `brand/*`, `hero/*` size variants, `Logo Green Hill Lombok.svg`, `logo-green-hill-mobile.png`, `logo-green-hill-desktop.webp`, `galery green hill/*`, `hero section image bg/*` | `src/assets/greenhill/` | Green Hill | Not imported by the app; several are inputs of `scripts/build-*.mjs` | Build sources | KEEP (not bundled; not Ukon). Review separately. |
| `logo-green-hill-lombok.svg` search hit for "ukon" | `src/assets/greenhill/` | Green Hill | — | — | KEEP — false positive: "UkoN" inside base64 image data |
| Invoice PDFs | `src/invoice/*.pdf` | Green Hill build | Output of `npm run invoice:pdf` | Developer tool | KEEP (not Ukon) |

## G. Translation keys

1,031 keys per language (en/id/nl/es, identical key sets). 508 are not used by
any reachable file. Fully unused namespaces: `agents` (31), `partners` (48),
`account` (28), `dashboard` (22), `messaging` (10), `admin` (19, the old
partner admin), `propertyDetail` (43, the old Ukon memo), `services` (14),
`testimonials` (3), `blog` (18), `filters` (35, the old filter bar). Mostly
unused: `auth` (67/69), `hero` (43/54), `common` (25/30), `about` (37/142),
`footer` (25/61 — Ukon services such as "Rental & Asset Management",
"Strategic Partnerships", "Our Global Network").

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| 508 unused keys | `src/lib/i18n/translations/*.json` | Mostly Ukon | None | None | SAFE TO DELETE (all four languages) |
| `properties.archive.statusRent` | same | Ukon | The rent filter above | None | REPLACE THEN DELETE |
| Used keys containing "partner"/"buyers"/"message" (Reece's story, Private form "Message", "questions buyers face") | same | Green Hill | Reachable | Yes | KEEP — legitimate Green Hill copy |

## H. CSS / styles

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| Ukon utilities: `.blink-dot`, `@keyframes blink`, `.glow-effect`, `.card-hover`, `.image-zoom`, `.nav-link`, `.gradient-text`, `.counter-animate`, `.parallax-bg`, `.stagger-1…6`, `.no-scrollbar` | `src/index.css` (`@layer components/utilities` block) | Ukon | Unreferenced | None | SAFE TO DELETE |
| `--ukon-red/-navy/-green` tokens + Tailwind `ukon` colour group | `src/index.css`, `tailwind.config.ts` | Ukon (values already re-tuned to Green Hill) | CMS editors, AddressAutocomplete, UpdatePassword, AuthCallback | Yes | REPLACE (rename to Green Hill semantic tokens, same values) |
| Unused Tailwind animations (`fade-in-up/left/right`, `scale-in`, `slide-up`, `float`, `pulse-glow` (reads `--ukon-red`), `count-up`, `shimmer`) | `tailwind.config.ts` | Ukon | Unused | None | SAFE TO DELETE |
| Manrope + Cormorant Garamond (`@fontsource` imports, base-layer `font-family`) | `src/index.css`, `tailwind.config.ts` | Ukon typography | Loaded on every page; Green Hill sections override with Jost/Prata | To be measured | UNKNOWN — INVESTIGATE (measure rendered fonts first) |
| `ProseMirror`, `is-editor-empty` | `src/index.css` | Tiptap | Added at runtime by the CMS editor | Yes | KEEP (look unused to static search) |
| ~70 unused `gh-*` selectors (earlier Green Hill iterations: `gh-search-*`, `gh-priv-list*`, `gh-about-hero*`, …) | `src/index.css` | Green Hill | Unreferenced | None | KEEP for now — Green Hill CSS, not Ukon; separate tidy-up |

## I–K. Database and storage

See `docs/green-hill-database-cleanup-plan.md` for the full plan.

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| `properties`, `user_profiles` (role), `enquiries`, `enquiry_activity` | migrations | Green Hill (+ inherited base) | CMS + public | Yes | KEEP |
| `poi_cache` | `20260211_add_nearby_amenities.sql` | Ukon, re-used | `src/lib/poi-cache.ts` (CMS nearby places) | Yes | KEEP |
| `listing_analytics`, `conversations`, `messages`, `seller_profiles`, `buyer_profiles`, `seller_settings`, `buyer_settings`, `seller_lead_settings`, `user_notification_preferences`, `partnership_applications` | migrations | Ukon | Only deleted files | None | DATABASE LEGACY (drop later, see plan) |
| `saved_listings`, `search_alerts` | not in any migration (inherited DB only) | Ukon | Only deleted files | None | DATABASE LEGACY (not created on a fresh project) |
| Functions `send_first_message`, `get_conversations_for_user`, `get_messages_for_conversation`, `mark_conversation_as_read`, `update_last_message_timestamp`, `increment_property_views/inquiries`, `get_seller_profile_for_property`, `get_seller_profiles_admin`, `review_partnership_application`, `get_partnership_applications_admin`, `protect_role_column` | migrations | Ukon | Execute revoked (Phase 6H/6I) except triggers | None (`protect_role_column` still protects `user_profiles.role`) | DATABASE LEGACY (keep `protect_role_column`) |
| Bucket `seller-profile-images` + "Public read seller profile images" policy | `20260225_settings_tables.sql` | Ukon | Upload policies already dropped | None | DATABASE LEGACY |
| Buckets `opportunity-media` (private), `property-images` (public) + admin policies | `20260925_green_hill_cms.sql` | Green Hill | CMS | Yes | KEEP |
| `user_profiles.role` values `buyer`/`agent` allowed by a check constraint | `20260227_role_and_partner.sql` | Ukon | Not written by Green Hill | None | DATABASE LEGACY (tighten to `admin` later) |
| `properties` columns `price_type`, `bedrooms`/`bathrooms` defaults, `is_ukon_agent` (if present on inherited DBs) | migrations / inherited | Ukon | `price_type` written as `'sale'` for compatibility | Compatibility only | DATABASE LEGACY (document; keep until memo stops reading it) |

## L. Mock / demo data

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| Demo opportunities `properties` | `src/data/mockData.ts` | Green Hill (curated demo) | Public fallback without a database; local-preview seed | Yes | KEEP |
| `Agent`, `agents`, `Testimonial`, `testimonials`, `Service`, `services`, `BlogPost`, `blogPosts`, `stats`, `contactInfo` | `src/data/mockData.ts` | Ukon | Only deleted files | None | SAFE TO DELETE |
| `Property.isUkonAgent` + mappings in Properties, PropertyDetail, SelectedOpportunities | same + pages | Ukon | Mapped, never displayed | None | SAFE TO DELETE |
| `Property.priceType`/`status` value `'rent'` | same | Ukon | Rent filter + status label | None | REPLACE THEN DELETE |
| `blogData.ts` (alias of notes data), `chartData.ts`, `worldMapPaths.ts` | `src/data/` | Ukon | Unreachable | None | SAFE TO DELETE |

## M. Environment / config

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| `.env`, `.env.example` | root | Green Hill | Placeholders; comment warns not to reuse Ukon credentials | Yes | KEEP (warning is intentional) |
| `index.html` title / OG / Twitter meta | root | Green Hill | Green Hill copy | Yes | KEEP |
| `vite.config.ts` (`lovable-tagger` dev plugin) | root | Lovable tooling | Dev only | Tooling | KEEP |
| `bun.lockb` | root | Lovable tooling | npm is the package manager | None | KEEP for now (not Ukon); note it is stale |
| `components.json` | root | shadcn | shadcn CLI config | Tooling | KEEP |
| Supabase isolation comment naming the former project | `src/lib/supabase.ts` | Green Hill | Comment | — | REPLACE (reword) |

## N. Documentation

| Item | Location | Origin | Current usage | Green Hill dependency | Action |
|---|---|---|---|---|---|
| `FEATURED_LISTINGS_IMPLEMENTATION.md` (paid featured for sellers) | root | Ukon | — | None | CONTENT LEGACY — delete |
| `FEATURED_PROPERTIES_SETUP.md` (paid featured) | root | Ukon | — | None | CONTENT LEGACY — delete |
| `LUXURY_CONSOLE_IMPLEMENTATION.md` (seller edit-listing console) | root | Ukon | — | None | CONTENT LEGACY — delete |
| `MAPBOX_INTEGRATION_COMPLETE.md` (Ukon-era implementation note) | root | Ukon | — | None | CONTENT LEGACY — delete |
| `supabase_migration_add_location.sql` (stray; columns already in `supabase/migrations`, `geocoding_provider` unused) | root | Ukon | — | None | SAFE TO DELETE |
| `save_logo.py` (placeholder script) | root | Lovable/Ukon | — | None | SAFE TO DELETE |
| `.lovable/plan.md` ("UKON Estate Website Clone") | `.lovable/` | Ukon | — | None | CONTENT LEGACY — delete |
| `docs/ukon_estate_platform_philosophy.md`, `docs/editorial/Ukon_Estate_Blog_Strategy_…md` | `docs/` | Ukon | — | None | CONTENT LEGACY — delete |
| `README.md` | root | Green Hill | — | Yes | KEEP |
| `supabase/PRODUCTION_CHECKLIST.md` | `supabase/` | Green Hill | Warns not to reuse the Ukon project | Yes | KEEP (warning is intentional) |
| `_recovery/` (CSS recovery working files, untracked) | root | Green Hill recovery work | — | None | KEEP (untracked, not Ukon; owner's call) |
