'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Mail,
  Webhook,
  MessageSquare,
  ArrowLeft,
  Send,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createApiClient, type AlertChannel, type AlertChannelCreate } from '@/lib/api'
import { useAlertChannels } from '@/hooks/useAlertChannels'

type ChannelType = AlertChannel['type']

const channelTypeConfig: Record<ChannelType, { label: string; icon: React.ReactNode; description: string }> = {
  pagerduty: {
    label: 'PagerDuty',
    icon: <AlertTriangle size={24} />,
    description: 'Trigger PagerDuty incidents',
  },
  email: {
    label: 'Email',
    icon: <Mail size={24} />,
    description: 'Send email alerts via Resend',
  },
  webhook: {
    label: 'Webhook',
    icon: <Webhook size={24} />,
    description: 'POST to any HTTP endpoint',
  },
  slack: {
    label: 'Slack',
    icon: <MessageSquare size={24} />,
    description: 'Post to a Slack channel',
  },
}

function typeBadgeVariant(type: ChannelType) {
  switch (type) {
    case 'pagerduty':
      return <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/20">{channelTypeConfig[type].label}</Badge>
    case 'email':
      return <Badge className="bg-blue-500/15 text-blue-500 hover:bg-blue-500/20">{channelTypeConfig[type].label}</Badge>
    case 'webhook':
      return <Badge className="bg-purple-500/15 text-purple-500 hover:bg-purple-500/20">{channelTypeConfig[type].label}</Badge>
    case 'slack':
      return <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/20">{channelTypeConfig[type].label}</Badge>
  }
}

function channelDestination(channel: AlertChannel) {
  switch (channel.type) {
    case 'email':
      return <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{channel.config.to ?? '—'}</span>
    case 'pagerduty':
      return <span className="text-xs text-muted-foreground">PagerDuty service</span>
    case 'webhook':
      return <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{(channel.config.url ?? '').length > 40 ? `${channel.config.url.slice(0, 40)}…` : channel.config.url || '—'}</span>
    case 'slack':
      return <span className="text-xs text-muted-foreground">Slack webhook</span>
  }
}

export default function AlertChannelsPage() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const { data: channels, isLoading, error } = useAlertChannels()

  const [showCreate, setShowCreate] = useState(false)
  const [editingChannel, setEditingChannel] = useState<AlertChannel | null>(null)
  const [deletingChannel, setDeletingChannel] = useState<AlertChannel | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  async function handleToggleActive(channel: AlertChannel) {
    const token = await getToken()
    if (!token) return
    try {
      const api = createApiClient(token)
      await api.updateAlertChannel(channel.id, { is_active: !channel.is_active })
      queryClient.invalidateQueries({ queryKey: ['alert-channels'] })
      toast.success(channel.is_active ? 'Channel deactivated' : 'Channel activated')
    } catch {
      toast.error('Failed to update channel')
    }
  }

  async function handleDelete(id: string) {
    const token = await getToken()
    if (!token) return
    try {
      const api = createApiClient(token)
      await api.deleteAlertChannel(id)
      queryClient.invalidateQueries({ queryKey: ['alert-channels'] })
      toast.success('Channel deleted')
      setDeletingChannel(null)
    } catch {
      toast.error('Failed to delete channel')
    }
  }

  async function handleTest(id: string) {
    const token = await getToken()
    if (!token) return
    setTestingId(id)
    try {
      const api = createApiClient(token)
      await api.testAlertChannel(id)
      toast.success('Test alert sent successfully')
    } catch {
      toast.error('Failed to send test alert')
    } finally {
      setTestingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-6 w-36 mb-2" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <Card className="p-6 space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </Card>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Alert channels</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {channels?.length ?? 0} channel{(channels?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} />
          Add channel
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error.message}</p>}

      {channels && channels.length === 0 && !error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">No alert channels yet</p>
            <Button variant="link" onClick={() => setShowCreate(true)}>Create your first alert channel</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels?.map((channel, i) => (
                <motion.tr
                  key={channel.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-t border-border hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium">{channel.name}</TableCell>
                  <TableCell>{typeBadgeVariant(channel.type)}</TableCell>
                  <TableCell>{channelDestination(channel)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={channel.is_active}
                      onCheckedChange={() => handleToggleActive(channel)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={testingId === channel.id}
                        onClick={() => handleTest(channel.id)}
                      >
                        {testingId === channel.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingChannel(channel)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingChannel(channel)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {showCreate && (
        <CreateChannelDialog
          onClose={() => setShowCreate(false)}
          onSubmit={async (data) => {
            const token = await getToken()
            if (!token) return
            const api = createApiClient(token)
            await api.createAlertChannel(data)
            queryClient.invalidateQueries({ queryKey: ['alert-channels'] })
            toast.success('Channel created')
            setShowCreate(false)
          }}
        />
      )}

      {editingChannel && (
        <EditChannelDialog
          channel={editingChannel}
          onClose={() => setEditingChannel(null)}
          onSubmit={async (data) => {
            const token = await getToken()
            if (!token) return
            const api = createApiClient(token)
            await api.updateAlertChannel(editingChannel.id, data)
            queryClient.invalidateQueries({ queryKey: ['alert-channels'] })
            toast.success('Channel updated')
            setEditingChannel(null)
          }}
        />
      )}

      {deletingChannel && (
        <DeleteChannelDialog
          channel={deletingChannel}
          onClose={() => setDeletingChannel(null)}
          onConfirm={() => handleDelete(deletingChannel.id)}
        />
      )}
    </motion.div>
  )
}

function CreateChannelDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: AlertChannelCreate) => Promise<void>
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [type, setType] = useState<ChannelType | null>(null)
  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSelectType(t: ChannelType) {
    setType(t)
    setStep(2)
    setConfig({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type || !name.trim()) return
    setError(null)
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), type, config })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={step === 1 ? 'max-w-lg' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle>{step === 1 ? 'Add channel' : `Configure ${type ? channelTypeConfig[type].label : ''}`}</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Choose a channel type' : 'Fill in the configuration details'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid grid-cols-2 gap-3 py-2">
            {(Object.keys(channelTypeConfig) as ChannelType[]).map((t) => {
              const cfg = channelTypeConfig[t]
              return (
                <Card
                  key={t}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelectType(t)}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                    {cfg.icon}
                    <p className="text-sm font-medium">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">{cfg.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                required
                placeholder="My channel"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {type === 'pagerduty' && (
              <div className="space-y-1.5">
                <Label>Routing Key</Label>
                <Input
                  required
                  placeholder="abc123..."
                  value={config.routing_key ?? ''}
                  onChange={(e) => setConfig({ ...config, routing_key: e.target.value })}
                />
              </div>
            )}
            {type === 'email' && (
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  required
                  type="email"
                  placeholder="alerts@example.com"
                  value={config.to ?? ''}
                  onChange={(e) => setConfig({ ...config, to: e.target.value })}
                />
              </div>
            )}
            {type === 'webhook' && (
              <>
                <div className="space-y-1.5">
                  <Label>URL</Label>
                  <Input
                    required
                    type="url"
                    placeholder="https://example.com/webhook"
                    value={config.url ?? ''}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>HMAC secret (optional)</Label>
                  <Input
                    placeholder="whsec_..."
                    value={config.secret ?? ''}
                    onChange={(e) => setConfig({ ...config, secret: e.target.value })}
                  />
                </div>
              </>
            )}
            {type === 'slack' && (
              <div className="space-y-1.5">
                <Label>Webhook URL</Label>
                <Input
                  required
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={config.webhook_url ?? ''}
                  onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft size={13} />
                Back
              </Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving && <Loader2 size={14} className="animate-spin mr-1" />}
                {saving ? 'Creating…' : 'Create channel'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditChannelDialog({
  channel,
  onClose,
  onSubmit,
}: {
  channel: AlertChannel
  onClose: () => void
  onSubmit: (data: { name?: string; config?: Record<string, string> }) => Promise<void>
}) {
  const [name, setName] = useState(channel.name)
  const [config, setConfig] = useState<Record<string, string>>({ ...channel.config })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), config })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {channelTypeConfig[channel.type].label} channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {channel.type === 'pagerduty' && (
            <div className="space-y-1.5">
              <Label>Routing Key</Label>
              <Input required value={config.routing_key ?? ''} onChange={(e) => setConfig({ ...config, routing_key: e.target.value })} />
            </div>
          )}
          {channel.type === 'email' && (
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input required type="email" value={config.to ?? ''} onChange={(e) => setConfig({ ...config, to: e.target.value })} />
            </div>
          )}
          {channel.type === 'webhook' && (
            <>
              <div className="space-y-1.5">
                <Label>URL</Label>
                <Input required type="url" value={config.url ?? ''} onChange={(e) => setConfig({ ...config, url: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>HMAC secret (optional)</Label>
                <Input value={config.secret ?? ''} onChange={(e) => setConfig({ ...config, secret: e.target.value })} />
              </div>
            </>
          )}
          {channel.type === 'slack' && (
            <div className="space-y-1.5">
              <Label>Webhook URL</Label>
              <Input required type="url" value={config.webhook_url ?? ''} onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })} />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />}
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteChannelDialog({
  channel,
  onClose,
  onConfirm,
}: {
  channel: AlertChannel
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    try {
      await onConfirm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete channel</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{channel.name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 size={14} className="animate-spin mr-1" />}
            <Trash2 size={14} className="mr-1" />
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
