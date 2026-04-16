import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Preview } from '@/components/landing/preview'
import { Features } from '@/components/landing/features'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { CtaBanner } from '@/components/landing/cta-banner'
import { Footer } from '@/components/landing/footer'

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Preview />
      <Features />
      <HowItWorks />
      <Pricing />
      <CtaBanner />
      <Footer />
    </main>
  )
}