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
    connected: 'Connected',
    reconnecting: 'Reconnecting…',
    disconnected: 'Disconnected',
  }[status]

  return (
    <Tooltip>
      <TooltipTrigger className="flex items-center">
        <span className={cn('h-2 w-2 rounded-full', color, status === 'reconnecting' && 'animate-pulse')} />
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
