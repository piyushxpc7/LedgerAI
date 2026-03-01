"""FastAPI dashboard and analytics routes."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from db.database import get_db
from db import models, schemas
from core.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    firm_id = current_user.firm_id

    # Total notices
    total_notices = db.query(func.count(models.Notice.id)).filter(
        models.Notice.firm_id == firm_id
    ).scalar()

    # Pending approval
    pending_approval = db.query(func.count(models.Notice.id)).filter(
        models.Notice.firm_id == firm_id,
        models.Notice.status == models.NoticeStatus.PENDING_APPROVAL
    ).scalar()

    # Resolved this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    resolved_this_month = db.query(func.count(models.Notice.id)).filter(
        models.Notice.firm_id == firm_id,
        models.Notice.status == models.NoticeStatus.RESOLVED,
        models.Notice.resolved_at >= month_start
    ).scalar()

    # Active clients
    active_clients = db.query(func.count(models.Client.id)).filter(
        models.Client.firm_id == firm_id,
        models.Client.is_active == True
    ).scalar()

    # Notices by status
    status_counts = db.query(
        models.Notice.status, func.count(models.Notice.id)
    ).filter(
        models.Notice.firm_id == firm_id
    ).group_by(models.Notice.status).all()
    notices_by_status = {s.value: c for s, c in status_counts}


    # Deadline urgency — next 30 days
    now = datetime.utcnow()
    urgent = db.query(func.count(models.Notice.id)).filter(
        models.Notice.firm_id == firm_id,
        models.Notice.deadline != None,
        models.Notice.deadline <= now + timedelta(days=7),
        models.Notice.status.notin_([models.NoticeStatus.SUBMITTED, models.NoticeStatus.RESOLVED])
    ).scalar()

    # Recent notices (last 10)
    recent = db.query(models.Notice).filter(
        models.Notice.firm_id == firm_id
    ).order_by(desc(models.Notice.detected_at)).limit(10).all()

    recent_out = []
    for n in recent:
        out = schemas.NoticeOut.model_validate(n)
        if n.client:
            out.client_name = n.client.name
            out.client_pan = n.client.pan
        recent_out.append(out)

    return {
        "total_notices": total_notices,
        "pending_approval": pending_approval,
        "resolved_this_month": resolved_this_month,
        "active_clients": active_clients,
        "notices_by_status": notices_by_status,
        "urgent_deadlines": urgent,
        "recent_notices": recent_out,
    }


@router.get("/intelligence")
def get_intelligence(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Resolution Intelligence stats for the dashboard."""
    firm_id = current_user.firm_id

    # Strategy distribution
    strategy_counts = db.query(
        models.Notice.ai_strategy, func.count(models.Notice.id)
    ).filter(
        models.Notice.firm_id == firm_id,
        models.Notice.ai_strategy != None
    ).group_by(models.Notice.ai_strategy).all()
    strategies = {s.value if s else 'UNKNOWN': c for s, c in strategy_counts}

    # Notice type distribution
    type_counts = db.query(
        models.Notice.notice_type, func.count(models.Notice.id)
    ).filter(
        models.Notice.firm_id == firm_id
    ).group_by(models.Notice.notice_type).all()
    notice_types = {t.value if t else 'UNKNOWN': c for t, c in type_counts}

    # Section distribution
    section_counts = db.query(
        models.Notice.section, func.count(models.Notice.id)
    ).filter(
        models.Notice.firm_id == firm_id
    ).group_by(models.Notice.section).all()
    sections = {s.value if s else 'UNKNOWN': c for s, c in section_counts}

    return {
        "strategies": strategies,
        "notice_types": notice_types,
        "sections": sections,
        "disclaimer": "Resolution Intelligence data grows with every notice resolved.",
    }
