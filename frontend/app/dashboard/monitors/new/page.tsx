'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ArrowLeft, Globe, Clock, Plus, ChevronDown, ChevronRight, X } from 'lucide-react'
import { createApiClient, MonitorCreate } from '@/lib/api'

const INTERVALS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
]

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

interface HeaderRow {
  key: string
  value: string
}

export default function NewMonitorPage() {
  const router = useRouter()
  const { getToken } = useAuth()

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState('GET')
  const [intervalSec, setIntervalSec] = useState(60)
  const [headers, setHeaders] = useState<HeaderRow[]>([])
  const [keyword, setKeyword] = useState('')
  const [expectedStatus, setExpectedStatus] = useState(200)
  const [timeoutSec, setTimeoutSec] = useState(10)
  const [incidentThreshold, setIncidentThreshold] = useState(2)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addHeader() {
    setHeaders([...headers, { key: '', value: '' }])
  }

  function removeHeader(index: number) {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  function updateHeader(index: number, field: 'key' | 'value', val: string) {
    setHeaders(headers.map((h, i) => (i === index ? { ...h, [field]: val } : h)))
  }

  function buildPayload(): MonitorCreate {
    const payload: MonitorCreate = {
      name,
      url,
      method,
      interval_sec: intervalSec,
    }
    const filledHeaders = headers.filter((h) => h.key.trim())
    if (filledHeaders.length > 0) {
      payload.headers = Object.fromEntries(filledHeaders.map((h) => [h.key.trim(), h.value]))
    }
    if (keyword.trim()) payload.keyword = keyword.trim()
    if (expectedStatus !== 200) payload.expected_status = expectedStatus
    if (timeoutSec !== 10) payload.timeout_sec = timeoutSec
    if (incidentThreshold !== 2) payload.incident_threshold = incidentThreshold
    return payload
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const api = createApiClient(token)
      const monitor = await api.createMonitor(buildPayload())
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </Field>

        <Field label="URL / Address" icon={<Globe size={13} className="text-neutral-500" />}>
          <input
            type="text"
            required
            placeholder="https://example.com/health"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-[120px_1fr] gap-3">
          <Field label="Method">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="input"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Check interval" icon={<Clock size={13} className="text-neutral-500" />}>
            <select
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              className="input"
            >
              {INTERVALS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors pt-1"
        >
          {advancedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          Advanced settings
        </button>

        {advancedOpen && (
          <div className="flex flex-col gap-5 border-l-2 border-neutral-800 ml-1 pl-4">
            <Field label="Custom headers">
              <div className="flex flex-col gap-2">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Header name"
                      value={h.key}
                      onChange={(e) => updateHeader(i, 'key', e.target.value)}
                      className="input flex-1"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={h.value}
                      onChange={(e) => updateHeader(i, 'value', e.target.value)}
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(i)}
                      className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addHeader}
                  className="text-xs text-neutral-500 hover:text-white transition-colors self-start"
                >
                  + Add header
                </button>
              </div>
            </Field>

            <Field label="Keyword to check in response body">
              <input
                type="text"
                placeholder="e.g. &quot;ok&quot; or &quot;healthy&quot;"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="input"
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Expected status code">
                <input
                  type="number"
                  min={100}
                  max={599}
                  value={expectedStatus}
                  onChange={(e) => setExpectedStatus(Number(e.target.value))}
                  className="input"
                />
              </Field>
              <Field label="Timeout (sec)">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={timeoutSec}
                  onChange={(e) => setTimeoutSec(Number(e.target.value))}
                  className="input"
                />
              </Field>
              <Field label="Failures before incident">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={incidentThreshold}
                  onChange={(e) => setIncidentThreshold(Number(e.target.value))}
                  className="input"
                />
              </Field>
            </div>
          </div>
        )}

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
