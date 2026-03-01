'use client'
import { useEffect, useState } from 'react'
import { dashboard } from '@/lib/api'

const NOTICE_TYPES: Record<string, string> = {
    AIS_MISMATCH: 'AIS Mismatch',
    TDS_CREDIT: 'TDS Credit',
    DEMAND_CONFIRMATION: 'Demand Confirmation',
    SCRUTINY: 'Scrutiny',
    INCOME_OMISSION: 'Income Omission',
    COMPUTATION_ERROR: 'Computation Error',
    REASSESSMENT: 'Reassessment',
    PENALTY: 'Penalty',
    OTHER: 'Other',
}

const STRATEGIES: Record<string, string> = {
    PAY_DEMAND: 'Pay Demand',
    FILE_154: 'File Sec 154',
    REVISED_RETURN: 'Revised Return',
    CONTEST: 'Contest',
    PARTIAL_PAY: 'Partial Pay',
}

export default function IntelligencePage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        dashboard.intelligence().then(setData).catch(console.error).finally(() => setLoading(false))
    }, [])

    const hasData = data && (
        Object.keys(data.notice_types || {}).length > 0 ||
        Object.keys(data.strategies || {}).length > 0
    )

    return (
        <div style={{ padding: '32px 36px', minHeight: '100vh' }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>Resolution Intelligence</h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Insights built from every notice resolved through LedgerAI</p>
            </div>

            {/* Intelligence flywheel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
                {[
                    { stage: 'Stage 1', range: '0–10K notices', label: 'Pattern Recognition', desc: 'Notice type → strategy mapping. Better than a new Article clerk.', active: true },
                    { stage: 'Stage 2', range: '10K–50K notices', label: 'Argument Intelligence', desc: 'Argument-level success rates. Which arguments work for which amounts.', active: false },
                    { stage: 'Stage 3', range: '50K–100K notices', label: 'Jurisdictional Patterns', desc: 'AO circle intelligence, timing optimization, response analytics.', active: false },
                    { stage: 'Stage 4', range: '100K+ notices', label: 'Pre-Filing Risk Engine', desc: 'Predict notice probability before filing ITR. Nobody has this.', active: false },
                ].map((s, i) => (
                    <div key={i} className="glass" style={{ padding: '18px', border: s.active ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--border)', opacity: s.active ? 1 : 0.6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: s.active ? 'var(--accent-gold)' : 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 4 }}>{s.stage}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6 }}>{s.desc}</div>
                        <div style={{ fontSize: 10, color: s.active ? 'var(--accent-gold)' : 'var(--text-muted)', fontWeight: 600 }}>{s.range}</div>
                        {s.active && <div style={{ marginTop: 8, padding: '3px 10px', background: 'rgba(245,158,11,0.1)', borderRadius: 99, display: 'inline-block', fontSize: 10, fontWeight: 700, color: 'var(--accent-gold)' }}>BUILDING NOW</div>}
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading intelligence data...</div>
            ) : !hasData ? (
                <div className="glass" style={{ padding: '60px', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>◎</div>
                    <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Intelligence Building...</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
                        Resolution Intelligence grows with every notice processed and resolved. Upload and process your first notices to start building your firm's intelligence database.
                    </p>
                    <a href="/dashboard/upload" className="btn-primary" style={{ display: 'inline-flex', marginTop: 24 }}>↑ Upload Your First Notice</a>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Notice Type Distribution */}
                    <div className="glass" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Notice Types Processed</h3>
                        {Object.entries(data.notice_types || {}).map(([type, count]: [string, any]) => {
                            const max = Math.max(...Object.values(data.notice_types).map(Number))
                            const pct = max > 0 ? (count / max) * 100 : 0
                            return (
                                <div key={type} style={{ marginBottom: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13 }}>{NOTICE_TYPES[type] || type}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
                                    </div>
                                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #F59E0B, #F97316)', borderRadius: 4 }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Strategy Distribution */}
                    <div className="glass" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Strategies Recommended</h3>
                        {Object.keys(data.strategies || {}).length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px' }}>No strategy data yet</div>
                        ) : Object.entries(data.strategies || {}).map(([strategy, count]: [string, any]) => {
                            const max = Math.max(...Object.values(data.strategies).map(Number))
                            const pct = max > 0 ? (count / max) * 100 : 0
                            return (
                                <div key={strategy} style={{ marginBottom: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13 }}>{STRATEGIES[strategy] || strategy}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
                                    </div>
                                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: 4 }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Coming Soon — Pre-Filing Risk Engine */}
            <div style={{ marginTop: 24, padding: '24px 28px', background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(249,115,22,0.04) 100%)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '1px', marginBottom: 6 }}>PHASE 3 FEATURE</div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Pre-Filing Risk Engine</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 500, lineHeight: 1.6 }}>
                            Before filing an ITR, LedgerAI will analyze the return and predict: <em>"This return has a 73% chance of receiving a Section 133(6) notice"</em> — based on 100,000+ resolved cases in our intelligence database.
                        </p>
                    </div>
                    <div style={{ padding: '8px 20px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 99, fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)' }}>
                        Launching Phase 3
                    </div>
                </div>
            </div>
        </div>
    )
}
