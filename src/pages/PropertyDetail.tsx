import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { GhIconArrow, GhIconViewfinder } from '@/components/brand/GhIcons';
import { DescriptionRenderer } from '@/components/property/DescriptionRenderer';
import { OpportunityCard } from '@/components/properties/OpportunityCard';
import {
  isPrivateOpportunity,
  isSampleOpportunity,
  landSizeLabel,
  opportunityImage,
  opportunityLensOf,
  rawStatus,
  statusTranslationKey,
} from '@/components/properties/opportunityMeta';
import { demoOpportunities as mockProperties, type Property } from '@/data/mockData';
import founderPortrait from '@/assets/greenhill/founder/green-hill-reece-green.webp';
import privatePhoto from '@/assets/greenhill/green-hill-private.webp';
import talkBackdrop from '@/assets/greenhill/bg-sec-talk-to-reece.webp';
import talkPhoto1 from '@/assets/greenhill/sec-talk-to-reece1.webp';
import talkPhoto2 from '@/assets/greenhill/sec-talk-to-reece2.webp';
import CardSwap, { Card } from '@/components/ui/CardSwap';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInView } from '@/hooks/useInView';
import { isSupabaseConfigured } from '@/lib/supabase';
import { publicOpportunities, publicOpportunityByKey } from '@/lib/publicOpportunities';
import { useOpportunityPriceDetail } from '@/lib/opportunityPrice';
import { fetchPrivateTeaser } from '@/lib/privateTeasers';
import { buildWhatsAppUrl, getPublicWhatsAppUrl } from '@/lib/contact';
import { useContactSettings, useContentImage } from '@/content/hooks';
import { trackContact } from '@/lib/analytics';
import { isPreviewRequest, readOpportunityPreview } from '@/lib/opportunityPreview';
import { googleMapsView } from '@/lib/googleMaps';
import { getEmbedUrl } from '@/lib/video-utils';

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_IMAGES = 8;
const MOSAIC_THUMBS = 4;

function orderedImages(values: string[], fallback = ''): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const src of values) {
    const clean = src.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    list.push(clean);
    if (list.length === MAX_IMAGES) break;
  }
  if (list.length === 0 && fallback.trim()) list.push(fallback.trim());
  return list;
}

const TYPE_KEY: Record<string, string> = {
  land: 'properties.archive.land',
  villa: 'properties.exampleVilla',
  development: 'properties.archive.development',
  private: 'properties.archive.private',
};

type OpportunityRecord = Property & {
  descriptionJson?: unknown;
  videoUrl?: string;
  latitude?: number;
  longitude?: number;
  landSize?: number;
  slug?: string;
  whyGreenHill?: string;
  summary?: string;
  imageAlt?: Record<string, string>;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  priceAmount?: number;
  priceCurrency?: string;
  priceOnRequest?: boolean;
  priceDisplay?: string;
  priceAmountMax?: number;
  roadAccess?: string;
  utilities?: string;
  developmentPotential?: string;
  developerName?: string;
  brochureUrl?: string;
  masterplanUrl?: string;
};

type GlanceItem = { label: string; value: string };
type NearbyLine = { name: string; distance: string };

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function positive(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function coordinate(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function fill(template: string, vars: Record<string, string>) {
  return template
    .replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function offered(data: Record<string, unknown>, key: 'brochure' | 'masterplan', value: unknown): string | undefined {
  const url = str(value);
  if (!/^https?:\/\//.test(url)) return undefined;
  if (data.private_teaser === true) return url;
  const disclosure = data.disclosure as Record<string, unknown> | undefined;
  return disclosure && disclosure[key] === true ? url : undefined;
}

function fromRow(data: Record<string, unknown>): OpportunityRecord {
  const image = str(data.image_url) || str(data.image);
  const images = Array.isArray(data.images)
    ? data.images.map((item) => str(item)).filter(Boolean)
    : [];
  const features =
    data.features && typeof data.features === 'object' && !Array.isArray(data.features)
      ? Object.fromEntries(
          Object.entries(data.features as Record<string, unknown>).map(([key, value]) => [
            key,
            String(value ?? ''),
          ]),
        )
      : {};
  const status = str(data.status);

  return {
    id: str(data.id),
    title: str(data.title),
    address: str(data.address),
    price: positive(data.price) ?? 0,
    priceType: 'sale',
    bedrooms: positive(data.bedrooms) ?? 0,
    bathrooms: positive(data.bathrooms) ?? 0,
    sqft: positive(data.m2) ?? positive(data.sqft) ?? 0,
    status: (status || 'sale') as Property['status'],
    image,
    images: orderedImages(images, image),
    featured: Boolean(data.featured),
    type: str(data.type),
    listingCode: str(data.listing_code) || str(data.listingCode) || undefined,
    ownership: str(data.ownership) || undefined,
    yearBuilt: str(data.year_built) || str(data.yearBuilt) || undefined,
    surfaceArea: str(data.surface_area) || str(data.surfaceArea) || undefined,
    buildingArea: str(data.building_area) || str(data.buildingArea) || undefined,
    description: str(data.description) || undefined,
    features,
    nearbyAmenities: Array.isArray(data.nearbyAmenities)
      ? (data.nearbyAmenities as Property['nearbyAmenities'])
      : Array.isArray(data.nearby_amenities)
        ? (data.nearby_amenities as Property['nearbyAmenities'])
        : undefined,
    descriptionJson: data.description_json,
    videoUrl: str(data.video_url) || undefined,
    latitude: coordinate(data.latitude),
    longitude: coordinate(data.longitude),
    landSize: positive(data.land_size),
    slug: str(data.slug) || undefined,
    whyGreenHill: str(data.why_green_hill) || undefined,
    summary: str(data.summary) || undefined,
    imageAlt:
      data.image_alt && typeof data.image_alt === 'object' && !Array.isArray(data.image_alt)
        ? (data.image_alt as Record<string, string>)
        : undefined,
    seoTitle: str(data.seo_title) || undefined,
    seoDescription: str(data.seo_description) || undefined,
    ogImage: str(data.og_image) || undefined,
    canonicalUrl: str(data.canonical_url) || undefined,
    priceAmount: positive(data.price_amount),
    priceCurrency: str(data.price_currency) || undefined,
    priceOnRequest: data.price_on_request === true,
    priceDisplay: str(data.price_display) || undefined,
    priceAmountMax: positive(data.price_amount_max),
    roadAccess: str(data.road_access) || undefined,
    utilities: str(data.utilities) || undefined,
    developmentPotential: str(data.development_potential) || undefined,
    developerName: str(data.developer_name) || undefined,
    // Only real public links that Reece chose to offer; private references never render.
    // (Teaser rows arrive already filtered by the server.)
    brochureUrl: offered(data, 'brochure', data.brochure_url),
    masterplanUrl: offered(data, 'masterplan', data.masterplan_url),
  };
}

/**
 * Memo calls to action (brief §6, §11, §21). Standard: Talk to Reece on
 * WhatsApp (prefilled with the opportunity) and an investor enquiry.
 * Green Hill Private teaser: Request investment memorandum first.
 */
function MemoActions({
  teaser,
  whatsappHref,
  onWhatsApp,
  enquireHref,
  secondaryHref,
  secondaryLabel,
}: {
  teaser: boolean;
  whatsappHref: string | null;
  onWhatsApp: () => void;
  enquireHref: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  const { t } = useLanguage();
  const talkClass = `gh-final__cta ${teaser ? 'gh-final__cta--secondary' : 'gh-final__cta--primary'}`;
  const talk = whatsappHref ? (
    <a href={whatsappHref} className={talkClass} target="_blank" rel="noopener noreferrer" onClick={onWhatsApp}>
      <span className="gh-final__cta-label">{t('properties.archive.talkToReece')}</span>
      <GhIconArrow size={teaser ? 14 : 15} />
    </a>
  ) : (
    <Link className={talkClass} to={enquireHref}>
      <span className="gh-final__cta-label">{t('properties.archive.talkToReece')}</span>
      <GhIconArrow size={teaser ? 14 : 15} />
    </Link>
  );
  const enquire = (
    <Link className={`gh-final__cta ${teaser ? 'gh-final__cta--primary' : 'gh-final__cta--secondary'}`} to={enquireHref}>
      <span className="gh-final__cta-label">
        {t(teaser ? 'properties.memo.requestMemorandum' : 'properties.memo.sendEnquiry')}
      </span>
      <GhIconArrow size={teaser ? 15 : 14} />
    </Link>
  );
  return (
    <>
      {teaser ? enquire : talk}
      {teaser ? talk : enquire}
      {secondaryHref.startsWith('/') ? (
        <Link className="gh-final__cta gh-final__cta--secondary" to={secondaryHref}>
          <span className="gh-final__cta-label">{secondaryLabel}</span>
          <GhIconArrow size={14} />
        </Link>
      ) : null}
    </>
  );
}

function fromMock(property: Property): OpportunityRecord {
  return {
    ...property,
    images: orderedImages(property.images || [], property.image),
  };
}

function sizeLabel(property: OpportunityRecord): string | null {
  const label = landSizeLabel(property);
  const m2 = property.landSize ?? (label ? Number(label.replace(/[^\d.]/g, '')) || null : null);
  // Large sites read in hectares first so their scale is clear (brief §19).
  if (m2 && m2 >= 10000) {
    const ha = (m2 / 10000).toLocaleString('en-US', { maximumFractionDigits: 2 });
    return `${ha} ha · ${Math.round(m2).toLocaleString('en-US')} m²`;
  }
  if (label) return label;
  if (property.landSize) return `${property.landSize.toLocaleString('en-US')} m²`;
  return null;
}

function placeLine(address: string): string {
  return address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

function nearbyLines(property: OpportunityRecord): NearbyLine[] {
  const raw = property.nearbyAmenities;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as { name?: string; distance?: string; distance_meters?: number };
    const name = str(record.name);
    if (!name) return [];
    const distance =
      str(record.distance) ||
      (typeof record.distance_meters === 'number' ? `${record.distance_meters} m` : '');
    return [{ name, distance }];
  });
}

function coordinates(property: OpportunityRecord): { lat: number; lng: number } | null {
  const lat = property.latitude;
  const lng = property.longitude;
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/**
 * Sets a memo meta tag. The site-wide default for the same key (index.html) is
 * taken out while the memo is open, so crawlers read one description, not two,
 * and put back by the effect's cleanup.
 */
function upsertMeta(attr: 'name' | 'property', key: string, content: string, stash: Element[]) {
  document.head.querySelectorAll(`meta[${attr}="${key}"]:not([data-gh-memo])`).forEach((node) => {
    stash.push(node);
    node.remove();
  });
  let el = document.head.querySelector(`meta[${attr}="${key}"][data-gh-memo]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute('data-gh-memo', '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="gh-memo min-h-screen">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

function Reveal({
  children,
  className,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const { ref, isInView } = useInView({ threshold: 0.18 });
  const reduce = useReducedMotion();
  return (
    <section className={className} aria-labelledby={labelledBy}>
      <motion.div
        ref={ref}
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        animate={isInView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
      >
        {children}
      </motion.div>
    </section>
  );
}

/** `teaser`: a Green Hill Private teaser page (brief §17), fed only with what Reece disclosed. */
const PropertyDetail = ({ teaser = false }: { teaser?: boolean }) => {
  const { id } = useParams();
  const { search } = useLocation();
  const preview = isPreviewRequest(search);
  const { t, language } = useLanguage();
  const reduce = useReducedMotion();
  const close = useInView({ threshold: 0.25 });
  const portrait = useContentImage('site.reece.portrait', founderPortrait);
  const contact = useContactSettings();
  const [property, setProperty] = useState<OpportunityRecord | null>(null);
  const [others, setOthers] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const swipeStart = useRef<number | null>(null);
  const imagesRef = useRef<string[]>([]);

  useEffect(() => {
    let active = true;

    const pickOthers = (list: Property[], currentId: string | undefined) =>
      list.filter((item) => item.id !== currentId).slice(0, 3);

    const load = async () => {
      setLoading(true);
      setProperty(null);
      setOthers([]);
      setPhotoIndex(null);

      try {
        if (preview && id) {
          const draft = readOpportunityPreview(id);
          if (draft) {
            if (active) setProperty(fromRow(draft));
            return;
          }
        }

        if (teaser) {
          const row = await fetchPrivateTeaser(id ?? '');
          if (active) {
            setProperty(row ? fromRow(row) : null);
            setOthers([]);
          }
          return;
        }

        if (!isSupabaseConfigured) {
          const mock = mockProperties.find((item) => item.id === id);
          if (active) {
            setProperty(mock ? fromMock(mock) : null);
            setOthers(pickOthers(mockProperties, id));
          }
          return;
        }

        const { data, error } = await publicOpportunityByKey(id ?? '').maybeSingle();
        if (!active) return;

        if (data && !error) {
          const record = fromRow(data as Record<string, unknown>);
          setProperty(record);
          const { data: siblings } = await publicOpportunities()
            .neq('id', record.id)
            .limit(3);
          if (!active) return;
          setOthers((siblings ?? []).map((row) => fromRow(row as Record<string, unknown>)));
          return;
        }

        setProperty(null);
        setOthers([]);
      } catch (err) {
        console.error('Error fetching property:', err);
        if (!active) return;
        setProperty(null);
        setOthers([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id, preview, teaser]);

  useEffect(() => {
    if (photoIndex == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhotoIndex(null);
      const total = imagesRef.current.length;
      if (!total) return;
      if (event.key === 'ArrowRight') {
        setPhotoIndex((current) => (current == null ? current : (current + 1) % total));
      }
      if (event.key === 'ArrowLeft') {
        setPhotoIndex((current) => (current == null ? current : (current - 1 + total) % total));
      }
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [photoIndex]);

  useEffect(() => {
    const previousTitle = document.title;
    if (loading) return;

    const title = property
      ? property.seoTitle || `${property.title} · Green Hill Lombok`
      : `${t('properties.notFound')} · Green Hill Lombok`;
    const description = property
      ? property.seoDescription ||
        property.summary ||
        property.description?.trim() ||
        (sizeLabel(property) && placeLine(property.address)
          ? fill(
              t(
                opportunityLensOf(property) === 'land'
                  ? 'properties.memo.factualLand'
                  : 'properties.memo.factualTyped',
              ),
              { size: sizeLabel(property) || '', place: placeLine(property.address) },
            )
          : property.title)
      : t('properties.memo.notFoundLead');
    const image = property ? property.ogImage || opportunityImage(property) : '';
    const imageUrl = image ? new URL(image, window.location.origin).href : '';
    const canonical =
      property?.canonicalUrl ||
      (teaser
        ? `${window.location.origin}/${language}/private/${property?.listingCode || id || ''}`
        : `${window.location.origin}/${language}/property/${property?.slug || id || ''}`);

    document.title = title;
    const defaults: Element[] = [];
    upsertMeta('name', 'description', description, defaults);
    upsertMeta('property', 'og:title', title, defaults);
    upsertMeta('property', 'og:description', description, defaults);
    upsertMeta('property', 'og:type', 'article', defaults);
    upsertMeta('property', 'og:url', canonical, defaults);
    upsertMeta('name', 'twitter:title', title, defaults);
    upsertMeta('name', 'twitter:description', description, defaults);
    if (imageUrl) {
      upsertMeta('property', 'og:image', imageUrl, defaults);
      upsertMeta('name', 'twitter:image', imageUrl, defaults);
      // The default image's dimensions do not describe this one.
      document.head.querySelectorAll('meta[property="og:image:width"], meta[property="og:image:height"]').forEach((node) => {
        defaults.push(node);
        node.remove();
      });
    }

    let link = document.head.querySelector('link[rel="canonical"][data-gh-memo]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('data-gh-memo', '');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
    if (preview || (property && isSampleOpportunity(property))) upsertMeta('name', 'robots', 'noindex, nofollow', defaults);

    return () => {
      document.title = previousTitle;
      document.head.querySelectorAll('[data-gh-memo]').forEach((node) => node.remove());
      defaults.forEach((node) => document.head.appendChild(node));
    };
  }, [property, loading, language, id, t, preview, teaser]);

  const priceDetail = useOpportunityPriceDetail(property ?? {});
  const priceLabel = priceDetail?.display ?? null;
  const whatsappUrl = getPublicWhatsAppUrl();
  const archiveHref = `/${language}/properties`;
  const privateHref = `/${language}/private`;

  if (loading) {
    return (
      <Shell>
        <main className="gh-memo-state gh-memo-state--wait" aria-busy="true">
          <div className="gh-memo-wait" role="status" aria-live="polite">
            <BrandCurveMark className="gh-memo-wait__mark" isInView />
            <p className="gh-memo-wait__name">Green Hill</p>
            <span className="gh-memo-wait__line" aria-hidden>
              <span className="gh-memo-wait__line-fill" />
            </span>
            <p className="gh-memo-wait__label">{t('properties.memo.loading')}</p>
          </div>
        </main>
      </Shell>
    );
  }

  if (!property) {
    return (
      <Shell>
        <main className="gh-memo-state">
          <h1>{t('properties.notFound')}</h1>
          <p>{t('properties.memo.notFoundLead')}</p>
          <Link className="gh-final__cta gh-final__cta--primary" to={archiveHref}>
            <span className="gh-final__cta-label">{t('properties.memo.exploreAll')}</span>
            <GhIconArrow size={15} />
          </Link>
        </main>
      </Shell>
    );
  }

  const discreet = teaser || isPrivateOpportunity(property);
  const reference = property.listingCode;
  // Brief §11: prepopulate WhatsApp with the opportunity so the lead's source is clear.
  const whatsappMessage = fill(t('properties.memo.whatsappMessage'), {
    title: property.title,
    reference: reference ? ` (${reference})` : '',
  });
  const whatsappHref = whatsappUrl
    ? buildWhatsAppUrl(`${whatsappMessage}\n${window.location.origin}${window.location.pathname}`)
    : null;
  const onWhatsApp = () => {
    trackContact({ channel: 'whatsapp', opportunity: reference || property.title, teaser: teaser ? 'yes' : 'no' });
  };
  const enquireHref = teaser
    ? `/${language}/enquire?private=${encodeURIComponent(reference || property.id)}`
    : `/${language}/enquire?opportunity=${encodeURIComponent(property.slug || property.id)}`;
  const documents = [
    property.brochureUrl ? { label: t('properties.memo.brochure'), url: property.brochureUrl } : null,
    property.masterplanUrl ? { label: t('properties.memo.masterplan'), url: property.masterplanUrl } : null,
  ].filter((item): item is { label: string; url: string } => Boolean(item));
  const lens = opportunityLensOf(property);
  const typeKey = TYPE_KEY[lens];
  const typeLabel = typeKey ? t(typeKey) : property.type;
  const statusKey = statusTranslationKey(property);
  const status = statusKey ? t(statusKey) : rawStatus(property);
  const size = sizeLabel(property);
  const place = placeLine(property.address);
  const price = priceLabel ?? t('selected.priceOnRequest');
  const altFor = (src: string, fallback: string) => property.imageAlt?.[src]?.trim() || fallback;
  const images = orderedImages(property.images || [], opportunityImage(property));
  imagesRef.current = images;
  const heroImage = images[0] || '';
  const showMoreOverlay = images.length > MOSAIC_THUMBS + 1;
  const mosaicThumbs = showMoreOverlay
    ? images.slice(1, MOSAIC_THUMBS + 1)
    : images.slice(1);
  const showBedrooms = lens === 'villa' && property.bedrooms > 0;
  const showBathrooms = lens === 'villa' && property.bathrooms > 0;
  const building =
    property.buildingArea && property.buildingArea !== size ? property.buildingArea : '';
  const written = property.description?.trim() || '';
  const factual =
    !written && !property.descriptionJson
      ? size && place
        ? fill(t(lens === 'land' ? 'properties.memo.factualLand' : 'properties.memo.factualTyped'), {
            size,
            place,
          })
        : place
          ? fill(t('properties.memo.factualPlace'), { place })
          : ''
      : '';
  const video = property.videoUrl ? getEmbedUrl(property.videoUrl) : null;
  const nearby = nearbyLines(property);
  const point = coordinates(property);
  const maps = googleMapsView({
    url: property.features?._maps,
    latitude: point?.lat,
    longitude: point?.lng,
  });
  const meta = [
    typeLabel,
    size,
    showBedrooms ? `${property.bedrooms} ${t('properties.archive.bedroomsWord')}` : '',
    status,
  ].filter((item): item is string => Boolean(item));

  const overview: GlanceItem[] = [
    place ? { label: t('properties.memo.location'), value: place } : null,
    size ? { label: t('properties.memo.landSize'), value: size } : null,
    typeLabel ? { label: t('properties.memo.type'), value: typeLabel } : null,
    status ? { label: t('properties.memo.status'), value: status } : null,
    showBedrooms
      ? { label: t('properties.memo.bedrooms'), value: String(property.bedrooms) }
      : null,
    showBathrooms
      ? { label: t('properties.memo.bathrooms'), value: String(property.bathrooms) }
      : null,
    building ? { label: t('properties.memo.building'), value: building } : null,
    property.listingCode
      ? { label: t('properties.memo.reference'), value: property.listingCode }
      : null,
    property.yearBuilt ? { label: t('properties.memo.year'), value: property.yearBuilt } : null,
    property.ownership
      ? { label: t('properties.memo.ownership'), value: property.ownership }
      : null,
    property.roadAccess ? { label: t('properties.memo.roadAccess'), value: property.roadAccess } : null,
    property.utilities ? { label: t('properties.memo.utilities'), value: property.utilities } : null,
    property.developerName ? { label: t('properties.memo.developer'), value: property.developerName } : null,
    ...Object.entries(property.features || {}).flatMap(([key, value]) => {
      const normalized = key.toLowerCase();
      if (normalized === 'type' || normalized === 'status' || normalized === 'private' || key.startsWith('_')) return [];
      const text = String(value ?? '').trim();
      if (!text) return [];
      return [{ label: key, value: text }];
    }),
  ].filter((item): item is GlanceItem => Boolean(item));

  const openPhoto = (index: number) => setPhotoIndex(index);
  const shiftPhoto = (delta: number) => {
    setPhotoIndex((current) => {
      if (current == null || images.length === 0) return current;
      return (current + delta + images.length) % images.length;
    });
  };

  const mosaicCount = Math.min(images.length, 1 + mosaicThumbs.length);
  const viewAllLabel = fill(t('properties.memo.viewAllPhotos'), {
    count: String(images.length).padStart(2, '0'),
  });

  return (
    <Shell>
      <main>
        <header className="gh-memo-head">
          <div className="gh-memo-head__copy">
            <p className="gh-memo-kicker">
              <BrandCurveMark className="gh-memo-kicker__mark" isInView />
              <motion.span
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.55, delay: reduce ? 0 : 0.12, ease: EASE }}
              >
                {discreet ? t('properties.memo.privateOpportunity') : t('properties.memo.selected')}
              </motion.span>
            </p>
            <div className="gh-memo-head__place">
              {place ? <p className="gh-memo-where">{place}</p> : null}
              {property.listingCode ? (
                <p className="gh-memo-code">{property.listingCode}</p>
              ) : null}
            </div>
            <motion.h1
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.18, ease: EASE }}
            >
              {property.title}
            </motion.h1>
            {isSampleOpportunity(property) ? (
              <p className="gh-memo-sample">{t('properties.archive.sampleLabel')}</p>
            ) : null}
            {meta.length > 0 ? (
              <ul className="gh-memo-meta">
                {meta.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <Link className="gh-memo-back" to={archiveHref}>
            {t('properties.memo.exploreAll')}
            <GhIconArrow size={14} />
          </Link>
        </header>

        {heroImage ? (
          <div
            className="gh-memo-mosaic"
            data-count={mosaicCount}
            data-more={showMoreOverlay ? 'true' : 'false'}
          >
            <button
              type="button"
              className="gh-memo-mosaic__lead"
              onClick={() => openPhoto(0)}
              aria-label={`${t('properties.memo.viewPhoto')}: ${property.title}`}
            >
              <motion.img
                src={heroImage}
                alt={altFor(heroImage, property.title)}
                width={1600}
                height={1200}
                fetchPriority="high"
                loading="eager"
                initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.01 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduce ? 0 : 1.05, ease: EASE }}
              />
              <span className="gh-memo-mosaic__full" aria-hidden="true">
                <GhIconViewfinder size={16} />
                <span>{t('properties.memo.fullView')}</span>
              </span>
            </button>
            {mosaicThumbs.length > 0 ? (
              <div className="gh-memo-mosaic__grid">
                {mosaicThumbs.map((src, thumbIndex) => {
                  const imageIndex = thumbIndex + 1;
                  const isLast = showMoreOverlay && thumbIndex === mosaicThumbs.length - 1;
                  return (
                    <button
                      key={`${src}-${imageIndex}`}
                      type="button"
                      className="gh-memo-mosaic__shot"
                      onClick={() => openPhoto(imageIndex)}
                      aria-label={
                        isLast
                          ? viewAllLabel
                          : `${t('properties.memo.viewPhoto')} ${String(imageIndex + 1).padStart(2, '0')}`
                      }
                    >
                      <img
                        src={src}
                        alt={altFor(src, `${property.title}, ${String(imageIndex + 1).padStart(2, '0')}`)}
                        loading="lazy"
                        decoding="async"
                      />
                      {isLast ? (
                        <span className="gh-memo-mosaic__more">
                          <span>{viewAllLabel}</span>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="gh-memo-body">
          <div className="gh-memo-body__main">
            <Reveal className="gh-memo-block" labelledBy="gh-memo-opportunity">
              <p className="gh-memo-chapter">
                <BrandCurveMark className="gh-memo-chapter__mark" isInView />
                <span>{t('properties.memo.theOpportunity')}</span>
              </p>
              <h2 id="gh-memo-opportunity" className="gh-memo-block__title">
                {t('properties.memo.opportunityTitle')}
              </h2>
              <p className="gh-memo-note">{t('hero.subheadline')}</p>
              {written ? <p className="gh-memo-copy">{written}</p> : null}
              {!written && property.descriptionJson ? (
                <div className="gh-memo-rich">
                  <DescriptionRenderer json={property.descriptionJson as never} />
                </div>
              ) : null}
              {factual ? <p className="gh-memo-copy">{factual}</p> : null}
              {property.whyGreenHill ? (
                <>
                  <p className="gh-memo-chapter gh-memo-chapter--next">
                    <span>{t(teaser ? 'properties.memo.whyLookingAtThis' : 'properties.memo.whyGreenHill')}</span>
                  </p>
                  <p className="gh-memo-copy">{property.whyGreenHill}</p>
                </>
              ) : null}
              {property.developmentPotential ? (
                <>
                  <p className="gh-memo-chapter gh-memo-chapter--next">
                    <span>{t('properties.memo.developmentPotential')}</span>
                  </p>
                  <p className="gh-memo-copy">{property.developmentPotential}</p>
                  <p className="gh-memo-disclaimer">{t('properties.memo.conceptsNote')}</p>
                </>
              ) : null}
            </Reveal>

            {place ? (
              <Reveal className="gh-memo-block" labelledBy="gh-memo-place">
                <div className="gh-memo-place-head">
                  <p className="gh-memo-chapter gh-memo-chapter--next">
                    <span>{t('properties.memo.location')}</span>
                  </p>
                  <h2 id="gh-memo-place" className="gh-memo-block__title">
                    {place}
                  </h2>
                </div>
                {property.address && property.address.trim() !== place ? (
                  <p className="gh-memo-place-line">{property.address.trim()}</p>
                ) : null}
                {nearby.length > 0 ? (
                  <div className="gh-memo-nearby">
                    <h3>{t('properties.memo.nearby')}</h3>
                    <ul>
                      {nearby.map((item) => (
                        <li key={`${item.name}-${item.distance}`}>
                          <span>{item.name}</span>
                          {item.distance ? <span>{item.distance}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {maps ? (
                  <div className="gh-memo-map">
                    <iframe
                      className="gh-memo-map__frame"
                      src={maps.embed}
                      title={`${property.title} — ${place}`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <a className="gh-memo-map__link" href={maps.href} target="_blank" rel="noopener noreferrer">
                      {t('properties.memo.openMap')}
                      <GhIconArrow size={14} />
                    </a>
                  </div>
                ) : null}
              </Reveal>
            ) : null}

            {video ? (
              <Reveal className="gh-memo-block" labelledBy="gh-memo-film">
                <h2 id="gh-memo-film" className="gh-memo-block__title">
                  {t('properties.memo.film')}
                </h2>
                <div className="gh-memo-film">
                  <iframe
                    src={video}
                    title={property.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </Reveal>
            ) : null}
          </div>

          <aside className="gh-memo-rail" aria-label={t('properties.memo.overview')}>
            <div className="gh-memo-rail__inner">
              <div className="gh-memo-rail__price">
                <span>{t('properties.memo.price')}</span>
                <strong>{price}</strong>
                {priceDetail?.approximate ? (
                  <span className="gh-memo-rail__price-source">
                    {fill(t('properties.memo.priceSource'), { price: priceDetail.source })}
                  </span>
                ) : null}
              </div>

              {overview.length > 0 ? (
                <div className="gh-memo-rail__overview">
                  <h2>{t('properties.memo.overview')}</h2>
                  <dl>
                    {overview.map((item) => (
                      <div key={`${item.label}-${item.value}`} className="gh-memo-rail__row">
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {documents.length > 0 ? (
                <div className="gh-memo-rail__overview gh-memo-rail__docs">
                  <h2>{t('properties.memo.documents')}</h2>
                  <ul>
                    {documents.map((doc) => (
                      <li key={doc.url}>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          {doc.label}
                          <span className="sr-only"> {t('properties.memo.opensNewTab')}</span>
                          <GhIconArrow size={13} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="gh-memo-rail__contact">
                <h2>{t('properties.memo.speakWith')}</h2>
                <div className="gh-memo-rail__agent">
                  <img
                    src={portrait.src}
                    alt=""
                    width={72}
                    height={96}
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <p className="gh-memo-rail__name">{contact.name}</p>
                    <p className="gh-memo-rail__role">{t('properties.memo.reeceRole')}</p>
                  </div>
                </div>
                <div className="gh-memo-rail__actions">
                  <MemoActions
                    teaser={teaser}
                    whatsappHref={whatsappHref}
                    onWhatsApp={onWhatsApp}
                    enquireHref={enquireHref}
                    secondaryHref={teaser ? privateHref : archiveHref}
                    secondaryLabel={t(teaser ? 'properties.archive.closePrivate' : 'properties.memo.exploreOther')}
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {others.length > 0 ? (
          <Reveal className="gh-memo-others" labelledBy="gh-memo-others">
            <div className="gh-memo-others__head">
              <div>
                <h2 id="gh-memo-others">{t('properties.memo.otherOpportunities')}</h2>
                <p>{t('properties.memo.otherLead')}</p>
              </div>
              <Link className="gh-memo-others__more" to={archiveHref}>
                {t('properties.memo.seeMore')}
                <GhIconArrow size={14} />
              </Link>
            </div>
            <div className="gh-memo-others__grid">
              {others.map((item, index) => (
                <OpportunityCard key={item.id} property={item} index={index} />
              ))}
            </div>
          </Reveal>
        ) : null}

        <section className="gh-memo-close" aria-labelledby="gh-memo-close" ref={close.ref}>
          <div className="gh-memo-close__backdrop" aria-hidden>
            <img src={talkBackdrop} alt="" width={1920} height={1080} loading="lazy" decoding="async" />
          </div>
          <div className="gh-memo-close__inner">
            <div className="gh-memo-close__copy">
              <p className="gh-memo-close__eyebrow">
                <BrandCurveMark className="gh-memo-close__mark" isInView={close.isInView} />
                <span>
                  {discreet ? t('properties.memo.privateOpportunity') : t('hero.subheadline')}
                </span>
              </p>
              <h2 id="gh-memo-close">{t('properties.memo.interested')}</h2>
              <p className="gh-memo-close__lead">
                {t(teaser ? 'properties.memo.privateInformation' : 'properties.memo.interestedLead')}
              </p>
              <div className="gh-memo-close__actions">
                <MemoActions
                  teaser={teaser}
                  whatsappHref={whatsappHref}
                  onWhatsApp={onWhatsApp}
                  enquireHref={enquireHref}
                  secondaryHref={teaser ? privateHref : archiveHref}
                  secondaryLabel={t(teaser ? 'properties.archive.closePrivate' : 'properties.memo.exploreOther')}
                />
              </div>
            </div>

            <div className="gh-memo-close__stage" aria-hidden>
              <div className="gh-memo-close__swap">
                <CardSwap
                  width={320}
                  height={420}
                  cardDistance={48}
                  verticalDistance={58}
                  delay={4800}
                  pauseOnHover
                  skewAmount={4}
                  easing="linear"
                >
                  <Card>
                    <img src={privatePhoto} alt="" width={960} height={1280} loading="lazy" decoding="async" />
                  </Card>
                  <Card>
                    <img src={talkPhoto1} alt="" width={720} height={960} loading="lazy" decoding="async" />
                  </Card>
                  <Card>
                    <img src={talkPhoto2} alt="" width={720} height={960} loading="lazy" decoding="async" />
                  </Card>
                </CardSwap>
              </div>
            </div>
          </div>
        </section>
      </main>

      {photoIndex != null && images[photoIndex] ? (
        <div
          className="gh-memo-light"
          role="dialog"
          aria-modal="true"
          aria-label={property.title}
          onClick={() => setPhotoIndex(null)}
          onTouchStart={(event) => {
            swipeStart.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (swipeStart.current == null) return;
            const delta = (event.changedTouches[0]?.clientX ?? swipeStart.current) - swipeStart.current;
            swipeStart.current = null;
            if (Math.abs(delta) < 48) return;
            shiftPhoto(delta < 0 ? 1 : -1);
          }}
        >
          <button
            type="button"
            className="gh-memo-light__close"
            onClick={() => setPhotoIndex(null)}
            autoFocus
          >
            {t('navigation.close')}
          </button>
          {images.length > 1 ? (
            <p className="gh-memo-light__count">
              {String(photoIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
            </p>
          ) : null}
          <img
            src={images[photoIndex]}
            alt={altFor(images[photoIndex], property.title)}
            onClick={(event) => event.stopPropagation()}
          />
          {images.length > 1 ? (
            <div className="gh-memo-light__nav">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  shiftPhoto(-1);
                }}
              >
                {t('properties.memo.previous')}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  shiftPhoto(1);
                }}
              >
                {t('properties.memo.next')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Shell>
  );
};

export default PropertyDetail;
