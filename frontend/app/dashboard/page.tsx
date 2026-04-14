'use client'

import Link from 'next/link'
import { Wifi, Plus, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@clerk/nextjs'
import { useQueries } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { createApiClient, UptimeResponse } from '@/lib/api'
import { useMonitorsWithStatus, type MonitorWithStatus } from '@/hooks/use-api'

function MonitorRow({ monitor }: { monitor: MonitorWithStatus }) {
  const isUp = monitor.latestPing?.is_up ?? null
  const uptimePct = useMonitorUptimeValue(monitor.id)

  return (
    <Link
      href={`/dashboard/monitors/${monitor.id}`}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
    >
      <Wifi
        size={14}
        className={cn(
          'shrink-0',
          isUp === true && 'text-emerald-500',
          isUp === false && 'text-red-500',
          isUp === null && 'text-muted-foreground/50',
        )}
      />
      <span className="flex-1 text-sm truncate">{monitor.name}</span>
      <span className="text-xs text-muted-foreground font-mono truncate max-w-xs">{monitor.url}</span>
      <span
        className={cn(
          'text-xs tabular-nums font-mono',
          uptimePct !== null && uptimePct >= 99 && 'text-emerald-500',
          uptimePct !== null && uptimePct >= 95 && uptimePct < 99 && 'text-yellow-500',
          uptimePct !== null && uptimePct < 95 && 'text-red-500',
          uptimePct === null && 'text-muted-foreground',
        )}
      >
        {uptimePct !== null ? `${uptimePct.toFixed(2)}%` : '—'}
      </span>
      <Badge
        variant={isUp === true ? 'default' : isUp === false ? 'destructive' : 'secondary'}
        className={cn(
          'ml-3 text-xs',
          isUp === true && 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20',
          isUp === null && 'bg-muted text-muted-foreground',
        )}
      >
        {isUp === true ? 'Up' : isUp === false ? 'Down' : 'No data'}
      </Badge>
    </Link>
  )
}

function useMonitorUptimeValue(id: string): number | null {
  const { getToken } = useAuth()
  const results = useQueries({
    queries: [{
      queryKey: ['monitors', id, 'uptime', { days: 30 }] as const,
      queryFn: async (): Promise<UptimeResponse | null> => {
        const token = await getToken()
        if (!token) return null
        return createApiClient(token).getMonitorUptime(id)
      },
    }],
  })
  return results[0].data?.uptime_percentage ?? null
}

export default function DashboardPage() {
  const { data: monitors, isLoading, error } = useMonitorsWithStatus()
  const { getToken } = useAuth()

  const monitorIds = monitors?.map((m) => m.id) ?? []

  const uptimeResults = useQueries({
    queries: monitorIds.map((id) => ({
      queryKey: ['monitors', id, 'uptime', { days: 30 }] as const,
      queryFn: async (): Promise<UptimeResponse | null> => {
        const token = await getToken()
        if (!token) return null
        return createApiClient(token).getMonitorUptime(id)
      },
    })),
  })

  const validUptimes = uptimeResults
    .map((q) => q.data?.uptime_percentage)
    .filter((u): u is number => u !== undefined && u !== null)
  const avgUptime = validUptimes.length > 0
    ? validUptimes.reduce((a, b) => a + b, 0) / validUptimes.length
    : null

  const up = monitors?.filter((m) => m.latestPing?.is_up === true).length ?? 0
  const down = monitors?.filter((m) => m.latestPing?.is_up === false).length ?? 0
  const noData = monitors?.filter((m) => m.latestPing === null).length ?? 0

  if (isLoading) {
    return (
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <Skeleton className="h-6 w-28 mb-2" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-8 w-12" /></CardContent></Card>
          ))}
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-8 py-8 max-w-5xl">
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Your monitoring summary</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-10">
        <StatCard label="Monitors up" value={up} accent="text-emerald-500" />
        <StatCard label="Monitors down" value={down} accent="text-red-500" />
        <StatCard label="No data" value={noData} accent="text-muted-foreground" />
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <TrendingUp size={14} className={avgUptime !== null ? (avgUptime >= 99 ? 'text-emerald-500' : avgUptime >= 95 ? 'text-yellow-500' : 'text-red-500') : ''} />
                Avg uptime (30d)
              </p>
              <p
                className={cn(
                  'text-3xl font-semibold tabular-nums font-mono',
                  avgUptime !== null && avgUptime >= 99 && 'text-emerald-500',
                  avgUptime !== null && avgUptime >= 95 && avgUptime < 99 && 'text-yellow-500',
                  avgUptime !== null && avgUptime < 95 && 'text-red-500',
                  avgUptime === null && 'text-muted-foreground',
                )}
              >
                {avgUptime !== null ? `${avgUptime.toFixed(2)}%` : '—'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium">Monitors</h2>
        <Link href="/dashboard/monitors/new">
          <Button size="sm">
            <Plus size={13} />
            Add monitor
          </Button>
        </Link>
      </div>

      {monitors && monitors.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">No monitors yet</p>
            <Link href="/dashboard/monitors/new">
              <Button variant="link">Create your first monitor</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {monitors?.map((monitor, i) => (
            <div
              key={monitor.id}
              className={cn(i > 0 && 'border-t border-border')}
            >
              <MonitorRow monitor={monitor} />
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={cn('text-3xl font-semibold tabular-nums font-mono', accent)}>{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
