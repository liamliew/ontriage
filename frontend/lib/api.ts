const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export interface Monitor {
  id: string
  name: string
  url: string
  type: 'http' | 'tcp' | 'ping'
  interval_sec: number
  status: 'up' | 'down' | 'paused' | 'pending'
  last_checked_at: string | null
  created_at: string
  updated_at: string
}

export interface MonitorCreate {
  name: string
  url: string
  type: 'http' | 'tcp' | 'ping'
  interval_sec: number
}

export interface MonitorUpdate {
  name?: string
  url?: string
  type?: 'http' | 'tcp' | 'ping'
  interval_sec?: number
}

export interface Ping {
  id: string
  monitor_id: string
  is_up: boolean
  status_code: number | null
  latency_ms: number
  checked_at: string
  error?: string
}

export interface Incident {
  id: string
  monitor_id: string
  started_at: string
  resolved_at: string | null
  duration_ms: number | null
}

export interface StatusPage {
  id: string
  name: string
  slug: string
  monitors: Monitor[]
  incidents: Incident[]
}

async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export function createApiClient(token: string) {
  return {
    getMonitors: () =>
      apiFetch<Monitor[]>('/monitors', token),

    createMonitor: (data: MonitorCreate) =>
      apiFetch<Monitor>('/monitors', token, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateMonitor: (id: string, data: MonitorUpdate) =>
      apiFetch<Monitor>(`/monitors/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteMonitor: (id: string) =>
      apiFetch<void>(`/monitors/${id}`, token, { method: 'DELETE' }),

    getMonitorPings: (id: string) =>
      apiFetch<Ping[]>(`/monitors/${id}/pings`, token),

    getMonitorIncidents: (id: string) =>
      apiFetch<Incident[]>(`/monitors/${id}/incidents`, token),

    getStatusPage: (slug: string) =>
      apiFetch<StatusPage>(`/status/${slug}`, token),
  }
}
