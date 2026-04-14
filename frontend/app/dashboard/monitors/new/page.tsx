'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ArrowLeft, Globe, Clock, Plus } from 'lucide-react'
import { createApiClient, MonitorCreate } from '@/lib/api'

const INTERVALS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
]

export default function NewMonitorPage() {
  const router = useRouter()
  const { getToken } = useAuth()

  const [form, setForm] = useState<MonitorCreate>({
    name: '',
    url: '',
    interval_sec: 60,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const api = createApiClient(token)
      const monitor = await api.createMonitor(form)
      router.push(`/dashboard/monitors/${monitor.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create monitor')
      setSaving(false)
    }
  }

  return (
    <div className="px-8 py-8 max-w-xl">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <h1 className="text-xl font-semibold text-white">New monitor</h1>
        <p className="text-sm text-neutral-400 mt-1">Configure what to monitor and how often</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Name">
          <input
            type="text"
            required
            placeholder="My API"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="URL / Address" icon={<Globe size={13} className="text-neutral-500" />}>
          <input
            type="text"
            required
            placeholder="https://example.com/health"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Check interval" icon={<Clock size={13} className="text-neutral-500" />}>
          <select
            value={form.interval_sec}
            onChange={(e) => setForm({ ...form, interval_sec: Number(e.target.value) })}
            className="input"
          >
            {INTERVALS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
            {saving ? 'Creating…' : 'Create monitor'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-md text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
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
