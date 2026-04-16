'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Monitor, WebSocketEvent } from '@/lib/api'

interface StatusChangedPayload {
  monitor_id: string
  is_up: boolean
}

interface IncidentPayload {
  monitor_id: string
  monitor_name: string
}

interface SSLExpiryPayload {
  monitor_id: string
  monitor_name: string
  days_remaining: number
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { lastEvent } = useWebSocket()
  const lastEventRef = useRef<WebSocketEvent | null>(null)

  useEffect(() => {
    if (!lastEvent || lastEvent === lastEventRef.current) return
    lastEventRef.current = lastEvent

    const { type, payload } = lastEvent

    switch (type) {
      case 'ping.result': {
        const p = payload as { monitor_id: string }
        if (p.monitor_id) {
          queryClient.invalidateQueries({ queryKey: ['monitors', p.monitor_id, 'pings'] })
          queryClient.invalidateQueries({ queryKey: ['monitors', p.monitor_id, 'stats'] })
          queryClient.invalidateQueries({ queryKey: ['monitors', p.monitor_id, 'latest-ping'] })
          queryClient.invalidateQueries({ queryKey: ['monitors', p.monitor_id, 'uptime'] })
        }
        break
      }
      case 'monitor.status_changed': {
        const p = payload as StatusChangedPayload
        queryClient.invalidateQueries({ queryKey: ['monitors'] })

        if (p.monitor_id) {
          queryClient.setQueryData<Monitor[]>(['monitors'], (old) => {
            if (!old) return old
            return old.map((m) =>
              m.id === p.monitor_id ? { ...m, latest_is_up: p.is_up } : m
            )
          })
          queryClient.setQueryData<Monitor>(['monitors', p.monitor_id], (old) => {
            if (!old) return old
            return { ...old, latest_is_up: p.is_up }
          })
        }
        break
      }
      case 'incident.created': {
        const p = payload as IncidentPayload
        if (p.monitor_id) {
          queryClient.invalidateQueries({ queryKey: ['monitors', p.monitor_id, 'incidents'] })
        }
        toast.error(`Monitor down: ${p.monitor_name}`)
        break
      }
      case 'incident.resolved': {
        const p = payload as IncidentPayload
        if (p.monitor_id) {
          queryClient.invalidateQueries({ queryKey: ['monitors', p.monitor_id, 'incidents'] })
        }
        toast.success(`Monitor recovered: ${p.monitor_name}`)
        break
      }
      case 'ssl.expiry_warning': {
        const p = payload as SSLExpiryPayload
        if (p.monitor_id) {
          queryClient.invalidateQueries({ queryKey: ['monitors', p.monitor_id, 'ssl'] })
        }
        toast.warning(`SSL expiring soon: ${p.monitor_name} — ${p.days_remaining} days remaining`)
        break
      }
    }
  }, [lastEvent, queryClient])

  return <>{children}</>
}
