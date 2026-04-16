'use client'

import dynamic from 'next/dynamic'
import { MotionHero, staggerContainer, staggerItem } from './motion'
import Link from 'next/link'
import { Show } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ArrowRight, Play } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

const PixelBlast = dynamic(() => import('@/components/ui/pixel-blast'), { ssr: false })

export function Hero() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <PixelBlast
          pixelSize={4}
          color="#5e17eb"
          patternScale={1.5}
          patternDensity={0.8}
          edgeFade={0.6}
          speed={0.3}
          transparent
          className="w-full h-full opacity-30 dark:opacity-20"
        />
      </div>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-background/40 via-background/60 to-background pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center pt-24 pb-20">
        {shouldReduceMotion ? (
          <div className="flex flex-col items-center gap-6">
            <HeroContent />
          </div>
        ) : (
          <motion.div
            className="flex flex-col items-center gap-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={staggerItem}>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5e17eb]/30 bg-[#5e17eb]/10 px-4 py-1.5 text-xs font-medium text-[#5e17eb] dark:text-[#cb6ce6] dark:border-[#cb6ce6]/30 dark:bg-[#cb6ce6]/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Uptime monitoring, reimagined
              </span>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
            >
              The{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6]">
                cheapest monitoring
              </span>{' '}
              service you&apos;ll ever find
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="font-sans text-muted-foreground max-w-[520px] text-base sm:text-lg"
            >
              Monitor your websites, APIs, and services. Get alerted instantly when something goes wrong. Starting free.
            </motion.p>

            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <Show when="signed-out">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white hover:opacity-90 h-11 px-6 text-base"
                  render={<Link href="/sign-up" />}
                >
                  Start monitoring free
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Show>
              <Show when="signed-in">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white hover:opacity-90 h-11 px-6 text-base"
                  render={<Link href="/dashboard" />}
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Show>
              <Button
                variant="outline"
                size="lg"
                className="h-11 px-6 text-base border-border"
                render={<Link href="#preview" />}
              >
                <Play className="mr-2 size-4" />
                View live demo
              </Button>
            </motion.div>

            <motion.p
              variants={staggerItem}
              className="text-xs sm:text-sm text-muted-foreground mt-2"
            >
              No credit card required &middot; Free forever plan &middot; Setup in 2 minutes
            </motion.p>
          </motion.div>
        )}
      </div>
    </section>
  )
}

function HeroContent() {
  return (
    <>
      <span className="inline-flex items-center gap-2 rounded-full border border-[#5e17eb]/30 bg-[#5e17eb]/10 px-4 py-1.5 text-xs font-medium text-[#5e17eb] dark:text-[#cb6ce6] dark:border-[#cb6ce6]/30 dark:bg-[#cb6ce6]/10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Uptime monitoring, reimagined
      </span>

      <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
        The{' '}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6]">
          cheapest monitoring
        </span>{' '}
        service you&apos;ll ever find
      </h1>

      <p className="font-sans text-muted-foreground max-w-[520px] text-base sm:text-lg">
        Monitor your websites, APIs, and services. Get alerted instantly when something goes wrong. Starting free.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
        <Show when="signed-out">
          <Button
            size="lg"
            className="bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white hover:opacity-90 h-11 px-6 text-base"
            render={<Link href="/sign-up" />}
          >
            Start monitoring free
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Show>
        <Show when="signed-in">
          <Button
            size="lg"
            className="bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white hover:opacity-90 h-11 px-6 text-base"
            render={<Link href="/dashboard" />}
          >
            Go to Dashboard
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Show>
        <Button
          variant="outline"
          size="lg"
          className="h-11 px-6 text-base border-border"
          render={<Link href="#preview" />}
        >
          <Play className="mr-2 size-4" />
          View live demo
        </Button>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground mt-2">
        No credit card required &middot; Free forever plan &middot; Setup in 2 minutes
      </p>
    </>
  )
}