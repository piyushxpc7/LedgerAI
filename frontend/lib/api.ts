/**
 * LedgerAI API Client
 * Type-safe wrapper for all backend API calls.
 */

const API_BASE = '/api'

function getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('ledgerai_token')
}

async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken()
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

    if (res.status === 401) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('ledgerai_token')
            localStorage.removeItem('ledgerai_user')
            window.location.href = '/login'
        }
        throw new Error('Unauthorized')
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(error.detail || `API error ${res.status}`)
    }

    return res.json()
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
    id: string
    name: string
    email: string
    role: string
    firm_id: string
}

export interface Client {
    id: string
    name: string
    pan: string
    dob?: string
    email?: string
    phone?: string
    is_active: boolean
    created_at: string
    notice_count: number
}

export interface Notice {
    id: string
    client_id: string
    client_name?: string
    client_pan?: string
    assessment_year: string
    section: string
    notice_type: string
    mismatch_amount?: number
    demand_amount?: number
    deadline?: string
    status: string
    portal_reference?: string
    ao_name?: string
    ai_strategy?: string
    ai_draft_response?: string
    detected_at: string
    resolved_at?: string
}

export interface ClaimItem {
    claim_description: string
    claim_amount: number
    source_document: string
    source_line?: string
    our_value?: number
    match_confidence: number
    discrepancy?: number
    status: 'MATCH' | 'MISMATCH' | 'UNKNOWN'
}

export interface ProofObject {
    id: string
    notice_id: string
    claim_items: ClaimItem[]
    root_cause?: string
    total_discrepancy: number
    overall_confidence: number
    data_sources_used?: string[]
    generated_at: string
}

export interface PipelineStatus {
    notice_id: string
    status: string
    current_stage?: string
    proof_object?: ProofObject
    strategy?: string
    strategy_reasoning?: string
    draft_response?: string
    doc_checklist?: string[]
    error?: string
}

export interface DashboardStats {
    total_notices: number
    pending_approval: number
    resolved_this_month: number
    active_clients: number
    notices_by_status: Record<string, number>
    urgent_deadlines: number
    recent_notices: Notice[]
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
    register: (data: { firm_name: string; email: string; password: string; phone?: string }) =>
        apiFetch<{ access_token: string; user: User }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    login: (data: { email: string; password: string }) =>
        apiFetch<{ access_token: string; user: User }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    me: () => apiFetch<User>('/auth/me'),
    forgotPassword: (email: string) =>
        apiFetch<{ message: string }>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),
    resetPassword: (data: { token: string; new_password: string }) =>
        apiFetch<{ message: string }>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
}

// ─── Team ───────────────────────────────────────────────────────────────────

export const team = {
    list: () => apiFetch<User[]>('/users'),
    invite: (data: { firm_name: string; name: string; email: string; password: string }) =>
        apiFetch<User>('/users', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<{ name: string; role: string; is_active: boolean }>) =>
        apiFetch<User>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients = {
    list: () => apiFetch<Client[]>('/clients'),

    create: (data: Partial<Client>) =>
        apiFetch<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: Partial<Client>) =>
        apiFetch<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id: string) =>
        apiFetch<{ message: string }>(`/clients/${id}`, { method: 'DELETE' }),
}

// ─── Notices ─────────────────────────────────────────────────────────────────

export const notices = {
    list: (status?: string) =>
        apiFetch<Notice[]>(`/notices${status ? `?status=${status}` : ''}`),

    upload: async (formData: FormData) => {
        const token = getToken()
        const res = await fetch(`${API_BASE}/notices/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }))
            throw new Error(err.detail)
        }
        return res.json()
    },

    getStatus: (id: string) => apiFetch<PipelineStatus>(`/notices/${id}`),

    approve: (id: string, data: { action: string; edited_draft?: string; ca_notes?: string }) =>
        apiFetch<{ message: string; status: string }>(`/notices/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiFetch<{ message: string }>(`/notices/${id}`, { method: 'DELETE' }),
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboard = {
    stats: () => apiFetch<DashboardStats>('/dashboard/stats'),
    intelligence: () => apiFetch<any>('/dashboard/intelligence'),
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatAmount(amount?: number | null): string {
    if (!amount) return '—'
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
    return `₹${amount.toLocaleString('en-IN')}`
}

export function getDaysUntil(deadline?: string | null): number | null {
    if (!deadline) return null
    const diff = new Date(deadline).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getDeadlineClass(daysLeft: number | null): string {
    if (daysLeft === null) return 'text-slate-500'
    if (daysLeft <= 7) return 'deadline-urgent'
    if (daysLeft <= 21) return 'deadline-warning'
    return 'deadline-safe'
}

export function getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
        DETECTED: 'badge-detected',
        ANALYZING: 'badge-analyzing',
        DRAFT_READY: 'badge-draft',
        PENDING_APPROVAL: 'badge-pending',
        SUBMITTED: 'badge-submitted',
        RESOLVED: 'badge-resolved',
        FAILED: 'badge-failed',
    }
    return `badge ${map[status] || 'badge-detected'}`
}

export function getSectionLabel(section: string): string {
    const map: Record<string, string> = {
        '143(1)': 'Sec 143(1)',
        '143(2)': 'Sec 143(2)',
        '148': 'Sec 148',
        '148A': 'Sec 148A',
        '154': 'Sec 154',
        '133(6)': 'Sec 133(6)',
        '270A': 'Sec 270A',
        '263': 'Sec 263',
        '264': 'Sec 264',
        '245': 'Sec 245',
        '221(1)': 'Sec 221(1)',
        OTHER: 'Other',
    }
    return map[section] || section
}
