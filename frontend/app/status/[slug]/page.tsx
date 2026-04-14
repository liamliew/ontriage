import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Clock,
  Activity,
  Globe,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getPublicStatusPage } from '@/lib/api'

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
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
    <div className="min-h-screen flex flex-col bg-background">
      <div className="max-w-2xl mx-auto w-full px-6 py-16 flex-1">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold mb-1">{status_page.title}</h1>
          <p className="text-sm text-muted-foreground">Uptime monitoring by OnTriage</p>
        </div>

        <div
          className={cn(
            'rounded-xl border px-5 py-4 mb-8',
            overall.variant === 'green' && 'border-emerald-500/30 bg-emerald-500/10',
            overall.variant === 'red' && 'border-red-500/30 bg-red-500/10',
            overall.variant === 'grey' && 'border-border bg-muted/50',
          )}
        >
          <p
            className={cn(
              'flex items-center gap-2 text-sm font-medium',
              overall.variant === 'green' && 'text-emerald-500',
              overall.variant === 'red' && 'text-red-500',
              overall.variant === 'grey' && 'text-muted-foreground',
            )}
          >
            {overall.variant === 'green' ? <CheckCircle2 size={16} /> : overall.variant === 'red' ? <AlertCircle size={16} /> : <Activity size={16} />}
            {overall.label}
          </p>
        </div>

        {monitors.length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Services</h2>
            <Card>
              {monitors.map((monitor, i) => {
                const ping = monitor.latest_ping
                return (
                  <div
                    key={monitor.id}
                    className={cn('flex items-center gap-4 px-5 py-4', i > 0 && 'border-t border-border')}
                  >
                    <StatusIndicator isUp={ping?.is_up ?? null} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{monitor.name}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 font-mono">
                        <Globe size={10} className="shrink-0" />
                        {monitor.url}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {ping ? (
                        <>
                          <p className="text-xs text-muted-foreground font-mono">{ping.latency_ms} ms</p>
                          <p className="text-xs text-muted-foreground/60 flex items-center gap-1 justify-end">
                            <Clock size={9} />
                            {timeAgo(ping.checked_at)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No data yet</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </Card>
          </section>
        )}
      </div>

      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-6 h-12 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Powered by OnTriage</p>
          <a href="https://on.triage.lt" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            on.triage.lt
          </a>
        </div>
      </footer>
    </div>
  )
}

function StatusIndicator({ isUp }: { isUp: boolean | null }) {
  if (isUp === true) return <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
  if (isUp === false) return <AlertCircle size={18} className="text-red-500 shrink-0" />
  return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
}

function PrivatePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <EyeOff size={32} className="text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">This status page is private</h1>
        <p className="text-sm text-muted-foreground">The owner has not made this page public.</p>
      </div>
    </div>
  )
}
