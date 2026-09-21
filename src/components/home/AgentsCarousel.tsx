import { motion, useAnimationControls, useMotionValue } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { agents } from '@/data/mockData';
import { useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/** Photos come from local demo agent data — original carousel structure preserved */
const agentPhotos: Record<string, string> = Object.fromEntries(
  agents.map((a) => [a.id, a.photo])
);

export function AgentsCarousel() {
  const { t } = useLanguage();
  const duplicatedAgents = [...agents, ...agents, ...agents, ...agents];
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const x = useMotionValue(0);
  const isDragging = useRef(false);
  const animationRef = useRef<number>();

  const startAutoScroll = useCallback(() => {
    if (!containerRef.current) return;
    const totalWidth = containerRef.current.scrollWidth / 4;
    const currentX = x.get();
    // Calculate remaining distance as fraction
    const progress = Math.abs(currentX % totalWidth) / totalWidth;
    const remainingDuration = 30 * (1 - progress);

    controls.start({
      x: currentX - totalWidth + (currentX % totalWidth),
      transition: {
        ease: 'linear',
        duration: remainingDuration > 0 ? remainingDuration : 30,
        repeat: Infinity,
        repeatType: 'loop',
      },
    });
  }, [controls, x]);

  useEffect(() => {
    // Small delay to let layout settle
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const totalWidth = containerRef.current.scrollWidth / 4;
      controls.start({
        x: -totalWidth,
        transition: { ease: 'linear', duration: 30, repeat: Infinity, repeatType: 'loop' },
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [controls]);

  const handleDragStart = () => {
    isDragging.current = true;
    controls.stop();
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    // Wrap position to avoid drifting too far
    if (containerRef.current) {
      const totalWidth = containerRef.current.scrollWidth / 4;
      const currentX = x.get();
      const wrapped = currentX % totalWidth;
      x.set(wrapped);
    }
    startAutoScroll();
  };

  return (
    <section className="py-24 bg-background overflow-hidden w-full relative">
      <div className="container mx-auto px-4 mb-12 text-center">
        <span className="gh-label inline-block text-[#2D3621]/50 mb-5">
          {t('agents.ourTeam')}
        </span>
        <h2 className="gh-section-display">
          {t('agents.meetOurExperts')}
        </h2>
      </div>

      <div className="w-full overflow-hidden cursor-grab active:cursor-grabbing">
        <motion.div
          ref={containerRef}
          className="flex gap-6 w-max pl-6"
          style={{ x, willChange: 'transform' }}
          animate={controls}
          drag="x"
          dragConstraints={{ left: -99999, right: 0 }}
          dragElastic={0}
          dragMomentum={false}
          dragTransition={{ power: 0, timeConstant: 200, restDelta: 0.001 }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {duplicatedAgents.map((agent, index) => (
            <div
              key={`${agent.id}-${index}`}
              className="group relative flex-shrink-0 select-none"
              style={{ width: '19vw', minWidth: '260px', maxWidth: '340px' }}
            >
              <div
                className="relative w-full overflow-hidden mb-4"
                style={{ borderRadius: '1.5rem', aspectRatio: '801/1000' }}
              >
                <img
                  src={agentPhotos[agent.id] || agent.photo}
                  alt={agent.name}
                  loading="lazy"
                  className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 group-hover:brightness-110 group-hover:saturate-[1.15] transition-all duration-300 ease-out pointer-events-none"
                  draggable={false}
                />
              </div>
              <div className="flex flex-col items-start px-2">
                <h3 className="text-xl font-sans font-semibold tracking-[-0.01em] text-[#2D3621] leading-tight">
                  {agent.name}
                </h3>
                <div className="flex items-center gap-1.5 text-muted-foreground mt-1.5">
                  <MapPin size={14} className="text-ukon-red fill-current" />
                  <span className="text-sm font-medium">{agent.location}</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
