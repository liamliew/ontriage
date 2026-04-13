import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { createApiClient, Monitor } from '@/lib/api'

function statusDot(status: Monitor['status']) {
  const map = {
    up: 'bg-emerald-500',
    down: 'bg-red-500',
    paused: 'bg-neutral-500',
    pending: 'bg-yellow-500',
  }
  return map[status] ?? 'bg-neutral-500'
}

function statusLabel(status: Monitor['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default async function DashboardPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let monitors: Monitor[] = []
  let error: string | null = null

  if (token) {
    try {
      const api = createApiClient(token)
      monitors = await api.getMonitors()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load monitors'
    }
  }

  const up = monitors.filter((m) => m.status === 'up').length
  const down = monitors.filter((m) => m.status === 'down').length
  const paused = monitors.filter((m) => m.status === 'paused').length

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Overview</h1>
        <p className="text-sm text-neutral-400 mt-1">Your monitoring summary</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <StatCard label="Monitors up" value={up} accent="text-emerald-400" />
        <StatCard label="Monitors down" value={down} accent="text-red-400" />
        <StatCard label="Paused" value={paused} accent="text-neutral-400" />
      </div>

      {/* Monitor list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-white">Monitors</h2>
        <Link
          href="/dashboard/monitors/new"
          className="text-xs bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-neutral-200 transition-colors"
        >
          + Add monitor
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
          {monitors.map((monitor, i) => (
            <Link
              key={monitor.id}
              href={`/dashboard/monitors/${monitor.id}`}
              className={`flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-900 transition-colors ${
                i > 0 ? 'border-t border-neutral-800' : ''
              }`}
            >
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${statusDot(monitor.status)}`} />
              <span className="flex-1 text-sm text-white truncate">{monitor.name}</span>
              <span className="text-xs text-neutral-500 truncate max-w-xs">{monitor.url}</span>
              <span className="text-xs text-neutral-500 ml-auto">{statusLabel(monitor.status)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-900/40">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className={`text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  )
}
