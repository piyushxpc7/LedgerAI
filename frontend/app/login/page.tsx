'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/api'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('demo@ledgerai.ai')
    const [password, setPassword] = useState('ledgerai2026')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await auth.login({ email, password })
            localStorage.setItem('ledgerai_token', res.access_token)
            localStorage.setItem('ledgerai_user', JSON.stringify(res.user))
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Left — Brand panel */}
            <div style={{ background: 'linear-gradient(135deg, #0C1B1A 0%, #0D3330 60%, #0A4040 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 48px', position: 'relative', overflow: 'hidden' }}>
                {/* Dot pattern */}
                <div className="dot-pattern" style={{ position: 'absolute', inset: 0, opacity: 0.2 }} />
                {/* Glow */}
                <div style={{ position: 'absolute', top: '30%', left: '40%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(10,155,136,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #0A9B88, #14B8A6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff' }}>T</div>
                        <span style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>LedgerAI</span>
                    </Link>
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-1px' }}>
                        India's Smartest<br />Tax Notice Platform
                    </div>
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 40, maxWidth: 340 }}>
                        CA firms using LedgerAI save 120+ hours per month by letting AI handle notice analysis, evidence building, and response drafting.
                    </p>

                    {/* Mini stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {[
                            { value: '94%', label: 'Success Rate' },
                            { value: '8 min', label: 'Avg Analysis' },
                            { value: '10K+', label: 'Notices Processed' },
                            { value: '₹0', label: 'Upfront Cost' },
                        ].map((s, i) => (
                            <div key={i} style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginBottom: 4 }}>{s.value}</div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ position: 'relative', zIndex: 1, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    Not a legal advisor. CA holds all liability for submissions.
                </div>
            </div>

            {/* Right — Form */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 56px', background: '#fff' }}>
                <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
                    <div style={{ marginBottom: 32 }}>
                        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginBottom: 6 }}>Welcome back</h1>
                        <p style={{ fontSize: 14, color: '#6B7280' }}>Sign in to your firm dashboard</p>
                    </div>

                    {/* Demo creds hint */}
                    <div style={{ padding: '12px 16px', background: '#F0FDFB', border: '1.5px solid #CCFBF1', borderRadius: 10, marginBottom: 24 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0A9B88', marginBottom: 3, letterSpacing: '0.3px' }}>DEMO CREDENTIALS (pre-filled)</div>
                        <div style={{ fontSize: 12.5, color: '#374151', fontFamily: 'monospace' }}>demo@ledgerai.ai · ledgerai2026</div>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="partner@yourfirm.com" required />
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
                            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                        </div>

                        {error && (
                            <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#DC2626' }}>{error}</div>
                        )}

                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 15 }} disabled={loading}>
                            {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><span className="anim-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />Signing in...</span> : 'Sign In →'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9CA3AF' }}>
                        New CA firm?{' '}
                        <Link href="/register" style={{ color: '#0A9B88', textDecoration: 'none', fontWeight: 600 }}>Create account</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
