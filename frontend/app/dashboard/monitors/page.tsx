import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { CheckCircle, XCircle, Wifi, Plus } from 'lucide-react'
import { createApiClient, Monitor } from '@/lib/api'

function formatInterval(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  return `${Math.round(seconds / 60)} min`
}

function StatusCell({ isUp }: { isUp: boolean | null }) {
  if (isUp === true)
    return (
      <span className="flex items-center gap-1.5 text-emerald-400">
        <CheckCircle size={13} />
        <span className="text-xs">Up</span>
      </span>
    )
  if (isUp === false)
    return (
      <span className="flex items-center gap-1.5 text-red-400">
        <XCircle size={13} />
        <span className="text-xs">Down</span>
      </span>
    )
  return (
    <span className="flex items-center gap-1.5 text-neutral-500">
      <Wifi size={13} />
      <span className="text-xs">No data</span>
    </span>
  )
}

export default async function MonitorsPage() {
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

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Monitors</h1>
          <p className="text-sm text-neutral-400 mt-1">{monitors.length} monitor{monitors.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/dashboard/monitors/new"
          className="flex items-center gap-1.5 text-sm bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-neutral-200 transition-colors"
        >
          <Plus size={14} />
          Add monitor
        </Link>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {monitors.length === 0 && !error ? (
        <div className="border border-neutral-800 rounded-xl p-12 text-center">
          <p className="text-sm text-neutral-500 mb-4">No monitors yet</p>
          <Link href="/dashboard/monitors/new" className="text-sm text-white underline underline-offset-2">
            Create your first monitor
          </Link>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_2fr_80px_100px] gap-4 px-5 py-2.5 border-b border-neutral-800 bg-neutral-900/60">
            <span className="text-xs text-neutral-500 font-medium">Name</span>
            <span className="text-xs text-neutral-500 font-medium">URL</span>
            <span className="text-xs text-neutral-500 font-medium">Interval</span>
            <span className="text-xs text-neutral-500 font-medium">Status</span>
          </div>

          {monitors.map((monitor, i) => (
            <Link
              key={monitor.id}
              href={`/dashboard/monitors/${monitor.id}`}
              className={`grid grid-cols-[1fr_2fr_80px_100px] gap-4 px-5 py-3.5 hover:bg-neutral-900 transition-colors items-center ${
                i > 0 ? 'border-t border-neutral-800' : ''
              }`}
            >
              <span className="text-sm text-white truncate">{monitor.name}</span>
              <span className="text-sm text-neutral-400 truncate">{monitor.url}</span>
              <span className="text-xs text-neutral-500">{formatInterval(monitor.interval_sec)}</span>
              <StatusCell isUp={monitor.latest_is_up} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
