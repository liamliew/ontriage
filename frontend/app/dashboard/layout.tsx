'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, Activity, Globe, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/dashboard/monitors', label: 'Monitors', Icon: Activity },
  { href: '/dashboard/status-pages', label: 'Status Pages', Icon: Globe },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r border-neutral-800 bg-neutral-900 flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-neutral-800">
          <Link href="/dashboard" className="font-semibold text-white tracking-tight text-sm">
            OnTriage
          </Link>
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
                className={`flex items-center gap-2.5 text-sm px-3 py-2 rounded-md transition-colors ${
                  active
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-5 py-4 border-t border-neutral-800 flex items-center gap-2.5">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-7 w-7',
              },
            }}
          />
          <span className="text-xs text-neutral-500 flex items-center gap-1.5">
            <Settings size={12} />
            Settings
          </span>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
