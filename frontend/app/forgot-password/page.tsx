'use client'
import { useState } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/api'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setError('')
        try {
            const res = await auth.forgotPassword(email)
            setMessage(res.message)
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.')
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
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: '#fff' }}>TaxOS</span>
                </Link>

                <div>
                    <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 16 }}>Security</p>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 18 }}>
                        Recover your<br />account access
                    </h1>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 36 }}>
                        Enter your email and we'll send you a secure link to reset your password. The link will be valid for 1 hour.
                    </p>
                </div>

                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                    TaxOS uses industry-standard encryption to protect your account. Never share your reset link with anyone.
                </p>
            </div>

            {/* Right — Form */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6F8', padding: '48px 32px' }}>
                <div style={{ width: '100%', maxWidth: 400 }}>
                    <div style={{ marginBottom: 32 }}>
                        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Password recovery</p>
                        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Forgot password?</h2>
                    </div>

                    {!message ? (
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Work Email</label>
                                <input
                                    className="input"
                                    type="email"
                                    placeholder="partner@yourfirm.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 20, fontSize: 'var(--text-sm)', color: '#B91C1C' }}>
                                    {error}
                                </div>
                            )}

                            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 'var(--text-md)' }} disabled={loading}>
                                {loading ? 'Sending link...' : 'Send reset link'}
                            </button>
                        </form>
                    ) : (
                        <div style={{ padding: '24px', background: '#ecfdf5', border: '1px solid #059669', borderRadius: 12, textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, background: '#10b981', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>Check your inbox</h3>
                            <p style={{ fontSize: 14, color: '#047857', lineHeight: 1.6 }}>
                                We've sent an email with instructions to <strong>{email}</strong>.
                            </p>
                            <Link href="/login" style={{ display: 'inline-block', marginTop: 20, fontWeight: 600, color: '#065f46', textDecoration: 'underline' }}>Return to sign in</Link>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: 24, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                        Remembered your password?{' '}
                        <Link href="/login" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
