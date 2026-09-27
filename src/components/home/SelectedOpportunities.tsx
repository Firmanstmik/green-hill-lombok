import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@/icons/iconsax';
import { Link } from 'react-router-dom';
import { demoOpportunities as mockProperties, type Property } from '@/data/mockData';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useContentText } from '@/content/hooks';
import { publicOpportunities } from '@/lib/publicOpportunities';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { CuratedOpportunityCard } from './opportunities/CuratedOpportunityCard';
import { selectCuratedOpportunities } from './opportunities/selectCuratedOpportunities';
import { withGoldStop } from '@/components/brand/GoldStop';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Section 03 — Selected Opportunities.
 * Curated editorial collection. Same Green Hill signature mark as Section 02.
 */
export function SelectedOpportunities() {
  const { ref, isInView } = useInView({ threshold: 0.12 });
  const { language, t } = useLanguage();
  const reduce = useReducedMotion();
  // Without a database: the demo set in development or an explicit demo build, otherwise nothing.
  const [source, setSource] = useState<Property[]>(isSupabaseConfigured ? [] : mockProperties);
  const [loaded, setLoaded] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSource(mockProperties);
      return;
    }

    let cancelled = false;

    const fetchProperties = async () => {
      try {
        const { data, error } = await publicOpportunities()
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        const rows = data ?? [];
        const normalized = rows.map((p: Record<string, unknown>) => ({
          ...p,
          image: (p.image_url as string) || (p.image as string),
          sqft: (p.m2 as number) || (p.sqft as number) || 0,
          priceType: (p.price_type as string) || (p.priceType as string),
          featured: (p.is_featured as boolean) ?? (p.featured as boolean),
          surfaceArea: (p.surface_area as string) || (p.surfaceArea as string),
          type: (p.type as string) || (p.property_type as string) || '',
          address: (p.address as string) || (p.location as string) || '',
          title: (p.title as string) || '',
          price: Number(p.price) || 0,
          bedrooms: Number(p.bedrooms) || 0,
          bathrooms: Number(p.bathrooms) || 0,
          status: (p.status as Property['status']) || 'sale',
          images: (p.images as string[]) || [],
          features: (p.features as Record<string, string>) || {},
        })) as Property[];

        setSource(normalized);
      } catch (err) {
        console.error('Error fetching curated opportunities:', err);
        if (!cancelled) setSource([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    fetchProperties();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reece chooses 3–6 in the admin (brief §4); the shipped default otherwise.
  const countSetting = Number(useContentText('cms.home.selected.count'));
  const count = Number.isFinite(countSetting) && countSetting >= 3 && countSetting <= 6 ? countSetting : undefined;
  const curated = useMemo(() => selectCuratedOpportunities(source, count), [source, count]);

  /*
   * Choreography mirrors Section 02: mark draws first, eyebrow settles, then
   * heading / lead / collection — calm editorial entrance, not a cascade.
   */
  const reveal = (delay: number, y = 14) => {
    if (reduce) {
      return {
        initial: { opacity: 0 },
        animate: isInView ? { opacity: 1 } : { opacity: 0 },
        transition: { duration: 0.4, delay: Math.min(delay, 0.1), ease: EASE },
      };
    }
    return {
      initial: { opacity: 0, y },
      animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y },
      transition: { duration: 0.72, delay, ease: EASE },
    };
  };

  const headlineLines = t('selected.headline').split('|');

  return (
    <section id="opportunities" className="gh-opp" aria-labelledby="gh-opp-heading">
      <div className="gh-opp__inner" ref={ref}>
        <header className="gh-opp__intro">
          <p className="gh-opp__eyebrow">
            <BrandCurveMark className="gh-opp__eyebrow-mark" isInView={isInView} />
            <motion.span {...reveal(0.14, 8)}>{t('selected.eyebrow')}</motion.span>
          </p>

          <h2 id="gh-opp-heading" className="gh-opp__headline">
            {headlineLines.map((line, i) => (
              <motion.span key={i} className="gh-opp__headline-line" {...reveal(0.22 + i * 0.06, 12)}>
                {i === headlineLines.length - 1 ? withGoldStop(line) : line}
              </motion.span>
            ))}
          </h2>

          <motion.p className="gh-opp__lead" {...reveal(0.34, 10)}>
            {t('selected.lead')}
          </motion.p>
        </header>

        <div className="gh-opp__collection">
          {loaded && curated.length === 0 ? (
            <p className="gh-opp__lead">{t('selected.empty')}</p>
          ) : null}
          {curated[0] && (
            <CuratedOpportunityCard
              property={curated[0]}
              index={0}
              lead
              inView={isInView}
            />
          )}

          {curated.length > 1 && (
            <div className="gh-sel-list" role="list">
              {curated.slice(1).map((property, i) => (
                <div key={property.id} role="listitem">
                  <CuratedOpportunityCard
                    property={property}
                    index={i + 1}
                    inView={isInView}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <motion.div className="gh-opp__footer" {...reveal(0.52, 10)}>
          <Link to={`/${language}/properties`} className="gh-opp__view-all">
            <span className="gh-opp__view-all-label">{t('selected.viewAll')}</span>
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
