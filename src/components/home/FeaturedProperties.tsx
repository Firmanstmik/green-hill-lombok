import { useState, useEffect, useMemo, Fragment } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/PropertyCard';
import { properties as mockProperties } from '@/data/mockData';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useSavedListings } from '@/hooks/useSavedListings';

export function FeaturedProperties() {
  const { ref, isInView } = useInView();
  const { language, t } = useLanguage();
  const { isSaved, toggle } = useSavedListings();
  const [displayProperties, setDisplayProperties] = useState<any[]>(mockProperties);

  useEffect(() => {
    // Isolation: never query the former Ukon Estate database
    if (!isSupabaseConfigured) {
      setDisplayProperties(mockProperties);
      return;
    }

    const fetchProperties = async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const propertiesToDisplay = data && data.length > 0 ? data : mockProperties;

        const normalized = propertiesToDisplay.map((p) => ({
          ...p,
          image: p.image_url || p.image,
          sqft: p.m2 || p.sqft || 0,
          priceType: p.price_type || p.priceType,
          isUkonAgent: p.is_ukon_agent || p.isUkonAgent,
          featured: p.is_featured ?? p.featured,
        }));

        setDisplayProperties(normalized);
      } catch (err) {
        console.error('Error fetching featured properties:', err);
        setDisplayProperties(mockProperties);
      }
    };

    fetchProperties();
  }, []);

  const featuredProperties = useMemo(() => {
    const DISPLAY_COUNT = 6;
    const featured = displayProperties.filter((p) => p.featured);

    if (featured.length >= DISPLAY_COUNT) {
      return featured.slice(0, DISPLAY_COUNT);
    }

    const featuredIds = new Set(featured.map((p) => p.id));
    const nonFeatured = displayProperties.filter((p) => !featuredIds.has(p.id));
    return [...featured, ...nonFeatured].slice(0, DISPLAY_COUNT);
  }, [displayProperties]);

  const headline = t('properties.featuredSubtitle');

  return (
    <section id="opportunities" className="py-24 md:py-28" style={{ backgroundColor: '#F7F5F0' }}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-10">
        <div ref={ref} className="gh-featured-header mb-14 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="gh-featured-header__meta"
          >
            <span className="gh-label text-[#2D3621]/55">{t('properties.featured')}</span>
            <span className="gh-featured-header__chips" aria-hidden>
              <span>{t('properties.exampleLand')}</span>
              <span className="gh-featured-header__dot" />
              <span>{t('properties.exampleVilla')}</span>
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scaleX: 0.85 }}
            animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="gh-featured-header__rule"
          />

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="gh-featured-header__title"
          >
            {headline.split('|').map((line, i) => {
              const parts = line.split('&');
              return (
                <span key={i} className="gh-featured-header__line">
                  {parts.map((part, j) => (
                    <Fragment key={j}>
                      {j > 0 && <em>&</em>}
                      {part}
                    </Fragment>
                  ))}
                </span>
              );
            })}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="gh-featured-header__lead"
          >
            {t('properties.featuredLead')}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProperties.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={index}
              eager={index === 0}
              isSaved={isSaved(property.id)}
              onToggleSave={() => toggle(property.id)}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-12"
        >
          <Button
            asChild
            size="lg"
            className="gh-btn gh-btn--primary bg-[#2D3621] hover:bg-[#2D3621] text-white border-none h-12 px-8 font-sans font-semibold tracking-[0.06em] uppercase text-[12px]"
          >
            <Link to={`/${language}/properties`}>
              {t('properties.viewAllProperties')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
