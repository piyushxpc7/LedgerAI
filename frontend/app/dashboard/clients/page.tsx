'use client'
import { useEffect, useState } from 'react'
import { clients, type Client } from '@/lib/api'

const AY_OPTIONS = ['2024-25', '2023-24', '2022-23', '2021-22', '2020-21']
const EMPTY_FORM = { name: '', pan: '', dob: '', email: '', phone: '' }

export default function ClientsPage() {
    const [clientList, setClientList] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')

    function refresh() {
        clients.list().then(setClientList).catch(console.error).finally(() => setLoading(false))
    }

    useEffect(() => { refresh() }, [])

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true); setError('')
        try {
            await clients.create({ ...form, pan: form.pan.toUpperCase() })
            setShowModal(false)
            setForm(EMPTY_FORM)
            refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Deactivate client ${name}?`)) return
        await clients.delete(id)
        refresh()
    }

    const filtered = clientList.filter(c =>
        !search || [c.name, c.pan, c.email].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div style={{ padding: '32px 36px', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>Clients</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{clientList.length} active client PANs monitored</p>
                </div>
                <button className="btn-primary" onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setError('') }}>+ Add Client</button>
            </div>

            <div style={{ marginBottom: 16 }}>
                <input className="input" style={{ width: 280 }} placeholder="Search name or PAN..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="glass" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading clients...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                        <div style={{ fontWeight: 600 }}>{search ? 'No clients match your search' : 'No clients yet'}</div>
                        {!search && <div style={{ fontSize: 13, marginTop: 6 }}>Add your clients' PAN details to start monitoring for notices</div>}
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>PAN</th>
                                <th>DOB</th>
                                <th>Email</th>
                                <th>Notices</th>
                                <th>Added</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, letterSpacing: '0.5px' }}>{c.pan}</td>
                                    <td style={{ fontSize: 13 }}>{c.dob || '—'}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                                    <td>
                                        <span style={{ fontWeight: 700, fontSize: 15, color: c.notice_count > 0 ? '#F59E0B' : 'var(--text-muted)' }}>{c.notice_count}</span>
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <a href={`/dashboard/notices?client=${c.id}`} className="btn-secondary" style={{ padding: '5px 12px', fontSize: 11 }}>View Notices</a>
                                            <button onClick={() => handleDelete(c.id, c.name)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid transparent', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}
                                                onMouseOver={e => { (e.currentTarget as any).style.color = '#F87171'; (e.currentTarget as any).style.borderColor = 'rgba(239,68,68,0.3)' }}
                                                onMouseOut={e => { (e.currentTarget as any).style.color = 'var(--text-muted)'; (e.currentTarget as any).style.borderColor = 'transparent' }}
                                            >Remove</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Client Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div className="glass" style={{ width: '100%', maxWidth: 480, padding: '32px', position: 'relative' }}>
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
                        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Add Client</h2>
                        <form onSubmit={handleSave}>
                            {[
                                { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Ankit Kumar Gupta' },
                                { label: 'PAN *', key: 'pan', type: 'text', placeholder: 'ABCDE1234F', pattern: '^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$' },
                                { label: 'Date of Birth (DD/MM/YYYY)', key: 'dob', type: 'text', placeholder: '15/03/1985' },
                                { label: 'Email', key: 'email', type: 'email', placeholder: 'client@example.com' },
                                { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91-9876543210' },
                            ].map(field => (
                                <div key={field.key} style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{field.label}</label>
                                    <input type={field.type} className="input" value={(form as any)[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} placeholder={field.placeholder} pattern={field.pattern} required={field.label.includes('*')} />
                                </div>
                            ))}

                            <div style={{ marginTop: 4, padding: '10px 12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                                💡 DOB is used to decrypt encrypted IT portal notice PDFs (PAN+DOB password format)
                            </div>

                            {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#F87171' }}>{error}</div>}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving...' : 'Add Client'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
