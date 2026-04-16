'use client'

import { MotionDiv } from './motion'
import { Activity, Shield, Bell, Globe, BarChart2, Zap } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

const features = [
  {
    icon: Activity,
    title: 'Uptime monitoring',
    description: 'Monitor HTTP, HTTPS endpoints every 10 seconds. Know the moment something goes down.',
  },
  {
    icon: Shield,
    title: 'SSL monitoring',
    description: 'Track certificate expiry dates and get alerted before they expire.',
  },
  {
    icon: Bell,
    title: 'Multi-channel alerts',
    description: 'Email, Slack, PagerDuty, and webhooks. Get notified where you work.',
  },
  {
    icon: Globe,
    title: 'Public status pages',
    description: 'Give your users a branded status page. Build trust through transparency.',
  },
  {
    icon: BarChart2,
    title: 'Detailed analytics',
    description: 'Latency charts, uptime history, DNS and TLS breakdowns per check.',
  },
  {
    icon: Zap,
    title: 'Instant incidents',
    description: 'Automatic incident creation and resolution. Full timeline, zero manual work.',
  },
]

export function Features() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section id="features" className="relative py-20 sm:py-32 pixel-texture-subtle bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <MotionDiv className="text-center mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Features
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mt-3 text-foreground">
            Everything you need to stay online
          </h2>
        </MotionDiv>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            if (shouldReduceMotion) {
              return (
                <div
                  key={feature.title}
                  className="group relative rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-[#5e17eb]/10 dark:bg-[#cb6ce6]/10 mb-4">
                    <feature.icon className="size-5 text-[#5e17eb] dark:text-[#cb6ce6]" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              )
            }

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center justify-center size-10 rounded-lg bg-[#5e17eb]/10 dark:bg-[#cb6ce6]/10 mb-4">
                  <feature.icon className="size-5 text-[#5e17eb] dark:text-[#cb6ce6]" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}