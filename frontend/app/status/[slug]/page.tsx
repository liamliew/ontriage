import { notFound } from 'next/navigation'
import {
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Clock,
  Activity,
  Globe,
} from 'lucide-react'
import { getPublicStatusPage } from '@/lib/api'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.round(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return formatDate(iso)
}

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let data: Awaited<ReturnType<typeof getPublicStatusPage>>
  try {
    data = await getPublicStatusPage(slug)
  } catch (e) {
    if (e instanceof Error && e.message === 'not_found') notFound()
    if (e instanceof Error && e.message === 'private') {
      return <PrivatePage />
    }
    throw e
  }

  if (!data.status_page.is_public) {
    return <PrivatePage />
  }

  const { status_page, monitors } = data
  const withData = monitors.filter((m) => m.latest_ping !== null)
  const upCount = withData.filter((m) => m.latest_ping!.is_up).length
  const downCount = withData.filter((m) => !m.latest_ping!.is_up).length

  let overall: { label: string; variant: 'green' | 'red' | 'grey' }
  if (monitors.length === 0) {
    overall = { label: 'No monitors configured', variant: 'grey' }
  } else if (downCount === 0 && upCount > 0) {
    overall = { label: 'All systems operational', variant: 'green' }
  } else if (upCount > 0) {
    overall = { label: 'Partial outage', variant: 'red' }
  } else {
    overall = { label: 'Major outage', variant: 'red' }
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      <div className="max-w-2xl mx-auto w-full px-6 py-16 flex-1">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-white mb-1">{status_page.title}</h1>
          <p className="text-sm text-neutral-400">
            Uptime monitoring by OnTriage
          </p>
        </div>

        <div
          className={`rounded-xl border px-5 py-4 mb-8 ${
            overall.variant === 'green'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : overall.variant === 'red'
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-neutral-700 bg-neutral-800/50'
          }`}
        >
          <p
            className={`flex items-center gap-2 text-sm font-medium ${
              overall.variant === 'green'
                ? 'text-emerald-400'
                : overall.variant === 'red'
                  ? 'text-red-400'
                  : 'text-neutral-400'
            }`}
          >
            {overall.variant === 'green' ? (
              <CheckCircle2 size={16} />
            ) : overall.variant === 'red' ? (
              <AlertCircle size={16} />
            ) : (
              <Activity size={16} />
            )}
            {overall.label}
          </p>
        </div>

        {monitors.length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
              Services
            </h2>
            <div className="border border-neutral-800 rounded-xl overflow-hidden">
              {monitors.map((monitor, i) => {
                const ping = monitor.latest_ping
                return (
                  <div
                    key={monitor.id}
                    className={`flex items-center gap-4 px-5 py-4 ${
                      i > 0 ? 'border-t border-neutral-800' : ''
                    }`}
                  >
                    <StatusIndicator isUp={ping?.is_up ?? null} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{monitor.name}</p>
                      <p className="text-xs text-neutral-500 truncate flex items-center gap-1">
                        <Globe size={10} className="shrink-0" />
                        {monitor.url}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {ping ? (
                        <>
                          <p className="text-xs text-neutral-400">
                            {ping.latency_ms} ms
                          </p>
                          <p className="text-xs text-neutral-600 flex items-center gap-1 justify-end">
                            <Clock size={9} />
                            {timeAgo(ping.checked_at)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-neutral-600">No data yet</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      <footer className="border-t border-neutral-800">
        <div className="max-w-2xl mx-auto px-6 h-12 flex items-center justify-between">
          <p className="text-xs text-neutral-600">Powered by OnTriage</p>
          <a
            href="https://on.triage.lt"
            className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            on.triage.lt
          </a>
        </div>
      </footer>
    </div>
  )
}

function StatusIndicator({ isUp }: { isUp: boolean | null }) {
  if (isUp === true)
    return <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
  if (isUp === false)
    return <AlertCircle size={18} className="text-red-400 shrink-0" />
  return <span className="h-2.5 w-2.5 rounded-full bg-neutral-600 shrink-0" />
}

function PrivatePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="text-center">
        <EyeOff size={32} className="text-neutral-600 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">
          This status page is private
        </h1>
        <p className="text-sm text-neutral-500">
          The owner has not made this page public.
        </p>
      </div>
    </div>
  )
}
