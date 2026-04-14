'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Link2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
import { createApiClient,
  StatusPage,
  StatusPageCreate,
  Monitor,
} from '@/lib/api'
import { useStatusPages } from '@/hooks/use-api'

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function StatusPagesPage() {
  const { getToken } = useAuth()
  const { data: pages, isLoading, error } = useStatusPages()
  const [monitors, setMonitors] = useState<Monitor[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [editingPage, setEditingPage] = useState<StatusPage | null>(null)
  const [deletingPage, setDeletingPage] = useState<StatusPage | null>(null)

  useEffect(() => {
    async function fetchMonitors() {
      const token = await getToken()
      if (!token) return
      try {
        const api = createApiClient(token)
        setMonitors(await api.getMonitors())
      } catch { /* useStatusPages handles error display */ }
    }
    fetchMonitors()
  }, [getToken])

  async function handleCreate(data: StatusPageCreate) {
    const token = await getToken()
    if (!token) return
    const api = createApiClient(token)
    await api.createStatusPage(data)
    toast.success('Status page created')
    setShowCreate(false)
  }

  async function handleDelete(id: string) {
    const token = await getToken()
    if (!token) return
    const api = createApiClient(token)
    await api.deleteStatusPage(id)
    toast.success('Status page deleted')
    setDeletingPage(null)
  }

  async function handleEdit(
    page: StatusPage,
    data: { title: string; slug: string; is_public: boolean },
    selectedIds: Set<string>,
    currentMonitorIds: Set<string>,
  ) {
    const token = await getToken()
    if (!token) return
    const api = createApiClient(token)

    const added = [...selectedIds].filter((id) => !currentMonitorIds.has(id))
    const removed = [...currentMonitorIds].filter((id) => !selectedIds.has(id))

    await Promise.all([
      api.updateStatusPage(page.id, data),
      ...added.map((id) => api.addMonitorToStatusPage(page.id, id)),
      ...removed.map((id) => api.removeMonitorFromStatusPage(page.id, id)),
    ])

    toast.success('Status page updated')
    setEditingPage(null)
  }

  if (isLoading) {
    return (
      <div className="px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div><Skeleton className="h-6 w-36 mb-2" /><Skeleton className="h-4 w-52" /></div>
        </div>
        <Card className="p-6 space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </Card>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Status Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pages?.length ?? 0} status page{pages?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} />
          Create status page
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error.message}</p>}

      {pages && pages.length === 0 && !error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">No status pages yet</p>
            <Button variant="link" onClick={() => setShowCreate(true)}>Create your first status page</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Monitors</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages?.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell>
                    <a
                      href={`/status/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
                    >
                      <Link2 size={12} className="shrink-0" />
                      {page.slug}
                      <ExternalLink size={10} className="shrink-0 opacity-50" />
                    </a>
                  </TableCell>
                  <TableCell>
                    {page.is_public ? (
                      <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20"><Eye size={10} className="mr-1" />Public</Badge>
                    ) : (
                      <Badge variant="secondary"><EyeOff size={10} className="mr-1" />Private</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{page.monitors?.length ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingPage(page)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingPage(page)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {showCreate && (
        <CreateDialog onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}

      {editingPage && (
        <EditDialog
          page={editingPage}
          monitors={monitors}
          onClose={() => setEditingPage(null)}
          onSubmit={(data, selectedIds, currentMonitorIds) => handleEdit(editingPage, data, selectedIds, currentMonitorIds)}
        />
      )}

      {deletingPage && (
        <DeleteDialog page={deletingPage} onClose={() => setDeletingPage(null)} onConfirm={() => handleDelete(deletingPage.id)} />
      )}
    </div>
  )
}

function CreateDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: StatusPageCreate) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [slugManual, setSlugManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugManual) setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!SLUG_REGEX.test(slug)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({ title, slug, is_public: isPublic })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create status page</DialogTitle>
          <DialogDescription>Set up a new public or private status page for your services.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required placeholder="My Status Page" value={title} onChange={(e) => handleTitleChange(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Link2 size={13} className="text-muted-foreground" />Slug</Label>
            <Input required placeholder="my-status-page" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }} className="font-mono" />
            {slug.length > 0 && !SLUG_REGEX.test(slug) && (
              <p className="text-xs text-destructive">Only lowercase letters, numbers, and hyphens</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            <Label>{isPublic ? 'Anyone can view' : 'Only you can view'}</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />}
              {saving ? 'Creating…' : 'Create status page'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditDialog({
  page,
  monitors,
  onClose,
  onSubmit,
}: {
  page: StatusPage
  monitors: Monitor[]
  onClose: () => void
  onSubmit: (data: { title: string; slug: string; is_public: boolean }, selectedIds: Set<string>, currentMonitorIds: Set<string>) => Promise<void>
}) {
  const { getToken } = useAuth()
  const [title, setTitle] = useState(page.title)
  const [slug, setSlug] = useState(page.slug)
  const [isPublic, setIsPublic] = useState(page.is_public)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentMonitorIds, setCurrentMonitorIds] = useState<Set<string>>(new Set())
  const [fetchingMonitors, setFetchingMonitors] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCurrentMonitors() {
      try {
        const token = await getToken()
        if (!token) return
        const api = createApiClient(token)
        const data = await api.getStatusPageBySlug(page.slug)
        const ids = new Set(data.monitors.map((m) => m.id))
        setCurrentMonitorIds(ids)
        setSelectedIds(new Set(ids))
      } catch {
        setSelectedIds(new Set((page.monitors ?? []).map((m) => m.id)))
      } finally {
        setFetchingMonitors(false)
      }
    }
    fetchCurrentMonitors()
  }, [getToken, page.slug, page.monitors])

  function toggleMonitor(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!SLUG_REGEX.test(slug)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({ title, slug, is_public: isPublic }, selectedIds, currentMonitorIds)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit status page</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Link2 size={13} className="text-muted-foreground" />Slug</Label>
            <Input required value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono" />
            {!SLUG_REGEX.test(slug) && <p className="text-xs text-destructive">Only lowercase letters, numbers, and hyphens</p>}
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            <Label>{isPublic ? 'Anyone can view' : 'Only you can view'}</Label>
          </div>

          <Separator />

          <div>
            <Label className="mb-3 block">Monitors</Label>
            {fetchingMonitors ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : monitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No monitors available</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {monitors.map((monitor) => (
                  <label key={monitor.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(monitor.id)}
                      onChange={() => toggleMonitor(monitor.id)}
                      className="h-3.5 w-3.5 rounded border-input accent-emerald-500"
                    />
                    <span className="text-sm flex-1 truncate">{monitor.name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{monitor.url}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

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

function DeleteDialog({
  page,
  onClose,
  onConfirm,
}: {
  page: StatusPage
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
          <DialogTitle>Delete status page</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{page.title}</strong>? This action cannot be undone.
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
