import { AboutSection } from '@/components/marketing/about-section'
import { AuthoritiesSection } from '@/components/marketing/authorities-section'
import { CtaSection } from '@/components/marketing/cta-section'
import { HeroSection } from '@/components/marketing/hero-section'
import { StatisticsSection } from '@/components/marketing/statistics-section'

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-24 pb-24 md:gap-32">
      <HeroSection />
      <AuthoritiesSection />
      <StatisticsSection />
      <AboutSection />
      <CtaSection />
    </div>
  )
}
