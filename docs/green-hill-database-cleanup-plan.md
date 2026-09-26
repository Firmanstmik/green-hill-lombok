# Green Hill — database cleanup plan

Status: **plan only.** No legacy table, column or function is dropped in the
code cleanup (Phase 6J). Run this as one dedicated migration **after** the
real Supabase project passes `supabase/PRODUCTION_CHECKLIST.md` §9.

Why wait: the migrations in `supabase/migrations/` were written on top of the
inherited Ukon schema, and several Green Hill migrations `ALTER` inherited
objects (`ALTER FUNCTION public.increment_property_views …`,
`REVOKE … send_first_message`, `DROP POLICY … seller profile images`). Dropping
the legacy objects first would make those statements fail on a fresh project.
The cleanup therefore goes in a **new, final** migration that runs after all
of them, and every statement is `IF EXISTS`.

Already done (no data risk): every legacy `SECURITY DEFINER` function has
`EXECUTE` revoked from `anon`/`authenticated`; seller upload policies are
dropped; `listing_analytics` is admin-read-only. Proven by
`src/test/security/database-security.test.ts`.

---

## 1. Legacy tables

| Legacy table | Why it is legacy | Current references (code) | Dependencies | Migration required | Order |
|---|---|---|---|---|---|
| `messages` | Buyer↔agent marketplace messaging | None (hook and components deleted in 6J) | FK → `conversations`; trigger `trg_update_last_message_at`; realtime publication; edge function (deleted) | `ALTER PUBLICATION supabase_realtime DROP TABLE` (if added), `DROP TABLE` | 1 |
| `conversations` | Messaging threads per listing | None | FK → `properties`, `auth.users`; referenced by `messages` | `DROP TABLE` after `messages` | 2 |
| `partnership_applications` | Agent "verified partner" applications | None | FK → `auth.users` | `DROP TABLE` | 3 |
| `seller_lead_settings`, `seller_settings`, `seller_profiles` | Seller/agent accounts and agency profiles | None | FK → `auth.users`; `is_ukon_partner` column; bucket `seller-profile-images` | `DROP TABLE` each | 4 |
| `buyer_settings`, `buyer_profiles` | Buyer accounts | None | FK → `auth.users` | `DROP TABLE` each | 5 |
| `user_notification_preferences` | Marketplace notification settings | None | FK → `auth.users` | `DROP TABLE` | 6 |
| `listing_analytics` | Per-listing views/inquiries ("performance") | None | FK → `properties` | `DROP TABLE` | 7 |
| `saved_listings`, `search_alerts` | Buyer favourites and alerts | None | Only on inherited databases (not in any migration) | `DROP TABLE IF EXISTS` | 8 |

Not legacy: `properties`, `user_profiles`, `enquiries`, `enquiry_activity`,
`poi_cache` (used by the CMS "nearby places" in `src/lib/poi-cache.ts`).

## 2. Legacy functions and triggers

Drop after the tables they read (step 9), with `DROP FUNCTION IF EXISTS`:

- `send_first_message(uuid, text)`, `get_conversations_for_user()`,
  `get_messages_for_conversation(uuid)`, `mark_conversation_as_read(uuid)`,
  `update_last_message_timestamp()` (+ trigger `trg_update_last_message_at`,
  dropped with `messages`)
- `increment_property_views(uuid)`, `increment_property_inquiries(uuid)`
- `get_seller_profile_for_property(uuid)`, `get_seller_profiles_admin()`
- `review_partnership_application(uuid, text)`,
  `get_partnership_applications_admin()`

**Keep:** `is_admin()`, `protect_role_column()` + trigger `protect_user_role`
(guards `user_profiles.role`), `protect_role_on_insert()`, `touch_updated_at()`,
`log_enquiry_activity()`, `submit_enquiry(...)`, `private_opportunity_count()`.

Also remove the Section 6/7 statements in `20260925_green_hill_cms.sql` that
reference these functions **only if** the cleanup migration is squashed into
a fresh baseline; otherwise leave them (they are `IF EXISTS`-guarded where
needed and harmless).

## 3. Legacy columns

| Column | Why legacy | Current references | Migration | Order |
|---|---|---|---|---|
| `properties.price_type` | Sale/rent marketplace | CMS writes `'sale'`; public memo reads it for compatibility | Stop writing/reading in code first, then `DROP COLUMN` | 10 (after a code release) |
| `properties.bedrooms/bathrooms` defaults `0` | Residential listing model | CMS writes them for villas | Keep (valid for villas) | — |
| `properties.user_id` | Listing owner (seller) | CMS writes the admin's id | Keep (audit trail) or rename later | — |
| `user_profiles.role` check allows `buyer`, `agent` | Marketplace roles | Green Hill only writes `admin` | `ALTER TABLE … DROP CONSTRAINT`, re-add `CHECK (role IS NULL OR role = 'admin')` after confirming no rows use them | 11 |
| `user_profiles.full_name` and other profile fields | Marketplace profile | None | Keep (harmless) | — |

## 4. Storage

| Item | Why legacy | Migration | Order |
|---|---|---|---|
| Bucket `seller-profile-images` + policy "Public read seller profile images" | Seller avatars | Empty the bucket (dashboard or API), `DROP POLICY`, `DELETE FROM storage.buckets WHERE id = 'seller-profile-images'` | 12 |
| Bucket `opportunity-documents` (only if an earlier draft created it; set private in 6I) | Replaced by `opportunity-media` | Empty, then delete | 13 |

Keep: `opportunity-media` (private), `property-images` (public copies of
public, live opportunities) and their admin-only policies.

## 5. Safe deletion sequence

1. Confirm production is verified (checklist §9) and take a database backup
   (Supabase → Database → Backups, or `pg_dump`).
2. On a **staging copy**, run the new migration `YYYYMMDD_remove_ukon_legacy.sql`
   containing steps 1–13 above, all `IF EXISTS`.
3. Run `npm test` against the migrations (the PGlite suite applies every
   migration, so the new file is exercised automatically) and add assertions
   that the legacy tables/functions no longer exist.
4. Run the checklist §9 again on staging.
5. Apply to production. Keep the backup for at least 30 days.
6. Only then remove `price_type` reads/writes from the code and drop the
   column in a follow-up migration (step 10).
