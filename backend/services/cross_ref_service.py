"""
Cross-Reference Engine — Compares notice claims against taxpayer's financial documents
(Form 26AS, ITR data, AIS) to build the ProofObject with confidence scores.
"""
from typing import Dict, Any, List, Optional
from db.models import RootCause


def get_amount_bracket(amount: float) -> str:
    if amount < 50000:
        return "UNDER_50K"
    elif amount < 500000:
        return "50K_TO_5L"
    elif amount < 5000000:
        return "5L_TO_50L"
    else:
        return "ABOVE_50L"


def cross_reference_notice(
    notice_data: Dict[str, Any],
    form_26as_data: Optional[Dict[str, Any]] = None,
    itr_data: Optional[Dict[str, Any]] = None,
    ais_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Main cross-reference function. Compares notice claims against financial docs.
    Returns a ProofObject-compatible dictionary.
    """
    claim_items = []
    data_sources_used = []
    total_discrepancy = 0.0
    confidence_scores = []

    # ── TDS Cross-Reference ──────────────────────────────────────────────────
    if form_26as_data and "tds_entries" in form_26as_data:
        data_sources_used.append("26AS")
        notice_tds_claim = notice_data.get("tds_claim", 0) or 0

        total_26as_tds = form_26as_data.get("total_tds", 0) or 0
        itr_tds_claimed = itr_data.get("tds_claimed", 0) if itr_data else 0

        if notice_tds_claim > 0 or total_26as_tds > 0:
            discrepancy = abs(notice_tds_claim - total_26as_tds)
            confidence = 0.95 if discrepancy < 1 else (0.7 if discrepancy < 5000 else 0.5)
            status = "MATCH" if discrepancy < 1 else "MISMATCH"

            claim_items.append({
                "claim_description": "TDS Credit as per Dept Records",
                "claim_amount": float(notice_tds_claim),
                "source_document": "Form 26AS",
                "source_line": f"Total TDS: ₹{total_26as_tds:,.2f}",
                "our_value": float(total_26as_tds),
                "match_confidence": confidence,
                "discrepancy": discrepancy,
                "status": status,
            })

            if discrepancy > 0:
                total_discrepancy += discrepancy
                confidence_scores.append(confidence)

    # ── Income / Mismatch Cross-Reference ────────────────────────────────────
    notice_mismatch = notice_data.get("mismatch_amount", 0) or 0
    notice_type = notice_data.get("notice_type", "")

    if notice_mismatch > 0:
        our_value = 0.0
        source_doc = "AIS/TIS"
        source_line = "Not found in filed return"

        if itr_data:
            data_sources_used.append("ITR")
            our_value = itr_data.get("gross_total_income", 0) or 0

        if ais_data and isinstance(ais_data, dict):
            data_sources_used.append("AIS")

        discrepancy = abs(notice_mismatch - our_value)
        confidence = 0.85 if our_value > 0 else 0.4
        status = "MISMATCH" if discrepancy > 100 else "MATCH"

        claim_items.append({
            "claim_description": f"Income/Mismatch per Dept ({notice_data.get('section', '')})",
            "claim_amount": float(notice_mismatch),
            "source_document": source_doc,
            "source_line": source_line,
            "our_value": float(our_value),
            "match_confidence": confidence,
            "discrepancy": discrepancy,
            "status": status,
        })

        if discrepancy > 100:
            total_discrepancy += discrepancy
            confidence_scores.append(confidence)

    # ── Demand Amount Cross-Reference ────────────────────────────────────────
    demand_amount = notice_data.get("demand_amount", 0) or 0
    if demand_amount > 0 and demand_amount != notice_mismatch:
        tax_payable_itr = itr_data.get("tax_payable", 0) if itr_data else 0

        discrepancy = abs(demand_amount - tax_payable_itr)
        confidence = 0.75 if tax_payable_itr > 0 else 0.3
        status = "MISMATCH" if discrepancy > 100 else "MATCH"

        claim_items.append({
            "claim_description": "Tax Demand Amount",
            "claim_amount": float(demand_amount),
            "source_document": "ITR Computation",
            "source_line": f"Tax payable as per ITR: ₹{tax_payable_itr:,.2f}",
            "our_value": float(tax_payable_itr),
            "match_confidence": confidence,
            "discrepancy": discrepancy,
            "status": status,
        })

        if discrepancy > 100:
            total_discrepancy += discrepancy
            confidence_scores.append(confidence)

    # ── If no specific data available, create a placeholder evidence item ───
    if not claim_items:
        claim_items.append({
            "claim_description": "Notice Claim (Documents not uploaded for cross-reference)",
            "claim_amount": float(notice_mismatch or demand_amount or 0),
            "source_document": "Notice PDF",
            "source_line": "Requires Form 26AS and ITR upload for full analysis",
            "our_value": None,
            "match_confidence": 0.3,
            "discrepancy": None,
            "status": "UNKNOWN",
        })
        confidence_scores.append(0.3)
        data_sources_used.append("Notice PDF")

    # ── Determine Root Cause ─────────────────────────────────────────────────
    root_cause = _determine_root_cause(notice_type, claim_items, itr_data, form_26as_data)

    overall_confidence = (
        sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
    )

    return {
        "claim_items": claim_items,
        "root_cause": root_cause,
        "total_discrepancy": round(total_discrepancy, 2),
        "overall_confidence": round(overall_confidence, 3),
        "data_sources_used": list(set(data_sources_used)),
    }


def _determine_root_cause(
    notice_type: str,
    claim_items: List[Dict],
    itr_data: Optional[Dict],
    form_26as_data: Optional[Dict],
) -> str:
    """Heuristically determine the root cause of the notice."""

    mismatches = [item for item in claim_items if item.get("status") == "MISMATCH"]

    if not mismatches:
        return RootCause.PORTAL_ERROR.value

    # Classify based on notice type and discrepancy patterns
    if notice_type in ("AIS_MISMATCH", "INCOME_OMISSION"):
        if itr_data and itr_data.get("gross_total_income", 0) == 0:
            return RootCause.INCOME_OMISSION.value
        return RootCause.AIS_ERROR.value

    if notice_type == "TDS_CREDIT":
        return RootCause.TDS_MISMATCH.value

    if notice_type == "COMPUTATION_ERROR":
        return RootCause.COMPUTATION_ERROR.value

    # Default: check discrepancy size
    max_discrepancy = max((item.get("discrepancy", 0) or 0 for item in mismatches), default=0)
    if max_discrepancy < 1000:
        return RootCause.DATA_ENTRY_ERROR.value
    elif max_discrepancy < 10000:
        return RootCause.COMPUTATION_ERROR.value
    else:
        return RootCause.INCOME_OMISSION.value


def build_proof_summary(proof_result: Dict[str, Any]) -> str:
    """Build a human-readable summary of the proof object for Mistral prompts."""
    lines = [
        f"Total Discrepancy: ₹{proof_result.get('total_discrepancy', 0):,.2f}",
        f"Root Cause: {proof_result.get('root_cause', 'Unknown')}",
        f"Overall Confidence: {proof_result.get('overall_confidence', 0):.0%}",
        f"Data Sources: {', '.join(proof_result.get('data_sources_used', ['Notice PDF']))}",
        "",
        "Evidence Items:",
    ]
    for item in proof_result.get("claim_items", []):
        status_icon = "✓" if item.get("status") == "MATCH" else "✗" if item.get("status") == "MISMATCH" else "?"
        lines.append(
            f"  {status_icon} {item.get('claim_description', '')}: "
            f"Claimed ₹{item.get('claim_amount', 0):,.0f} | "
            f"Our records: ₹{item.get('our_value', 0) or 0:,.0f} | "
            f"Source: {item.get('source_document', '')}"
        )
    return "\n".join(lines)
