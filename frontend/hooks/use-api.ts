import { useQuery, useQueries } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { createApiClient, Monitor, Ping, PaginatedPings } from '@/lib/api'

export interface MonitorWithStatus extends Monitor {
  latestPing: Ping | null
}

export function useMonitorsWithStatus() {
  const { getToken } = useAuth()

  const monitorsQuery = useQuery({
    queryKey: ['monitors'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getMonitors()
    },
  })

  const monitors = monitorsQuery.data ?? []

  const pingQueries = useQueries({
    queries: monitors.map((m) => ({
      queryKey: ['monitors', m.id, 'latest-ping'] as const,
      queryFn: async (): Promise<Ping | null> => {
        const token = await getToken()
        if (!token) return null
        const res = await createApiClient(token).getMonitorPings(m.id, 1, 1)
        return res.data.length > 0 ? res.data[0] : null
      },
    })),
  })

  const enriched: MonitorWithStatus[] = monitors.map((m, i) => ({
    ...m,
    latestPing: pingQueries[i].data ?? null,
  }))

  return {
    data: enriched,
    isLoading: monitorsQuery.isLoading || (monitors.length > 0 && pingQueries.some((q) => q.isLoading)),
    error: monitorsQuery.error,
  }
}

export function useMonitor(id: string) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['monitors', id],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const api = createApiClient(token)
      const monitors = await api.getMonitors()
      const m = monitors.find((m) => m.id === id)
      if (!m) throw new Error('not_found')
      return m
    },
  })
}

export function useMonitorPings(id: string, page = 1, limit = 50) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['monitors', id, 'pings', { page, limit }],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getMonitorPings(id, page, limit)
    },
  })
}

export function useMonitorStats(id: string, days = 7) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['monitors', id, 'stats', { days }],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getMonitorStats(id, days)
    },
  })
}

export function useMonitorUptime(id: string, days = 30) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['monitors', id, 'uptime', { days }],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getMonitorUptime(id, days)
    },
  })
}

export function useMonitorIncidents(id: string) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['monitors', id, 'incidents'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getMonitorIncidents(id)
    },
  })
}

export function useStatusPages() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['status-pages'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getStatusPages()
    },
  })
}
