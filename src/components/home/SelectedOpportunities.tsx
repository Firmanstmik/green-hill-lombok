import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { properties as mockProperties, type Property } from '@/data/mockData';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { CuratedOpportunityCard } from './opportunities/CuratedOpportunityCard';
import { selectCuratedOpportunities } from './opportunities/selectCuratedOpportunities';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Section 03 — Selected Opportunities.
 * Curated editorial collection. Same Green Hill signature mark as Section 02.
 */
export function SelectedOpportunities() {
  const { ref, isInView } = useInView({ threshold: 0.12 });
  const { language, t } = useLanguage();
  const reduce = useReducedMotion();
  const [source, setSource] = useState<Property[]>(mockProperties);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSource(mockProperties);
      return;
    }

    let cancelled = false;

    const fetchProperties = async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        const rows = data && data.length > 0 ? data : mockProperties;
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
          isUkonAgent: Boolean(p.is_ukon_agent || p.isUkonAgent),
        })) as Property[];

        setSource(normalized);
      } catch (err) {
        console.error('Error fetching curated opportunities:', err);
        if (!cancelled) setSource(mockProperties);
      }
    };

    fetchProperties();
    return () => {
      cancelled = true;
    };
  }, []);

  const curated = useMemo(() => selectCuratedOpportunities(source), [source]);

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
                {line}
              </motion.span>
            ))}
          </h2>

          <motion.p className="gh-opp__lead" {...reveal(0.34, 10)}>
            {t('selected.lead')}
          </motion.p>
        </header>

        <div className="gh-opp__collection">
          {curated[0] && (
            <CuratedOpportunityCard
              property={curated[0]}
              index={0}
              lead
              inView={isInView}
            />
          )}

          {curated.length > 1 && (
            <div className="gh-opp__list" role="list">
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
            <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
