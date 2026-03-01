'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useReveal, useCountUp, revealStyle, revealStyleRight, revealStyleScale } from '@/lib/animations'

// ─── Reusable Reveal wrapper ───────────────────────
function Reveal({ children, delay = 0, direction = 'up' }: {
  children: React.ReactNode; delay?: number; direction?: 'up' | 'right' | 'scale'
}) {
  const [ref, visible] = useReveal<HTMLDivElement>()
  const style = direction === 'right' ? revealStyleRight(visible, delay)
    : direction === 'scale' ? revealStyleScale(visible, delay)
      : revealStyle(visible, delay)
  return <div ref={ref} style={style}>{children}</div>
}

// ─── Animated counter ─────────────────────────────
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [ref, visible] = useReveal<HTMLSpanElement>()
  const val = useCountUp(target, visible)
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

// ─── Product mockup (clean, no emojis) ─────────────
function MockupCard() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  const messages = [
    'Generating legal arguments for Sec 143(1)…',
    'Cross-referencing Form 26AS data…',
    'Identifying TDS discrepancy…',
    'Drafting response letter…',
  ]

  return (
    <div className="anim-float" style={{ position: 'relative' }}>
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E8EAED',
        boxShadow: '0 24px 64px rgba(0,0,0,0.10)', overflow: 'hidden', width: 360,
      }}>
        {/* Teal header */}
        <div style={{ background: 'var(--teal)', padding: '18px 20px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Notice Queue</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>3 pending review</p>
        </div>

        {/* Notice rows — staggered */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { client: 'Ankit Gupta', section: '143(1)', amount: '₹68,420', days: 12, color: '#C2410C' },
            { client: 'Meera Investments', section: '133(6)', amount: '₹3,45,000', days: 21, color: '#B45309' },
            { client: 'Suresh Kumar', section: '143(1)', amount: '₹22,400', days: 5, color: '#B91C1C' },
          ].map((n, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, background: '#FAFBFC', border: '1px solid #F0F1F3',
              opacity: 0, animation: `slide-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 80 + 200}ms both`,
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: `${n.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: n.color, flexShrink: 0 }}>
                {n.client[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0F1117', marginBottom: 1 }}>{n.client}</p>
                <p style={{ fontSize: 11, color: '#9BA3AF' }}>{n.section} · {n.amount}</p>
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: n.color, flexShrink: 0 }}>{n.days}d</p>
            </div>
          ))}
        </div>

        {/* Rotating AI status */}
        <div style={{ margin: '0 16px 14px', padding: '10px 14px', background: '#F0FDF9', borderRadius: 8, border: '1px solid var(--teal-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="ping-dot" />
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)' }}>AI Agent Active</p>
            <p key={tick} style={{ fontSize: 11, color: 'var(--text-muted)', animation: 'fade-in 0.4s ease-out both' }}>
              {messages[tick % messages.length]}
            </p>
          </div>
        </div>
      </div>

      {/* Floating callout — top right */}
      <div style={{
        position: 'absolute', top: -14, right: -20,
        background: '#fff', borderRadius: 10, padding: '9px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.09)', border: '1px solid var(--border)',
        animation: 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1) 500ms both',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0F1117' }}>94% success rate</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sec 154 rectifications</p>
      </div>

      {/* Floating callout — bottom left */}
      <div style={{
        position: 'absolute', bottom: 20, left: -22,
        background: '#fff', borderRadius: 10, padding: '9px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.09)', border: '1px solid var(--border)',
        animation: 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1) 700ms both',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0F1117' }}>8 min avg</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs 3 hrs manually</p>
      </div>
    </div>
  )
}

// ─── Typing headline ───────────────────────────────
function TypingWords({ words }: { words: string[] }) {
  const [idx, setIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[idx]
    if (!deleting && displayed.length < word.length) {
      const t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 60)
      return () => clearTimeout(t)
    }
    if (!deleting && displayed.length === word.length) {
      const t = setTimeout(() => setDeleting(true), 2200)
      return () => clearTimeout(t)
    }
    if (deleting && displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35)
      return () => clearTimeout(t)
    }
    if (deleting && displayed.length === 0) {
      setDeleting(false)
      setIdx((idx + 1) % words.length)
    }
  }, [displayed, deleting, idx, words])

  return (
    <span className="gradient-text-animated" style={{ display: 'inline-block', minWidth: 20 }}>
      {displayed}
      <span style={{ borderRight: '2px solid var(--teal)', marginLeft: 2, animation: 'blink 0.8s ease-in-out infinite' }}>&nbsp;</span>
    </span>
  )
}

// ─── HOW IT WORKS step card ────────────────────────
function StepCard({ step, title, desc, delay }: { step: string; title: string; desc: string; delay: number }) {
  const [revRef, visible] = useReveal<HTMLDivElement>()
  return (
    <div ref={revRef} style={{ ...revealStyle(visible, delay) }}>
      <div
        style={{ padding: '22px 20px', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s', cursor: 'default' }}
        onMouseOver={e => { const el = e.currentTarget; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; el.style.borderColor = 'var(--teal-border)'; el.style.transform = 'translateY(-2px)' }}
        onMouseOut={e => { const el = e.currentTarget; el.style.boxShadow = 'none'; el.style.borderColor = 'var(--border)'; el.style.transform = 'translateY(0)' }}
      >
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Step {step}</p>
        <p style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
      </div>
    </div>
  )
}


// ─── MAIN PAGE ─────────────────────────────────────
export default function LandingPage() {
  const router = useRouter()
  useEffect(() => {
    if (localStorage.getItem('taxos_token')) router.push('/dashboard')
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#fff', overflowX: 'hidden' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', height: 58, gap: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: 'var(--teal)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', transition: 'transform 0.15s' }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}>T</div>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>TaxOS</span>
          </div>
          <div style={{ display: 'flex', gap: 24, flex: 1 }}>
            {['Features', 'Pricing', 'About'].map(item => (
              <a key={item} href="#" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.12s' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                {item}
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/login" className="btn-ghost" style={{ padding: '7px 14px' }}>Sign in</Link>
            <Link href="/register" className="btn-primary" style={{ padding: '7px 16px' }}>Get started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 28px 80px', display: 'grid', gridTemplateColumns: '1fr 440px', gap: 80, alignItems: 'center' }}>
        <div>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#F0FDF9', border: '1px solid var(--teal-border)', borderRadius: 99, marginBottom: 22, animation: 'slide-up 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
            <span className="ping-dot" />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--teal)', letterSpacing: '0.3px' }}>AI-powered · Built for CA firms</span>
          </div>

          {/* Headline with typing effect */}
          <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.06, letterSpacing: '-2px', color: 'var(--text-primary)', marginBottom: 20, animation: 'slide-up 0.45s cubic-bezier(0.16,1,0.3,1) 80ms both' }}>
            Income tax notices,<br />
            <TypingWords words={['handled by AI', 'resolved in 8 min', 'analysed instantly', 'approved by you']} />
          </h1>

          <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 32, maxWidth: 440, animation: 'slide-up 0.45s cubic-bezier(0.16,1,0.3,1) 160ms both' }}>
            Upload a notice PDF. TaxOS classifies it, cross-references Form 26AS and ITR, builds a proof document, and drafts a legally structured response — in minutes.
          </p>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 32, animation: 'slide-up 0.45s cubic-bezier(0.16,1,0.3,1) 220ms both' }}>
            <Link href="/register" className="btn-primary" style={{ padding: '11px 24px', fontSize: 'var(--text-md)' }}>Start free</Link>
            <Link href="/login" className="btn-ghost" style={{ padding: '11px 24px', fontSize: 'var(--text-md)' }}>Sign in</Link>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', animation: 'slide-up 0.45s cubic-bezier(0.16,1,0.3,1) 280ms both' }}>
            {['No credit card required', 'Works with all notice types', 'ICAI-compliant workflow'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="#0A9B88" opacity="0.15" /><path d="M3.5 6L5 7.5L8.5 4" stroke="#0A9B88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Animated mockup card */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', animation: 'slide-up 0.6s cubic-bezier(0.16,1,0.3,1) 100ms both' }}>
          <div className="dot-bg" style={{ position: 'absolute', inset: -40, opacity: 0.4, zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1 }}><MockupCard /></div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section style={{ background: 'var(--text-primary)', padding: '48px 28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            { target: 10000, suffix: '+', label: 'Notices processed' },
            { target: 94, suffix: '%', label: 'Success rate' },
            { target: 8, suffix: ' min', label: 'Average analysis' },
            { target: 78, suffix: '%', label: 'AIS mismatches resolved' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: '-2px', lineHeight: 1, marginBottom: 6 }}>
                <CountUp target={s.target} suffix={s.suffix} />
              </p>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '80px 28px', background: '#F5F6F8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p className="label" style={{ marginBottom: 12 }}>How it works</p>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: 12 }}>Four agents. One pipeline.</h2>
              <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto' }}>Upload a notice — eight minutes later, a response is ready for your approval.</p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { step: '01', title: 'Classify', desc: 'Extracts section, assessment year, notice amount, and deadline from the PDF.' },
              { step: '02', title: 'Analyze', desc: 'Cross-references the notice against Form 26AS and ITR. Builds a proof document.' },
              { step: '03', title: 'Strategize', desc: 'Selects the optimal path — rectify, contest, revise, or pay — with success rates.' },
              { step: '04', title: 'Draft', desc: 'Generates a legally structured response letter. You review and approve.' },
            ].map((a, i) => (
              <StepCard key={i} step={a.step} title={a.title} desc={a.desc} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '80px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p className="label" style={{ marginBottom: 12 }}>Core features</p>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>Built for CA firms who move fast</h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              {
                tag: 'Evidence Engine', title: 'Proof document in seconds',
                desc: 'TaxOS maps every notice claim against Form 26AS, AIS, and ITR. You see exactly where the mismatch is — with confidence scores and source citations.',
                preview: (
                  <div style={{ marginTop: 18, padding: '14px', background: '#F5F6F8', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {[
                      { label: 'TDS per 26AS', val: '₹22,400', color: '#15803D' },
                      { label: 'TDS in ITR', val: '₹0', color: '#B91C1C' },
                      { label: 'Discrepancy', val: '₹22,400', color: '#B45309' },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 2 ? '1px solid #E8EAED' : 'none' }}>
                        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{r.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                tag: 'Strategy Engine', title: 'Picks the best resolution path',
                desc: 'Based on thousands of resolved notices, TaxOS recommends the path with the highest expected success — with percentage rates from real outcomes.',
                preview: (
                  <div style={{ marginTop: 18 }}>
                    {[
                      { label: 'File Sec 154 Rectification', pct: 94, active: true },
                      { label: 'Pay the demand', pct: 40, active: false },
                    ].map((s, i) => (
                      <div key={i} style={{ marginBottom: 8, padding: '9px 11px', borderRadius: 7, background: s.active ? '#F0FDF9' : '#FAFBFC', border: `1px solid ${s.active ? 'var(--teal-border)' : 'var(--border)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: s.active ? 600 : 500, color: s.active ? 'var(--teal)' : 'var(--text-secondary)' }}>{s.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: s.active ? 'var(--teal)' : 'var(--text-muted)' }}>{s.pct}%</span>
                        </div>
                        <div style={{ height: 3, background: '#EEEFF1', borderRadius: 99 }}>
                          <div style={{ width: `${s.pct}%`, height: '100%', background: s.active ? 'var(--teal)' : '#D4D6DA', borderRadius: 99, animation: 'bar-grow 1s cubic-bezier(0.16,1,0.3,1) both' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                tag: 'Response Drafting', title: 'Legal letter ready to submit',
                desc: 'Mistral AI drafts a structured response addressed to the AO, tailored to your client\'s specific facts. Edit or approve — your call.',
                preview: (
                  <div style={{ marginTop: 18, padding: '12px 14px', background: '#FAFBFC', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <p className="label" style={{ marginBottom: 10 }}>Draft preview</p>
                    {[100, 85, 100, 72, 60].map((w, i) => (
                      <div key={i} style={{ height: 8, background: '#E8EAED', borderRadius: 4, marginBottom: 7, width: `${w}%`, animation: `bar-grow 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both` }} />
                    ))}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                      <div style={{ padding: '5px 12px', background: 'var(--teal)', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#fff', transition: 'opacity 0.15s', cursor: 'pointer' }}
                        onMouseOver={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
                        onMouseOut={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>Approve</div>
                      <div style={{ padding: '5px 12px', background: '#F5F6F8', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', transition: 'background 0.15s', cursor: 'pointer' }}
                        onMouseOver={e => (e.currentTarget as HTMLElement).style.background = '#EDEEF0'}
                        onMouseOut={e => (e.currentTarget as HTMLElement).style.background = '#F5F6F8'}>Edit</div>
                    </div>
                  </div>
                ),
              },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 90} direction="scale">
                <div style={{ padding: '24px 22px', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%', transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s' }}
                  onMouseOver={e => { const el = e.currentTarget; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; el.style.borderColor = 'var(--teal-border)'; el.style.transform = 'translateY(-2px)' }}
                  onMouseOut={e => { const el = e.currentTarget; el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; el.style.borderColor = 'var(--border)'; el.style.transform = 'translateY(0)' }}
                >
                  <p className="label" style={{ color: 'var(--teal)', marginBottom: 10 }}>{f.tag}</p>
                  <p style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>{f.title}</p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</p>
                  {f.preview}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding: '80px 28px', background: '#F5F6F8' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p className="label" style={{ marginBottom: 12 }}>Pricing</p>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: 8 }}>Simple pricing</h2>
              <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)' }}>Start free. Pay when your firm grows.</p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { plan: 'Starter', price: '₹3,000', features: ['150 client PANs', '5 notice types', '2 users', 'Email support'], highlight: false },
              { plan: 'Professional', price: '₹6,000', features: ['400 client PANs', 'All notice types', '8 users', 'Resolution Intelligence', 'WhatsApp alerts'], highlight: true },
              { plan: 'Firm', price: '₹12,000', features: ['Unlimited PANs', 'GST module', '20 users', 'API access', 'Dedicated support'], highlight: false },
            ].map((tier, i) => (
              <Reveal key={tier.plan} delay={i * 100}>
                <div style={{ padding: '28px 24px', background: '#fff', border: tier.highlight ? '1.5px solid var(--teal)' : '1px solid var(--border)', borderRadius: 12, position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseOver={e => { const el = e.currentTarget; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.09)' }}
                  onMouseOut={e => { const el = e.currentTarget; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none' }}
                >
                  {tier.highlight && (
                    <>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--teal)', borderRadius: '12px 12px 0 0' }} />
                      <div style={{ position: 'absolute', top: 14, right: 16, padding: '2px 10px', background: 'var(--teal)', borderRadius: 99, fontSize: 10, fontWeight: 700, color: '#fff' }}>Popular</div>
                    </>
                  )}
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{tier.plan}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>{tier.price}</span>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>/mo</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                    {tier.features.map(f => (
                      <div key={f} style={{ display: 'flex', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginTop: 2, flexShrink: 0 }}><path d="M2 6L4.5 8.5L10 3" stroke="#0A9B88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {f}
                      </div>
                    ))}
                  </div>
                  <Link href="/register" className={tier.highlight ? 'btn-primary' : 'btn-outline'} style={{ display: 'block', textAlign: 'center' }}>Get started</Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: 'var(--text-primary)', padding: '44px 28px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 28 }}>
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, background: 'var(--teal)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#fff' }}>T</div>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: '#fff' }}>TaxOS</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>The operating system for Indian tax compliance. Built for CA firms who refuse to waste hours on work that can be automated.</p>
            </div>
            <div style={{ display: 'flex', gap: 44 }}>
              {[
                { title: 'Product', links: ['Features', 'Pricing', 'API', 'Changelog'] },
                { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              ].map(col => (
                <div key={col.title}>
                  <p className="label" style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>{col.title}</p>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 8, transition: 'color 0.12s' }}
                      onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                      onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                      {l}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.25)' }}>© 2026 TaxOS. Confidential.</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.25)' }}>TaxOS generates drafts. The CA firm holds all liability.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
