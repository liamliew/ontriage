'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Show } from '@clerk/nextjs'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Status', href: '/status' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            OnTriage
          </span>
          <span className="font-mono text-[10px] text-muted-foreground leading-tight">
            a Triage Labs SaaS
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Show when="signed-out">
            <Button variant="ghost" size="default" render={<Link href="/sign-in" />}>
              Sign In
            </Button>
            <Button
              size="default"
              className="bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white hover:opacity-90"
              render={<Link href="/sign-up" />}
            >
              Get Started
            </Button>
          </Show>
          <Show when="signed-in">
            <Button
              size="default"
              className="bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white hover:opacity-90"
              render={<Link href="/dashboard" />}
            >
              Dashboard
            </Button>
          </Show>
        </div>

        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle>OnTriage</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                {navLinks.map((link) => (
                  <SheetClose key={link.href} render={<Link href={link.href} />} onClick={() => setOpen(false)}>
                    {link.label}
                  </SheetClose>
                ))}
                <Show when="signed-out">
                  <SheetClose render={<Link href="/sign-in" className="text-base text-foreground hover:text-primary transition-colors" />}>
                    Sign In
                  </SheetClose>
                  <SheetClose render={<Link href="/sign-up" className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white px-4 py-2 text-sm font-medium" />}>
                    Get Started
                  </SheetClose>
                </Show>
                <Show when="signed-in">
                  <SheetClose render={<Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#5e17eb] to-[#cb6ce6] text-white px-4 py-2 text-sm font-medium" />}>
                    Dashboard
                  </SheetClose>
                </Show>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}