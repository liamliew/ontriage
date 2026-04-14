'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ArrowLeft, Globe, Clock, Plus, X, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { createApiClient, MonitorCreate } from '@/lib/api'
import { toast } from 'sonner'

const INTERVALS = [
  { value: '30', label: '30 seconds' },
  { value: '60', label: '1 minute' },
  { value: '300', label: '5 minutes' },
  { value: '600', label: '10 minutes' },
  { value: '1800', label: '30 minutes' },
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
  const [intervalSec, setIntervalSec] = useState('60')
  const [headers, setHeaders] = useState<HeaderRow[]>([])
  const [keyword, setKeyword] = useState('')
  const [expectedStatus, setExpectedStatus] = useState('200')
  const [timeoutSec, setTimeoutSec] = useState('10')
  const [incidentThreshold, setIncidentThreshold] = useState('2')
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
    const filledHeaders = headers.filter((h) => h.key.trim())
    const headersObj = filledHeaders.length > 0
      ? Object.fromEntries(filledHeaders.map((h) => [h.key.trim(), h.value]))
      : {}
    return {
      name,
      url,
      method,
      interval_sec: Number(intervalSec),
      expected_status: Number(expectedStatus),
      timeout_sec: Number(timeoutSec),
      incident_threshold: Number(incidentThreshold),
      headers: headersObj,
      keyword: keyword.trim(),
    }
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
      toast.success('Monitor created')
      router.push(`/dashboard/monitors/${monitor.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create monitor')
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 py-8 max-w-xl">
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 -ml-2 text-muted-foreground">
          <ArrowLeft size={13} />
          Back
        </Button>
        <h1 className="text-xl font-semibold">New monitor</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure what to monitor and how often</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input required placeholder="My API" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Globe size={13} className="text-muted-foreground" />URL / Address</Label>
          <Input required placeholder="https://example.com/health" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-3">
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => v && setMethod(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Clock size={13} className="text-muted-foreground" />Check interval</Label>
            <Select value={intervalSec} onValueChange={(v) => v && setIntervalSec(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-0 -ml-1"
          >
            <ChevronRight size={13} className={cn('transition-transform', advancedOpen && 'rotate-90')} />
            Advanced settings
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-5 pt-4 border-l-2 border-border ml-1 pl-4">
              <div className="space-y-2">
                <Label>Custom headers</Label>
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Header name" value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} />
                    <Input placeholder="Value" value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} />
                    <Button variant="ghost" size="icon" type="button" className="h-8 w-8 shrink-0" onClick={() => removeHeader(i)}>
                      <X size={14} />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" type="button" size="sm" onClick={addHeader} className="text-muted-foreground">
                  + Add header
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>Keyword to check in response body</Label>
                <Input placeholder="e.g. &quot;ok&quot; or &quot;healthy&quot;" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Expected status code</Label>
                  <Input type="number" min={100} max={599} value={expectedStatus} onChange={(e) => setExpectedStatus(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Timeout (sec)</Label>
                  <Input type="number" min={1} max={60} value={timeoutSec} onChange={(e) => setTimeoutSec(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Failures before incident</Label>
                  <Input type="number" min={1} max={10} value={incidentThreshold} onChange={(e) => setIncidentThreshold(e.target.value)} />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            <Plus size={14} />
            {saving ? 'Creating…' : 'Create monitor'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
