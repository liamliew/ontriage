import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Wifi, Plus, TrendingUp } from 'lucide-react'
import { createApiClient, Monitor } from '@/lib/api'

function MonitorStatusIcon({ isUp }: { isUp: boolean | null }) {
  if (isUp === true) return <Wifi size={14} className="text-emerald-400 opacity-100 flex-shrink-0" />
  if (isUp === false) return <Wifi size={14} className="text-red-400 opacity-100 flex-shrink-0" />
  return <Wifi size={14} className="text-neutral-500 opacity-50 flex-shrink-0" />
}

function statusLabel(isUp: boolean | null) {
  if (isUp === true) return { text: 'Up', className: 'text-emerald-400' }
  if (isUp === false) return { text: 'Down', className: 'text-red-400' }
  return { text: 'No data', className: 'text-neutral-500' }
}

function formatUptime(pct: number | null) {
  if (pct === null) return '—'
  return `${pct.toFixed(2)}%`
}

function uptimeColor(pct: number | null) {
  if (pct === null) return 'text-neutral-500'
  if (pct >= 99) return 'text-emerald-400'
  if (pct >= 95) return 'text-yellow-400'
  return 'text-red-400'
}

export default async function DashboardPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let monitors: (Monitor & { uptime_pct: number | null })[] = []
  let error: string | null = null

  if (token) {
    try {
      const api = createApiClient(token)
      const rawMonitors = await api.getMonitors()

      const uptimeResults = await Promise.all(
        rawMonitors.map((m) => api.getMonitorUptime(m.id, 30).catch(() => null)),
      )

      monitors = rawMonitors.map((m, i) => {
        const u = uptimeResults[i]
        return {
          ...m,
          latest_is_up: u ? (u.down_checks > 0 ? false : u.up_checks > 0 ? true : null) : null,
          uptime_pct: u ? u.uptime_percentage : null,
        }
      })
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load monitors'
    }
  }

  const up = monitors.filter((m) => m.latest_is_up === true).length
  const down = monitors.filter((m) => m.latest_is_up === false).length
  const noData = monitors.filter((m) => m.latest_is_up === null).length
  const avgUptime =
    monitors.length > 0 && monitors.some((m) => m.uptime_pct !== null)
      ? monitors.filter((m) => m.uptime_pct !== null).reduce((sum, m) => sum + (m.uptime_pct ?? 0), 0) /
        monitors.filter((m) => m.uptime_pct !== null).length
      : null

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Overview</h1>
        <p className="text-sm text-neutral-400 mt-1">Your monitoring summary</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-10">
        <StatCard label="Monitors up" value={up} accent="text-emerald-400" />
        <StatCard label="Monitors down" value={down} accent="text-red-400" />
        <StatCard label="No data" value={noData} accent="text-neutral-400" />
        <StatCard
          label="Avg uptime (30d)"
          value={avgUptime !== null ? `${avgUptime.toFixed(2)}%` : '—'}
          accent={avgUptime !== null ? (avgUptime >= 99 ? 'text-emerald-400' : avgUptime >= 95 ? 'text-yellow-400' : 'text-red-400') : 'text-neutral-400'}
          icon={<TrendingUp size={14} />}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-white">Monitors</h2>
        <Link
          href="/dashboard/monitors/new"
          className="flex items-center gap-1.5 text-xs bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-neutral-200 transition-colors"
        >
          <Plus size={13} />
          Add monitor
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-4">{error}</p>
      )}

      {monitors.length === 0 && !error ? (
        <div className="border border-neutral-800 rounded-xl p-12 text-center">
          <p className="text-sm text-neutral-500 mb-4">No monitors yet</p>
          <Link
            href="/dashboard/monitors/new"
            className="text-sm text-white underline underline-offset-2"
          >
            Create your first monitor
          </Link>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          {monitors.map((monitor, i) => {
            const { text, className } = statusLabel(monitor.latest_is_up)
            return (
              <Link
                key={monitor.id}
                href={`/dashboard/monitors/${monitor.id}`}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-900 transition-colors ${
                  i > 0 ? 'border-t border-neutral-800' : ''
                }`}
              >
                <MonitorStatusIcon isUp={monitor.latest_is_up} />
                <span className="flex-1 text-sm text-white truncate">{monitor.name}</span>
                <span className="text-xs text-neutral-500 truncate max-w-xs">{monitor.url}</span>
                <span className={`text-xs ${uptimeColor(monitor.uptime_pct)}`}>
                  {formatUptime(monitor.uptime_pct)}
                </span>
                <span className={`text-xs ml-3 ${className}`}>{text}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: number | string
  accent: string
  icon?: React.ReactNode
}) {
  return (
    <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-900/40">
      <p className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
        {icon && <span className={accent}>{icon}</span>}
        {label}
      </p>
      <p className={`text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  )
}
