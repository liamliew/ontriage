'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { createApiClient, type UserPreferences } from '@/lib/api'

export function useUserPreferences() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).getUserPreferences()
    },
  })
}

export function useUpdateUserPreferences() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return createApiClient(token).updateUserPreferences(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    },
  })
}
