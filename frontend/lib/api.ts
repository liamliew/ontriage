const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export interface Monitor {
  id: string
  name: string
  url: string
  method: string
  interval_sec: number
  is_active: boolean
  latest_is_up: boolean | null
  last_checked_at: string | null
  created_at: string
  updated_at: string
  headers?: Record<string, string>
  keyword?: string
  expected_status: number
  timeout_sec: number
  incident_threshold: number
}

export interface MonitorCreate {
  name: string
  url: string
  method: string
  interval_sec: number
  headers: Record<string, string>
  keyword: string
  expected_status: number
  timeout_sec: number
  incident_threshold: number
}

export interface MonitorUpdate {
  name?: string
  url?: string
  method?: string
  interval_sec?: number
  is_active?: boolean
  headers?: Record<string, string>
  keyword?: string
  expected_status?: number
  timeout_sec?: number
  incident_threshold?: number
}

export interface Ping {
  id: string
  monitor_id: string
  is_up: boolean
  status_code: number
  latency_ms: number
  dns_ms: number
  tls_ms: number
  checked_at: string
  error_message: string
}

export interface Incident {
  id: string
  monitor_id: string
  started_at: string
  resolved_at: string | null
  is_resolved: boolean
}

export interface StatusPage {
  id: string
  user_id: string
  slug: string
  title: string
  is_public: boolean
  created_at: string
  monitors?: Monitor[]
}

export interface StatusPageCreate {
  title: string
  slug: string
  is_public: boolean
}

export interface StatusPageUpdate {
  title?: string
  slug?: string
  is_public?: boolean
}

export type StatusPageMonitor = Monitor & {
  latest_ping: Ping | null
}

export interface PublicStatusPageResponse {
  status_page: StatusPage
  monitors: StatusPageMonitor[]
}

export interface UptimeResponse {
  uptime_percentage: number
  total_checks: number
  up_checks: number
  down_checks: number
  days: number
}

export interface StatsDay {
  date: string
  avg_latency_ms: number
  min_latency_ms: number
  max_latency_ms: number
  uptime_percentage: number
}

export interface StatsResponse {
  days: StatsDay[]
}

export interface PaginatedPings {
  data: Ping[]
  page: number
  limit: number
  total: number
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
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) return res.json()
  return undefined as T
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
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteMonitor: (id: string) =>
      apiFetch<void>(`/monitors/${id}`, token, { method: 'DELETE' }),

    getMonitorPings: (id: string, page = 1, limit = 50, from?: string, to?: string) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      return apiFetch<PaginatedPings>(`/monitors/${id}/pings?${params}`, token)
    },

    getMonitorIncidents: (id: string) =>
      apiFetch<Incident[]>(`/monitors/${id}/incidents`, token),

    getMonitorUptime: (id: string, days = 30) =>
      apiFetch<UptimeResponse>(`/monitors/${id}/uptime?days=${days}`, token),

    getMonitorStats: (id: string, days = 7) =>
      apiFetch<StatsResponse>(`/monitors/${id}/stats?days=${days}`, token),

    getStatusPages: () =>
      apiFetch<StatusPage[]>('/status-pages', token),

    createStatusPage: (data: StatusPageCreate) =>
      apiFetch<StatusPage>('/status-pages', token, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateStatusPage: (id: string, data: StatusPageUpdate) =>
      apiFetch<StatusPage>(`/status-pages/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteStatusPage: (id: string) =>
      apiFetch<void>(`/status-pages/${id}`, token, { method: 'DELETE' }),

    addMonitorToStatusPage: (statusPageId: string, monitorId: string) =>
      apiFetch<void>(`/status-pages/${statusPageId}/monitors`, token, {
        method: 'POST',
        body: JSON.stringify({ monitor_id: monitorId }),
      }),

    removeMonitorFromStatusPage: (statusPageId: string, monitorId: string) =>
      apiFetch<void>(`/status-pages/${statusPageId}/monitors/${monitorId}`, token, {
        method: 'DELETE',
      }),

    getStatusPageBySlug: (slug: string) =>
      apiFetch<PublicStatusPageResponse>(`/status/${slug}`, token),
  }
}

export async function getPublicStatusPage(slug: string): Promise<PublicStatusPageResponse> {
  const res = await fetch(`${API_BASE}/status/${slug}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('not_found')
    if (res.status === 403) throw new Error('private')
    throw new Error(`API ${res.status}`)
  }
  return res.json()
}
