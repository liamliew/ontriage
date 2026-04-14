'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  X,
  Link2,
  Loader2,
} from 'lucide-react'
import {
  createApiClient,
  StatusPage,
  StatusPageCreate,
  Monitor,
} from '@/lib/api'

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function StatusPagesPage() {
  const { getToken } = useAuth()

  const [pages, setPages] = useState<StatusPage[]>([])
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editingPage, setEditingPage] = useState<StatusPage | null>(null)
  const [deletingPage, setDeletingPage] = useState<StatusPage | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return
      const api = createApiClient(token)
      const [p, m] = await Promise.all([
        api.getStatusPages(),
        api.getMonitors(),
      ])
      setPages(p)
      setMonitors(m)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleCreate(data: StatusPageCreate) {
    const token = await getToken()
    if (!token) return
    const api = createApiClient(token)
    await api.createStatusPage(data)
    setShowCreate(false)
    await fetchData()
  }

  async function handleDelete(id: string) {
    const token = await getToken()
    if (!token) return
    const api = createApiClient(token)
    await api.deleteStatusPage(id)
    setDeletingPage(null)
    await fetchData()
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

    setEditingPage(null)
    await fetchData()
  }

  if (loading) {
    return (
      <div className="px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-6 w-36 bg-neutral-800 rounded animate-pulse" />
            <div className="h-4 w-52 bg-neutral-800 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="border border-neutral-800 rounded-xl p-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-neutral-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Status Pages</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {pages.length} status page{pages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-neutral-200 transition-colors"
        >
          <Plus size={14} />
          Create status page
        </button>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {pages.length === 0 && !error ? (
        <div className="border border-neutral-800 rounded-xl p-12 text-center">
          <p className="text-sm text-neutral-500 mb-4">No status pages yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm text-white underline underline-offset-2"
          >
            Create your first status page
          </button>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1.5fr_100px_80px_100px] gap-4 px-5 py-2.5 border-b border-neutral-800 bg-neutral-900/60">
            <span className="text-xs text-neutral-500 font-medium">Title</span>
            <span className="text-xs text-neutral-500 font-medium">Slug</span>
            <span className="text-xs text-neutral-500 font-medium">Visibility</span>
            <span className="text-xs text-neutral-500 font-medium">Monitors</span>
            <span className="text-xs text-neutral-500 font-medium">Actions</span>
          </div>

          {pages.map((page, i) => (
            <div
              key={page.id}
              className={`grid grid-cols-[2fr_1.5fr_100px_80px_100px] gap-4 px-5 py-3.5 items-center hover:bg-neutral-900 transition-colors ${
                i > 0 ? 'border-t border-neutral-800' : ''
              }`}
            >
              <span className="text-sm text-white truncate">{page.title}</span>
              <a
                href={`/status/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white truncate transition-colors"
              >
                <Link2 size={12} className="shrink-0" />
                {page.slug}
                <ExternalLink size={10} className="shrink-0 opacity-50" />
              </a>
              <span>
                {page.is_public ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
                    <Eye size={10} />
                    Public
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-500/15 text-neutral-400">
                    <EyeOff size={10} />
                    Private
                  </span>
                )}
              </span>
              <span className="text-xs text-neutral-400">
                {page.monitors?.length ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <button
                  onClick={() => setEditingPage(page)}
                  className="p-1 text-neutral-500 hover:text-white transition-colors"
                  title="Edit"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setDeletingPage(page)}
                  className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingPage && (
        <EditModal
          page={editingPage}
          monitors={monitors}
          onClose={() => setEditingPage(null)}
          onSubmit={(data, selectedIds, currentMonitorIds) => handleEdit(editingPage, data, selectedIds, currentMonitorIds)}
        />
      )}

      {deletingPage && (
        <DeleteModal
          page={deletingPage}
          onClose={() => setDeletingPage(null)}
          onConfirm={() => handleDelete(deletingPage.id)}
        />
      )}
    </div>
  )
}

function CreateModal({
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
    if (!slugManual) {
      setSlug(slugify(value))
    }
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
    <ModalOverlay onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Create status page</h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <Field label="Title">
            <input
              type="text"
              required
              placeholder="My Status Page"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Slug" icon={<Link2 size={13} className="text-neutral-500" />}>
            <input
              type="text"
              required
              placeholder="my-status-page"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugManual(true)
              }}
              className="input font-mono"
            />
            {slug.length > 0 && !SLUG_REGEX.test(slug) && (
              <p className="text-xs text-red-400 mt-1">
                Only lowercase letters, numbers, and hyphens
              </p>
            )}
          </Field>

          <Field label="Visibility">
            <div className="flex items-center gap-3">
              <Toggle checked={isPublic} onChange={setIsPublic} />
              <span className="text-sm text-neutral-400">
                {isPublic ? 'Anyone can view' : 'Only you can view'}
              </span>
            </div>
          </Field>
        </div>

        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Creating…' : 'Create status page'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function EditModal({
  page,
  monitors,
  onClose,
  onSubmit,
}: {
  page: StatusPage
  monitors: Monitor[]
  onClose: () => void
  onSubmit: (
    data: { title: string; slug: string; is_public: boolean },
    selectedIds: Set<string>,
    currentMonitorIds: Set<string>,
  ) => Promise<void>
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
    <ModalOverlay onClose={onClose}>
      <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Edit status page</h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <Field label="Title">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Slug" icon={<Link2 size={13} className="text-neutral-500" />}>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="input font-mono"
            />
            {!SLUG_REGEX.test(slug) && (
              <p className="text-xs text-red-400 mt-1">
                Only lowercase letters, numbers, and hyphens
              </p>
            )}
          </Field>

          <Field label="Visibility">
            <div className="flex items-center gap-3">
              <Toggle checked={isPublic} onChange={setIsPublic} />
              <span className="text-sm text-neutral-400">
                {isPublic ? 'Anyone can view' : 'Only you can view'}
              </span>
            </div>
          </Field>
        </div>

        <div className="mt-6 pt-5 border-t border-neutral-800">
          <h3 className="text-sm font-medium text-white mb-3">Monitors</h3>
          {fetchingMonitors ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 bg-neutral-800/50 rounded animate-pulse" />
              ))}
            </div>
          ) : monitors.length === 0 ? (
            <p className="text-sm text-neutral-500">No monitors available</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {monitors.map((monitor) => (
                <label
                  key={monitor.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800/60 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(monitor.id)}
                    onChange={() => toggleMonitor(monitor.id)}
                    className="h-3.5 w-3.5 rounded border-neutral-600 bg-neutral-800 accent-emerald-500"
                  />
                  <span className="text-sm text-neutral-300 flex-1 truncate">{monitor.name}</span>
                  <span className="text-xs text-neutral-500 truncate max-w-[200px]">{monitor.url}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function DeleteModal({
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
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Delete status page</h2>
        <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>
      <p className="text-sm text-neutral-400 mb-6">
        Are you sure you want to delete{' '}
        <span className="text-white font-medium">{page.title}</span>? This action cannot be undone.
      </p>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {deleting && <Loader2 size={14} className="animate-spin" />}
          <Trash2 size={14} />
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md text-sm text-neutral-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </ModalOverlay>
  )
}

function ModalOverlay({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl p-6">
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-neutral-700'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
