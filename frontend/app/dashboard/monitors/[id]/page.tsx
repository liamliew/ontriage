import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  AlertTriangle,
  BarChart2,
} from 'lucide-react'
import { createApiClient, Monitor, Ping, Incident } from '@/lib/api'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms: number | null) {
  if (ms === null) return 'Ongoing'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.round(m / 60)}h ${m % 60}m`
}

function formatInterval(sec: number) {
  if (sec < 60) return `${sec}s`
  const m = sec / 60
  return `${m} min`
}

function UpDownBadge({ isUp }: { isUp: boolean }) {
  return isUp ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
      <CheckCircle size={11} />
      Up
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
      <XCircle size={11} />
      Down
    </span>
  )
}

export default async function MonitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { getToken } = await auth()
  const token = await getToken()

  if (!token) notFound()

  const api = createApiClient(token)

  let monitor: Monitor
  let pings: Ping[] = []
  let incidents: Incident[] = []

  try {
    ;[monitor, pings, incidents] = await Promise.all([
      api.getMonitors().then((monitors) => {
        const m = monitors.find((m) => m.id === id)
        if (!m) throw new Error('not_found')
        return m
      }),
      api.getMonitorPings(id),
      api.getMonitorIncidents(id),
    ])
  } catch (e) {
    if (e instanceof Error && e.message === 'not_found') notFound()
    throw e
  }

  const recentPings = pings.slice(0, 30)
  const avgLatency =
    pings.length > 0
      ? Math.round(pings.reduce((a, p) => a + p.latency_ms, 0) / pings.length)
      : null

  const latestPing = recentPings[0] ?? null

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {latestPing === null ? (
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-500" />
            ) : latestPing.is_up ? (
              <CheckCircle size={16} className="text-emerald-400" />
            ) : (
              <XCircle size={16} className="text-red-400" />
            )}
            <h1 className="text-xl font-semibold text-white">{monitor.name}</h1>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-neutral-400">
            <Globe size={13} className="shrink-0" />
            {monitor.url}
          </p>
        </div>
        <Link
          href="/dashboard/monitors"
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          All monitors
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <MiniStat
          icon={latestPing?.is_up ? <CheckCircle size={14} /> : <XCircle size={14} />}
          label="Status"
          value={
            latestPing !== null
              ? latestPing.is_up ? 'Up' : 'Down'
              : '—'
          }
          className={
            latestPing !== null
              ? latestPing.is_up ? 'text-emerald-400' : 'text-red-400'
              : 'text-neutral-400'
          }
        />
        <MiniStat
          icon={<Clock size={14} />}
          label="Interval"
          value={formatInterval(monitor.interval_sec)}
        />
        <MiniStat
          icon={<BarChart2 size={14} />}
          label="Avg latency"
          value={avgLatency !== null ? `${avgLatency} ms` : '—'}
        />
      </div>

      {/* Ping timeline */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-white mb-3">Recent checks</h2>
        {recentPings.length === 0 ? (
          <p className="text-sm text-neutral-500">No checks yet</p>
        ) : (
          <>
            <div className="flex gap-0.5 mb-3">
              {recentPings.map((p) => (
                <div
                  key={p.id}
                  title={`${p.is_up ? 'Up' : 'Down'} — ${p.latency_ms}ms`}
                  className={`flex-1 h-8 rounded-sm ${p.is_up ? 'bg-emerald-500' : 'bg-red-500'}`}
                />
              ))}
            </div>
            <div className="border border-neutral-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_90px_100px_1fr] gap-4 px-5 py-2.5 border-b border-neutral-800 bg-neutral-900/60">
                <span className="text-xs text-neutral-500 font-medium">Time</span>
                <span className="text-xs text-neutral-500 font-medium">Status</span>
                <span className="text-xs text-neutral-500 font-medium">Status Code</span>
                <span className="text-xs text-neutral-500 font-medium">Latency</span>
              </div>
              {recentPings.map((ping, i) => (
                <div
                  key={ping.id}
                  className={`grid grid-cols-[1fr_90px_100px_1fr] gap-4 px-5 py-3 items-center ${i > 0 ? 'border-t border-neutral-800' : ''}`}
                >
                  <span className="text-xs text-neutral-400">{formatDate(ping.checked_at)}</span>
                  <span className="text-xs">
                    <UpDownBadge isUp={ping.is_up} />
                  </span>
                  <span className="text-xs text-neutral-400">
                    {ping.status_code ?? '—'}
                  </span>
                  <span className="text-xs text-neutral-400">{ping.latency_ms} ms</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Incidents */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-medium text-white mb-3">
          <AlertTriangle size={14} className="text-red-400" />
          Incidents
        </h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-neutral-500">No incidents recorded</p>
        ) : (
          <div className="border border-neutral-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_100px] gap-4 px-5 py-2.5 border-b border-neutral-800 bg-neutral-900/60">
              <span className="text-xs text-neutral-500 font-medium">Started</span>
              <span className="text-xs text-neutral-500 font-medium">Resolved</span>
              <span className="text-xs text-neutral-500 font-medium">Duration</span>
            </div>
            {incidents.map((incident, i) => (
              <div
                key={incident.id}
                className={`grid grid-cols-[1fr_1fr_100px] gap-4 px-5 py-3 ${i > 0 ? 'border-t border-neutral-800' : ''}`}
              >
                <span className="text-xs text-neutral-400">{formatDate(incident.started_at)}</span>
                <span className="text-xs text-neutral-400">
                  {incident.resolved_at ? formatDate(incident.resolved_at) : (
                    <span className="text-red-400">Ongoing</span>
                  )}
                </span>
                <span className="text-xs text-neutral-400">{formatDuration(incident.duration_ms)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
  className = 'text-white',
}: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40">
      <p className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
        <span className={className}>{icon}</span>
        {label}
      </p>
      <p className={`text-sm font-medium ${className}`}>{value}</p>
    </div>
  )
}
