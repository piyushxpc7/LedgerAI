'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV_ITEMS = [
    {
        href: '/dashboard',
        label: 'Overview',
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    },
    {
        href: '/dashboard/notices',
        label: 'Notices',
        badge: '3',
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></svg>,
    },
    {
        href: '/dashboard/upload',
        label: 'Upload',
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16,16 12,12 8,16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>,
    },
    {
        href: '/dashboard/clients',
        label: 'Clients',
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    },
    {
        href: '/dashboard/intelligence',
        label: 'Intelligence',
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>,
    },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [user, setUser] = useState<any>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (!localStorage.getItem('taxos_token')) { router.push('/login'); return }
        const u = localStorage.getItem('taxos_user')
        if (u) setUser(JSON.parse(u))
    }, [router])

    function logout() {
        localStorage.removeItem('taxos_token')
        localStorage.removeItem('taxos_user')
        router.push('/login')
    }

    if (!mounted) return null

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: 220, flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 40,
                background: '#fff', borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Logo */}
                <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
                    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 30, height: 30, background: 'var(--teal)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>T</div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)', lineHeight: 1 }}>TaxOS</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>CA Dashboard</div>
                        </div>
                    </Link>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
                    <p className="label" style={{ padding: '6px 8px 4px', marginBottom: 4 }}>Navigation</p>
                    {NAV_ITEMS.map(item => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        return (
                            <Link key={item.href} href={item.href} style={{
                                display: 'flex', alignItems: 'center', gap: 9,
                                padding: '8px 9px', borderRadius: 7, textDecoration: 'none',
                                fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 500,
                                color: isActive ? 'var(--teal)' : 'var(--text-secondary)',
                                background: isActive ? 'var(--teal-muted)' : 'transparent',
                                transition: 'all 0.12s',
                            }}
                                onMouseOver={e => { if (!isActive) { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--bg)'; el.style.color = 'var(--text-primary)' } }}
                                onMouseOut={e => { if (!isActive) { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--text-secondary)' } }}
                            >
                                <span style={{ color: isActive ? 'var(--teal)' : 'var(--text-muted)', flexShrink: 0 }}>{item.icon}</span>
                                <span style={{ flex: 1 }}>{item.label}</span>
                                {item.badge && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#C2410C', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '1px 6px', borderRadius: 99 }}>{item.badge}</span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Bottom */}
                <div style={{ padding: '10px', borderTop: '1px solid var(--border)' }}>
                    {user && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, background: 'var(--bg)', marginBottom: 6 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0 }}>
                                {(user.name || 'U')[0]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role?.toLowerCase()}</div>
                            </div>
                        </div>
                    )}
                    <button onClick={logout} style={{
                        width: '100%', padding: '7px 10px', background: 'transparent', border: '1px solid var(--border)',
                        borderRadius: 7, color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.12s',
                    }}
                        onMouseOver={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#FEF2F2'; el.style.color = '#B91C1C'; el.style.borderColor = '#FECACA' }}
                        onMouseOut={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--text-muted)'; el.style.borderColor = 'var(--border)' }}
                    >
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Content */}
            <main style={{ flex: 1, marginLeft: 220 }}>{children}</main>
        </div>
    )
}
