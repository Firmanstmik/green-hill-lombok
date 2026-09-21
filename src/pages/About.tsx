import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import heroBg from '@/assets/Ukon_Estate_Hero.avif';
import heroVideo from '@/assets/Ukon_Estate_hero-video-v2.mp4';

const About = () => {
  const { language } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* ── 1. Hero Section ── */}
        <section className="relative py-28 md:py-36 overflow-hidden">
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

          <div className="absolute inset-0 bg-black/60" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl">
              <h1 className="text-[2.5rem] md:text-[3.25rem] lg:text-[4rem] font-bold text-white mb-6 tracking-tight leading-[1.1]">
                Real Estate Without Borders.
              </h1>
              <p className="text-xl md:text-2xl text-white/75 font-light mb-5">
                Global reach. Local expertise. Strategic representation worldwide.
              </p>
              <p className="text-white/50 text-lg max-w-xl leading-relaxed">
                We connect discerning clients with exceptional properties across
                international markets — delivering advisory-led service at every stage.
              </p>
            </div>
          </div>
        </section>

        {/* ── 2. Prestige Metrics Grid ── */}
        <section className="py-24 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12">
              {[
                { value: '—', label: 'Years of Experience' },
                { value: '—', label: 'Properties Transacted' },
                { value: '—', label: 'Private Clients Represented' },
                { value: '—', label: 'Client Satisfaction' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`text-center ${
                    i < 3 ? 'md:border-r md:border-border' : ''
                  }`}
                >
                  <div className="text-5xl md:text-6xl font-bold text-foreground mb-3">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground/70 tracking-[0.15em] uppercase">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Our Story — Editorial Two-Column ── */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-28 items-start">
              <div>
                <h2 className="text-[2rem] md:text-[2.75rem] font-bold text-foreground leading-[1.15]">
                  A Global Brokerage Built
                  <br />
                  on Local Intelligence
                </h2>
              </div>
              <div className="space-y-6 max-w-lg">
                <p className="text-muted-foreground text-lg leading-[1.85]">
                  Green Hill is in early development. This page currently shows placeholder
                  copy only — not claims from any prior project or live business metrics.
                </p>
                <p className="text-muted-foreground text-lg leading-[1.85]">
                  Strategic content, market positioning, and real client outcomes will be
                  added once Green Hill branding and data sources are established.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Three Pillars ── */}
        <section className="py-32 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-20">
              {[
                {
                  title: 'GLOBAL NETWORK',
                  text: 'We operate across borders, connecting clients to opportunities in established and emerging markets worldwide.',
                },
                {
                  title: 'LOCAL COLLABORATION',
                  text: 'In every market we serve, we partner with trusted local professionals who share our standards and values.',
                },
                {
                  title: 'STRATEGIC EXECUTION',
                  text: 'Every transaction is guided by a disciplined process — from sourcing and due diligence to negotiation and closing.',
                },
              ].map((pillar) => (
                <div key={pillar.title}>
                  <h3 className="text-sm font-bold tracking-[0.2em] text-foreground mb-5">
                    {pillar.title}
                  </h3>
                  <div className="w-8 h-px bg-foreground/25 mb-8" />
                  <p className="text-muted-foreground leading-[1.8] max-w-xs">
                    {pillar.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Operating Model ── */}
        <section className="py-32">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
              How We Work
            </h2>
            <p className="text-muted-foreground text-lg leading-[1.85] mb-10">
              Our operating model is built around clarity, accountability, and
              client-centricity. From the first consultation to final settlement, every
              step is managed with precision.
            </p>
            <ul className="space-y-6 text-muted-foreground text-lg leading-[1.8]">
              <li className="flex items-start gap-3">
                <span className="mt-2.5 block w-1.5 h-1.5 rounded-full bg-foreground/30 shrink-0" />
                <span>
                  Initial consultation to define objectives, timelines, and market
                  parameters.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2.5 block w-1.5 h-1.5 rounded-full bg-foreground/30 shrink-0" />
                <span>
                  Curated property sourcing aligned to client criteria and investment
                  thesis.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2.5 block w-1.5 h-1.5 rounded-full bg-foreground/30 shrink-0" />
                <span>
                  Due diligence coordination across legal, financial, and structural
                  dimensions.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2.5 block w-1.5 h-1.5 rounded-full bg-foreground/30 shrink-0" />
                <span>
                  Negotiation and transaction management through to completion.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2.5 block w-1.5 h-1.5 rounded-full bg-foreground/30 shrink-0" />
                <span>
                  Post-acquisition support including property management referrals and
                  ongoing advisory.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ── 6. Values Section ── */}
        <section className="py-32 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-20">
              {[
                {
                  title: 'CLIENT-FIRST',
                  text: 'Every decision is anchored in the best interest of the client.',
                },
                {
                  title: 'EXCELLENCE',
                  text: 'We hold ourselves to the highest standard in every interaction.',
                },
                {
                  title: 'INTEGRITY',
                  text: 'Transparency and honesty define every relationship we build.',
                },
              ].map((value) => (
                <div key={value.title} className="text-center">
                  <h3 className="text-base font-bold tracking-[0.2em] text-foreground mb-5">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground/70 leading-relaxed">
                    {value.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. Closing Section ── */}
        <section className="py-32">
          <div className="container mx-auto px-4 text-center">
            <div className="w-12 h-px bg-foreground/20 mx-auto mb-12" />
            <p className="text-3xl md:text-[2.5rem] font-light text-foreground max-w-2xl mx-auto mb-14 leading-snug">
              Exceptional properties deserve strategic representation.
            </p>
            <Link to={`/${language}/properties`}>
              <Button
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90 px-10 py-6 text-base"
              >
                View Listings
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
