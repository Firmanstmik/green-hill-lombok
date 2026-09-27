import { motion } from 'framer-motion';
import { ArrowDown } from '@/icons/iconsax';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHeroReveal } from './useHeroReveal';

type Props = {
  onScroll: () => void;
};

export function HeroScrollCue({ onScroll }: Props) {
  const { t } = useLanguage();
  const { reveal, reduce } = useHeroReveal();

  return (
    <motion.button
      type="button"
      onClick={onScroll}
      className={`gh-hero-scroll${reduce ? ' is-static' : ''}`}
      {...reveal(1.28, 0)}
      aria-label={t('hero.scrollExplore')}
    >
      <span className="gh-hero-scroll__label">{t('hero.scrollExplore')}</span>
      <span className="gh-hero-scroll__orb" aria-hidden>
        <ArrowDown size={14} strokeWidth={1.5} />
      </span>
    </motion.button>
  );
}
