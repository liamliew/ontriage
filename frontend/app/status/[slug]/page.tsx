import { notFound } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'
import { createApiClient, StatusPage, Monitor } from '@/lib/api'

function StatusDot({ isUp }: { isUp: boolean | null }) {
  if (isUp === true) return <CheckCircle size={14} className="text-emerald-400 shrink-0" />
  if (isUp === false) return <XCircle size={14} className="text-red-400 shrink-0" />
  return <span className="h-2 w-2 rounded-full bg-neutral-500 shrink-0" />
}

function statusLabel(isUp: boolean | null) {
  if (isUp === true) return { text: 'Operational', className: 'text-emerald-400' }
  if (isUp === false) return { text: 'Down', className: 'text-red-400' }
  return { text: 'No data', className: 'text-neutral-500' }
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

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let statusPage: StatusPage

  try {
    const api = createApiClient('')
    statusPage = await api.getStatusPage(slug)
  } catch {
    notFound()
  }

  const allUp = statusPage.monitors.every((m) => m.latest_is_up === true)
  const anyDown = statusPage.monitors.some((m) => m.latest_is_up === false)
  const activeIncidents = statusPage.incidents.filter((i) => !i.resolved_at)

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-6 py-16 flex-1">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-white mb-1">{statusPage.name}</h1>
          <p className="text-sm text-neutral-400">
            Status page — last updated just now
          </p>
        </div>

        {/* Overall status */}
        <div
          className={`rounded-xl border px-5 py-4 mb-8 ${
            anyDown
              ? 'border-red-500/30 bg-red-500/10'
              : 'border-emerald-500/30 bg-emerald-500/10'
          }`}
        >
          <p className={`text-sm font-medium ${anyDown ? 'text-red-400' : 'text-emerald-400'}`}>
            {anyDown
              ? 'Some services are experiencing issues'
              : allUp
              ? 'All systems operational'
              : 'Waiting for first checks'}
          </p>
        </div>

        {/* Monitors */}
        {statusPage.monitors.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
              Services
            </h2>
            <div className="border border-neutral-800 rounded-xl overflow-hidden">
              {statusPage.monitors.map((monitor, i) => {
                const { text, className } = statusLabel(monitor.latest_is_up)
                return (
                  <div
                    key={monitor.id}
                    className={`flex items-center gap-3 px-5 py-3.5 ${
                      i > 0 ? 'border-t border-neutral-800' : ''
                    }`}
                  >
                    <StatusDot isUp={monitor.latest_is_up} />
                    <span className="flex-1 text-sm text-white">{monitor.name}</span>
                    <span className={`text-xs font-medium ${className}`}>{text}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Active incidents */}
        {activeIncidents.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
              Active incidents
            </h2>
            <div className="flex flex-col gap-3">
              {activeIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="border border-red-500/20 rounded-xl px-5 py-4 bg-red-500/5"
                >
                  <p className="text-sm text-red-400 font-medium mb-1">Outage in progress</p>
                  <p className="text-xs text-neutral-500">
                    Started {formatDate(incident.started_at)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past incidents */}
        {statusPage.incidents.filter((i) => i.resolved_at).length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
              Past incidents (30 days)
            </h2>
            <div className="border border-neutral-800 rounded-xl overflow-hidden">
              {statusPage.incidents
                .filter((i) => i.resolved_at)
                .map((incident, i) => (
                  <div
                    key={incident.id}
                    className={`px-5 py-3.5 ${i > 0 ? 'border-t border-neutral-800' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-neutral-300">Outage resolved</p>
                      <p className="text-xs text-neutral-500">
                        {incident.resolved_at && formatDate(incident.resolved_at)}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Lasted {incident.duration_ms !== null
                        ? `${Math.round(incident.duration_ms / 1000 / 60)} minutes`
                        : 'unknown duration'}
                    </p>
                  </div>
                ))}
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
