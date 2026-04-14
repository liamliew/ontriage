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
  TrendingUp,
  Timer,
  Layers,
  AlertOctagon,
  Settings,
} from 'lucide-react'
import { createApiClient, Monitor, Incident, UptimeResponse, StatsResponse } from '@/lib/api'
import PingsTable from './pings-table'

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

function computeDuration(startedAt: string, resolvedAt: string | null): number | null {
  if (!resolvedAt) return null
  return new Date(resolvedAt).getTime() - new Date(startedAt).getTime()
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
  let incidents: Incident[]
  let uptime: UptimeResponse | null = null
  let stats: StatsResponse | null = null

  try {
    const [monitorsResult, incidentsResult, uptimeResult, statsResult] = await Promise.all([
      api.getMonitors().then((monitors) => {
        const m = monitors.find((m) => m.id === id)
        if (!m) throw new Error('not_found')
        return m
      }),
      api.getMonitorIncidents(id),
      api.getMonitorUptime(id, 30).catch(() => null),
      api.getMonitorStats(id, 7).catch(() => null),
    ])

    monitor = monitorsResult
    incidents = incidentsResult
    uptime = uptimeResult
    stats = statsResult
  } catch (e) {
    if (e instanceof Error && e.message === 'not_found') notFound()
    throw e
  }

  const ongoingIncidents = incidents.filter((i) => !i.is_resolved)
  const resolvedIncidents = incidents.filter((i) => i.is_resolved)
  const totalDowntimeMs = resolvedIncidents.reduce((sum, i) => {
    return sum + (computeDuration(i.started_at, i.resolved_at) ?? 0)
  }, 0)

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {monitor.is_active ? (
              <CheckCircle size={16} className="text-emerald-400" />
            ) : (
              <XCircle size={16} className="text-neutral-500" />
            )}
            <h1 className="text-xl font-semibold text-white">{monitor.name}</h1>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-neutral-400">
            <Globe size={13} className="shrink-0" />
            {monitor.url}
          </p>
          <p className="text-xs text-neutral-600 mt-1">{monitor.method} &middot; every {formatInterval(monitor.interval_sec)}</p>
        </div>
        <Link
          href="/dashboard/monitors"
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          All monitors
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <MiniStat
          icon={<TrendingUp size={14} />}
          label="Uptime (30d)"
          value={uptime ? `${uptime.uptime_percentage.toFixed(2)}%` : '—'}
          className={uptime ? (uptime.uptime_percentage >= 99 ? 'text-emerald-400' : uptime.uptime_percentage >= 95 ? 'text-yellow-400' : 'text-red-400') : 'text-neutral-400'}
        />
        <MiniStat
          icon={<Clock size={14} />}
          label="Interval"
          value={formatInterval(monitor.interval_sec)}
        />
        <MiniStat
          icon={<BarChart2 size={14} />}
          label="Checks (30d)"
          value={uptime ? String(uptime.total_checks) : '—'}
        />
        <MiniStat
          icon={<Timer size={14} />}
          label="Downtime (30d)"
          value={formatDuration(totalDowntimeMs || null)}
          className={totalDowntimeMs > 0 ? 'text-red-400' : 'text-emerald-400'}
        />
      </div>

      {stats && stats.days.length > 0 && (
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-sm font-medium text-white mb-3">
            <BarChart2 size={14} className="text-neutral-400" />
            Latency (last 7 days)
          </h2>
          <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-900/40">
            <LatencyChart days={stats.days} />
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-sm font-medium text-white mb-3">
          <Layers size={14} className="text-neutral-400" />
          Recent checks
        </h2>
        <PingsTable monitorId={id} />
      </section>

      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-sm font-medium text-white mb-3">
          <AlertTriangle size={14} className="text-red-400" />
          Incidents
          {ongoingIncidents.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
              <AlertOctagon size={10} />
              {ongoingIncidents.length} ongoing
            </span>
          )}
        </h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-neutral-500">No incidents recorded</p>
        ) : (
          <div className="border border-neutral-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_100px_100px] gap-4 px-5 py-2.5 border-b border-neutral-800 bg-neutral-900/60">
              <span className="text-xs text-neutral-500 font-medium">Started</span>
              <span className="text-xs text-neutral-500 font-medium">Resolved</span>
              <span className="text-xs text-neutral-500 font-medium">Duration</span>
              <span className="text-xs text-neutral-500 font-medium">Status</span>
            </div>
            {incidents.map((incident, i) => {
              const dur = computeDuration(incident.started_at, incident.resolved_at)
              return (
                <div
                  key={incident.id}
                  className={`grid grid-cols-[1fr_1fr_100px_100px] gap-4 px-5 py-3 ${i > 0 ? 'border-t border-neutral-800' : ''}`}
                >
                  <span className="text-xs text-neutral-400">{formatDate(incident.started_at)}</span>
                  <span className="text-xs text-neutral-400">
                    {incident.resolved_at ? formatDate(incident.resolved_at) : (
                      <span className="text-red-400">—</span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-400">{formatDuration(dur)}</span>
                  <span>
                    {incident.is_resolved ? (
                      <span className="text-xs text-neutral-500">Resolved</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
                        <AlertOctagon size={10} />
                        Ongoing
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-sm font-medium text-white mb-3">
          <Settings size={14} className="text-neutral-400" />
          Configuration
        </h2>
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-2 gap-4 px-5 py-3.5">
            <ConfigRow label="Expected status" value={String(monitor.expected_status)} />
            <ConfigRow label="Timeout" value={`${monitor.timeout_sec}s`} />
            <ConfigRow label="Keyword" value={monitor.keyword || '—'} />
            <ConfigRow label="Incident threshold" value={`${monitor.incident_threshold} failures`} />
          </div>
          {monitor.headers && Object.keys(monitor.headers).length > 0 && (
            <div className="border-t border-neutral-800 px-5 py-3.5">
              <p className="text-xs text-neutral-500 font-medium mb-2">Custom headers</p>
              <div className="space-y-1">
                {Object.entries(monitor.headers).map(([key, val]) => (
                  <p key={key} className="text-xs text-neutral-400 font-mono">
                    {key}: <span className="text-neutral-300">{val}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-sm text-neutral-300">{value}</p>
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

function LatencyChart({ days }: { days: { date: string; avg_latency_ms: number }[] }) {
  const maxLatency = Math.max(...days.map((d) => d.avg_latency_ms), 1)
  const chartH = 120
  const barW = 100 / days.length

  return (
    <svg viewBox={`0 0 100 ${chartH}`} className="w-full h-32" preserveAspectRatio="none">
      {days.map((day, i) => {
        const barH = (day.avg_latency_ms / maxLatency) * (chartH - 20)
        const x = i * barW + barW * 0.15
        const w = barW * 0.7
        const y = chartH - barH
        return (
          <rect
            key={day.date}
            x={x}
            y={y}
            width={w}
            height={barH}
            rx={1}
            className="fill-emerald-500/70"
          >
            <title>{day.date}: {day.avg_latency_ms}ms avg</title>
          </rect>
        )
      })}
    </svg>
  )
}
