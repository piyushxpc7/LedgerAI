'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { notices, formatAmount, getDaysUntil, getDeadlineClass, getStatusBadgeClass, getSectionLabel, type Notice } from '@/lib/api'

const STATUS_FILTERS = [
    { value: '', label: 'All Notices' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'ANALYZING', label: 'Analyzing' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'RESOLVED', label: 'Resolved' },
]

function NoticesContent() {
    const searchParams = useSearchParams()
    const [allNotices, setAllNotices] = useState<Notice[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState(searchParams.get('status') || '')
    const [search, setSearch] = useState('')

    function refresh() {
        notices.list().then(setAllNotices).catch(console.error).finally(() => setLoading(false))
    }
    useEffect(() => {
        refresh()
        const interval = setInterval(refresh, 15000)
        return () => clearInterval(interval)
    }, [])

    const filtered = allNotices.filter(n => {
        const matchStatus = !filter || n.status === filter
        const matchSearch = !search || [n.client_name, n.client_pan, n.section, n.assessment_year, n.portal_reference]
            .some(v => v?.toLowerCase().includes(search.toLowerCase()))
        return matchStatus && matchSearch
    })

    return (
        <div style={{ padding: '28px 32px', minHeight: '100vh', background: '#F0F4F3' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginBottom: 2 }}>Notices</h1>
                    <p style={{ fontSize: 13, color: '#9CA3AF' }}>{allNotices.length} total · {allNotices.filter(n => n.status === 'PENDING_APPROVAL').length} pending approval</p>
                </div>
                <Link href="/dashboard/upload" className="btn-primary" style={{ fontSize: 13 }}>↑ Upload Notice</Link>
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '0 0 260px' }}>
                    <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input className="input" style={{ paddingLeft: 36 }} placeholder="Search client, PAN, section..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {STATUS_FILTERS.map(f => (
                        <button key={f.value} onClick={() => setFilter(f.value)} style={{
                            padding: '8px 14px', borderRadius: 8, border: '1.5px solid',
                            fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                            background: filter === f.value ? '#F0FDFB' : '#fff',
                            borderColor: filter === f.value ? '#0A9B88' : '#E5E7EB',
                            color: filter === f.value ? '#0A9B88' : '#6B7280',
                        }}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                        <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#0A9B88', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
                        <div style={{ color: '#9CA3AF', fontSize: 14 }}>Loading notices...</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '64px', textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>No notices found</div>
                        <div style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 24 }}>
                            {filter ? 'Try a different filter' : 'Upload your first notice PDF to get started'}
                        </div>
                        {!filter && <Link href="/dashboard/upload" className="btn-primary">↑ Upload Notice</Link>}
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Section</th>
                                <th>AY</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Deadline</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(notice => {
                                const daysLeft = getDaysUntil(notice.deadline)
                                return (
                                    <tr key={notice.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(10,155,136,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0A9B88', flexShrink: 0 }}>
                                                    {(notice.client_name || '?')[0]}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 13.5 }}>{notice.client_name || '–'}</div>
                                                    <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 1 }}>{notice.client_pan}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{getSectionLabel(notice.section)}</div>
                                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{notice.notice_type?.replace(/_/g, ' ')}</div>
                                        </td>
                                        <td><span style={{ fontWeight: 600, fontSize: 13 }}>AY {notice.assessment_year}</span></td>
                                        <td>
                                            {notice.mismatch_amount || notice.demand_amount ? (
                                                <span style={{ fontWeight: 700, fontSize: 14, color: '#DC2626' }}>
                                                    {formatAmount(notice.mismatch_amount || notice.demand_amount)}
                                                </span>
                                            ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                                        </td>
                                        <td><span className={getStatusBadgeClass(notice.status)}>{notice.status.replace(/_/g, ' ')}</span></td>
                                        <td>
                                            {daysLeft !== null ? (
                                                <span className={getDeadlineClass(daysLeft)} style={{ fontSize: 13 }}>{daysLeft}d left</span>
                                            ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                                        </td>
                                        <td>
                                            <Link href={`/dashboard/notices/${notice.id}`} className="btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>
                                                {notice.status === 'PENDING_APPROVAL' ? 'Review →' : 'View'}
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

export default function NoticesPage() {
    return (
        <Suspense fallback={<div style={{ padding: '40px', color: '#9CA3AF' }}>Loading...</div>}>
            <NoticesContent />
        </Suspense>
    )
}
