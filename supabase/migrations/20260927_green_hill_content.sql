-- Green Hill — structured content management (Phase 7A)
--
-- Not a page builder. Each Green Hill page has a fixed content model defined
-- in code (src/content/schema.ts); this table only stores the values Reece
-- edits. Anything he has not edited falls back to the approved copy that
-- ships with the site.
--
--   site_content  one row per (page, language, draft|published).
--                 locale '*' holds values shared by every language (images,
--                 contact details). Publishing copies the drafts over the
--                 published rows, so drafts are never visible to visitors.
--   notes         Notes from Lombok articles (brief §8).
--   site-media    public bucket for images of published content. Uploads go
--                 to the private bucket first and are copied here on publish.

-- ============================================================
-- 1. SITE CONTENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.site_content (
  page_key TEXT NOT NULL CHECK (page_key IN ('home', 'about', 'whyLombok', 'buying', 'private', 'site', 'seo')),
  locale TEXT NOT NULL CHECK (locale IN ('*', 'en', 'id', 'nl', 'es')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  fields JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(fields) = 'object'),
  media JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(media) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  PRIMARY KEY (page_key, locale, status),
  -- Published content never points at the private bucket.
  CONSTRAINT site_content_published_media_public
    CHECK (status = 'draft' OR (media::text NOT LIKE '%private-media:%' AND fields::text NOT LIKE '%private-media:%')),
  CONSTRAINT site_content_size CHECK (pg_column_size(fields) + pg_column_size(media) < 200000)
);

DROP TRIGGER IF EXISTS trg_site_content_touch ON public.site_content;
CREATE TRIGGER trg_site_content_touch
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads published site content" ON public.site_content;
CREATE POLICY "Public reads published site content"
  ON public.site_content FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Admin manages site content" ON public.site_content;
CREATE POLICY "Admin manages site content"
  ON public.site_content FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Save a page's drafts in one transaction. p_rows: [{ locale, fields, media }].
-- p_expected: the draft version (updated_at of the '*' row) the editor started
-- from; null when there was no draft. A newer draft saved elsewhere wins.
CREATE OR REPLACE FUNCTION public.save_content_draft(p_page TEXT, p_rows JSONB, p_expected TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_current TIMESTAMPTZ;
  v_row JSONB;
  v_version TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the Green Hill admin can edit content' USING ERRCODE = '42501';
  END IF;
  SELECT updated_at INTO v_current FROM public.site_content
    WHERE page_key = p_page AND locale = '*' AND status = 'draft' FOR UPDATE;
  IF v_current IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'This page was changed somewhere else since you opened it' USING ERRCODE = '40001';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    INSERT INTO public.site_content (page_key, locale, status, fields, media, updated_by)
    VALUES (
      p_page, v_row->>'locale', 'draft',
      COALESCE(v_row->'fields', '{}'::jsonb),
      CASE WHEN v_row->>'locale' = '*' THEN COALESCE(v_row->'media', '{}'::jsonb) ELSE '{}'::jsonb END,
      auth.uid()
    )
    ON CONFLICT (page_key, locale, status) DO UPDATE
      SET fields = EXCLUDED.fields, media = EXCLUDED.media, updated_by = EXCLUDED.updated_by;
  END LOOP;

  -- The '*' row carries the page version; always touch it.
  INSERT INTO public.site_content (page_key, locale, status, updated_by)
  VALUES (p_page, '*', 'draft', auth.uid())
  ON CONFLICT (page_key, locale, status) DO UPDATE SET updated_by = EXCLUDED.updated_by
  RETURNING updated_at INTO v_version;
  RETURN v_version;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- Publish a page: drafts replace the published rows (images already copied to
-- the public bucket by the admin app and passed in p_media), then the drafts
-- are removed so "no draft" always means "what visitors see".
CREATE OR REPLACE FUNCTION public.publish_content(p_page TEXT, p_media JSONB)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the Green Hill admin can publish content' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.site_content WHERE page_key = p_page AND status = 'draft') THEN
    RETURN;
  END IF;
  DELETE FROM public.site_content WHERE page_key = p_page AND status = 'published';
  INSERT INTO public.site_content (page_key, locale, status, fields, media, updated_by, published_at)
  SELECT page_key, locale, 'published', fields,
         CASE WHEN locale = '*' THEN COALESCE(p_media, '{}'::jsonb) ELSE '{}'::jsonb END,
         auth.uid(), now()
  FROM public.site_content WHERE page_key = p_page AND status = 'draft';
  DELETE FROM public.site_content WHERE page_key = p_page AND status = 'draft';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

REVOKE ALL ON FUNCTION public.save_content_draft(TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_content(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_content_draft(TEXT, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_content(TEXT, JSONB) TO authenticated;

-- ============================================================
-- 2. NOTES FROM LOMBOK (brief §8)
-- translations: { en: { title, excerpt, dek, seoTitle, seoDescription,
--                       sections: [{ heading, content, image, imageAlt, caption, pullQuote }] }, id: …, … }
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 120),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  topic TEXT NOT NULL DEFAULT 'perspective'
    CHECK (topic IN ('lombok', 'land', 'buying', 'development', 'hospitality', 'perspective')),
  published_on DATE,
  author TEXT NOT NULL DEFAULT 'Reece Green' CHECK (char_length(author) BETWEEN 1 AND 120),
  featured BOOLEAN NOT NULL DEFAULT false,
  cover_image TEXT,
  cover_alt TEXT CHECK (cover_alt IS NULL OR char_length(cover_alt) <= 200),
  og_image TEXT,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(translations) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- A published note needs an English title and a date, and only public images.
  CONSTRAINT notes_publishable CHECK (
    status <> 'published' OR (
      NULLIF(btrim(translations->'en'->>'title'), '') IS NOT NULL
      AND published_on IS NOT NULL
      AND COALESCE(cover_image, '') NOT LIKE 'private-media:%'
      AND COALESCE(og_image, '') NOT LIKE 'private-media:%'
      AND translations::text NOT LIKE '%private-media:%'
    )
  ),
  CONSTRAINT notes_size CHECK (pg_column_size(translations) < 400000)
);

CREATE INDEX IF NOT EXISTS idx_notes_status_date ON public.notes (status, published_on DESC);

DROP TRIGGER IF EXISTS trg_notes_touch ON public.notes;
CREATE TRIGGER trg_notes_touch
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads published notes" ON public.notes;
CREATE POLICY "Public reads published notes"
  ON public.notes FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Admin manages notes" ON public.notes;
CREATE POLICY "Admin manages notes"
  ON public.notes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3. SITE MEDIA BUCKET (images of published content)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-media', 'site-media', true, 26214400, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admin reads opportunity media" ON storage.objects;
CREATE POLICY "Admin reads opportunity media"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('opportunity-media', 'property-images', 'opportunity-files', 'site-media') AND public.is_admin());

DROP POLICY IF EXISTS "Admin uploads opportunity media" ON storage.objects;
CREATE POLICY "Admin uploads opportunity media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('opportunity-media', 'property-images', 'opportunity-files', 'site-media') AND public.is_admin());

DROP POLICY IF EXISTS "Admin updates opportunity media" ON storage.objects;
CREATE POLICY "Admin updates opportunity media"
  ON storage.objects FOR UPDATE
  USING (bucket_id IN ('opportunity-media', 'property-images', 'opportunity-files', 'site-media') AND public.is_admin())
  WITH CHECK (bucket_id IN ('opportunity-media', 'property-images', 'opportunity-files', 'site-media') AND public.is_admin());

DROP POLICY IF EXISTS "Admin deletes opportunity media" ON storage.objects;
CREATE POLICY "Admin deletes opportunity media"
  ON storage.objects FOR DELETE
  USING (bucket_id IN ('opportunity-media', 'property-images', 'opportunity-files', 'site-media') AND public.is_admin());
