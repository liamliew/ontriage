'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import type { WebSocketEvent } from '@/lib/api'

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'

const WS_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!
  .replace('https://', 'wss://')
  .replace('http://', 'ws://')

const INITIAL_DELAY = 1000
const MAX_DELAY = 30000

export function useWebSocket() {
  const { getToken, isSignedIn } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const delayRef = useRef(INITIAL_DELAY)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(async () => {
    if (!isSignedIn) return

    try {
      const token = await getToken()
      if (!token || !mountedRef.current) return

      const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setIsConnected(true)
        setStatus('connected')
        delayRef.current = INITIAL_DELAY
      }

      ws.onmessage = (e) => {
        if (!mountedRef.current) return
        try {
          const event: WebSocketEvent = JSON.parse(e.data)
          setLastEvent(event)
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setIsConnected(false)
        setStatus('reconnecting')
        scheduleReconnect()
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setIsConnected(false)
        setStatus('reconnecting')
        ws.close()
      }
    } catch {
      if (!mountedRef.current) return
      setStatus('reconnecting')
      scheduleReconnect()
    }
  }, [isSignedIn, getToken])

  function scheduleReconnect() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) connect()
    }, delayRef.current)
    delayRef.current = Math.min(delayRef.current * 2, MAX_DELAY)
  }

  useEffect(() => {
    mountedRef.current = true
    if (isSignedIn) {
      connect()
    }
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
      setStatus('disconnected')
    }
  }, [isSignedIn, connect])

  return { isConnected, status, lastEvent }
}
