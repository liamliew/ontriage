'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { createApiClient, MonitorCreate } from '@/lib/api'

const MONITOR_TYPES = [
  { value: 'http', label: 'HTTP(S)' },
  { value: 'tcp', label: 'TCP' },
  { value: 'ping', label: 'Ping' },
] as const

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
    type: 'http',
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

        <Field label="URL / Address">
          <input
            type="text"
            required
            placeholder="https://example.com/health"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Type">
          <div className="flex gap-2">
            {MONITOR_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, type: t.value })}
                className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                  form.type === t.value
                    ? 'border-white text-white bg-neutral-800'
                    : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Check interval">
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
            className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-neutral-300">{label}</label>
      {children}
    </div>
  )
}
