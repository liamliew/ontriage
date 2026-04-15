'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { createApiClient } from '@/lib/api'

export function useAlertChannels() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['alert-channels'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getAlertChannels()
    },
  })
}
