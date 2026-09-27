import { useEffect, useRef, useState } from 'react';
import type { HeroSlide } from './heroData';

/**
 * The editorial caption under the headline: the description Reece keeps for
 * each hero photograph in the CMS (Content → Homepage), so the text belongs to
 * the picture on screen.
 *
 * All captions share one grid cell, so the block is always as tall as the
 * longest caption and the headline, supporting line and buttons never move.
 * Only the caption for the current photograph is visible and read out; the
 * previous one leaves upwards as the new one rises in (timings in CSS).
 */
export function HeroCaption({ slides, activeIndex }: { slides: HeroSlide[]; activeIndex: number }) {
  const [leaving, setLeaving] = useState<number | null>(null);
  const previous = useRef(activeIndex);

  useEffect(() => {
    if (previous.current === activeIndex) return;
    setLeaving(previous.current);
    previous.current = activeIndex;
  }, [activeIndex]);

  return (
    <div className="gh-hero-caption">
      <div className="gh-hero-caption__stack">
        {slides.map((slide, index) => {
          const state = index === activeIndex ? 'active' : index === leaving ? 'leaving' : 'waiting';
          return (
            <p
              key={slide.id}
              className="gh-hero-caption__text"
              data-state={state}
              aria-hidden={state !== 'active' || undefined}
            >
              {slide.alt}
            </p>
          );
        })}
      </div>
    </div>
  );
}
