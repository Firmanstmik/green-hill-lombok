import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { OpportunityCard } from '@/components/properties/OpportunityCard';
import { OpportunityFilters } from '@/components/properties/OpportunityFilters';
import {
  lensesPresent,
  opportunityLensOf,
  type OpportunityLens,
} from '@/components/properties/opportunityMeta';
import { demoOpportunities as mockProperties, type Property } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFilters } from '@/hooks/useFilters';
import { useInView } from '@/hooks/useInView';
import { isSupabaseConfigured } from '@/lib/supabase';
import { publicOpportunities } from '@/lib/publicOpportunities';
import heroLand from '@/assets/greenhill/hero-masters/green-hill-hero-section-3.webp';
import talkBackdrop from '@/assets/greenhill/bg-sec-talk-to-reece.webp';
import talkPhoto1 from '@/assets/greenhill/sec-talk-to-reece1.webp';
import founderPortrait from '@/assets/greenhill/founder/green-hill-reece-green.webp';
import { useCmsPageSeo, useContentImage } from '@/content/hooks';

const EASE = [0.22, 1, 0.36, 1] as const;

function sectionReveal(inView: boolean, delay: number, reduce: boolean | null) {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: inView ? { opacity: 1 } : { opacity: 0 },
      transition: { duration: 0.35, delay: Math.min(delay, 0.08), ease: EASE },
    };
  }
  return {
    initial: { opacity: 0, y: 14 },
    animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    transition: { duration: 0.72, delay, ease: EASE },
  };
}

const Properties = () => {
  const { language, t } = useLanguage();
  const heroImage = useContentImage('opportunities.hero', heroLand, 'cms.opportunities.hero.alt');
  const portrait = useContentImage('site.reece.portrait', founderPortrait);
  useCmsPageSeo({
    titleKey: 'cms.opportunities.seo.title',
    descriptionKey: 'cms.opportunities.seo.description',
    imageSlot: 'opportunities.seo.image',
    path: '/properties',
  });
  const reduce = useReducedMotion();
  const intro = useInView({ threshold: 0.28 });
  const close = useInView({ threshold: 0.3 });
  // Without a database: the demo set in development or an explicit demo build, otherwise nothing.
  const [displayProperties, setDisplayProperties] = useState<Property[]>(isSupabaseConfigured ? [] : mockProperties);
  const [loaded, setLoaded] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setDisplayProperties(mockProperties);
      return;
    }

    const fetchProperties = async () => {
      try {
        const { data, error } = await publicOpportunities()
          .order('created_at', { ascending: false });

        if (error) throw error;

        const propertiesToDisplay = data ?? [];

        const normalized = propertiesToDisplay.map((p) => ({
          ...p,
          image: p.image_url || p.image,
          sqft: p.m2 || p.sqft || 0,
          priceType: p.price_type || p.priceType,
          buildingArea: p.building_area || p.buildingArea,
          surfaceArea: p.surface_area || p.surfaceArea,
          yearBuilt: p.year_built || p.yearBuilt,
          listingCode: p.listing_code || p.listingCode,
          nearbyAmenities: p.nearby_amenities || p.nearbyAmenities,
        }));

        setDisplayProperties(normalized);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setDisplayProperties([]);
      } finally {
        setLoaded(true);
      }
    };

    fetchProperties();
  }, []);

  const { filters, setFilter, resetFilters, filteredProperties } = useFilters(displayProperties);
  const lenses = useMemo(() => lensesPresent(displayProperties), [displayProperties]);
  const lens = filters.collection;

  useEffect(() => {
    if (lens !== 'all' && !lenses.includes(lens)) {
      setFilter('collection', 'all');
    }
  }, [lens, lenses, setFilter]);

  const applyLens = (next: OpportunityLens) => {
    setFilter('collection', next);
    if (next === 'villa') setFilter('propertyType', 'Villa');
    else if (next === 'land') setFilter('propertyType', 'Land');
    else setFilter('propertyType', 'all');
  };

  const clearFilters = () => {
    resetFilters();
  };

  const visible = filteredProperties.filter((property) => {
    if (lens === 'all') return true;
    return opportunityLensOf(property) === lens;
  });

  const reveal = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.35, delay, ease: EASE } }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.75, delay, ease: EASE },
        };

  const homeHash = (hash: string) => `/${language}/#${hash}`;

  return (
    <div className="gh-arch min-h-screen overflow-x-hidden">
      <Navbar />

      <main>
        <section className="gh-arch-hero" aria-labelledby="gh-arch-heading">
          <div className="gh-arch-hero__media">
            <motion.img
              src={heroImage.src}
              alt={heroImage.alt || 'Elevated South Lombok valley at golden hour, looking across the landscape toward the coast'}
              style={heroImage.focus ? { objectPosition: heroImage.focus } : undefined}
              className="gh-arch-hero__img"
              width={1672}
              height={941}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduce ? 0.4 : 1.15, ease: EASE }}
            />
          </div>
          <div className="gh-arch-hero__veil" aria-hidden />
          <div className="gh-arch-hero__inner">
            <p className="gh-arch-hero__eyebrow">
              <BrandCurveMark className="gh-arch-hero__eyebrow-mark" isInView />
              <motion.span {...reveal(0.22)}>{t('properties.archive.eyebrow')}</motion.span>
            </p>
            <motion.h1 id="gh-arch-heading" className="gh-arch-hero__title" {...reveal(0.4)}>
              {t('properties.archive.headline')}
            </motion.h1>
            <motion.p className="gh-arch-hero__lead" {...reveal(0.55)}>
              {t('properties.archive.lead')}
            </motion.p>
          </div>
          <div className="gh-arch-hero__wave" aria-hidden>
            <svg viewBox="0 0 1440 96" preserveAspectRatio="none">
              <path
                fill="#F1EDE5"
                d="M0 46C140 78 260 18 460 30C680 44 820 86 1040 64C1220 46 1340 16 1440 34V96H0Z"
              />
            </svg>
          </div>
        </section>

        <section className="gh-arch-body" aria-labelledby="gh-arch-collection">
          <div className="gh-arch-body__inner">
            <div className="gh-arch-seam" aria-hidden>
              <BrandCurveMark className="gh-arch-hero__seam-mark" isInView />
            </div>
            <OpportunityFilters
              filters={filters}
              setFilter={setFilter}
              lenses={lenses}
              lens={lens}
              onLens={applyLens}
              onClear={clearFilters}
            />

            <header className="gh-arch-intro" ref={intro.ref}>
              <div className="gh-arch-intro__main">
                <motion.p className="gh-arch-intro__index" {...sectionReveal(intro.isInView, 0.3, reduce)}>
                  <BrandCurveMark className="gh-arch-intro__mark" isInView={intro.isInView} />
                  <span>{t('properties.archive.collectionLabel')}</span>
                </motion.p>
                <motion.h2
                  id="gh-arch-collection"
                  className="gh-arch-intro__title"
                  {...sectionReveal(intro.isInView, 0.45, reduce)}
                >
                  {t('properties.archive.collectionHeadline')}
                </motion.h2>
              </div>
              <motion.div className="gh-arch-intro__aside" {...sectionReveal(intro.isInView, 0.65, reduce)}>
                <p className="gh-arch-count">
                  {String(visible.length).padStart(2, '0')} {t('properties.archive.opportunities')}
                </p>
                <p className="gh-arch-intro__lead">{t('properties.archive.collectionLead')}</p>
              </motion.div>
            </header>

            {visible.length > 0 ? (
              <div className="gh-arch-grid">
                  {visible.map((property, index) => (
                    <OpportunityCard key={property.id} property={property} index={index} />
                  ))}
              </div>
            ) : !loaded ? null : displayProperties.length === 0 ? (
              <div className="gh-arch-empty">
                <p>{t('properties.archive.emptyCollection')}</p>
                <Link className="gh-arch-empty__clear" to={`/${language}/enquire`}>
                  {t('properties.archive.emptyCollectionCta')}
                  <span aria-hidden>↗</span>
                </Link>
              </div>
            ) : (
              <div className="gh-arch-empty">
                <p>{t('properties.archive.empty')}</p>
                <button type="button" className="gh-arch-empty__clear" onClick={clearFilters}>
                  {t('properties.archive.clear')}
                  <span aria-hidden>↗</span>
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="gh-arch-close" aria-labelledby="gh-arch-close-heading" ref={close.ref}>
          <div className="gh-arch-close__backdrop" aria-hidden>
            <img src={talkBackdrop} alt="" width={1920} height={1080} loading="lazy" decoding="async" />
          </div>
          <div className="gh-arch-close__inner">
            <div className="gh-arch-close__copy">
              <p className="gh-arch-close__eyebrow">
                <BrandCurveMark className="gh-arch-close__mark" isInView={close.isInView} />
                <span>{t('properties.archive.closeEyebrow')}</span>
              </p>
              <h2 id="gh-arch-close-heading" className="gh-arch-close__title">
                {t('properties.archive.closeHeadline')}
              </h2>
              <p className="gh-arch-close__lead">{t('properties.archive.closeLead')}</p>
              <div className="gh-arch-close__actions">
                <a className="gh-final__cta gh-final__cta--primary" href={homeHash('contact')}>
                  <span className="gh-final__cta-label">{t('properties.archive.talkToReece')}</span>
                  <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
                </a>
                <a className="gh-final__cta gh-final__cta--secondary" href={`/${language}/private`}>
                  <span className="gh-final__cta-label">{t('properties.archive.closePrivate')}</span>
                  <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
                </a>
              </div>
            </div>
            <div className="gh-arch-close__stage" aria-hidden>
              <figure className="gh-arch-close__plate">
                <img src={talkPhoto1} alt="" width={720} height={960} loading="lazy" decoding="async" />
              </figure>
              <figure className="gh-arch-close__inset">
                <img src={portrait.src} alt="" width={1087} height={1447} loading="lazy" decoding="async" />
              </figure>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Properties;
