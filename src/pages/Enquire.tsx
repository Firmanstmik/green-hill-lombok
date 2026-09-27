import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { InvestorProfileForm, type EnquiryOpportunity } from '@/components/enquiry/InvestorProfileForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildWhatsAppUrl, getPublicWhatsAppUrl } from '@/lib/contact';
import { trackContact } from '@/lib/analytics';
import { demoOpportunities as demoProperties, type Property } from '@/data/mockData';
import { publicOpportunityByKey } from '@/lib/publicOpportunities';
import { fetchPrivateTeaser } from '@/lib/privateTeasers';
import { isSupabaseConfigured } from '@/lib/supabase';
import { applyPageSeo } from '@/lib/seo';
import { useOpportunityPrice } from '@/lib/opportunityPrice';
import {
  isSampleOpportunity,
  landSizeLabel,
  opportunityImage,
  opportunityLensOf,
} from '@/components/properties/opportunityMeta';

/**
 * Investor profile (brief §9): "I've got £150,000 to invest in Lombok. Where
 * would you put it?" — the conversation Green Hill wants to start.
 * `?opportunity=<id|slug>` attaches a public opportunity; `?private=<ref>`
 * a Green Hill Private teaser (which switches to the §21 qualification form).
 */
type BriefRecord = Property & {
  summary?: string;
  area?: string;
  region?: string;
  price_on_request?: boolean;
  price_amount?: number | null;
  price_currency?: string;
  price_display?: string;
  price_amount_max?: number | null;
};

const TYPE_KEY: Record<string, string> = {
  land: 'properties.archive.land',
  villa: 'properties.exampleVilla',
  development: 'properties.archive.development',
  private: 'properties.archive.private',
};

function textOf(value: unknown): string {
  return typeof value === 'string' ? value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function imageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [item.trim()];
    if (item && typeof item === 'object' && typeof (item as { url?: unknown }).url === 'string') {
      const url = (item as { url: string }).url.trim();
      return url ? [url] : [];
    }
    return [];
  });
}

function briefFromRow(row: Record<string, unknown>): BriefRecord {
  const images = imageList(row.images);
  const cover = textOf(row.image_url) || textOf(row.image);
  const area = textOf(row.area);
  const region = textOf(row.region);
  const address = textOf(row.address) || [area, region].filter(Boolean).join(', ');
  const metres = Number(row.land_size ?? row.m2 ?? row.sqft);
  const surface = textOf(row.surface_area) || textOf(row.surfaceArea);
  const features =
    row.features && typeof row.features === 'object' ? (row.features as Record<string, string>) : {};
  return {
    id: String(row.id ?? ''),
    title: textOf(row.title),
    address,
    price: Number(row.price) || 0,
    priceType: 'sale',
    bedrooms: Number(row.bedrooms) || 0,
    bathrooms: Number(row.bathrooms) || 0,
    sqft: Number.isFinite(metres) && metres > 0 ? metres : 0,
    status: 'sale',
    image: images[0] || cover,
    images: images.length > 0 ? images : cover ? [cover] : [],
    featured: false,
    type: textOf(row.type) || textOf(row.property_type),
    listingCode: textOf(row.listing_code) || textOf(row.listingCode) || undefined,
    surfaceArea: surface || undefined,
    description: textOf(row.summary) || textOf(row.description),
    features,
    summary: textOf(row.summary) || textOf(row.description),
    area,
    region,
    price_on_request: row.price_on_request === true || row.priceOnRequest === true,
    price_amount: row.price_amount == null ? null : Number(row.price_amount),
    price_currency: textOf(row.price_currency) || undefined,
    price_display: textOf(row.price_display) || undefined,
    price_amount_max: row.price_amount_max == null ? null : Number(row.price_amount_max),
  };
}

export default function Enquire() {
  const { t, language } = useLanguage();
  const [params] = useSearchParams();
  const opportunityKey = params.get('opportunity');
  const privateKey = params.get('private');
  const [record, setRecord] = useState<BriefRecord | null>(null);
  const whatsappUrl = getPublicWhatsAppUrl();
  const variant = privateKey ? 'private' : 'standard';
  const priced = useOpportunityPrice(record ?? {});
  const price = record ? priced ?? t('selected.priceOnRequest') : '';
  const size = record ? landSizeLabel(record) ?? '' : '';
  const lens = record ? opportunityLensOf(record) : 'other';
  const typeLabel = record && TYPE_KEY[lens] ? t(TYPE_KEY[lens]) : record?.type || '';
  const place = record
    ? [record.area, record.region].filter(Boolean).join(', ') || record.address
    : '';
  const facts = [place, typeLabel, size, price].filter(Boolean).join(' · ');
  const messageDraft = record
    ? t(variant === 'private' ? 'enquiry.form.privateBriefingDraft' : 'enquiry.form.briefingDraft')
        .replace('{title}', record.title)
        .replace('{facts}', facts ? ` (${facts})` : '')
    : '';
  const opportunity: EnquiryOpportunity | null = record
    ? {
        id: record.id || null,
        title: record.title,
        reference: record.listingCode,
        place,
        kind: typeLabel,
        size,
        price,
        image: opportunityImage(record),
        summary: record.summary,
      }
    : null;

  useEffect(() => {
    return applyPageSeo({
      title: t('enquiry.page.seoTitle'),
      description: t('enquiry.page.seoDescription'),
      canonicalPath: `/${language}/enquire`,
      lang: language,
    });
  }, [t, language]);

  useEffect(() => {
    let active = true;
    const resolve = async () => {
      if (privateKey) {
        const teaser = await fetchPrivateTeaser(privateKey);
        if (active) setRecord(teaser ? briefFromRow(teaser) : null);
        return;
      }
      if (!opportunityKey) {
        if (active) setRecord(null);
        return;
      }
      if (!isSupabaseConfigured) {
        const demo = demoProperties.find((item) => item.id === opportunityKey);
        if (active) setRecord(demo ? briefFromRow(demo as unknown as Record<string, unknown>) : null);
        return;
      }
      const { data } = await publicOpportunityByKey(opportunityKey).maybeSingle();
      if (active) setRecord(data ? briefFromRow(data as Record<string, unknown>) : null);
    };
    void resolve();
    return () => {
      active = false;
    };
  }, [opportunityKey, privateKey]);

  return (
    <div className="gh-priv gh-enquire min-h-screen">
      <Navbar />
      <main>
        <section className="gh-priv-section gh-priv-section--ivory gh-priv-section--enquiry gh-enquire__section" aria-labelledby="gh-enquire-title">
          <div className="gh-priv-enquiry">
            <div className="gh-priv-enquiry__rail">
            <div className="gh-priv-enquiry__intro">
              <p className="gh-priv-eyebrow gh-priv-eyebrow--dark">
                <BrandCurveMark className="gh-priv-mark" isInView />
                <span>{t(variant === 'private' ? 'enquiry.page.privateEyebrow' : 'enquiry.page.eyebrow')}</span>
              </p>
              <h1 id="gh-enquire-title" className="gh-priv-title">
                {opportunity
                  ? t('enquiry.page.opportunityTitle').replace('{title}', opportunity.title)
                  : t(variant === 'private' ? 'enquiry.page.privateTitle' : 'enquiry.page.title')}
              </h1>
              <p className="gh-priv-body gh-priv-body--narrow">
                {opportunity
                  ? t('enquiry.page.opportunityLead')
                  : t(variant === 'private' ? 'enquiry.page.privateLead' : 'enquiry.page.lead')}
              </p>
              {opportunity ? (
                <article className="gh-enquiry-brief">
                  {opportunity.image ? <img src={opportunity.image} alt="" /> : null}
                  <div className="gh-enquiry-brief__body">
                    <p className="gh-enquiry-brief__kicker">
                      {isSampleOpportunity(record ?? {})
                        ? t('properties.archive.sampleLabel')
                        : t('enquiry.form.about')}
                    </p>
                    <h2 className="gh-enquiry-brief__title">{opportunity.title}</h2>
                    {facts ? <p className="gh-enquiry-brief__facts">{facts}</p> : null}
                    {opportunity.summary ? <p className="gh-enquiry-brief__summary">{opportunity.summary}</p> : null}
                  </div>
                </article>
              ) : null}
              {whatsappUrl ? (
                <p className="gh-priv-body gh-priv-body--narrow gh-enquire__direct">
                  {t('enquiry.page.direct')}{' '}
                  <a
                    href={buildWhatsAppUrl(t('hero.whatsappMessage'))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackContact({ channel: 'whatsapp', form: 'enquire-direct' })}
                  >
                    {t('enquiry.page.directLink')}
                  </a>
                </p>
              ) : null}
            </div>
            </div>
            <InvestorProfileForm variant={variant} opportunity={opportunity} messageDraft={messageDraft} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
