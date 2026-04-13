import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createApiClient, Monitor, Ping, Incident } from '@/lib/api'

function statusColor(status: Monitor['status'] | Ping['status']) {
  if (status === 'up') return 'text-emerald-400'
  if (status === 'down') return 'text-red-400'
  return 'text-neutral-400'
}

function statusDot(status: Monitor['status'] | Ping['status']) {
  if (status === 'up') return 'bg-emerald-500'
  if (status === 'down') return 'bg-red-500'
  return 'bg-neutral-500'
}

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

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot(monitor.status)}`} />
            <h1 className="text-xl font-semibold text-white">{monitor.name}</h1>
          </div>
          <p className="text-sm text-neutral-400">{monitor.url}</p>
        </div>
        <Link
          href="/dashboard/monitors"
          className="text-xs text-neutral-500 hover:text-white transition-colors"
        >
          ← All monitors
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        <MiniStat label="Status" value={monitor.status} className={statusColor(monitor.status)} />
        <MiniStat label="Type" value={monitor.type.toUpperCase()} />
        <MiniStat
          label="Interval"
          value={`${monitor.interval_seconds >= 60 ? monitor.interval_seconds / 60 + 'm' : monitor.interval_seconds + 's'}`}
        />
        <MiniStat label="Avg latency" value={avgLatency !== null ? `${avgLatency} ms` : '—'} />
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
                  title={`${p.status} — ${p.latency_ms}ms`}
                  className={`flex-1 h-8 rounded-sm ${p.status === 'up' ? 'bg-emerald-500' : 'bg-red-500'}`}
                />
              ))}
            </div>
            <div className="border border-neutral-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_1fr] gap-4 px-5 py-2.5 border-b border-neutral-800 bg-neutral-900/60">
                <span className="text-xs text-neutral-500 font-medium">Time</span>
                <span className="text-xs text-neutral-500 font-medium">Status</span>
                <span className="text-xs text-neutral-500 font-medium">Latency</span>
              </div>
              {recentPings.map((ping, i) => (
                <div
                  key={ping.id}
                  className={`grid grid-cols-[1fr_80px_1fr] gap-4 px-5 py-3 ${i > 0 ? 'border-t border-neutral-800' : ''}`}
                >
                  <span className="text-xs text-neutral-400">{formatDate(ping.checked_at)}</span>
                  <span className={`text-xs font-medium capitalize ${statusColor(ping.status)}`}>
                    {ping.status}
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
        <h2 className="text-sm font-medium text-white mb-3">Incidents</h2>
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
  label,
  value,
  className = 'text-white',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className={`text-sm font-medium capitalize ${className}`}>{value}</p>
    </div>
  )
}
