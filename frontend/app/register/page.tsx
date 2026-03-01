'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/api'

export default function RegisterPage() {
    const router = useRouter()
    const [form, setForm] = useState({ firm_name: '', name: '', email: '', password: '', phone: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    function update(key: string, val: string) {
        setForm(f => ({ ...f, [key]: val }))
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault()
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }
        setLoading(true)
        setError('')
        try {
            const res = await auth.register(form)
            localStorage.setItem('ledgerai_token', res.access_token)
            localStorage.setItem('ledgerai_user', JSON.stringify(res.user))
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
            {/* Left — Brand panel */}
            <div style={{ width: 420, background: 'var(--text-primary)', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 44px' }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, background: 'var(--teal)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>T</div>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: '#fff' }}>LedgerAI</span>
                </Link>

                <div>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 16 }}>Get started</p>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 18 }}>
                        Set up your<br />CA firm in 2 minutes
                    </h1>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 36 }}>
                        Free to start. No credit card. Your clients' data stays isolated from every other firm.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                            { label: 'Notices analysed', value: '10,000+' },
                            { label: 'Avg. response time', value: '8 min' },
                            { label: 'Success rate', value: '94%' },
                        ].map(s => (
                            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
                                <span style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: '#fff' }}>{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                    LedgerAI is not a legal advisor. All responses submitted to the IT Department are the responsibility of the CA firm.
                </p>
            </div>

            {/* Right — Form */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6F8', padding: '48px 32px' }}>
                <div style={{ width: '100%', maxWidth: 440 }}>
                    <div style={{ marginBottom: 32 }}>
                        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>New account</p>
                        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Create your firm</h2>
                    </div>

                    <form onSubmit={handleRegister}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Firm name</label>
                                <input className="input" type="text" placeholder="Sharma & Associates" value={form.firm_name}
                                    onChange={e => update('firm_name', e.target.value)} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Your name</label>
                                <input className="input" type="text" placeholder="CA Rajesh Sharma" value={form.name}
                                    onChange={e => update('name', e.target.value)} required />
                            </div>
                        </div>

                        {[
                            { label: 'Email', key: 'email', type: 'email', placeholder: 'partner@yourfirm.com' },
                            { label: 'Password', key: 'password', type: 'password', placeholder: '8+ characters' },
                            { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91-9876543210 (optional)' },
                        ].map(field => (
                            <div key={field.key} style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{field.label}</label>
                                <input className="input" type={field.type} placeholder={field.placeholder}
                                    value={(form as any)[field.key]}
                                    onChange={e => update(field.key, e.target.value)}
                                    required={field.key !== 'phone'}
                                />
                            </div>
                        ))}

                        {error && (
                            <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 14, fontSize: 'var(--text-sm)', color: '#B91C1C' }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 'var(--text-md)', marginTop: 4 }} disabled={loading}>
                            {loading ? 'Creating account…' : 'Create account'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                        Already have an account?{' '}
                        <Link href="/login" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
