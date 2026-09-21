import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/home/HeroSection';
import { FounderSection } from '@/components/home/FounderSection';
import { SelectedOpportunities } from '@/components/home/SelectedOpportunities';
import { GreenHillPrivate } from '@/components/home/GreenHillPrivate';
import { TrustEducation } from '@/components/home/TrustEducation';
import { FinalCTA } from '@/components/home/FinalCTA';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="gh-app-shell-main">
        <HeroSection />
        <FounderSection />
        <SelectedOpportunities />
        <GreenHillPrivate />
        <TrustEducation />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
