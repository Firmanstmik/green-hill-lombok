import { motion } from 'framer-motion';
import { Store, Handshake, KeyRound, TrendingUp, SlidersHorizontal, Settings } from 'lucide-react';
import { services } from '@/data/mockData';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';

const iconMap: Record<string, React.ReactNode> = {
  Home: <Store size={22} strokeWidth={1.5} />,
  Users: <Handshake size={22} strokeWidth={1.5} />,
  Key: <KeyRound size={22} strokeWidth={1.5} />,
  TrendingUp: <TrendingUp size={22} strokeWidth={1.5} />,
  BarChart: <SlidersHorizontal size={22} strokeWidth={1.5} />,
  Settings: <Settings size={22} strokeWidth={1.5} />,
};

export function ServicesSection() {
  const { ref, isInView } = useInView();
  const { t } = useLanguage();

  // Map service IDs to translation keys
  const serviceTranslationMap: Record<string, { titleKey: string; descKey: string }> = {
    '1': { titleKey: 'services.propertySales', descKey: 'services.propertySalesDescription' },
    '2': { titleKey: 'services.buyerRepresentation', descKey: 'services.buyerRepresentationDescription' },
    '3': { titleKey: 'services.rentalManagement', descKey: 'services.rentalManagementDescription' },
    '4': { titleKey: 'services.investmentConsulting', descKey: 'services.investmentConsultingDescription' },
    '5': { titleKey: 'services.propertyValuation', descKey: 'services.propertyValuationDescription' },
    '6': { titleKey: 'services.tailoredSolutions', descKey: 'services.tailoredSolutionsDescription' },
  };

  return (
    <section id="services" className="py-20 lg:py-28 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
        {/* Header */}
        <div ref={ref} className="text-center mb-14 lg:mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="gh-label inline-block text-[#2D3621]/50 mb-5"
          >
            {t('services.whatWeDo')}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="gh-section-display max-w-3xl mx-auto normal-case"
          >
            {t('services.exploreOurRange')}
          </motion.h2>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, index) => {
            const translationMap = serviceTranslationMap[service.id];
            const title = translationMap ? t(translationMap.titleKey) : service.title;
            const description = translationMap ? t(translationMap.descKey) : service.description;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#f3f3f3] rounded-[20px] p-8 lg:p-10 flex flex-col"
              >
                {/* Icon */}
                <div className="w-12 h-12 bg-[#e5e5e5] rounded-full flex items-center justify-center text-[#111827] mb-8">
                  {iconMap[service.icon]}
                </div>

                {/* Content */}
                <h3 className="text-lg lg:text-xl font-sans font-semibold text-[#2D3621] mb-3 tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="text-[#2D3621]/60 text-[15px] font-sans font-normal leading-relaxed">
                  {description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
