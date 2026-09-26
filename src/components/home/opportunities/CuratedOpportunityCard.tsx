import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Property } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOpportunityPrice } from '@/lib/opportunityPrice';
import {
  opportunityImage,
  opportunityLandSize,
} from './selectCuratedOpportunities';

const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  property: Property;
  index: number;
  /** Featured lead piece — editorial prominence, not an oversized card. */
  lead?: boolean;
  inView: boolean;
};

function formatIndex(index: number) {
  return String(index + 1).padStart(2, '0');
}

/**
 * Editorial opportunity entry — curated collection piece, not a marketplace card.
 * Secondary rows: [number] [image] [information] [action] — full-width catalogue.
 */
export function CuratedOpportunityCard({ property, index, lead = false, inView }: Props) {
  const { language, t } = useLanguage();
  const reduce = useReducedMotion();

  const image = opportunityImage(property);
  const landSize = opportunityLandSize(property);
  const href = `/${language}/property/${property.id}`;
  const priceLabel = useOpportunityPrice(property) ?? t('selected.priceOnRequest');
  const num = formatIndex(index);

  const delay = lead ? 0.28 : 0.38 + (index - 1) * 0.06;
  const reveal = reduce
    ? {
        initial: { opacity: 0 },
        animate: inView ? { opacity: 1 } : { opacity: 0 },
        transition: { duration: 0.4, delay: Math.min(delay, 0.12), ease: EASE },
      }
    : {
        initial: { opacity: 0, y: 14 },
        animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
        transition: { duration: 0.68, delay, ease: EASE },
      };

  const alt = `${property.title}${property.address ? `: ${property.address}` : ''}`;
  const categoryParts = [property.address, property.type].filter(Boolean);
  const category = categoryParts.join(' · ');

  if (lead) {
    return (
      <motion.article className="gh-opp-feature" {...reveal}>
        <Link to={href} className="gh-opp-feature__link">
          <div className="gh-opp-feature__media">
            {image ? (
              <img
                src={image}
                alt={alt}
                className="gh-opp-feature__img"
                width={880}
                height={660}
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="gh-opp-feature__img-fallback" aria-hidden />
            )}
          </div>

          <div className="gh-opp-feature__panel">
            <span className="gh-opp-feature__num" aria-hidden>
              {num}
            </span>

            <div className="gh-opp-feature__body">
              {category && <p className="gh-opp-feature__category">{category}</p>}
              <h3 className="gh-opp-feature__title">{property.title}</h3>
              {landSize && <p className="gh-opp-feature__size">{landSize}</p>}
            </div>

            <div className="gh-opp-feature__foot">
              <p className="gh-opp-feature__price">{priceLabel}</p>
              <span className="gh-opp-feature__cta">
                <span className="gh-opp-feature__cta-label">{t('selected.viewOpportunity')}</span>
                <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
              </span>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  return (
    <motion.article className="gh-opp-entry" {...reveal}>
      <Link to={href} className="gh-opp-entry__link">
        <span className="gh-opp-entry__num" aria-hidden>
          {num}
        </span>

        <div className="gh-opp-entry__media">
          {image ? (
            <img
              src={image}
              alt={alt}
              className="gh-opp-entry__img"
              width={640}
              height={420}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="gh-opp-entry__img-fallback" aria-hidden />
          )}
        </div>

        <div className="gh-opp-entry__copy">
          {category && <p className="gh-opp-entry__category">{category}</p>}
          <h3 className="gh-opp-entry__title">{property.title}</h3>
          {landSize && <p className="gh-opp-entry__size">{landSize}</p>}
          <p className="gh-opp-entry__price">{priceLabel}</p>
        </div>

        <div className="gh-opp-entry__action">
          <span className="gh-opp-entry__cta">
            <span className="gh-opp-entry__cta-label">{t('selected.viewOpportunity')}</span>
            <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
