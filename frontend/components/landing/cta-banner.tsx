'use client'

import Link from 'next/link'
import { MotionDiv } from './motion'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CtaBanner() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#1800ad] via-[#5e17eb] to-[#cb6ce6]" />
      <div className="absolute inset-0 pixel-texture" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <MotionDiv>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Start monitoring in 2 minutes
          </h2>
          <p className="text-white/80 text-base sm:text-lg mb-8">
            Free forever plan. No credit card required.
          </p>
          <Button
            size="lg"
            className="bg-white text-[#5e17eb] hover:bg-white/90 h-12 px-8 text-base font-semibold"
            render={<Link href="/sign-up" />}
          >
            Get started free
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </MotionDiv>
      </div>
    </section>
  )
}