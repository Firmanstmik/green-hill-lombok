import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@/icons/iconsax';
import { Link } from 'react-router-dom';
import type { Property } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOpportunityPrice } from '@/lib/opportunityPrice';
import { landSizeLabel, opportunityLensOf, statusTranslationKey } from '@/components/properties/opportunityMeta';
import { opportunityImage } from './selectCuratedOpportunities';

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
  /** The featured lead: editorial room (summary + facts), never a sales label. */
  lead?: boolean;
  inView: boolean;
};

const pad = (index: number) => String(index + 1).padStart(2, '0');

/**
 * One entry of the homepage selection (brief §4: 3–6 opportunities, large
 * imagery, minimal clutter). The whole entry is the link; a quiet text link
 * says where it goes, instead of a bordered button on every item.
 */
export function CuratedOpportunityCard({ property, index, lead = false, inView }: Props) {
  const { language, t } = useLanguage();
  const reduce = useReducedMotion();

  const image = opportunityImage(property);
  const size = landSizeLabel(property);
  const href = `/${language}/property/${property.id}`;
  const price = useOpportunityPrice(property) ?? t('selected.priceOnRequest');
  const typeKey = TYPE_KEY[opportunityLensOf(property)];
  const type = typeKey ? t(typeKey) : '';
  const statusKey = statusTranslationKey(property);
  const status = statusKey ? t(statusKey) : '';
  // Available is the normal state; only Reserved and Sold need saying on a row.
  const notable = statusKey && statusKey !== 'properties.archive.statusAvailable' ? status : '';
  const tenure = (property as Property & { ownership?: string | null }).ownership?.trim() || '';
  const summary = (property as Property & { summary?: string | null }).summary?.trim() || '';
  const place = (property.address || '').split(',').map((part) => part.trim()).filter(Boolean).join(' · ');
  const alt = property.title + (place ? `, ${place}` : '');

  const delay = lead ? 0.26 : 0.38 + (index - 1) * 0.07;
  const reveal = reduce
    ? {
        initial: { opacity: 0 },
        animate: inView ? { opacity: 1 } : { opacity: 0 },
        transition: { duration: 0.4, delay: Math.min(delay, 0.12), ease: EASE },
      }
    : {
        initial: { opacity: 0, y: 16 },
        animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
        transition: { duration: 0.75, delay, ease: EASE },
      };

  if (lead) {
    const facts = [
      size ? { label: t('properties.memo.landSize'), value: size } : null,
      tenure ? { label: t('properties.memo.ownership'), value: tenure } : null,
      status ? { label: t('properties.memo.status'), value: status } : null,
    ].filter(Boolean) as { label: string; value: string }[];

    return (
      <motion.article className="gh-sel-lead" {...reveal}>
        <Link to={href} className="gh-sel-lead__link">
          <div className="gh-sel-lead__media">
            {image ? (
              <img
                src={image}
                alt={alt}
                className="gh-sel-lead__img"
                width={1200}
                height={900}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              <div className="gh-sel-lead__fallback" aria-hidden />
            )}
            {type ? <span className="gh-sel-lead__type">{type}</span> : null}
          </div>

          <div className="gh-sel-lead__panel">
            <p className="gh-sel-kicker">
              <span className="gh-sel-kicker__num">{pad(index)}</span>
              <span className="gh-sel-kicker__rule" aria-hidden />
              {place ? <span className="gh-sel-kicker__place">{place}</span> : null}
            </p>
            <h3 className="gh-sel-lead__title">{property.title}</h3>
            {summary ? <p className="gh-sel-lead__summary">{summary}</p> : null}

            {facts.length ? (
              <dl className="gh-sel-facts">
                {facts.map((fact) => (
                  <div key={fact.label} className="gh-sel-facts__item">
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="gh-sel-lead__foot">
              <p className="gh-sel-price">{price}</p>
              <span className="gh-sel-link">
                <span>{t('selected.viewOpportunity')}</span>
                <ArrowRight size={15} strokeWidth={1.6} aria-hidden />
              </span>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  const facts = [size, tenure].filter(Boolean);

  return (
    <motion.article className="gh-sel-row" {...reveal}>
      <Link to={href} className="gh-sel-row__link">
        <span className="gh-sel-row__num" aria-hidden>
          {pad(index)}
        </span>
        <div className="gh-sel-row__media">
          {image ? (
            <img
              src={image}
              alt={alt}
              className="gh-sel-row__img"
              width={640}
              height={480}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="gh-sel-row__fallback" aria-hidden />
          )}
          {notable ? <span className="gh-sel-row__status">{notable}</span> : null}
        </div>
        <div className="gh-sel-row__copy">
          <p className="gh-sel-row__place">{[place, type].filter(Boolean).join(' · ')}</p>
          <h3 className="gh-sel-row__title">{property.title}</h3>
          {facts.length ? (
            <p className="gh-sel-row__facts">
              {facts.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
            </p>
          ) : null}
        </div>
        <div className="gh-sel-row__end">
          <p className="gh-sel-price">{price}</p>
          <span className="gh-sel-link">
            <span className="gh-sel-link__label">{t('selected.viewOpportunity')}</span>
            <ArrowRight size={15} strokeWidth={1.6} aria-hidden />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
