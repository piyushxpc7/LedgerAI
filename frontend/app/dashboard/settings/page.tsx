'use client'
import { useState, useEffect } from 'react'
import { team, User } from '@/lib/api'
import { UserPlus, Shield, UserX, CheckCircle, AlertCircle } from 'lucide-react'

export default function SettingsPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [inviteModal, setInviteModal] = useState(false)
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '' })
    const [inviteLoading, setInviteLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        try {
            const data = await team.list()
            setUsers(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault()
        setInviteLoading(true)
        setError('')
        try {
            // Reusing the invite API which expects firm_name (we just pass a placeholder)
            await team.invite({ ...inviteForm, firm_name: 'Placeholder' })
            setInviteModal(false)
            setInviteForm({ name: '', email: '', password: '' })
            loadUsers()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setInviteLoading(false)
        }
    }

    async function toggleUserStatus(user: User) {
        try {
            await team.update(user.id, { is_active: !(user as any).is_active })
            loadUsers()
        } catch (err: any) {
            alert(err.message)
        }
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8 border-bottom pb-6 flex justify-between items-end">
                <div>
                    <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Team Settings</h1>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>
                        Manage your firm's staff accounts and access levels.
                    </p>
                </div>
                <button className="btn-primary flex items-center gap-2" onClick={() => setInviteModal(true)}>
                    <UserPlus size={18} />
                    Invite Associate
                </button>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-400">Loading team members...</div>
            ) : (
                <div className="bg-white rounded-xl border-soft overflow-hidden">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Member</th>
                                <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user: any) => (
                                <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td className="p-4">
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{user.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                                            <Shield size={14} className={user.role === 'PARTNER' ? 'text-teal-600' : 'text-slate-400'} />
                                            <span style={{ fontWeight: user.role === 'PARTNER' ? 600 : 400 }}>{user.role}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {user.is_active ? (
                                            <span className="badge badge-resolved flex items-center gap-1 w-fit">
                                                <CheckCircle size={12} /> Active
                                            </span>
                                        ) : (
                                            <span className="badge badge-failed flex items-center gap-1 w-fit">
                                                <UserX size={12} /> Deactivated
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {user.role !== 'PARTNER' && (
                                            <button
                                                onClick={() => toggleUserStatus(user)}
                                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${user.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                    }`}
                                            >
                                                {user.is_active ? 'Deactivate' : 'Reactivate'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Invite Modal */}
            {inviteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Invite Team Member</h2>
                        <form onSubmit={handleInvite}>
                            <div style={{ marginBottom: 16 }}>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Member Name</label>
                                <input className="input" type="text" placeholder="CA Ananya Gupta" required
                                    value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
                                <input className="input" type="email" placeholder="ananya@yourfirm.com" required
                                    value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Initial Password</label>
                                <input className="input" type="password" placeholder="Min 8 characters" required
                                    value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} />
                            </div>

                            {error && (
                                <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg flex gap-2">
                                    <AlertCircle size={18} /> {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button type="button" className="btn-secondary flex-1" onClick={() => setInviteModal(false)} disabled={inviteLoading}>Cancel</button>
                                <button type="submit" className="btn-primary flex-1" disabled={inviteLoading}>
                                    {inviteLoading ? 'Inviting...' : 'Invite Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
