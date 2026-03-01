"""
LangGraph Agent Pipeline for TaxOS
4 agents: Classifier → Analyst → Strategist → Drafter
Uses Mistral AI + cross-reference engine
"""
import json
import traceback
from typing import TypedDict, Optional, List, Dict, Any
from langgraph.graph import StateGraph, END
from db.models import NoticeStatus, NoticeSection, NoticeType, ResolutionStrategy, RootCause
from services import mistral_service, pdf_service, cross_ref_service


# ─── State ───────────────────────────────────────────────────────────────────

class NoticeAgentState(TypedDict):
    # Input
    notice_id: str
    client_pan: str
    client_dob: str
    client_name: str
    assessment_year: str
    notice_pdf_path: Optional[str]
    form_26as_path: Optional[str]
    itr_path: Optional[str]

    # Stage 1 — Classifier output
    notice_text: Optional[str]
    notice_extracted: Optional[Dict[str, Any]]  # Mistral extraction
    notice_section: Optional[str]
    notice_type: Optional[str]
    mismatch_amount: Optional[float]
    demand_amount: Optional[float]
    deadline: Optional[str]
    ao_name: Optional[str]
    ao_ward: Optional[str]
    portal_reference: Optional[str]
    classification_confidence: Optional[float]

    # Stage 2 — Analyst output
    form_26as_data: Optional[Dict]
    itr_data: Optional[Dict]
    proof_result: Optional[Dict[str, Any]]
    root_cause: Optional[str]

    # Stage 3 — Strategist output
    strategy: Optional[str]
    strategy_reasoning: Optional[str]
    success_probability: Optional[float]
    key_arguments: Optional[List[str]]
    risk_level: Optional[str]

    # Stage 4 — Drafter output
    draft_response: Optional[str]
    doc_checklist: Optional[List[str]]

    # Meta
    current_stage: str
    error: Optional[str]
    completed: bool


# ─── Node 1: Classifier ───────────────────────────────────────────────────────

def classifier_node(state: NoticeAgentState) -> NoticeAgentState:
    """
    Agent 1 — The Classifier
    Extracts and classifies notice fields from PDF using Mistral AI.
    """
    try:
        notice_text = ""
        pdf_path = state.get("notice_pdf_path")

        if pdf_path:
            # Try decryption first if PAN+DOB available
            pan = state.get("client_pan", "")
            dob = state.get("client_dob", "")

            if pan and dob:
                pdf_bytes = pdf_service.decrypt_pdf(pdf_path, pan, dob)
                if pdf_bytes:
                    notice_text = pdf_service.extract_text_from_pdf(pdf_path, pdf_bytes)
                else:
                    # Maybe not encrypted, try direct extraction
                    notice_text = pdf_service.extract_text_from_pdf(pdf_path)
            else:
                notice_text = pdf_service.extract_text_from_pdf(pdf_path)

        # Heuristic extraction as baseline
        heuristic = pdf_service.parse_notice_fields_heuristic(notice_text) if notice_text else {}

        # Mistral AI classification (primary)
        if notice_text and len(notice_text.strip()) > 50:
            extracted = mistral_service.classify_notice(notice_text)
        else:
            # No text — use defaults
            extracted = {
                "section": heuristic.get("section") or "OTHER",
                "notice_type": "OTHER",
                "assessment_year": heuristic.get("assessment_year") or state.get("assessment_year"),
                "mismatch_amount": heuristic.get("mismatch_amount"),
                "demand_amount": None,
                "deadline": heuristic.get("deadline"),
                "ao_name": None,
                "ao_ward": None,
                "portal_reference": heuristic.get("portal_reference"),
                "taxpayer_pan": heuristic.get("pan"),
                "summary": "No text extracted from PDF. Manual review required.",
                "confidence": 0.1,
            }

        # Merge heuristic fallbacks
        for field in ["section", "assessment_year", "mismatch_amount", "deadline", "portal_reference"]:
            if not extracted.get(field) and heuristic.get(field):
                extracted[field] = heuristic[field]

        return {
            **state,
            "notice_text": notice_text,
            "notice_extracted": extracted,
            "notice_section": extracted.get("section") or "OTHER",
            "notice_type": extracted.get("notice_type") or "OTHER",
            "mismatch_amount": extracted.get("mismatch_amount"),
            "demand_amount": extracted.get("demand_amount"),
            "deadline": extracted.get("deadline"),
            "ao_name": extracted.get("ao_name"),
            "ao_ward": extracted.get("ao_ward"),
            "portal_reference": extracted.get("portal_reference"),
            "classification_confidence": extracted.get("confidence", 0.5),
            "current_stage": "ANALYST",
            "error": None,
        }
    except Exception as e:
        traceback.print_exc()
        return {**state, "current_stage": "ANALYST", "error": f"Classifier error: {str(e)}"}


# ─── Node 2: Analyst ──────────────────────────────────────────────────────────

def analyst_node(state: NoticeAgentState) -> NoticeAgentState:
    """
    Agent 2 — The Analyst
    Parses supporting docs and builds the ProofObject via cross-reference engine.
    """
    try:
        form_26as_data = None
        itr_data = None

        # Parse Form 26AS if available
        if state.get("form_26as_path"):
            form_26as_data = pdf_service.parse_form_26as(state["form_26as_path"])

        # Parse ITR if available
        if state.get("itr_path"):
            itr_data = pdf_service.parse_itr_acknowledgement(state["itr_path"])

        # Run cross-reference engine
        notice_data = {
            "section": state.get("notice_section"),
            "notice_type": state.get("notice_type"),
            "mismatch_amount": state.get("mismatch_amount"),
            "demand_amount": state.get("demand_amount"),
            "tds_claim": None,  # Could be extracted from notice text
        }

        proof_result = cross_ref_service.cross_reference_notice(
            notice_data=notice_data,
            form_26as_data=form_26as_data,
            itr_data=itr_data,
        )

        return {
            **state,
            "form_26as_data": form_26as_data,
            "itr_data": itr_data,
            "proof_result": proof_result,
            "root_cause": proof_result.get("root_cause"),
            "current_stage": "STRATEGIST",
            "error": None,
        }
    except Exception as e:
        traceback.print_exc()
        return {**state, "current_stage": "STRATEGIST", "error": f"Analyst error: {str(e)}"}


# ─── Node 3: Strategist ───────────────────────────────────────────────────────

def strategist_node(state: NoticeAgentState) -> NoticeAgentState:
    """
    Agent 3 — The Strategist
    Recommends optimal resolution strategy using Mistral AI + decision tree.
    """
    try:
        proof_result = state.get("proof_result") or {}
        proof_summary = cross_ref_service.build_proof_summary(proof_result)

        strategy_result = mistral_service.recommend_strategy(
            notice_type=state.get("notice_type", "OTHER"),
            section=state.get("notice_section", "OTHER"),
            mismatch_amount=state.get("mismatch_amount") or state.get("demand_amount") or 0,
            proof_summary=proof_summary,
            root_cause=state.get("root_cause", "UNKNOWN"),
        )

        return {
            **state,
            "strategy": strategy_result.get("strategy", "CONTEST"),
            "strategy_reasoning": strategy_result.get("reasoning", ""),
            "success_probability": strategy_result.get("success_probability", 0.5),
            "key_arguments": strategy_result.get("key_arguments", []),
            "risk_level": strategy_result.get("risk_level", "MEDIUM"),
            "current_stage": "DRAFTER",
            "error": None,
        }
    except Exception as e:
        traceback.print_exc()
        return {**state, "current_stage": "DRAFTER", "error": f"Strategist error: {str(e)}"}


# ─── Node 4: Drafter ──────────────────────────────────────────────────────────

def drafter_node(state: NoticeAgentState) -> NoticeAgentState:
    """
    Agent 4 — The Drafter
    Generates legally structured response letter and document checklist.
    """
    try:
        proof_result = state.get("proof_result") or {}

        # Generate response letter
        draft = mistral_service.draft_response(
            notice_summary=state.get("notice_extracted", {}).get("summary", "Income Tax Notice"),
            section=state.get("notice_section", "OTHER"),
            assessment_year=state.get("assessment_year", "2023-24"),
            client_name=state.get("client_name", "Taxpayer"),
            client_pan=state.get("client_pan", ""),
            strategy=state.get("strategy", "CONTEST"),
            proof_items=proof_result.get("claim_items", []),
            key_arguments=state.get("key_arguments", []),
            ao_name=state.get("ao_name"),
            ao_ward=state.get("ao_ward"),
        )

        # Generate document checklist
        checklist = mistral_service.generate_doc_checklist(
            notice_type=state.get("notice_type", "OTHER"),
            strategy=state.get("strategy", "CONTEST"),
            section=state.get("notice_section", "OTHER"),
        )

        return {
            **state,
            "draft_response": draft,
            "doc_checklist": checklist,
            "current_stage": "COMPLETE",
            "completed": True,
            "error": None,
        }
    except Exception as e:
        traceback.print_exc()
        return {**state, "current_stage": "COMPLETE", "completed": True, "error": f"Drafter error: {str(e)}"}


# ─── Build Graph ──────────────────────────────────────────────────────────────

def build_notice_graph() -> StateGraph:
    """Build and compile the LangGraph pipeline."""
    graph = StateGraph(NoticeAgentState)

    graph.add_node("classifier", classifier_node)
    graph.add_node("analyst", analyst_node)
    graph.add_node("strategist", strategist_node)
    graph.add_node("drafter", drafter_node)

    graph.set_entry_point("classifier")
    graph.add_edge("classifier", "analyst")
    graph.add_edge("analyst", "strategist")
    graph.add_edge("strategist", "drafter")
    graph.add_edge("drafter", END)

    return graph.compile()


# Singleton compiled graph
notice_pipeline = build_notice_graph()


def run_notice_pipeline(
    notice_id: str,
    client_pan: str,
    client_dob: str,
    client_name: str,
    assessment_year: str,
    notice_pdf_path: Optional[str] = None,
    form_26as_path: Optional[str] = None,
    itr_path: Optional[str] = None,
) -> NoticeAgentState:
    """Run the complete 4-agent pipeline for a notice."""
    initial_state: NoticeAgentState = {
        "notice_id": notice_id,
        "client_pan": client_pan,
        "client_dob": client_dob,
        "client_name": client_name,
        "assessment_year": assessment_year,
        "notice_pdf_path": notice_pdf_path,
        "form_26as_path": form_26as_path,
        "itr_path": itr_path,
        "notice_text": None,
        "notice_extracted": None,
        "notice_section": None,
        "notice_type": None,
        "mismatch_amount": None,
        "demand_amount": None,
        "deadline": None,
        "ao_name": None,
        "ao_ward": None,
        "portal_reference": None,
        "classification_confidence": None,
        "form_26as_data": None,
        "itr_data": None,
        "proof_result": None,
        "root_cause": None,
        "strategy": None,
        "strategy_reasoning": None,
        "success_probability": None,
        "key_arguments": None,
        "risk_level": None,
        "draft_response": None,
        "doc_checklist": None,
        "current_stage": "CLASSIFIER",
        "error": None,
        "completed": False,
    }

    final_state = notice_pipeline.invoke(initial_state)
    return final_state
