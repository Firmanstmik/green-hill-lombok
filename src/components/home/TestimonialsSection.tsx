import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { testimonials } from '@/data/mockData';

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Auto-advance every 6 seconds, pause on hover
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      nextTestimonial();
    }, 6000);

    return () => clearInterval(interval);
  }, [isPaused, currentIndex]);

  return (
    <section className="py-12 md:py-16 bg-ukon-navy overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Authority Bar */}
        <div className="flex items-center justify-center gap-6 mb-10 max-w-sm mx-auto px-4">
          <div className="flex-1 h-px bg-white/15" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-lg font-serif text-white/80">—</span>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={13} className="fill-amber-300/60 text-amber-300/60" />
              ))}
            </div>
            <p className="text-white/40 text-xs font-sans tracking-[0.12em] uppercase">Investor conversations — coming soon</p>
          </div>
          <div className="flex-1 h-px bg-white/15" />
        </div>

        {/* Testimonial Carousel - Editorial Pull-Quote */}
        <div
          className="relative max-w-4xl mx-auto px-12 md:px-20"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Left Arrow */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-16 text-white/15 hover:text-white/40 transition-colors duration-200 p-2"
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={28} />
          </button>

          {/* Right Arrow */}
          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-16 text-white/15 hover:text-white/40 transition-colors duration-200 p-2"
            aria-label="Next testimonial"
          >
            <ChevronRight size={28} />
          </button>
          {/* Subtle Radial Gradient Background */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
            }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative px-8 md:px-16 py-8 min-h-[180px] flex flex-col justify-center"
            >
              {/* Oversized Decorative Quotation Mark - Background */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 text-white/[0.04] leading-none pointer-events-none select-none font-serif" style={{ fontSize: '18rem' }}>
                "
              </div>

              {/* Review Text - Editorial Style */}
              <p className="text-2xl md:text-3xl text-center leading-[1.55] font-display italic font-normal text-white/90 tracking-[-0.01em] mb-4 relative z-10">
                {testimonials[currentIndex].review}
              </p>

              {/* Divider */}
              <div className="w-12 h-px bg-white/20 mx-auto mb-4" />

              {/* Rating - Below Quote, Warm Amber */}
              <div className="flex items-center justify-center gap-1 mb-6">
                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Star size={13} className="fill-amber-300/60 text-amber-300/60" />
                  </motion.div>
                ))}
              </div>

              {/* Client Info - Minimal Authority */}
              <div className="flex items-center justify-center gap-3">
                <img
                  src={testimonials[currentIndex].photo}
                  alt={testimonials[currentIndex].clientName}
                  className="w-11 h-11 rounded-2xl object-cover border border-white/15"
                />
                <div className="text-center md:text-left">
                  <div className="text-white/85 font-medium text-sm tracking-wide leading-tight">
                    {testimonials[currentIndex].clientName}
                  </div>
                  <div className="text-white/40 text-xs tracking-[0.1em] uppercase leading-tight">
                    {testimonials[currentIndex].clientType}
                    {testimonials[currentIndex].location && (
                      <>
                        {' '} · {testimonials[currentIndex].location}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
