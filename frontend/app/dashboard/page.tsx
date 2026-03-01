'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { dashboard, formatAmount, getDaysUntil, getDeadlineClass, getStatusBadgeClass, type DashboardStats, type Notice } from '@/lib/api'

// ── Count-up animation ───────────────────────────────────
function useCountUp(target: number, duration = 900): number {
    const [val, setVal] = useState(0)
    const started = useRef(false)
    useEffect(() => {
        if (target === 0) { setVal(0); return }
        if (started.current) return
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - t, 3)
            setVal(Math.round(eased * target))
            if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
    }, [target, duration])
    return val
}


function StatCard({ value, label, sublabel, accent, change, link }: {
    value: number | string; label: string; sublabel: string;
    accent?: string; change?: string | null; link?: string
}) {
    const animated = useCountUp(typeof value === 'number' ? value : 0)
    const display = typeof value === 'number' ? animated : value

    const el = (
        <div className="card-hover" style={{ padding: '20px 20px 16px', transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span className="label">{label}</span>
                {change && (
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', padding: '2px 7px', borderRadius: 99 }}>
                        {change}
                    </span>
                )}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: accent || 'var(--text-primary)', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 6, transition: 'color 0.3s' }}>
                {display}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>{sublabel}</div>
        </div>
    )
    return link ? <Link href={link} style={{ textDecoration: 'none', display: 'block' }}>{el}</Link> : el
}


function NoticeRow({ notice }: { notice: Notice }) {
    const daysLeft = getDaysUntil(notice.deadline)
    return (
        <Link href={`/dashboard/notices/${notice.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, transition: 'background 0.12s' }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = '#F5F6F8'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: notice.status === 'PENDING_APPROVAL' ? '#FFF7ED' : 'var(--teal-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: notice.status === 'PENDING_APPROVAL' ? '#C2410C' : 'var(--teal)', flexShrink: 0 }}>
                    {(notice.client_name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{notice.client_name || '—'}</span>
                        <span className={getStatusBadgeClass(notice.status)}>{notice.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {notice.section} · AY {notice.assessment_year}
                        {(notice.mismatch_amount || notice.demand_amount) ? ` · ${formatAmount(notice.mismatch_amount || notice.demand_amount)}` : ''}
                    </div>
                </div>
                {daysLeft !== null && (
                    <div className={getDeadlineClass(daysLeft)} style={{ fontSize: 'var(--text-sm)', flexShrink: 0, textAlign: 'right' }}>
                        {daysLeft}d
                    </div>
                )}
            </div>
        </Link>
    )
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
    const pct = max > 0 ? Math.round((count / max) * 100) : 0
    // Backend may return "NoticeStatus.PENDING_APPROVAL" — strip prefix
    const clean = label.replace(/^NoticeStatus\./i, '').replace(/_/g, ' ')
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>{clean}</span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
            </div>
            <div style={{ height: 4, background: '#EEEFF1', borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [userName, setUserName] = useState('')

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('taxos_user') || 'null')
        if (u?.name) setUserName(u.name.split(' ')[0])
        dashboard.stats().then(setStats).finally(() => setLoading(false))
        const t = setInterval(() => dashboard.stats().then(setStats), 30000)
        return () => clearInterval(t)
    }, [])

    const pending = stats?.recent_notices?.filter(n => n.status === 'PENDING_APPROVAL') || []
    const recent = stats?.recent_notices?.filter(n => n.status !== 'PENDING_APPROVAL').slice(0, 4) || []
    const maxStatus = stats ? Math.max(...Object.values(stats.notices_by_status), 1) : 1

    const statusColors: Record<string, string> = {
        PENDING_APPROVAL: '#C2410C',
        ANALYZING: '#2563EB',
        SUBMITTED: '#15803D',
        RESOLVED: '#0A9B88',
        DETECTED: '#6B7280',
        FAILED: '#B91C1C',
    }

    if (loading) return (
        <div style={{ padding: '32px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
            </div>
        </div>
    )

    return (
        <div style={{ padding: '28px 28px', minHeight: '100vh', background: 'var(--bg)' }}>
            {/* Page header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                        {userName ? `Hello, ${userName}` : 'Dashboard'}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {stats?.urgent_deadlines ? (
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', padding: '6px 12px', borderRadius: 99 }}>
                            {stats.urgent_deadlines} urgent deadline{stats.urgent_deadlines > 1 ? 's' : ''}
                        </div>
                    ) : null}
                    <Link href="/dashboard/upload" className="btn-primary">Upload Notice</Link>
                </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }} className="stagger anim-slide-up">
                <StatCard value={stats?.total_notices ?? 0} label="Total Notices" sublabel="All time" />
                <StatCard value={stats?.pending_approval ?? 0} label="Pending Approval" sublabel="Needs your review" accent={(stats?.pending_approval ?? 0) > 0 ? '#C2410C' : undefined} change={stats?.urgent_deadlines ? `${stats.urgent_deadlines} urgent` : null} link="/dashboard/notices?status=PENDING_APPROVAL" />
                <StatCard value={stats?.resolved_this_month ?? 0} label="Resolved" sublabel="This month" accent={(stats?.resolved_this_month ?? 0) > 0 ? '#15803D' : undefined} />
                <StatCard value={stats?.active_clients ?? 0} label="Active Clients" sublabel="PANs monitored" link="/dashboard/clients" />
            </div>

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 14 }}>
                {/* Left */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Pending */}
                    <div className="card" style={{ padding: '18px 16px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="subheading" style={{ fontSize: 'var(--text-md)' }}>Pending Approvals</span>
                                {pending.length > 0 && (
                                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#C2410C', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '2px 8px', borderRadius: 99 }}>{pending.length}</span>
                                )}
                            </div>
                            <Link href="/dashboard/notices?status=PENDING_APPROVAL" style={{ fontSize: 'var(--text-xs)', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all</Link>
                        </div>

                        {pending.length === 0 ? (
                            <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>All caught up</p>
                                <p className="caption">No notices pending your approval</p>
                            </div>
                        ) : (
                            <div>{pending.slice(0, 6).map(n => <NoticeRow key={n.id} notice={n} />)}</div>
                        )}
                    </div>

                    {/* Recent */}
                    {recent.length > 0 && (
                        <div className="card" style={{ padding: '18px 16px 10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px', marginBottom: 8 }}>
                                <span className="subheading" style={{ fontSize: 'var(--text-md)' }}>Recent Activity</span>
                                <Link href="/dashboard/notices" style={{ fontSize: 'var(--text-xs)', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all</Link>
                            </div>
                            <div>{recent.map(n => <NoticeRow key={n.id} notice={n} />)}</div>
                        </div>
                    )}
                </div>

                {/* Right */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Status */}
                    <div className="card" style={{ padding: '18px 18px 14px' }}>
                        <p className="subheading" style={{ fontSize: 'var(--text-md)', marginBottom: 16 }}>By Status</p>
                        {Object.entries(stats?.notices_by_status || {}).map(([status, count]) => (
                            <BarRow key={status} label={status} count={count} max={maxStatus} color={statusColors[status] || '#6B7280'} />
                        ))}
                        {Object.keys(stats?.notices_by_status || {}).length === 0 && (
                            <p className="caption" style={{ textAlign: 'center', padding: '8px 0' }}>No data yet</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="card" style={{ padding: '18px' }}>
                        <p className="subheading" style={{ fontSize: 'var(--text-md)', marginBottom: 12 }}>Quick Actions</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            <Link href="/dashboard/upload" className="btn-primary" style={{ justifyContent: 'center' }}>Upload Notice PDF</Link>
                            <Link href="/dashboard/clients" className="btn-outline" style={{ justifyContent: 'center' }}>Add Client</Link>
                            <Link href="/dashboard/intelligence" className="btn-ghost" style={{ justifyContent: 'center' }}>View Intelligence</Link>
                        </div>
                    </div>

                    {/* AI status */}
                    <div style={{ padding: '14px 16px', background: 'var(--teal-muted)', border: '1px solid var(--teal-border)', borderRadius: 'var(--radius)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span className="live-dot" />
                            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Pipeline</span>
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Mistral AI · LangGraph · 4-agent pipeline</p>
                    </div>

                    <p className="caption" style={{ padding: '2px 4px', lineHeight: 1.6 }}>TaxOS generates evidence and drafts. The CA firm holds all responsibility for submissions.</p>
                </div>
            </div>
        </div>
    )
}
