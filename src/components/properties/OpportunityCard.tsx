import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, MessageCircle, Send } from '@/icons/iconsax';
import markLogo from '@/assets/greenhill/hero/green-hill-logo-solid-stacked-132.webp';
import type { Property } from '@/data/mockData';
import { useOpportunityPrice } from '@/lib/opportunityPrice';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  isPrivateOpportunity,
  isSampleOpportunity,
  landSizeLabel,
  opportunityImage,
  opportunityLensOf,
  rawStatus,
  statusTranslationKey,
} from './opportunityMeta';

const EASE = [0.22, 1, 0.36, 1] as const;

const TYPE_KEY: Record<string, string> = {
  land: 'properties.archive.land',
  villa: 'properties.exampleVilla',
  development: 'properties.archive.development',
  private: 'properties.archive.private',
};

type PublicProperty = Property & {
  summary?: string | null;
  slug?: string;
  area?: string;
  region?: string;
};

type Props = {
  property: Property;
  index: number;
  /** A Green Hill Private teaser: shown by name and linked to its teaser page. */
  teaserHref?: string;
  /**
   * The featured opportunity leading the collection: same card, given the
   * full width. Editorial prominence, never a sales label.
   */
  feature?: boolean;
};

function plainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function placeParts(property: PublicProperty) {
  const address = (property.address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const area = String(property.area || '').trim() || address[0] || '';
  const region = String(property.region || '').trim() || address[address.length - 1] || area;
  return { area, region };
}

export function OpportunityCard({ property, index, teaserHref, feature = false }: Props) {
  const { language, t } = useLanguage();
  const reduce = useReducedMotion();
  const record = property as PublicProperty;
  const image = opportunityImage(property);
  const lens = opportunityLensOf(property);
  const discreet = !teaserHref && isPrivateOpportunity(property);
  const size = landSizeLabel(property);
  const key = record.slug || property.id;
  const href = teaserHref ?? `/${language}/property/${key}`;
  const talkHref = `/${language}/#contact`;
  const enquireHref = teaserHref
    ? `/${language}/enquire?private=${encodeURIComponent(key)}`
    : `/${language}/enquire?opportunity=${encodeURIComponent(key)}`;
  const destination = discreet ? talkHref : href;
  const typeKey = TYPE_KEY[lens];
  const typeLabel = typeKey ? t(typeKey) : '';
  const statusKey = statusTranslationKey(property);
  const status = statusKey ? t(statusKey) : rawStatus(property);
  const price = useOpportunityPrice(property) ?? t('selected.priceOnRequest');
  const summary = plainText(record.summary) || plainText(property.description);
  const { area, region } = placeParts(record);
  const ownership = String(property.ownership || '').trim();
  const meta = [typeLabel, ownership || status].filter(Boolean).join(' · ');
  const overlayNote = ownership || size || status;
  const sample = isSampleOpportunity(property);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = new URL(href, window.location.origin).href;
    const payload = { title: property.title, text: summary || property.title, url };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      const area = document.createElement('textarea');
      area.value = url;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      ok = document.execCommand('copy');
      area.remove();
    }
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <motion.article
      className={['gh-arch-card', discreet ? 'is-private' : '', feature && !discreet ? 'is-featured' : ''].filter(Boolean).join(' ')}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: reduce ? 0.25 : 0.6, delay: Math.min(index, 4) * 0.06, ease: EASE }}
    >
      <header className="gh-arch-card__brand">
        <img className="gh-arch-card__mark" src={markLogo} alt="" width={175} height={132} />
        <div className="gh-arch-card__brand-copy">
          <p className="gh-arch-card__brand-name">
            Green Hill{area ? ` · ${area}` : ''}
          </p>
          {meta ? <p className="gh-arch-card__brand-meta">{meta}</p> : null}
        </div>
      </header>

      <div className="gh-arch-card__media">
        <Link to={destination} className="gh-arch-card__media-link" tabIndex={-1} aria-hidden>
          {image ? (
            <img
              src={image}
              alt=""
              className="gh-arch-card__img"
              width={960}
              height={720}
              loading={index < 2 ? 'eager' : 'lazy'}
              decoding="async"
            />
          ) : (
            <div className="gh-arch-card__fallback" />
          )}
        </Link>
        <div className="gh-arch-card__overlay">
          <div className="gh-arch-card__overlay-copy">
            <p className="gh-arch-card__price">{discreet ? t('properties.archive.privateLabel') : price}</p>
            {overlayNote && !discreet ? <p className="gh-arch-card__overlay-note">{overlayNote}</p> : null}
            {discreet ? <p className="gh-arch-card__overlay-note">{t('properties.archive.privateNote')}</p> : null}
          </div>
          <Link to={destination} className="gh-arch-card__view">
            {discreet ? t('properties.archive.talkToReece') : t('properties.archive.cardView')}
          </Link>
        </div>
      </div>

      <div className="gh-arch-card__toolbar">
        {discreet ? (
          <span />
        ) : (
          <button type="button" className="gh-arch-card__share" onClick={share} aria-label={copied ? t('properties.archive.copied') : t('properties.archive.share')}>
            <Send size={18} aria-hidden />
            {copied ? <span className="gh-arch-card__copied">{t('properties.archive.copied')}</span> : null}
          </button>
        )}
        <Link to={destination} className="gh-arch-card__details">
          <span>{discreet ? t('properties.archive.talkToReece') : t('properties.archive.details')}</span>
          <ArrowRight size={15} aria-hidden />
        </Link>
      </div>

      <div className="gh-arch-card__copy">
        {region ? (
          <p className="gh-arch-card__pin">
            <MapPin size={14} aria-hidden />
            <span>{region}</span>
          </p>
        ) : null}
        {sample ? <p className="gh-arch-card__sample">{t('properties.archive.sampleLabel')}</p> : null}
        {discreet ? (
          <h3 className="gh-arch-card__title">{t('properties.archive.privateLabel')}</h3>
        ) : (
          <h3 className="gh-arch-card__title">
            <Link to={href}>{property.title}</Link>
          </h3>
        )}
        {discreet ? (
          <p className="gh-arch-card__note">{t('properties.archive.privateNote')}</p>
        ) : summary ? (
          <p className="gh-arch-card__summary">{summary}</p>
        ) : null}
        <div className="gh-arch-card__links">
          <Link to={destination} className="gh-arch-card__more">
            {discreet ? t('properties.archive.talkToReece') : t('properties.archive.readMore')}
          </Link>
          {discreet ? null : (
            <Link to={enquireHref} className="gh-arch-card__brief">
              <MessageCircle size={15} aria-hidden />
              <span>{t('properties.archive.requestBriefing')}</span>
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  );
}
