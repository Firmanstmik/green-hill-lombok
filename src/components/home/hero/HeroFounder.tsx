import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHeroReveal } from './useHeroReveal';
import { HERO_EASE } from './heroData';

type Props = {
  onMeet: () => void;
};

/** When the block itself has settled; the sentence starts speaking after. */
const BLOCK_DELAY = 1.05;
const SPEAK_START = BLOCK_DELAY + 0.14;
/** Per-word offset. Slow enough to read as speech, quick enough not to nag. */
const WORD_STEP = 0.068;

/**
 * Founder annotation — a signature set into the photograph.
 * Deliberately not a card, a testimonial or a profile widget: a gold rule,
 * a name, a role, a line in his own voice, and a quiet text link.
 *
 * The line is revealed word by word rather than as a block, so it lands like
 * someone saying it rather than a caption appearing. Not a typewriter: no
 * per-character timing, no caret, no monospace tick — each word simply arrives
 * a beat after the last and stays. It plays once, on mount, and is not keyed
 * to the carousel, so changing chapter leaves Reece mid-sentence untouched.
 */
export function HeroFounder({ onMeet }: Props) {
  const { t } = useLanguage();
  const { reveal, reduce } = useHeroReveal();

  const words = t('hero.founderNote').split(/\s+/).filter(Boolean);

  /** The whole sentence arrives at once when motion is reduced. */
  const word = (i: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay: 0.16, ease: HERO_EASE } }
      : {
          initial: { opacity: 0, y: 5 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.52, delay: SPEAK_START + i * WORD_STEP, ease: HERO_EASE },
        };

  return (
    <motion.aside
      className="gh-hero-founder"
      {...reveal(BLOCK_DELAY, 8)}
      aria-label={t('hero.founderName')}
    >
      <span className="gh-hero-founder__rule" aria-hidden />
      <p className="gh-hero-founder__name">{t('hero.founderName')}</p>
      <p className="gh-hero-founder__role">{t('hero.founderRole')}</p>

      {/*
        One accessible sentence for assistive tech; the animated copy beside it
        is split into spans and hidden from the accessibility tree, so a screen
        reader never hears ten separate fragments.
      */}
      <blockquote className="gh-hero-founder__note">
        <p className="sr-only">{t('hero.founderNote')}</p>
        <p className="gh-hero-founder__spoken" aria-hidden>
          {/* The mark opens a beat before the first word — the breath before speech. */}
          <motion.span className="gh-hero-founder__mark" {...word(-0.9)}>
            &ldquo;
          </motion.span>
          {words.map((w, i) => (
            <Fragment key={i}>
              <motion.span className="gh-hero-founder__word" {...word(i)}>
                {w}
              </motion.span>
              {i < words.length - 1 ? ' ' : null}
            </Fragment>
          ))}
          <motion.span className="gh-hero-founder__mark" {...word(words.length - 1)}>
            &rdquo;
          </motion.span>
        </p>
      </blockquote>

      <button type="button" onClick={onMeet} className="gh-hero-founder__link">
        <span>{t('hero.meetReece')}</span>
        <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden />
      </button>
    </motion.aside>
  );
}
