'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { notices, formatAmount, getStatusBadgeClass, getSectionLabel, type PipelineStatus, type ClaimItem } from '@/lib/api'

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [data, setData] = useState<PipelineStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [editDraft, setEditDraft] = useState('')
    const [editMode, setEditMode] = useState(false)
    const [notes, setNotes] = useState('')
    const [approving, setApproving] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')

    function refresh() {
        notices.getStatus(id).then(d => {
            setData(d)
            if (d.draft_response && !editDraft) setEditDraft(d.draft_response)
        }).catch(console.error).finally(() => setLoading(false))
    }

    useEffect(() => {
        refresh()
        const interval = setInterval(() => {
            if (data?.status === 'ANALYZING' || data?.status === 'DETECTED') refresh()
        }, 5000)
        return () => clearInterval(interval)
    }, [data?.status])

    async function handleApprove(action: string) {
        setApproving(true)
        try {
            const res = await notices.approve(id, { action, edited_draft: editMode ? editDraft : undefined, ca_notes: notes || undefined })
            setSuccessMsg(res.message)
            refresh()
        } catch (err: any) { alert(err.message) }
        finally { setApproving(false) }
    }

    const isPending = data?.status === 'PENDING_APPROVAL'
    const isAnalyzing = data?.status === 'ANALYZING' || data?.status === 'DETECTED'
    const isSubmitted = data?.status === 'SUBMITTED' || data?.status === 'RESOLVED'

    if (loading) return (
        <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#0A9B88', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        </div>
    )
    if (!data) return <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>Notice not found</div>

    return (
        <div style={{ padding: '24px 32px', minHeight: '100vh', background: '#F0F4F3' }}>
            {/* Breadcrumb header */}
            <div style={{ marginBottom: 22 }}>
                <Link href="/dashboard/notices" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 14 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6" /></svg>
                    Back to Notices
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {data.status && <span className={getStatusBadgeClass(data.status)}>{data.status.replace(/_/g, ' ')}</span>}
                    <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Notice Analysis</h1>
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>#{id.slice(0, 8)}</span>
                    {successMsg && (
                        <div style={{ padding: '7px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#16A34A', marginLeft: 'auto' }}>
                            ✓ {successMsg}
                        </div>
                    )}
                </div>
            </div>

            {/* Analyzing state */}
            {isAnalyzing && (
                <div className="card" style={{ padding: '48px', textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ width: 52, height: 52, border: '4px solid #F3F4F6', borderTopColor: '#0A9B88', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 0.9s linear infinite' }} />
                    <h2 style={{ fontWeight: 800, fontSize: 20, color: '#111827', marginBottom: 8 }}>AI Analysis in Progress</h2>
                    <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 36 }}>Classifier → Analyst → Strategist → Drafter</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {['Classifier', 'Analyst', 'Strategist', 'Drafter'].map((stage, i) => (
                            <div key={i} style={{ padding: '16px 12px', borderRadius: 12, background: i === 0 ? '#F0FDFB' : '#F9FAFB', border: `1px solid ${i === 0 ? '#CCFBF1' : '#F3F4F6'}` }}>
                                <div style={{ fontSize: 22, marginBottom: 8 }}>{['🔎', '🔬', '⚖', '✍'][i]}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? '#0A9B88' : '#9CA3AF' }}>{stage}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.proof_object && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
                    {/* Left */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Proof document */}
                        <div className="card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0A9B88', letterSpacing: '0.5px', marginBottom: 5 }}>EVIDENCE PROOF DOCUMENT</div>
                                    <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 3 }}>Cross-Reference Analysis</h2>
                                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>Sources: {data.proof_object.data_sources_used?.join(' · ')} · Confidence: {(data.proof_object.overall_confidence * 100).toFixed(0)}%</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 24, fontWeight: 900, color: data.proof_object.total_discrepancy > 0 ? '#DC2626' : '#16A34A', letterSpacing: '-1px' }}>{formatAmount(data.proof_object.total_discrepancy)}</div>
                                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>total discrepancy</div>
                                </div>
                            </div>

                            {data.proof_object.root_cause && (
                                <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ fontSize: 14 }}>⚠</span>
                                    <div>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706' }}>ROOT CAUSE: </span>
                                        <span style={{ fontSize: 13, color: '#374151' }}>{data.proof_object.root_cause.replace(/_/g, ' ')}</span>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {data.proof_object.claim_items.map((item: ClaimItem, i: number) => {
                                    const isMismatch = item.status === 'MISMATCH'
                                    const isMatch = item.status === 'MATCH'
                                    return (
                                        <div key={i} style={{ padding: '16px', borderRadius: 12, background: isMismatch ? '#FEF2F2' : isMatch ? '#F0FDF4' : '#F9FAFB', border: `1px solid ${isMismatch ? '#FECACA' : isMatch ? '#BBF7D0' : '#E5E7EB'}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: isMismatch ? '#DC2626' : isMatch ? '#16A34A' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                                                            {isMismatch ? '✗' : isMatch ? '✓' : '?'}
                                                        </div>
                                                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{item.claim_description}</span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                        <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #F3F4F6' }}>
                                                            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3, fontWeight: 600, letterSpacing: '0.3px' }}>DEPT CLAIMS</div>
                                                            <div style={{ fontSize: 16, fontWeight: 800, color: '#DC2626' }}>{formatAmount(item.claim_amount)}</div>
                                                        </div>
                                                        {item.our_value !== null && item.our_value !== undefined && (
                                                            <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #F3F4F6' }}>
                                                                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3, fontWeight: 600, letterSpacing: '0.3px' }}>OUR RECORDS</div>
                                                                <div style={{ fontSize: 16, fontWeight: 800, color: '#16A34A' }}>{formatAmount(item.our_value)}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ marginTop: 8, fontSize: 11.5, color: '#6B7280' }}>📄 {item.source_document}{item.source_line ? ` · ${item.source_line}` : ''}</div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>Confidence</div>
                                                    <div style={{ fontSize: 20, fontWeight: 900, color: isMismatch ? '#DC2626' : isMatch ? '#16A34A' : '#6B7280' }}>{(item.match_confidence * 100).toFixed(0)}%</div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Draft response */}
                        {data.draft_response && (
                            <div className="card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0A9B88', letterSpacing: '0.5px', marginBottom: 3 }}>AI-GENERATED DRAFT</div>
                                        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Response Letter</h2>
                                    </div>
                                    {!isSubmitted && (
                                        <button onClick={() => setEditMode(!editMode)} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
                                            {editMode ? '👁 Preview' : '✎ Edit Draft'}
                                        </button>
                                    )}
                                </div>
                                {editMode ? (
                                    <textarea value={editDraft} onChange={e => setEditDraft(e.target.value)} className="input"
                                        style={{ minHeight: 380, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, padding: '16px', resize: 'vertical' }} />
                                ) : (
                                    <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '20px', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.9, color: '#374151', whiteSpace: 'pre-wrap', maxHeight: 440, overflow: 'auto', border: '1px solid #E5E7EB' }}>
                                        {editDraft || data.draft_response}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right sticky panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>
                        {/* Strategy */}
                        {data.strategy && (
                            <div className="card" style={{ padding: '20px', border: '1.5px solid #CCFBF1' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#0A9B88', letterSpacing: '0.5px', marginBottom: 12 }}>AI RECOMMENDATION</div>
                                <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 10, lineHeight: 1.3 }}>{strategyLabel(data.strategy)}</div>
                                <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.7, marginBottom: 14 }}>{data.strategy_reasoning}</div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                                        <span style={{ color: '#6B7280' }}>Success probability</span>
                                        <span style={{ fontWeight: 700, color: '#16A34A' }}>High</span>
                                    </div>
                                    <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99 }}>
                                        <div style={{ width: '78%', height: '100%', background: 'linear-gradient(90deg, #0A9B88, #34D399)', borderRadius: 99 }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Doc checklist */}
                        {data.doc_checklist && data.doc_checklist.length > 0 && (
                            <div className="card" style={{ padding: '20px' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>📎 Documents Required</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                                    {data.doc_checklist.map((item: string, i: number) => (
                                        <label key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                                            <input type="checkbox" style={{ marginTop: 2, accentColor: '#0A9B88', flexShrink: 0, width: 15, height: 15 }} />
                                            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CA Approval */}
                        {isPending && !successMsg && (
                            <div className="card" style={{ padding: '20px', border: '1.5px solid #CCFBF1' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#0A9B88', letterSpacing: '0.5px', marginBottom: 14 }}>CA APPROVAL REQUIRED</div>
                                <textarea placeholder="Add notes for record (optional)..." className="input" style={{ minHeight: 70, marginBottom: 12, fontSize: 12, resize: 'none' }} value={notes} onChange={e => setNotes(e.target.value)} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <button onClick={() => handleApprove('approve')} className="btn-primary" disabled={approving} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                                        {approving ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Processing...</span> : '✓ Approve & Submit'}
                                    </button>
                                    <button onClick={() => setEditMode(true)} className="btn-outline" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13 }}>✎ Edit Draft First</button>
                                    <button onClick={() => handleApprove('escalate')} className="btn-danger" disabled={approving} style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13 }}>⚠ Escalate — Manual Review</button>
                                </div>
                                <div style={{ marginTop: 14, padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
                                    By approving, you confirm accuracy and accept responsibility per TaxOS terms.
                                </div>
                            </div>
                        )}

                        {isSubmitted && (
                            <div style={{ padding: '16px 20px', background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 12 }}>
                                <div style={{ fontWeight: 700, color: '#16A34A', marginBottom: 4 }}>✓ Response Submitted</div>
                                <div style={{ fontSize: 13, color: '#374151' }}>Approved and submitted by CA.</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!data.proof_object && !isAnalyzing && (
                <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                    <div style={{ fontSize: 44, marginBottom: 14 }}>📄</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>Analysis not complete</div>
                    <div style={{ fontSize: 14, color: '#9CA3AF' }}>Status: {data.status}</div>
                    {data.error && <div style={{ marginTop: 12, color: '#DC2626', fontSize: 13 }}>Error: {data.error}</div>}
                </div>
            )}
        </div>
    )
}

function strategyLabel(strategy: string): string {
    const labels: Record<string, string> = {
        PAY_DEMAND: '💳 Pay the Demand',
        FILE_154: '📝 File Section 154 Rectification',
        REVISED_RETURN: '🔄 File Revised Return',
        CONTEST: '⚖ Contest the Notice',
        PARTIAL_PAY: '💰 Partial Payment + Contest',
    }
    return labels[strategy] || strategy
}
