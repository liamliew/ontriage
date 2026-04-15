'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, Activity, Globe, Bell } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { ConnectionStatus } from '@/components/connection-status'
import { WebSocketProvider } from '@/components/websocket-provider'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/dashboard/monitors', label: 'Monitors', Icon: Activity },
  { href: '/dashboard/status-pages', label: 'Status Pages', Icon: Globe },
  { href: '/dashboard/alert-channels', label: 'Alert Channels', Icon: Bell },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <WebSocketProvider>
      <div className="flex min-h-screen">
        <aside className="w-56 border-r border-border bg-sidebar flex flex-col">
          <div className="h-14 flex items-center justify-between px-5 border-b border-border">
            <Link href="/dashboard" className="font-semibold text-foreground tracking-tight text-sm">
              OnTriage
            </Link>
            <ThemeToggle />
          </div>

          <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
            {navItems.map(({ href, label, Icon }) => {
              const active =
                href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 text-sm px-3 py-2 rounded-md transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60',
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="px-5 py-4 border-t border-border flex items-center gap-2.5">
            <ConnectionStatus />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-7 w-7',
                },
              }}
            />
            <span className="text-xs text-muted-foreground">Account</span>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </WebSocketProvider>
  )
}
