"""
Mistral AI Service — Wraps Mistral API calls for notice classification,
strategy recommendation, and response drafting.
"""
import json
from typing import Optional, Dict, Any
from mistralai import Mistral
from core.config import settings

# Initialize Mistral client
client = Mistral(api_key=settings.mistral_api_key)
MODEL = "mistral-large-latest"


def _chat(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    """Internal helper to call Mistral chat completion."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    kwargs = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.complete(
        model=MODEL,
        messages=messages,
        **kwargs
    )
    return response.choices[0].message.content.strip()


def classify_notice(notice_text: str) -> Dict[str, Any]:
    """
    Use Mistral to extract and classify notice fields.
    Returns structured JSON with notice details.
    """
    system_prompt = """You are TaxOS, an expert Indian tax law assistant specializing in Income Tax notices.
Your task is to extract and classify key fields from an Income Tax Department notice.

You MUST respond with valid JSON only. No explanation, no markdown, just the JSON object.

Extract these fields:
- section: The IT Act section (e.g., "143(1)", "148", "133(6)", "154", "270A", "263")
- notice_type: One of [AIS_MISMATCH, TDS_CREDIT, DEMAND_CONFIRMATION, SCRUTINY, HIGH_VALUE_TXN, INCOME_OMISSION, COMPUTATION_ERROR, RECTIFICATION, REASSESSMENT, PENALTY, INTEREST, OTHER]
- assessment_year: The relevant AY (e.g., "2023-24")
- mismatch_amount: The disputed/claimed amount in INR as a number (or null if not found)
- demand_amount: The tax demand amount in INR as a number (or null if not found)
- deadline: Response deadline in YYYY-MM-DD format (or null if not found)
- ao_name: Assessing Officer's name (or null)
- ao_ward: AO ward (or null)
- portal_reference: Case/DIN reference number (or null)
- taxpayer_pan: The taxpayer's PAN (or null)
- summary: A 2-sentence summary of what this notice is about
- confidence: Your confidence in the extraction from 0.0 to 1.0"""

    user_prompt = f"""Please analyze this Income Tax notice and extract the required fields:

--- NOTICE TEXT ---
{notice_text[:5000]}
--- END NOTICE ---

Respond with JSON only."""

    try:
        raw = _chat(system_prompt, user_prompt, json_mode=True)
        result = json.loads(raw)
        return result
    except (json.JSONDecodeError, Exception) as e:
        print(f"Mistral classification error: {e}")
        # Return safe defaults
        return {
            "section": "OTHER",
            "notice_type": "OTHER",
            "assessment_year": None,
            "mismatch_amount": None,
            "demand_amount": None,
            "deadline": None,
            "ao_name": None,
            "ao_ward": None,
            "portal_reference": None,
            "taxpayer_pan": None,
            "summary": "Notice classification failed. Please review manually.",
            "confidence": 0.0,
        }


def recommend_strategy(
    notice_type: str,
    section: str,
    mismatch_amount: float,
    proof_summary: str,
    root_cause: str,
    success_rates: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Use Mistral to recommend the best resolution strategy.
    """
    system_prompt = """You are TaxOS's strategy engine — an expert Indian tax attorney.
Based on the notice details and evidence, recommend the best resolution strategy.

Available strategies:
- PAY_DEMAND: Genuine liability, pay to avoid interest/penalty
- FILE_154: Computation error by AO, file rectification application
- REVISED_RETURN: Income/deduction error by taxpayer
- CONTEST: Dispute the claim with legal arguments
- PARTIAL_PAY: Pay undisputed portion, contest the rest

Respond with valid JSON only. No explanation outside the JSON.
{
  "strategy": "<strategy_code>",
  "reasoning": "<2-3 sentence explanation>",
  "success_probability": <0.0 to 1.0>,
  "key_arguments": ["<argument1>", "<argument2>", ...],
  "time_to_resolve_days": <estimated days>,
  "risk_level": "LOW|MEDIUM|HIGH",
  "alternative_strategy": "<fallback strategy code>"
}"""

    user_prompt = f"""Notice Details:
- Section: {section}
- Notice Type: {notice_type}
- Disputed Amount: ₹{mismatch_amount:,.0f}
- Root Cause: {root_cause}

Evidence Summary:
{proof_summary}

Historical Success Rates (if available):
{json.dumps(success_rates or {}, indent=2)}

What is the best resolution strategy? Respond with JSON only."""

    try:
        raw = _chat(system_prompt, user_prompt, json_mode=True)
        return json.loads(raw)
    except Exception as e:
        print(f"Mistral strategy error: {e}")
        return {
            "strategy": "CONTEST",
            "reasoning": "Could not determine optimal strategy. Manual review recommended.",
            "success_probability": 0.5,
            "key_arguments": ["Review notice carefully", "Gather supporting documents"],
            "time_to_resolve_days": 30,
            "risk_level": "MEDIUM",
            "alternative_strategy": "FILE_154",
        }


def draft_response(
    notice_summary: str,
    section: str,
    assessment_year: str,
    client_name: str,
    client_pan: str,
    strategy: str,
    proof_items: list,
    key_arguments: list,
    ao_name: Optional[str] = None,
    ao_ward: Optional[str] = None,
) -> str:
    """
    Use Mistral to generate a legally structured response letter.
    """
    system_prompt = """You are TaxOS's legal drafting engine — an expert in Indian Income Tax law.
Draft a formal, legally correct response letter to an Income Tax Department notice.

Requirements:
1. Use formal legal language appropriate for IT Department submissions
2. Structure: Subject line → Respectful salutation → Facts → Legal arguments → Prayer/relief sought → Closing
3. Reference specific IT Act sections, rules, and case law where applicable
4. Be specific with amounts, dates, and document references
5. Keep tone respectful but assertive
6. Include a clear prayer (what relief is being sought)
7. Use standard Indian legal letter formatting
8. Do NOT include signature block — the CA will sign

Write the complete letter body only (no JSON, no markdown, just the letter text)."""

    proof_text = "\n".join([
        f"- {item.get('claim_description', '')}: Claimed ₹{item.get('claim_amount', 0):,.0f}, Our records show ₹{item.get('our_value', 0):,.0f} (Source: {item.get('source_document', '')})"
        for item in (proof_items or [])[:5]
    ])

    args_text = "\n".join([f"- {arg}" for arg in (key_arguments or [])[:5]])

    user_prompt = f"""Draft a response letter for:

NOTICE: {notice_summary}
SECTION: {section}
ASSESSMENT YEAR: {assessment_year}
TAXPAYER: {client_name} (PAN: {client_pan})
ASSESSING OFFICER: {ao_name or 'The Assessing Officer'}, {ao_ward or ''}
STRATEGY: {strategy}

KEY EVIDENCE:
{proof_text}

LEGAL ARGUMENTS TO INCLUDE:
{args_text}

Write the complete formal response letter now:"""

    try:
        return _chat(system_prompt, user_prompt, json_mode=False)
    except Exception as e:
        print(f"Mistral drafting error: {e}")
        return f"""To,
The Assessing Officer,
Income Tax Department

Subject: Response to Notice under Section {section} for A.Y. {assessment_year}

Respected Sir/Madam,

We, on behalf of {client_name} (PAN: {client_pan}), humbly submit this response to the notice issued under Section {section} for Assessment Year {assessment_year}.

[AI DRAFT GENERATION FAILED - Please draft response manually]

Strategy recommended: {strategy}

Yours faithfully,
[CA Name]
[Membership Number]"""


def generate_doc_checklist(notice_type: str, strategy: str, section: str) -> list:
    """Generate a checklist of supporting documents needed."""
    system_prompt = """You are a TaxOS assistant. Generate a checklist of supporting documents 
a CA needs to attach with their Income Tax notice response. Be specific and practical.

Respond with a JSON array of strings. Each string is a document to be gathered.
Example: ["Form 26AS for AY 2023-24", "Bank statement showing FD interest", ...]

Limit to 8-10 most important documents."""

    user_prompt = f"""Notice Type: {notice_type}
Section: {section}  
Strategy: {strategy}

What documents should be attached? JSON array only."""

    try:
        raw = _chat(system_prompt, user_prompt, json_mode=True)
        data = json.loads(raw)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "documents" in data:
            return data["documents"]
        return list(data.values())[0] if data else []
    except Exception as e:
        print(f"Mistral checklist error: {e}")
        return [
            f"Copy of the original notice (Section {section})",
            "Form 26AS for the relevant Assessment Year",
            "AIS/TIS statement",
            "ITR acknowledgement and computation",
            "Relevant bank statements",
            "Any correspondence with the IT Department",
        ]
