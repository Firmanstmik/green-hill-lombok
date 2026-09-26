-- Green Hill Phase 7B: three more structured content pages.
-- The Opportunities page, the Notes page and the Enquiry page join the
-- existing content model. No new table, function or permission: only the list
-- of allowed page keys grows. RLS, drafts and publishing are unchanged.

ALTER TABLE public.site_content DROP CONSTRAINT IF EXISTS site_content_page_key_check;
ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_page_key_check CHECK (
    page_key IN ('home', 'about', 'whyLombok', 'buying', 'private', 'opportunities', 'notes', 'enquire', 'site', 'seo')
  );
