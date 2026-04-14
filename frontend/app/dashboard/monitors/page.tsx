'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { Plus, ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { createApiClient } from '@/lib/api'
import { useMonitorsWithStatus, useMonitorUptime, type MonitorWithStatus } from '@/hooks/use-api'
import { toast } from 'sonner'

function formatInterval(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  return `${Math.round(seconds / 60)} min`
}

function UptimeCell({ monitorId }: { monitorId: string }) {
  const { data: uptime } = useMonitorUptime(monitorId)
  if (!uptime) return <span className="text-xs text-muted-foreground">—</span>
  const pct = uptime.uptime_percentage
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        pct >= 99 && 'text-emerald-500',
        pct >= 95 && pct < 99 && 'text-yellow-500',
        pct < 95 && 'text-red-500',
      )}
    >
      {pct.toFixed(2)}%
    </span>
  )
}

function ActionsCell({ monitor }: { monitor: MonitorWithStatus }) {
  const router = useRouter()
  const { getToken } = useAuth()

  async function handleDelete() {
    const token = await getToken()
    if (!token) return
    try {
      const api = createApiClient(token)
      await api.deleteMonitor(monitor.id)
      toast.success('Monitor deleted')
      router.push('/dashboard/monitors')
    } catch {
      toast.error('Failed to delete monitor')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/dashboard/monitors/${monitor.id}`)}>
          <Pencil size={13} className="mr-2" />
          View / Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
          <Trash2 size={13} className="mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const columns: ColumnDef<MonitorWithStatus>[] = [
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const ping = row.original.latestPing
      const isUp = ping ? ping.is_up : null
      return (
        <Badge
          variant={isUp === true ? 'default' : isUp === false ? 'destructive' : 'secondary'}
          className={cn(
            'text-xs',
            isUp === true && 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20',
            isUp === null && 'bg-muted text-muted-foreground',
          )}
        >
          {isUp === true ? 'Up' : isUp === false ? 'Down' : 'No data'}
        </Badge>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Name
        <ArrowUpDown size={13} className="ml-1" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-sm font-medium">{row.getValue('name')}</span>,
  },
  {
    accessorKey: 'url',
    header: 'URL',
    cell: ({ row }) => <span className="text-sm text-muted-foreground font-mono truncate max-w-xs">{row.getValue('url')}</span>,
    enableSorting: false,
  },
  {
    accessorKey: 'interval_sec',
    header: 'Interval',
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatInterval(row.getValue('interval_sec'))}</span>,
    enableSorting: false,
  },
  {
    id: 'uptime',
    header: 'Uptime',
    cell: ({ row }) => <UptimeCell monitorId={row.original.id} />,
    enableSorting: false,
  },
  {
    id: 'last_checked',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Last checked
        <ArrowUpDown size={13} className="ml-1" />
      </Button>
    ),
    cell: ({ row }) => {
      const ping = row.original.latestPing
      if (!ping) return <span className="text-xs text-muted-foreground">—</span>
      return (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(ping.checked_at), { addSuffix: true })}
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionsCell monitor={row.original} />,
    enableSorting: false,
  },
]

export default function MonitorsPage() {
  const { data: monitors, isLoading, error } = useMonitorsWithStatus()
  const [sorting, setSorting] = useState<SortingState>([])
  const [filter, setFilter] = useState('')

  const table = useReactTable({
    data: monitors ?? [],
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (isLoading) {
    return (
      <div className="px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-6 w-28 mb-2" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm mb-4" />
        <Card>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </Card>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Monitors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {monitors?.length ?? 0} monitor{(monitors?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/monitors/new">
          <Button size="sm">
            <Plus size={14} />
            Add monitor
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error.message}</p>}

      {monitors && monitors.length === 0 && !error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">No monitors yet</p>
            <Link href="/dashboard/monitors/new">
              <Button variant="link">Create your first monitor</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <Input
              placeholder="Filter by name or URL..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Card>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-t border-border hover:bg-muted/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground text-sm">
                      No monitors found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  )
}
