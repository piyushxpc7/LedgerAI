from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from db.models import (
    UserRole, NoticeStatus, NoticeSection, NoticeType,
    ResolutionStrategy, ResolutionOutcomeEnum, AmountBracket, RootCause
)


# ─── Auth ────────────────────────────────────────────────────────────────────

class FirmRegister(BaseModel):
    firm_name: str
    name: Optional[str] = None  # CA's own name (falls back to firm_name)
    email: str
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ForgotPassword(BaseModel):
    email: str

class ResetPassword(BaseModel):
    token: str
    new_password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    firm_id: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ─── Client ──────────────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    pan: str = Field(..., min_length=10, max_length=10, pattern="^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
    dob: Optional[str] = None   # DD/MM/YYYY
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class ClientOut(BaseModel):
    id: str
    name: str
    pan: str
    dob: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    is_active: bool
    created_at: datetime
    notice_count: Optional[int] = 0
    class Config:
        from_attributes = True


# ─── Notice ──────────────────────────────────────────────────────────────────

class NoticeCreate(BaseModel):
    client_id: str
    assessment_year: str
    section: Optional[NoticeSection] = NoticeSection.OTHER
    notice_type: Optional[NoticeType] = NoticeType.OTHER
    mismatch_amount: Optional[float] = None
    deadline: Optional[datetime] = None
    portal_reference: Optional[str] = None

class NoticeOut(BaseModel):
    id: str
    client_id: str
    client_name: Optional[str] = None
    client_pan: Optional[str] = None
    assessment_year: str
    section: NoticeSection
    notice_type: NoticeType
    mismatch_amount: Optional[float]
    demand_amount: Optional[float]
    deadline: Optional[datetime]
    status: NoticeStatus
    portal_reference: Optional[str]
    ao_name: Optional[str]
    ai_strategy: Optional[ResolutionStrategy]
    ai_draft_response: Optional[str]
    detected_at: datetime
    resolved_at: Optional[datetime]
    class Config:
        from_attributes = True


# ─── Proof Object ─────────────────────────────────────────────────────────────

class ClaimItem(BaseModel):
    claim_description: str
    claim_amount: float
    source_document: str
    source_line: Optional[str] = None
    our_value: Optional[float] = None
    match_confidence: float  # 0.0 to 1.0
    discrepancy: Optional[float] = None
    status: str = "MISMATCH"  # MATCH | MISMATCH | UNKNOWN

class ProofObjectOut(BaseModel):
    id: str
    notice_id: str
    claim_items: List[ClaimItem]
    root_cause: Optional[RootCause]
    total_discrepancy: float
    overall_confidence: float
    data_sources_used: Optional[List[str]]
    generated_at: datetime
    class Config:
        from_attributes = True


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_notices: int
    pending_approval: int
    resolved_this_month: int
    active_clients: int
    notices_by_status: dict
    recent_notices: List[NoticeOut]


# ─── Upload ──────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    notice_id: str
    message: str
    file_path: str


# ─── Pipeline ────────────────────────────────────────────────────────────────

class PipelineStatus(BaseModel):
    notice_id: str
    status: NoticeStatus
    current_stage: Optional[str] = None
    proof_object: Optional[ProofObjectOut] = None
    strategy: Optional[str] = None
    strategy_reasoning: Optional[str] = None
    draft_response: Optional[str] = None
    doc_checklist: Optional[List[str]] = None
    error: Optional[str] = None

class ApproveNotice(BaseModel):
    action: str  # "approve" | "edit" | "escalate"
    edited_draft: Optional[str] = None
    ca_notes: Optional[str] = None


# ─── Resolution Intelligence ─────────────────────────────────────────────────

class StrategyStats(BaseModel):
    strategy: ResolutionStrategy
    total_cases: int
    success_rate: float
    avg_resolution_days: float

class NoticeTypeStats(BaseModel):
    notice_type: NoticeType
    total: int
    resolved: int
    drop_rate: float
    strategies: List[StrategyStats]
