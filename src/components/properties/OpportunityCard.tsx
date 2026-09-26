import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GhIconArrow } from '@/components/brand/GhIcons';
import type { Property } from '@/data/mockData';
import { useOpportunityPrice } from '@/lib/opportunityPrice';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  isPrivateOpportunity,
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

type Props = {
  property: Property;
  index: number;
  /** A Green Hill Private teaser: shown by name and linked to its teaser page. */
  teaserHref?: string;
};

function formatIndex(index: number) {
  return String(index + 1).padStart(2, '0');
}

export function OpportunityCard({ property, index, teaserHref }: Props) {
  const { language, t } = useLanguage();
  const reduce = useReducedMotion();
  const image = opportunityImage(property);
  const lens = opportunityLensOf(property);
  const discreet = !teaserHref && isPrivateOpportunity(property);
  const size = landSizeLabel(property);
  const href = teaserHref ?? `/${language}/property/${property.id}`;
  const talkHref = `/${language}/#contact`;
  const num = formatIndex(index);
  const typeKey = TYPE_KEY[lens];
  const statusKey = statusTranslationKey(property);
  const status = statusKey ? t(statusKey) : rawStatus(property);
  const price = useOpportunityPrice(property) ?? t('selected.priceOnRequest');

  const location = (property.address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' · ');

  return (
    <article className={discreet ? 'gh-arch-card is-private' : 'gh-arch-card'}>
      <Link to={discreet ? talkHref : href} className="gh-arch-card__link">
        <motion.div
          className="gh-arch-card__media"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -6% 0px' }}
          transition={{
            duration: reduce ? 0.3 : 0.7,
            delay: Math.min(index, 5) * 0.1,
            ease: EASE,
          }}
        >
          {image ? (
            <img
              src={image}
              alt={discreet ? t('properties.archive.privateLabel') : property.title}
              className="gh-arch-card__img"
              width={960}
              height={640}
              loading={index < 3 ? 'eager' : 'lazy'}
              decoding="async"
            />
          ) : (
            <div className="gh-arch-card__fallback" aria-hidden />
          )}
          {typeKey ? <span className="gh-arch-card__type">{t(typeKey)}</span> : null}
        </motion.div>

        <motion.div
          className="gh-arch-card__body"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -6% 0px' }}
          transition={{
            duration: reduce ? 0.3 : 0.65,
            delay: Math.min(index, 5) * 0.1 + (reduce ? 0 : 0.12),
            ease: EASE,
          }}
        >
          {discreet ? (
            <>
              <p className="gh-arch-card__private">{t('properties.archive.privateLabel')}</p>
              <p className="gh-arch-card__note">{t('properties.archive.privateNote')}</p>
            </>
          ) : (
            <>
              <p className="gh-arch-card__kicker">
                <span className="gh-arch-card__num">{num}</span>
                {location ? <span className="gh-arch-card__where">{location}</span> : null}
              </p>
              <h3 className="gh-arch-card__title">{property.title}</h3>
              <p className="gh-arch-card__facts">
                {size ? <span>{size}</span> : null}
                {lens === 'villa' && property.bedrooms > 0 ? (
                  <span>
                    {property.bedrooms} {t('properties.archive.bedroomsWord')}
                  </span>
                ) : null}
                {status ? <span className="gh-arch-card__status">{status}</span> : null}
                <span className="gh-arch-card__price">{price}</span>
              </p>
            </>
          )}

          <span className="gh-arch-card__cta">
            <span className="gh-arch-card__cta-label">
              {discreet ? t('properties.archive.talkToReece') : t('properties.archive.view')}
            </span>
            <GhIconArrow className="gh-arch-card__arrow" size={15} />
          </span>
        </motion.div>
      </Link>
    </article>
  );
}
