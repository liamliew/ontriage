'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { createApiClient } from '@/lib/api'

export function useMonitorSSL(monitorId: string) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['monitors', monitorId, 'ssl'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getMonitorSSL(monitorId)
    },
    enabled: !!monitorId,
  })
}

export function useMonitorSSLHistory(monitorId: string) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['monitors', monitorId, 'ssl-history'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getMonitorSSLHistory(monitorId)
    },
    enabled: !!monitorId,
  })
}
