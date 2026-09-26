-- Green Hill: the same rule for published content and notes.
-- Visitors read published rows (RLS), but never the internal `updated_by`
-- account id. The website selects exactly these columns
-- (src/content/ContentContext.tsx, src/lib/socialPreview.ts).

REVOKE SELECT ON public.site_content FROM anon;
GRANT SELECT (page_key, locale, status, fields, media, updated_at, published_at) ON public.site_content TO anon;

REVOKE SELECT ON public.notes FROM anon;
GRANT SELECT (
  id, slug, status, topic, published_on, author, featured, cover_image, cover_alt, og_image,
  translations, created_at, updated_at
) ON public.notes TO anon;
