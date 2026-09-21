import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { agents } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInView } from '@/hooks/useInView';
import { GlobalMap } from '@/components/agents/GlobalMap';
import { RegionSection } from '@/components/agents/RegionSection';
import { NetworkModelSection } from '@/components/agents/NetworkModelSection';
import heroBg from '@/assets/Ukon_Estate_Hero.avif';
import heroVideo from '@/assets/Ukon_Estate_hero-video-v2.mp4';

/** Photos come from local placeholder data only — no prior-project agent assets */
const agentPhotos: Record<string, string> = Object.fromEntries(
  agents.map((agent) => [agent.id, agent.photo])
);

type RegionKey = 'all' | 'europe' | 'southeast-asia';

const regions: { key: RegionKey; filterKey: string; titleKey: string; subtextKey: string }[] = [
  { key: 'europe', filterKey: 'agents.filterEurope', titleKey: 'agents.regionEurope', subtextKey: 'agents.regionEuropeSubtext' },
  { key: 'southeast-asia', filterKey: 'agents.filterSoutheastAsia', titleKey: 'agents.regionSoutheastAsia', subtextKey: 'agents.regionSoutheastAsiaSubtext' },
];

const Agents = () => {
  const { t, language } = useLanguage();
  const { ref, isInView } = useInView();
  const [activeFilter, setActiveFilter] = useState<RegionKey>('all');

  const handleFilterClick = (key: RegionKey) => {
    setActiveFilter(key);
    if (key !== 'all') {
      const el = document.getElementById(`region-${key}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const agentsByRegion = useMemo(() => {
    const grouped: Record<string, typeof agents> = {};
    for (const region of regions) {
      grouped[region.key] = agents.filter((a) => a.region === region.key);
    }
    return grouped;
  }, []);

  const uniqueCountries = useMemo(() => {
    return new Set(agents.map((a) => a.country)).size;
  }, []);

  const visibleRegions = activeFilter === 'all'
    ? regions
    : regions.filter((r) => r.key === activeFilter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* ── 1. Hero Section — Institutional ── */}
        <section className="relative py-16 md:py-22 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={heroBg}
            src={heroVideo}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ display: 'block', transform: 'scale(1.05)' }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

          <div className="container mx-auto px-4 relative z-10">
            <div ref={ref} className="max-w-2xl">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="inline-block px-4 py-2 bg-white/10 text-white/80 rounded-full text-sm font-medium mb-6 tracking-wide"
              >
                {t('agents.ourNetwork')}
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-[2.5rem] md:text-[3.25rem] lg:text-[4rem] font-bold text-white mb-6 tracking-tight leading-[1.1]"
              >
                {t('agents.headline')}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl md:text-2xl text-white/75 font-light mb-5 max-w-xl"
              >
                {t('agents.subheadline')}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-white/50 text-lg mb-10"
              >
                {t('agents.supportingLine')}
              </motion.p>

              {/* Metric row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="flex items-center gap-6 text-white/40 text-sm"
              >
                <span>{uniqueCountries} {t('agents.metricCountries')}</span>
                <span className="w-px h-3 bg-white/20" />
                <span>2 {t('agents.metricContinents')}</span>
                <span className="w-px h-3 bg-white/20" />
                <span>— {t('agents.metricTransactions')}</span>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── 2. Global Presence Map ── */}
        <GlobalMap />

        {/* ── 3. Region Filter ── */}
        <section className="pt-32 pb-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'all' as RegionKey, label: t('agents.filterAll') },
                ...regions.map((r) => ({ key: r.key, label: t(r.filterKey) })),
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => handleFilterClick(filter.key)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors duration-150 ${
                    activeFilter === filter.key
                      ? 'bg-foreground text-background'
                      : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Regional Agent Sections ── */}
        <section className="pb-32">
          <div className="container mx-auto px-4 space-y-32">
            {visibleRegions.map((region) => (
              <RegionSection
                key={region.key}
                id={`region-${region.key}`}
                title={t(region.titleKey)}
                subtext={t(region.subtextKey)}
                agents={agentsByRegion[region.key] || []}
                agentPhotos={agentPhotos}
              />
            ))}
          </div>
        </section>

        {/* ── 5. Network Model ── */}
        <NetworkModelSection />

        {/* ── 6. Strategic Partnership CTA ── */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-ukon-navy rounded-xl p-14 md:p-20 text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {t('agents.partnerHeadline')}
              </h2>
              <p className="text-white/60 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
                {t('agents.partnerSubtext')}
              </p>
              <Link
                to={`/${language}/partners`}
                className="inline-flex items-center px-8 py-3.5 bg-white text-ukon-navy font-medium text-base rounded-lg hover:bg-white/90 transition-colors duration-150"
              >
                {t('agents.explorePartnership')} →
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Agents;
