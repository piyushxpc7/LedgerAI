'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/api'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!token) {
            setError('Invalid or expired reset link.')
            return
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)
        setError('')
        try {
            const res = await auth.resetPassword({ token, new_password: password })
            setMessage(res.message)
            setTimeout(() => {
                router.push('/login')
            }, 3000)
        } catch (err: any) {
            setError(err.message || 'Failed to reset password. The link may have expired.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Final step</p>
                <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Reset password</h2>
            </div>

            {!message ? (
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>New Password</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="8+ characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Confirm New Password</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="Repeat new password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 20, fontSize: 'var(--text-sm)', color: '#B91C1C' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 'var(--text-md)' }} disabled={loading || !token}>
                        {loading ? 'Updating password...' : 'Update password'}
                    </button>

                    {!token && (
                        <p style={{ marginTop: 12, fontSize: 'var(--text-xs)', color: '#B91C1C', textAlign: 'center' }}>
                            No reset token found. Please request a new link.
                        </p>
                    )}
                </form>
            ) : (
                <div style={{ padding: '24px', background: '#ecfdf5', border: '1px solid #059669', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, background: '#10b981', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#065f46', marginBottom: 8 }}>Password updated</h3>
                    <p style={{ fontSize: 14, color: '#047857', lineHeight: 1.6 }}>
                        Your password has been changed successfully. Redirecting you to sign in...
                    </p>
                    <Link href="/login" style={{ display: 'inline-block', marginTop: 20, fontWeight: 600, color: '#065f46', textDecoration: 'underline' }}>Sign in now</Link>
                </div>
            )}
        </div>
    )
}

export default function ResetPasswordPage() {
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
                        Create your new<br />password
                    </h1>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 36 }}>
                        Choose a strong password that you don't use elsewhere. We recommend at least 12 characters with a mix of letters and symbols.
                    </p>
                </div>

                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                    TaxOS uses industry-standard encryption to protect your account. Never share your reset link with anyone.
                </p>
            </div>

            {/* Right — Form */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6F8', padding: '48px 32px' }}>
                <Suspense fallback={<div>Loading reset flow...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    )
}
