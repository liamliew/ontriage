'use client'

import dynamic from 'next/dynamic'
import { MotionDiv } from './motion'
import { Card } from '@/components/ui/card-swap'

const CardSwap = dynamic(() => import('@/components/ui/card-swap'), { ssr: false })

function MonitorCard() {
  return (
    <div className="bg-[#0d0c12] border border-purple-500/20 rounded-xl overflow-hidden shadow-2xl p-5 text-white text-sm w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base">Monitors</h3>
        <span className="text-xs text-purple-400">4 active</span>
      </div>
      <div className="space-y-3">
        {[
          { name: 'api.example.com', status: 'up', uptime: '99.98%', latency: '142ms' },
          { name: 'webapp.example.com', status: 'up', uptime: '99.95%', latency: '89ms' },
          { name: 'cdn.example.com', status: 'down', uptime: '98.12%', latency: '—' },
          { name: 'auth.example.com', status: 'up', uptime: '99.99%', latency: '56ms' },
        ].map((m) => (
          <div key={m.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${m.status === 'up' ? 'bg-emerald-400' : 'bg-red-500'}`} />
              <span className="text-xs font-mono">{m.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{m.uptime}</span>
              <span>{m.latency}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IncidentCard() {
  return (
    <div className="bg-[#0d0c12] border border-purple-500/20 rounded-xl overflow-hidden shadow-2xl p-5 text-white text-sm w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base">Incidents</h3>
        <span className="text-xs text-red-400">1 active</span>
      </div>
      <div className="space-y-3">
        {[
          { title: 'CDN Provider Outage', status: 'Ongoing', duration: '2h 14m', time: '14:32 UTC', severity: 'critical' },
          { title: 'API Latency Spike', status: 'Resolved', duration: '18m', time: '09:15 UTC', severity: 'warning' },
          { title: 'SSL Cert Renewal', status: 'Resolved', duration: '5m', time: 'Yesterday', severity: 'info' },
        ].map((inc) => (
          <div key={inc.title} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium">{inc.title}</span>
              <span className="text-[10px] text-gray-500">{inc.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                inc.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                inc.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {inc.status}
              </span>
              <span className="text-[10px] text-gray-500">{inc.duration}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusPageCard() {
  return (
    <div className="bg-[#0d0c12] border border-purple-500/20 rounded-xl overflow-hidden shadow-2xl p-5 text-white text-sm w-full h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-3 rounded-full bg-emerald-400" />
        <h3 className="font-semibold text-base">All Systems Operational</h3>
      </div>
      <div className="space-y-3">
        {[
          { name: 'API Gateway', status: 'Operational', uptime: '99.98%' },
          { name: 'Web Application', status: 'Operational', uptime: '99.95%' },
          { name: 'CDN', status: 'Partial Outage', uptime: '98.12%' },
          { name: 'Authentication', status: 'Operational', uptime: '99.99%' },
        ].map((s) => (
          <div key={s.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${
                s.status === 'Operational' ? 'bg-emerald-400' : 'bg-yellow-400'
              }`} />
              <span className="text-xs font-medium">{s.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] ${
                s.status === 'Operational' ? 'text-emerald-400' : 'text-yellow-400'
              }`}>{s.status}</span>
              <span className="text-[10px] text-gray-400">{s.uptime}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-white/10 text-center">
        <span className="text-[10px] text-gray-500">status.ontriage.io &middot; Last updated 2m ago</span>
      </div>
    </div>
  )
}

export function Preview() {
  return (
    <section id="preview" className="relative py-20 sm:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <MotionDiv className="text-center mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            See it in action
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mt-3 text-foreground">
            Your monitoring dashboard
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto text-sm">
            Real-time insights, instant alerts, and full visibility into your services.
          </p>
        </MotionDiv>

        <div className="flex justify-center items-center" style={{ height: 500 }}>
          <CardSwap
            width={420}
            height={300}
            cardDistance={30}
            verticalDistance={25}
            delay={4000}
            skewAmount={3}
            easing="elastic"
          >
            <Card className="card-swap-card">
              <MonitorCard />
            </Card>
            <Card className="card-swap-card">
              <IncidentCard />
            </Card>
            <Card className="card-swap-card">
              <StatusPageCard />
            </Card>
          </CardSwap>
        </div>
      </div>
    </section>
  )
}