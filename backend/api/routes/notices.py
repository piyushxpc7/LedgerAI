"""FastAPI routes: notice management + AI pipeline trigger + approval."""
import threading
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db.database import get_db
from db import models, schemas
from core.auth import get_current_user
from core.config import settings
from agents.graph import run_notice_pipeline
from services.storage_service import save_file, validate_upload

router = APIRouter(prefix="/notices", tags=["notices"])


# File saving is handled by storage_service.save_file(file, subfolder)


def _run_pipeline_background(
    notice_id: str,
    client_pan: str,
    client_dob: str,
    client_name: str,
    assessment_year: str,
    notice_pdf_path: Optional[str],
    form_26as_path: Optional[str],
    itr_path: Optional[str],
    db_url: str,
):
    """Run the agent pipeline in a background thread and persist results."""
    from db.database import SessionLocal
    db = SessionLocal()
    try:
        # Mark as ANALYZING
        notice = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
        if notice:
            notice.status = models.NoticeStatus.ANALYZING
            db.commit()

        # Run LangGraph pipeline
        result = run_notice_pipeline(
            notice_id=notice_id,
            client_pan=client_pan,
            client_dob=client_dob,
            client_name=client_name,
            assessment_year=assessment_year,
            notice_pdf_path=notice_pdf_path,
            form_26as_path=form_26as_path,
            itr_path=itr_path,
        )

        # Refresh notice
        notice = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
        if not notice:
            return

        # Update notice with AI results
        if result.get("notice_section"):
            try:
                notice.section = models.NoticeSection(result["notice_section"])
            except ValueError:
                notice.section = models.NoticeSection.OTHER

        if result.get("notice_type"):
            try:
                notice.notice_type = models.NoticeType(result["notice_type"])
            except ValueError:
                notice.notice_type = models.NoticeType.OTHER

        notice.mismatch_amount = result.get("mismatch_amount")
        notice.demand_amount = result.get("demand_amount")
        notice.ao_name = result.get("ao_name")
        notice.ao_ward = result.get("ao_ward")
        notice.portal_reference = result.get("portal_reference")

        if result.get("deadline"):
            try:
                # Handle different date formats
                deadline_str = result["deadline"]
                for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]:
                    try:
                        notice.deadline = datetime.strptime(deadline_str, fmt)
                        break
                    except ValueError:
                        continue
            except Exception:
                pass

        if result.get("strategy"):
            try:
                notice.ai_strategy = models.ResolutionStrategy(result["strategy"])
            except ValueError:
                pass

        notice.ai_strategy_reasoning = result.get("strategy_reasoning")
        notice.ai_draft_response = result.get("draft_response")
        notice.ai_doc_checklist = result.get("doc_checklist")
        notice.agent_job_id = notice_id

        # Create ProofObject
        proof_result = result.get("proof_result")
        if proof_result:
            existing_proof = db.query(models.ProofObject).filter(
                models.ProofObject.notice_id == notice_id
            ).first()

            if not existing_proof:
                proof = models.ProofObject(
                    notice_id=notice_id,
                    claim_items=proof_result.get("claim_items", []),
                    root_cause=proof_result.get("root_cause"),
                    total_discrepancy=proof_result.get("total_discrepancy", 0),
                    overall_confidence=proof_result.get("overall_confidence", 0),
                    data_sources_used=proof_result.get("data_sources_used", []),
                    notice_extracted_text=result.get("notice_text"),
                    form_26as_data=result.get("form_26as_data"),
                    itr_data=result.get("itr_data"),
                )
                db.add(proof)

        notice.status = models.NoticeStatus.PENDING_APPROVAL
        db.commit()

        # Audit log
        log = models.AuditLog(
            firm_id=notice.firm_id,
            notice_id=notice_id,
            action="PIPELINE_COMPLETE",
            details={
                "strategy": str(result.get("strategy")),
                "root_cause": result.get("root_cause"),
                "confidence": result.get("classification_confidence"),
                "error": result.get("error"),
            }
        )
        db.add(log)
        db.commit()

        # Email notification — tell the CA the notice is ready for review
        try:
            from services.email_service import send_pipeline_ready
            # Get CA user email
            firm_users = db.query(models.User).filter(
                models.User.firm_id == notice.firm_id,
                models.User.role == models.UserRole.PARTNER,
                models.User.is_active == True,
            ).all()
            client = db.query(models.Client).filter(models.Client.id == notice.client_id).first()
            for u in firm_users:
                send_pipeline_ready(
                    to=u.email,
                    client_name=client.name if client else "Unknown",
                    notice_id=notice_id,
                    section=str(notice.section.value if notice.section else "UNKNOWN"),
                    strategy=result.get("strategy"),
                )
        except Exception as email_err:
            print(f"Email notification failed (non-critical): {email_err}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        # Mark as FAILED
        try:
            notice = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
            if notice:
                notice.status = models.NoticeStatus.FAILED
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.get("", response_model=List[schemas.NoticeOut])
def list_notices(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    limit = min(limit, 200)  # cap at 200 per page
    query = db.query(models.Notice).filter(models.Notice.firm_id == current_user.firm_id)
    if status:
        try:
            query = query.filter(models.Notice.status == models.NoticeStatus(status))
        except ValueError:
            pass
    notices = query.order_by(desc(models.Notice.detected_at)).offset(skip).limit(limit).all()

    result = []
    for n in notices:
        out = schemas.NoticeOut.model_validate(n)
        if n.client:
            out.client_name = n.client.name
            out.client_pan = n.client.pan
        result.append(out)
    return result


@router.post("/upload")
async def upload_notice(
    background_tasks: BackgroundTasks,
    notice_pdf: UploadFile = File(...),
    client_id: str = Form(...),
    assessment_year: str = Form(...),
    form_26as: Optional[UploadFile] = File(None),
    itr_doc: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload notice PDF and optionally Form 26AS/ITR, trigger AI pipeline."""
    # Get client
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.firm_id == current_user.firm_id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Save uploaded files (storage_service validates type + size)
    try:
        notice_path = save_file(notice_pdf, "notices")
        form_26as_path = save_file(form_26as, "26as") if form_26as and form_26as.filename else None
        itr_path = save_file(itr_doc, "itr") if itr_doc and itr_doc.filename else None
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create Notice record
    notice = models.Notice(
        client_id=client.id,
        firm_id=current_user.firm_id,
        assessment_year=assessment_year,
        status=models.NoticeStatus.DETECTED,
        raw_pdf_path=notice_path,
        supporting_docs={
            "form_26as": form_26as_path,
            "itr": itr_path,
        }
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)

    # Audit log
    log = models.AuditLog(
        firm_id=current_user.firm_id,
        notice_id=notice.id,
        user_id=current_user.id,
        action="NOTICE_UPLOADED",
        details={"filename": notice_pdf.filename, "client_id": client_id}
    )
    db.add(log)
    db.commit()

    # Run AI pipeline in background thread
    thread = threading.Thread(
        target=_run_pipeline_background,
        args=(
            notice.id,
            client.pan,
            client.dob or "",
            client.name,
            assessment_year,
            notice_path,
            form_26as_path,
            itr_path,
            settings.database_url,
        ),
        daemon=True
    )
    thread.start()

    return {
        "notice_id": notice.id,
        "message": "Notice uploaded successfully. AI analysis started.",
        "client": client.name,
        "status": "ANALYZING"
    }


@router.get("/{notice_id}", response_model=schemas.PipelineStatus)
def get_notice_status(
    notice_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get the current status and AI results for a notice."""
    notice = db.query(models.Notice).filter(
        models.Notice.id == notice_id,
        models.Notice.firm_id == current_user.firm_id
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    proof_object = None
    if notice.proof_object:
        po = notice.proof_object
        claim_items = [schemas.ClaimItem(**item) for item in (po.claim_items or [])]
        proof_object = schemas.ProofObjectOut(
            id=po.id,
            notice_id=po.notice_id,
            claim_items=claim_items,
            root_cause=po.root_cause,
            total_discrepancy=po.total_discrepancy or 0,
            overall_confidence=po.overall_confidence or 0,
            data_sources_used=po.data_sources_used,
            generated_at=po.generated_at,
        )

    return schemas.PipelineStatus(
        notice_id=notice_id,
        status=notice.status,
        current_stage=str(notice.status),
        proof_object=proof_object,
        strategy=str(notice.ai_strategy) if notice.ai_strategy else None,
        strategy_reasoning=notice.ai_strategy_reasoning,
        draft_response=notice.ai_draft_response,
        doc_checklist=notice.ai_doc_checklist,
    )


@router.post("/{notice_id}/approve")
def approve_notice(
    notice_id: str,
    payload: schemas.ApproveNotice,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """CA approves, edits, or escalates a notice draft."""
    notice = db.query(models.Notice).filter(
        models.Notice.id == notice_id,
        models.Notice.firm_id == current_user.firm_id
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    if payload.action == "approve":
        if payload.edited_draft:
            notice.ai_draft_response = payload.edited_draft
        notice.status = models.NoticeStatus.SUBMITTED
        notice.submitted_at = datetime.utcnow()
        notice.ca_notes = payload.ca_notes
        action_label = "DRAFT_APPROVED"

    elif payload.action == "edit":
        notice.ai_draft_response = payload.edited_draft or notice.ai_draft_response
        notice.ca_notes = payload.ca_notes
        action_label = "DRAFT_EDITED"

    elif payload.action == "escalate":
        notice.status = models.NoticeStatus.PENDING_APPROVAL
        notice.ca_notes = payload.ca_notes
        action_label = "ESCALATED_MANUAL"

    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    db.add(models.AuditLog(
        firm_id=current_user.firm_id,
        notice_id=notice_id,
        user_id=current_user.id,
        action=action_label,
        details={"action": payload.action, "notes": payload.ca_notes},
    ))
    db.commit()
    return {"message": f"Notice {payload.action}d successfully", "status": str(notice.status)}


@router.delete("/{notice_id}")
def delete_notice(
    notice_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notice = db.query(models.Notice).filter(
        models.Notice.id == notice_id,
        models.Notice.firm_id == current_user.firm_id
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    db.delete(notice)
    db.commit()
    return {"message": "Notice deleted"}
