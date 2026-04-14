'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, differenceInMinutes } from 'date-fns'
import { motion } from 'framer-motion'
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  useMonitor,
  useMonitorPings,
  useMonitorStats,
  useMonitorUptime,
  useMonitorIncidents,
} from '@/hooks/use-api'

function formatInterval(sec: number) {
  if (sec < 60) return `${sec}s`
  const m = sec / 60
  return `${m} min`
}

function formatDuration(ms: number | null) {
  if (ms === null) return 'Ongoing'
  const m = differenceInMinutes(new Date(Date.now() + ms), new Date(Date.now()))
  if (m < 1) return '<1m'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function formatDurationFromDates(startedAt: string, resolvedAt: string | null) {
  if (!resolvedAt) return null
  return new Date(resolvedAt).getTime() - new Date(startedAt).getTime()
}

const latencyChartConfig = {
  avg_latency_ms: { label: 'Avg latency', color: 'var(--chart-1)' },
  min_latency_ms: { label: 'Min latency', color: 'var(--chart-2)' },
  max_latency_ms: { label: 'Max latency', color: 'var(--chart-3)' },
} satisfies ChartConfig

const uptimeChartConfig = {
  uptime_percentage: { label: 'Uptime %', color: 'var(--chart-1)' },
} satisfies ChartConfig

export default function MonitorDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  paramsPromise.then((p) => setId(p.id))

  if (!id) return <DetailSkeleton />

  return <MonitorDetail id={id} />
}

function MonitorDetail({ id }: { id: string }) {
  const { data: monitor, isLoading: monitorLoading, error: monitorError } = useMonitor(id)
  const { data: uptime } = useMonitorUptime(id)
  const { data: stats } = useMonitorStats(id)
  const { data: incidents } = useMonitorIncidents(id)
  const [page, setPage] = useState(1)
  const { data: pingsData, isLoading: pingsLoading } = useMonitorPings(id, page)

  if (monitorLoading) return <DetailSkeleton />
  if (monitorError) return <p className="text-sm text-destructive p-8">{monitorError.message}</p>
  if (!monitor) return null

  const ongoingIncidents = incidents?.filter((i) => !i.is_resolved) ?? []
  const resolvedIncidents = incidents?.filter((i) => i.is_resolved) ?? []
  const totalDowntimeMs = resolvedIncidents.reduce((sum, i) => {
    return sum + (formatDurationFromDates(i.started_at, i.resolved_at) ?? 0)
  }, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {monitor.is_active ? (
              <CheckCircle size={16} className="text-emerald-500" />
            ) : (
              <XCircle size={16} className="text-muted-foreground" />
            )}
            <h1 className="text-xl font-semibold">{monitor.name}</h1>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Globe size={13} className="shrink-0" />
            {monitor.url}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">{monitor.method} &middot; every {formatInterval(monitor.interval_sec)}</p>
        </div>
        <Link href="/dashboard/monitors">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={13} />
            All monitors
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <MiniStat
          icon={<TrendingUp size={14} />}
          label="Uptime (30d)"
          value={uptime ? `${uptime.uptime_percentage.toFixed(2)}%` : '—'}
          className={uptime ? (uptime.uptime_percentage >= 99 ? 'text-emerald-500' : uptime.uptime_percentage >= 95 ? 'text-yellow-500' : 'text-red-500') : 'text-muted-foreground'}
        />
        <MiniStat icon={<Clock size={14} />} label="Interval" value={formatInterval(monitor.interval_sec)} />
        <MiniStat icon={<BarChart2 size={14} />} label="Checks (30d)" value={uptime ? String(uptime.total_checks) : '—'} />
        <MiniStat
          icon={<Timer size={14} />}
          label="Downtime (30d)"
          value={totalDowntimeMs > 0 ? formatDuration(totalDowntimeMs) : 'None'}
          className={totalDowntimeMs > 0 ? 'text-red-500' : 'text-emerald-500'}
        />
      </div>

      {stats && stats.days.length > 0 && (
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-sm font-medium mb-3">
            <BarChart2 size={14} className="text-muted-foreground" />
            Latency (last 7 days)
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ChartContainer config={latencyChartConfig} className="h-48 w-full">
                <LineChart data={stats.days} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(new Date(v), 'dd MMM')}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} unit="ms" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="min_latency_ms" stroke="var(--color-min_latency_ms)" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="avg_latency_ms" stroke="var(--color-avg_latency_ms)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="max_latency_ms" stroke="var(--color-max_latency_ms)" strokeWidth={1} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>
      )}

      {stats && stats.days.length > 0 && (
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-sm font-medium mb-3">
            <TrendingUp size={14} className="text-muted-foreground" />
            Uptime per day
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ChartContainer config={uptimeChartConfig} className="h-32 w-full">
                <BarChart data={stats.days} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(new Date(v), 'dd MMM')}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis domain={[95, 100]} className="text-xs" tick={{ fontSize: 11 }} unit="%" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="uptime_percentage" fill="var(--color-uptime_percentage)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-sm font-medium mb-3">
          <Layers size={14} className="text-muted-foreground" />
          Recent checks
        </h2>
        {pingsLoading && !pingsData ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !pingsData || pingsData.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checks yet</p>
        ) : (
          <>
            <div className="flex gap-0.5 mb-3">
              {pingsData.data.slice(0, 50).map((p) => (
                <div
                  key={p.id}
                  title={`${p.is_up ? 'Up' : 'Down'} — ${p.latency_ms}ms`}
                  className={cn('flex-1 h-8 rounded-sm', p.is_up ? 'bg-emerald-500' : 'bg-red-500')}
                />
              ))}
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>
                      <span className="grid grid-cols-3 gap-2">
                        <span>DNS</span><span>TLS</span><span>Total</span>
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pingsData.data.map((ping) => (
                    <TableRow key={ping.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(ping.checked_at), 'dd MMM, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ping.is_up ? 'default' : 'destructive'} className={cn('text-xs', ping.is_up && 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20')}>
                          {ping.is_up ? 'Up' : 'Down'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ping.status_code}</TableCell>
                      <TableCell>
                        <span className="grid grid-cols-3 gap-2 text-xs">
                          <span className="text-muted-foreground">{ping.dns_ms}ms</span>
                          <span className="text-muted-foreground">{ping.tls_ms}ms</span>
                          <span className="font-medium">{ping.latency_ms}ms</span>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            {pingsData && Math.ceil(pingsData.total / pingsData.limit) > 1 && (
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Page {pingsData.page} of {Math.ceil(pingsData.total / pingsData.limit)} ({pingsData.total} total)
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={pingsData.page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft size={13} /> Previous
                  </Button>
                  <Button variant="ghost" size="sm" disabled={pingsData.page >= Math.ceil(pingsData.total / pingsData.limit)} onClick={() => setPage(page + 1)}>
                    Next <ChevronRight size={13} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-sm font-medium mb-3">
          <AlertTriangle size={14} className="text-red-500" />
          Incidents
          {ongoingIncidents.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertOctagon size={10} className="mr-1" />
              {ongoingIncidents.length} ongoing
            </Badge>
          )}
        </h2>
        {!incidents || incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents recorded</p>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => {
                  const dur = formatDurationFromDates(incident.started_at, incident.resolved_at)
                  return (
                    <TableRow key={incident.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(incident.started_at), 'dd MMM, HH:mm')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {incident.resolved_at ? format(new Date(incident.resolved_at), 'dd MMM, HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDuration(dur)}</TableCell>
                      <TableCell>
                        {incident.is_resolved ? (
                          <Badge variant="secondary" className="text-xs">Resolved</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <AlertOctagon size={10} className="mr-1" />
                            Ongoing
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-sm font-medium mb-3">
          <Settings size={14} className="text-muted-foreground" />
          Configuration
        </h2>
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <ConfigRow label="Expected status" value={String(monitor.expected_status)} />
              <ConfigRow label="Timeout" value={`${monitor.timeout_sec}s`} />
              <ConfigRow label="Keyword" value={monitor.keyword || '—'} />
              <ConfigRow label="Incident threshold" value={`${monitor.incident_threshold} failures`} />
            </div>
            {monitor.headers && Object.keys(monitor.headers).length > 0 && (
              <>
                <Separator className="my-4" />
                <p className="text-xs text-muted-foreground font-medium mb-2">Custom headers</p>
                <div className="space-y-1">
                  {Object.entries(monitor.headers).map(([key, val]) => (
                    <p key={key} className="text-xs font-mono">
                      <span className="text-muted-foreground">{key}:</span> <span>{val}</span>
                    </p>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </motion.div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

function MiniStat({ icon, label, value, className = '' }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span className={className}>{icon}</span>
            {label}
          </p>
          <p className={cn('text-sm font-medium tabular-nums', className)}>{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DetailSkeleton() {
  return (
    <div className="px-8 py-8 max-w-4xl space-y-8">
      <div className="flex justify-between">
        <div><Skeleton className="h-6 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-3 w-16 mb-2" /><Skeleton className="h-5 w-20" /></CardContent></Card>)}
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
