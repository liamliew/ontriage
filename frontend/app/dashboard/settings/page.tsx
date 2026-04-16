'use client'

import { useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  User,
  Globe,
  Shield,
  Trash2,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { createApiClient } from '@/lib/api'
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserPreferences'

const TIMEZONES = [
  'UTC',
  'Asia/Kuala_Lumpur',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'Asia/Tokyo',
]

export default function SettingsPage() {
  const { user } = useUser()
  const { data: preferences, isLoading } = useUserPreferences()
  const updatePrefs = useUpdateUserPreferences()

  const [timezone, setTimezone] = useState('')
  const [sslThreshold, setSslThreshold] = useState('30')
  const [initialized, setInitialized] = useState(false)

  if (isLoading) {
    return (
      <div className="px-8 py-8 max-w-2xl">
        <Skeleton className="h-6 w-28 mb-2" />
        <Skeleton className="h-4 w-40 mb-8" />
        <Card className="p-6 space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </Card>
      </div>
    )
  }

  if (preferences && !initialized) {
    setTimezone(preferences.timezone)
    setSslThreshold(String(preferences.ssl_alert_threshold_days))
    setInitialized(true)
  }

  async function handleSavePreferences() {
    try {
      await updatePrefs.mutateAsync({
        timezone,
        ssl_alert_threshold_days: Number(sslThreshold),
      })
      toast.success('Preferences saved')
    } catch {
      toast.error('Failed to save preferences')
    }
  }

  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || '—'
    : '—'
  const email = user?.emailAddresses?.[0]?.emailAddress ?? '—'
  const imageUrl = user?.imageUrl ?? ''

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-medium mb-3">
          <User size={14} className="text-muted-foreground" />
          Profile
        </h2>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-4">
              {imageUrl && (
                <img src={imageUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              )}
              <div>
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-xs text-muted-foreground">Display name</Label>
                <Input value={fullName} disabled className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={email} disabled className="mt-1" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Manage your profile at accounts.triage.lt</p>
            <a href="https://accounts.triage.lt/user" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink size={13} className="mr-1.5" />
                Edit profile
              </Button>
            </a>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-medium mb-3">
          <Globe size={14} className="text-muted-foreground" />
          Preferences
        </h2>
        <Card>
          <CardContent className="p-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select value={timezone || undefined} onValueChange={(v) => { if (v) setTimezone(v) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default SSL alert threshold (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={sslThreshold}
                  onChange={(e) => setSslThreshold(e.target.value)}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleSavePreferences} disabled={updatePrefs.isPending}>
                  {updatePrefs.isPending && <Loader2 size={14} className="animate-spin mr-1" />}
                  {updatePrefs.isPending ? 'Saving…' : 'Save preferences'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-sm font-medium mb-3 text-destructive">
          <Shield size={14} />
          Danger zone
        </h2>
        <Card className="border-destructive/30">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete all monitors</p>
                <p className="text-xs text-muted-foreground">Permanently remove all your monitors and their data</p>
              </div>
              <DeleteAllMonitorsButton />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete account</p>
                <p className="text-xs text-muted-foreground">Permanently remove your account and all associated data</p>
              </div>
              <a href="https://accounts.triage.lt/user" target="_blank" rel="noopener noreferrer">
                <Button variant="destructive" size="sm">
                  Delete account
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </motion.div>
  )
}

function DeleteAllMonitorsButton() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (confirmText !== 'DELETE') return
    setDeleting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const api = createApiClient(token)
      const monitors = await api.getMonitors()
      await Promise.all(monitors.map((m) => api.deleteMonitor(m.id)))
      queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success('All monitors deleted')
      setOpen(false)
      setConfirmText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete monitors')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 size={13} className="mr-1" />
        Delete all
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all monitors</DialogTitle>
            <DialogDescription>
              This will permanently delete all your monitors and their data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpen(false); setConfirmText('') }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={confirmText !== 'DELETE' || deleting}>
              {deleting && <Loader2 size={14} className="animate-spin mr-1" />}
              {deleting ? 'Deleting…' : 'Delete all monitors'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
