"""
Seed script — Creates demo data for TaxOS MVP demo.
Run: python db/seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from db.database import SessionLocal, create_tables
from db import models
from core.auth import get_password_hash

def seed():
    create_tables()
    db = SessionLocal()

    # Check if already seeded
    existing = db.query(models.Firm).filter(models.Firm.email == "demo@taxos.ai").first()
    if existing:
        print("✅ Database already seeded. Skipping.")
        db.close()
        return

    print("🌱 Seeding TaxOS demo data...")

    # ── Firm ────────────────────────────────────────────────────────────────
    firm = models.Firm(
        name="Sharma & Associates — CA Firm",
        email="demo@taxos.ai",
        phone="+91-9876543210",
        address="304, Maker Chambers IV, Nariman Point, Mumbai 400021",
    )
    db.add(firm)
    db.flush()

    # ── Users ───────────────────────────────────────────────────────────────
    partner = models.User(
        firm_id=firm.id,
        name="CA Rajesh Sharma",
        email="demo@taxos.ai",
        hashed_password=get_password_hash("taxos2026"),
        role=models.UserRole.PARTNER,
    )
    senior = models.User(
        firm_id=firm.id,
        name="CA Priya Mehta",
        email="priya@taxos.ai",
        hashed_password=get_password_hash("taxos2026"),
        role=models.UserRole.SENIOR_CA,
    )
    db.add_all([partner, senior])
    db.flush()

    # ── Clients ─────────────────────────────────────────────────────────────
    clients_data = [
        {"name": "Ankit Gupta", "pan": "AABCG1234D", "dob": "15/03/1985", "email": "ankit@example.com"},
        {"name": "Meera Investments Pvt Ltd", "pan": "BBBCI5678E", "dob": "01/01/2010", "email": "meera@example.com"},
        {"name": "Suresh Kumar", "pan": "CCCSK9012F", "dob": "22/07/1972", "email": "suresh@example.com"},
        {"name": "Preeti Agarwal", "pan": "DDDPA3456G", "dob": "08/11/1990", "email": "preeti@example.com"},
        {"name": "RK Textiles LLP", "pan": "EEERK7890H", "dob": "15/06/2015", "email": "rk@example.com"},
    ]
    clients = []
    for cd in clients_data:
        c = models.Client(firm_id=firm.id, **cd)
        db.add(c)
        clients.append(c)
    db.flush()

    # ── Notices ─────────────────────────────────────────────────────────────
    now = datetime.utcnow()

    notice1 = models.Notice(
        client_id=clients[0].id,
        firm_id=firm.id,
        assessment_year="2022-23",
        section=models.NoticeSection.S143_1,
        notice_type=models.NoticeType.DEMAND_CONFIRMATION,
        mismatch_amount=0,
        demand_amount=68420.00,
        deadline=now + timedelta(days=12),
        status=models.NoticeStatus.PENDING_APPROVAL,
        portal_reference="DIN-2024-143-1-ANKIT",
        ao_name="ITO Ward 14(3), Mumbai",
        ao_ward="Ward 14(3)",
        ao_circle="Circle 14, Mumbai",
        ai_strategy=models.ResolutionStrategy.FILE_154,
        ai_strategy_reasoning="Computation error by AO — tax should be ₹52,400 based on correct Schedule OS calculation. Filing 154 rectification is the fastest path.",
        ai_draft_response="""To,
The Income Tax Officer,
Ward 14(3), Mumbai

Subject: Response to Intimation under Section 143(1) for A.Y. 2022-23 — Request for Rectification under Section 154

Respected Sir/Madam,

We, on behalf of Mr. Ankit Gupta (PAN: AABCG1234D), humbly submit this response to the intimation dated received under Section 143(1) for Assessment Year 2022-23.

FACTS:
The intimation demands ₹68,420/- on account of alleged mismatch in computation. Upon careful review, we submit that the demand arises due to a computation error by the CPC in processing Schedule OS — Other Sources income.

COMPUTATION:
- Income from Other Sources per ITR: ₹2,40,000/-
- Standard deduction claimed: ₹24,000/- (Section 57)
- Net taxable OS income: ₹2,16,000/-
- CPC has disallowed the Section 57 deduction, creating an apparent discrepancy of ₹24,000/- in the computation.

PRAYER:
It is, therefore, most respectfully prayed that Your Honour may be pleased to:
1. Accept this rectification application
2. Correct the computation to allow Section 57 deduction of ₹24,000/-
3. Revise the demand accordingly

We trust that the matter shall receive your kind consideration.

Respectfully submitted,""",
        ai_doc_checklist=[
            "Copy of Intimation under Section 143(1)",
            "Original ITR-1 filing acknowledgement for AY 2022-23",
            "Schedule OS computation sheet",
            "Bank interest certificate (FD statements showing interest income)",
            "Proof of expenses eligible under Section 57",
        ],
        detected_at=now - timedelta(days=2),
    )

    notice2 = models.Notice(
        client_id=clients[1].id,
        firm_id=firm.id,
        assessment_year="2023-24",
        section=models.NoticeSection.S133_6,
        notice_type=models.NoticeType.AIS_MISMATCH,
        mismatch_amount=3_45_000.00,
        demand_amount=None,
        deadline=now + timedelta(days=21),
        status=models.NoticeStatus.PENDING_APPROVAL,
        portal_reference="DIN-2024-133-MEERA",
        ao_name="ITO Ward 7(2), Mumbai",
        ao_ward="Ward 7(2)",
        ao_circle="Circle 7, Mumbai",
        ai_strategy=models.ResolutionStrategy.CONTEST,
        ai_strategy_reasoning="AIS shows SFT transaction of ₹3.45L from mutual fund. This income WAS reported in ITR Schedule CG. AIS data may be duplicated. Contest with 26AS + ITR proof.",
        ai_draft_response="""To,
The Income Tax Officer,
Ward 7(2), Mumbai

Subject: Response to Notice under Section 133(6) for A.Y. 2023-24 — AIS Mismatch

Respected Sir/Madam,

We, on behalf of Meera Investments Pvt Ltd (PAN: BBBCI5678E), submit this response to the notice dated under Section 133(6) regarding alleged AIS mismatch of ₹3,45,000/-.

The said amount relates to redemption of mutual fund units credited by HDFC Mutual Fund (SFT transaction). We submit that this income has been duly reported in the ITR for AY 2023-24 under Schedule Capital Gains (STCG).

Enclosed herewith are: Form 26AS, AIS/TIS statement, ITR - Schedule CG computation, and HDFC MF redemption statement confirming the transaction and capital gains computation.

PRAYER: Drop the proceedings under Section 133(6) as the income is fully accounted for in the filed return.

Respectfully submitted,""",
        ai_doc_checklist=[
            "Notice under Section 133(6) — Original",
            "AIS/TIS statement download for AY 2023-24",
            "Form 26AS for AY 2023-24",
            "ITR filing acknowledgement with Schedule CG computation",
            "HDFC Mutual Fund redemption statement",
            "Capital gains computation worksheet",
        ],
        detected_at=now - timedelta(days=1),
    )

    notice3 = models.Notice(
        client_id=clients[2].id,
        firm_id=firm.id,
        assessment_year="2022-23",
        section=models.NoticeSection.S143_1,
        notice_type=models.NoticeType.TDS_CREDIT,
        mismatch_amount=22_400.00,
        demand_amount=22_400.00,
        deadline=now + timedelta(days=5),
        status=models.NoticeStatus.PENDING_APPROVAL,
        portal_reference="DIN-2024-TDS-SURESH",
        ao_name="ITO Ward 3(1), Mumbai",
        ao_ward="Ward 3(1)",
        ao_circle="Circle 3, Mumbai",
        ai_strategy=models.ResolutionStrategy.FILE_154,
        ai_strategy_reasoning="TDS of ₹22,400 deducted by employer (TAN MUMX12345E) shows in Form 26AS but CPC has not credited it in intimation. Classic TDS credit mismatch — Section 154 rectification with 26AS attachment resolves in 15-30 days with near-100% success rate.",
        ai_draft_response="""To,
The Income Tax Officer,
Ward 3(1), Mumbai

Subject: Rectification Application under Section 154 for A.Y. 2022-23 — TDS Credit Mismatch

Respected Sir/Madam,

We, on behalf of Mr. Suresh Kumar (PAN: CCCSK9012F), submit this rectification application under Section 154 regarding TDS credit not reflected in Intimation under Section 143(1) for AY 2022-23.

FACTS:
The CPC intimation does not reflect TDS of ₹22,400/- deducted at source by M/s Tata Consultancy Services Limited (TAN: MUMX12345E) as certified in Form 26AS.

The TDS has been duly deducted and deposited by the deductor as evidenced by Form 26AS (Part A, Entry 3). However, the CPC has processed the return without crediting this TDS, resulting in an erroneous demand.

EVIDENCE ATTACHED:
- Form 26AS for AY 2022-23 (Part A showing TDS of ₹22,400)
- TDS certificate (Form 16) from employer
- Salary certificate

PRAYER:
Rectify the computation to credit TDS of ₹22,400/- and drop the consequential demand.

Respectfully submitted,""",
        ai_doc_checklist=[
            "Form 26AS for AY 2022-23 (showing TDS entry)",
            "Form 16 / TDS certificate from employer",
            "Salary slip / salary certificate",
            "Original ITR filing acknowledgement",
            "Copy of 143(1) intimation",
        ],
        detected_at=now - timedelta(hours=6),
    )

    # One more — being analyzed
    notice4 = models.Notice(
        client_id=clients[3].id,
        firm_id=firm.id,
        assessment_year="2023-24",
        section=models.NoticeSection.S148A,
        notice_type=models.NoticeType.REASSESSMENT,
        mismatch_amount=8_50_000.00,
        deadline=now + timedelta(days=18),
        status=models.NoticeStatus.ANALYZING,
        detected_at=now - timedelta(minutes=30),
    )

    db.add_all([notice1, notice2, notice3, notice4])
    db.flush()

    # ── ProofObjects for seeded notices ─────────────────────────────────────
    proof1 = models.ProofObject(
        notice_id=notice1.id,
        claim_items=[
            {
                "claim_description": "Tax demand per CPC intimation",
                "claim_amount": 68420.0,
                "source_document": "143(1) Intimation",
                "source_line": "CPC computation, total demand",
                "our_value": 52400.0,
                "match_confidence": 0.92,
                "discrepancy": 16020.0,
                "status": "MISMATCH",
            },
            {
                "claim_description": "Section 57 deduction disallowed by CPC",
                "claim_amount": 24000.0,
                "source_document": "Source: ITR Schedule OS",
                "source_line": "Deduction claimed: ₹24,000",
                "our_value": 24000.0,
                "match_confidence": 0.98,
                "discrepancy": 0.0,
                "status": "MISMATCH",
            }
        ],
        root_cause=models.RootCause.COMPUTATION_ERROR,
        total_discrepancy=16020.0,
        overall_confidence=0.94,
        data_sources_used=["ITR", "Notice PDF"],
    )

    proof2 = models.ProofObject(
        notice_id=notice2.id,
        claim_items=[
            {
                "claim_description": "AIS SFT transaction — MF redemption",
                "claim_amount": 345000.0,
                "source_document": "AIS/TIS Data",
                "source_line": "HDFC Mutual Fund SFT",
                "our_value": 345000.0,
                "match_confidence": 0.89,
                "discrepancy": 0.0,
                "status": "MATCH",
            },
            {
                "claim_description": "Capital Gain reported in ITR",
                "claim_amount": 345000.0,
                "source_document": "ITR Schedule CG",
                "source_line": "STCG from MF redemption: ₹3,45,000",
                "our_value": 345000.0,
                "match_confidence": 0.97,
                "discrepancy": 0.0,
                "status": "MATCH",
            }
        ],
        root_cause=models.RootCause.AIS_ERROR,
        total_discrepancy=0.0,
        overall_confidence=0.92,
        data_sources_used=["AIS", "ITR", "26AS"],
    )

    proof3 = models.ProofObject(
        notice_id=notice3.id,
        claim_items=[
            {
                "claim_description": "TDS per Form 26AS (Employer deduction)",
                "claim_amount": 22400.0,
                "source_document": "Form 26AS — Part A, Entry 3",
                "source_line": "TCS Ltd (TAN: MUMX12345E) — Salary TDS",
                "our_value": 22400.0,
                "match_confidence": 0.99,
                "discrepancy": 22400.0,
                "status": "MISMATCH",
            }
        ],
        root_cause=models.RootCause.TDS_MISMATCH,
        total_discrepancy=22400.0,
        overall_confidence=0.97,
        data_sources_used=["26AS", "ITR"],
    )

    db.add_all([proof1, proof2, proof3])
    db.commit()
    db.close()

    print("✅ Seeded: 1 firm, 2 users, 5 clients, 4 notices, 3 proof objects")
    print("   Login: demo@taxos.ai / taxos2026")


if __name__ == "__main__":
    seed()
