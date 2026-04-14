'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createApiClient, PaginatedPings } from '@/lib/api'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function UpDownBadge({ isUp }: { isUp: boolean }) {
  return isUp ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
      Up
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
      Down
    </span>
  )
}

export default function PingsTable({ monitorId }: { monitorId: string }) {
  const { getToken } = useAuth()
  const [data, setData] = useState<PaginatedPings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPings = useCallback(async (page: number) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      const api = createApiClient(token)
      const result = await api.getMonitorPings(monitorId, page)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load checks')
    } finally {
      setLoading(false)
    }
  }, [getToken, monitorId])

  useEffect(() => {
    fetchPings(1)
  }, [fetchPings])

  if (loading && !data) {
    return (
      <div className="space-y-2">
        <div className="flex gap-0.5 mb-3">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="flex-1 h-8 bg-neutral-800 rounded-sm animate-pulse" />
          ))}
        </div>
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-neutral-800/30 animate-pulse border-t border-neutral-800" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (!data || data.data.length === 0) {
    return <p className="text-sm text-neutral-500">No checks yet</p>
  }

  const pings = data.data
  const totalPages = Math.ceil(data.total / data.limit)
  const hasPrev = data.page > 1
  const hasNext = data.page < totalPages

  return (
    <div>
      <div className="flex gap-0.5 mb-3">
        {pings.slice(0, 50).map((p) => (
          <div
            key={p.id}
            title={`${p.is_up ? 'Up' : 'Down'} — ${p.latency_ms}ms`}
            className={`flex-1 h-8 rounded-sm ${p.is_up ? 'bg-emerald-500' : 'bg-red-500'}`}
          />
        ))}
      </div>

      <div className="border border-neutral-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_70px_70px_3fr] gap-2 px-5 py-2.5 border-b border-neutral-800 bg-neutral-900/60">
          <span className="text-xs text-neutral-500 font-medium">Time</span>
          <span className="text-xs text-neutral-500 font-medium">Status</span>
          <span className="text-xs text-neutral-500 font-medium">Code</span>
          <span className="text-xs text-neutral-500 font-medium">
            <span className="grid grid-cols-3 gap-2">
              <span>DNS</span>
              <span>TLS</span>
              <span>Total</span>
            </span>
          </span>
        </div>
        {pings.map((ping, i) => (
          <div
            key={ping.id}
            className={`grid grid-cols-[1fr_70px_70px_3fr] gap-2 px-5 py-2.5 items-center ${i > 0 ? 'border-t border-neutral-800' : ''}`}
          >
            <span className="text-xs text-neutral-400">{formatDate(ping.checked_at)}</span>
            <span className="text-xs"><UpDownBadge isUp={ping.is_up} /></span>
            <span className="text-xs text-neutral-400">{ping.status_code}</span>
            <span className="grid grid-cols-3 gap-2">
              <span className="text-xs text-neutral-500">{ping.dns_ms}ms</span>
              <span className="text-xs text-neutral-500">{ping.tls_ms}ms</span>
              <span className="text-xs text-neutral-300 font-medium">{ping.latency_ms}ms</span>
            </span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-neutral-500">
            Page {data.page} of {totalPages} ({data.total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPings(data.page - 1)}
              disabled={!hasPrev}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} />
              Previous
            </button>
            <button
              onClick={() => fetchPings(data.page + 1)}
              disabled={!hasNext}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
