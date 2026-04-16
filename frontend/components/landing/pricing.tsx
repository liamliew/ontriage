'use client'

import Link from 'next/link'
import { MotionDiv } from './motion'
import { Check } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for personal projects',
    highlighted: false,
    features: [
      '75 monitors',
      '2 minute check interval',
      'Email alerts',
      'Public status pages',
      '30 day history',
    ],
    cta: 'Get started free',
    href: '/sign-up',
  },
  {
    name: 'Basic',
    price: '$2',
    period: '/month',
    description: 'For growing teams',
    highlighted: false,
    features: [
      '100 monitors',
      '60 second check interval',
      'All alert channels',
      'Latency analytics',
      'Location-specific monitoring',
      '90 day history',
    ],
    cta: 'Start Basic',
    href: '/sign-up',
  },
  {
    name: 'Pro',
    price: '$5',
    period: '/month',
    description: 'Most popular',
    highlighted: true,
    features: [
      '200 monitors',
      '30 second check interval',
      'Everything in Basic',
      'Full website monitoring',
      'SMS alerts',
      '1 year history',
    ],
    cta: 'Start Pro',
    href: '/sign-up',
  },
  {
    name: 'Max',
    price: '$10',
    period: '/month',
    description: 'For mission-critical services',
    highlighted: false,
    features: [
      'Unlimited monitors',
      '10 second check interval',
      'Everything in Pro',
      'Phone call alerts',
      'Priority support',
      'Custom retention',
    ],
    cta: 'Start Max',
    href: '/sign-up',
  },
]

export function Pricing() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section id="pricing" className="relative py-20 sm:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <MotionDiv className="text-center mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Pricing
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mt-3 text-foreground">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto text-sm">
            Start free, scale as you grow. No hidden fees.
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => {
            if (shouldReduceMotion) {
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-xl border p-6 flex flex-col ${
                    plan.highlighted
                      ? 'border-[#5e17eb] dark:border-[#cb6ce6] bg-[#5e17eb]/5 dark:bg-[#cb6ce6]/5 shadow-xl shadow-[#5e17eb]/10'
                      : 'border-border bg-card'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Most popular
                    </span>
                  )}
                  <div className="mb-4">
                    <h3 className="font-heading font-semibold text-lg text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="font-heading text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="size-4 shrink-0 mt-0.5 text-[#5e17eb] dark:text-[#cb6ce6]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.highlighted ? 'default' : 'outline'}
                    className={`w-full ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white hover:opacity-90'
                        : ''
                    }`}
                    render={<Link href={plan.href} />}
                  >
                    {plan.cta}
                  </Button>
                </div>
              )
            }

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-xl border p-6 flex flex-col ${
                  plan.highlighted
                    ? 'border-[#5e17eb] dark:border-[#cb6ce6] bg-[#5e17eb]/5 dark:bg-[#cb6ce6]/5 shadow-xl shadow-[#5e17eb]/10'
                    : 'border-border bg-card'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Most popular
                  </span>
                )}
                <div className="mb-4">
                  <h3 className="font-heading font-semibold text-lg text-foreground">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="font-heading text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="size-4 shrink-0 mt-0.5 text-[#5e17eb] dark:text-[#cb6ce6]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlighted ? 'default' : 'outline'}
                  className={`w-full ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white hover:opacity-90'
                      : ''
                  }`}
                  render={<Link href={plan.href} />}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}