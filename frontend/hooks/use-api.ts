import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { createApiClient } from '@/lib/api'

export function useMonitors() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['monitors'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getMonitors()
    },
  })
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
