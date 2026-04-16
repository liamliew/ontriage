'use client'

import { MotionDiv } from './motion'
import { Plus, Bell, CheckCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

const steps = [
  {
    icon: Plus,
    number: '01',
    title: 'Add your monitor',
    description: 'Enter your URL, choose your check interval, and configure your alert channels.',
  },
  {
    icon: Bell,
    number: '02',
    title: 'Get alerted instantly',
    description: 'When your service goes down, OnTriage fires alerts to all your configured channels within seconds.',
  },
  {
    icon: CheckCircle,
    number: '03',
    title: 'Stay in control',
    description: 'View full incident history, latency trends, and uptime stats from your dashboard.',
  },
]

export function HowItWorks() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="relative py-20 sm:py-32 bg-surface pixel-texture-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <MotionDiv className="text-center mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            How it works
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mt-3 text-foreground">
            Up and running in minutes
          </h2>
        </MotionDiv>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div className="hidden md:block absolute top-1/2 left-[20%] right-[20%] border-t-2 border-dashed border-border -translate-y-1/2" />
          {steps.map((step, i) => {
            if (shouldReduceMotion) {
              return (
                <div key={step.number} className="relative flex flex-col items-center text-center">
                  <span className="font-heading text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] mb-3">
                    {step.number}
                  </span>
                  <div className="flex items-center justify-center size-12 rounded-xl bg-[#5e17eb]/10 dark:bg-[#cb6ce6]/10 mb-4">
                    <step.icon className="size-6 text-[#5e17eb] dark:text-[#cb6ce6]" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">{step.description}</p>
                </div>
              )
            }

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                <span className="font-heading text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] mb-3">
                  {step.number}
                </span>
                <div className="flex items-center justify-center size-12 rounded-xl bg-[#5e17eb]/10 dark:bg-[#cb6ce6]/10 mb-4">
                  <step.icon className="size-6 text-[#5e17eb] dark:text-[#cb6ce6]" />
                </div>
                <h3 className="font-heading font-semibold text-foreground text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">{step.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}