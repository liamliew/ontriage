'use client'

import { useWebSocket } from '@/hooks/useWebSocket'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ConnectionStatus() {
  const { status } = useWebSocket()

  const color = {
    connected: 'bg-emerald-500',
    reconnecting: 'bg-yellow-500',
    disconnected: 'bg-red-500',
  }[status]

  const label = {
    connected: 'Live',
    reconnecting: 'Reconnecting...',
    disconnected: 'Disconnected',
  }[status]

  return (
    <Tooltip>
      <TooltipTrigger className="flex items-center gap-1.5">
        <span className={cn('h-2 w-2 rounded-full', color, status === 'reconnecting' && 'animate-pulse')} />
        <span className={cn(
          'text-xs',
          status === 'connected' && 'text-emerald-500',
          status === 'reconnecting' && 'text-yellow-500',
          status === 'disconnected' && 'text-red-500',
        )}>
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {status === 'connected' ? 'Connected to real-time updates' : status === 'reconnecting' ? 'Attempting to reconnect...' : 'Disconnected from server'}
      </TooltipContent>
    </Tooltip>
  )
}
