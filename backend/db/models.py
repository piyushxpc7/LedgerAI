import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Enum, ForeignKey,
    Text, Boolean, JSON, DECIMAL
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.sqlite import TEXT
from db.database import Base
import enum


def gen_uuid():
    return str(uuid.uuid4())


# ─── Enums ───────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    PARTNER = "PARTNER"
    SENIOR_CA = "SENIOR_CA"
    ARTICLE = "ARTICLE"


class NoticeStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    ANALYZING = "ANALYZING"
    DRAFT_READY = "DRAFT_READY"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    SUBMITTED = "SUBMITTED"
    RESOLVED = "RESOLVED"
    FAILED = "FAILED"


class NoticeSection(str, enum.Enum):
    S143_1 = "143(1)"
    S143_2 = "143(2)"
    S148 = "148"
    S148A = "148A"
    S154 = "154"
    S133_6 = "133(6)"
    S270A = "270A"
    S263 = "263"
    S264 = "264"
    S245 = "245"
    S221 = "221(1)"
    OTHER = "OTHER"


class NoticeType(str, enum.Enum):
    AIS_MISMATCH = "AIS_MISMATCH"
    TDS_CREDIT = "TDS_CREDIT"
    DEMAND_CONFIRMATION = "DEMAND_CONFIRMATION"
    SCRUTINY = "SCRUTINY"
    HIGH_VALUE_TXN = "HIGH_VALUE_TXN"
    INCOME_OMISSION = "INCOME_OMISSION"
    COMPUTATION_ERROR = "COMPUTATION_ERROR"
    RECTIFICATION = "RECTIFICATION"
    REASSESSMENT = "REASSESSMENT"
    PENALTY = "PENALTY"
    INTEREST = "INTEREST"
    OTHER = "OTHER"


class RootCause(str, enum.Enum):
    INCOME_OMISSION = "INCOME_OMISSION"
    TDS_MISMATCH = "TDS_MISMATCH"
    COMPUTATION_ERROR = "COMPUTATION_ERROR"
    DATA_ENTRY_ERROR = "DATA_ENTRY_ERROR"
    PORTAL_ERROR = "PORTAL_ERROR"
    GENUINE_LIABILITY = "GENUINE_LIABILITY"
    AIS_ERROR = "AIS_ERROR"


class ResolutionStrategy(str, enum.Enum):
    PAY_DEMAND = "PAY_DEMAND"
    FILE_154 = "FILE_154"
    REVISED_RETURN = "REVISED_RETURN"
    CONTEST = "CONTEST"
    PARTIAL_PAY = "PARTIAL_PAY"


class ResolutionOutcomeEnum(str, enum.Enum):
    DEMAND_DROPPED = "DEMAND_DROPPED"
    DEMAND_REDUCED = "DEMAND_REDUCED"
    DEMAND_UPHELD = "DEMAND_UPHELD"
    PENDING = "PENDING"


class AmountBracket(str, enum.Enum):
    UNDER_50K = "UNDER_50K"
    BETWEEN_50K_5L = "50K_TO_5L"
    BETWEEN_5L_50L = "5L_TO_50L"
    ABOVE_50L = "ABOVE_50L"


# ─── Models ──────────────────────────────────────────────────────────────────

class Firm(Base):
    __tablename__ = "firms"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    registration_number = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="firm")
    clients = relationship("Client", back_populates="firm")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.SENIOR_CA)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    firm = relationship("Firm", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")


class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, default=gen_uuid)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False)
    name = Column(String(255), nullable=False)
    pan = Column(String(10), nullable=False)
    dob = Column(String(10), nullable=True)   # DD/MM/YYYY for PDF decryption
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    firm = relationship("Firm", back_populates="clients")
    notices = relationship("Notice", back_populates="client")


class Notice(Base):
    __tablename__ = "notices"

    id = Column(String, primary_key=True, default=gen_uuid)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False)

    # Notice details
    assessment_year = Column(String(10), nullable=False)  # e.g. "2023-24"
    section = Column(Enum(NoticeSection), default=NoticeSection.OTHER)
    notice_type = Column(Enum(NoticeType), default=NoticeType.OTHER)
    mismatch_amount = Column(Float, nullable=True)
    demand_amount = Column(Float, nullable=True)
    deadline = Column(DateTime, nullable=True)
    status = Column(Enum(NoticeStatus), default=NoticeStatus.DETECTED)

    # Portal details
    portal_reference = Column(String(100), nullable=True)
    ao_name = Column(String(255), nullable=True)
    ao_ward = Column(String(100), nullable=True)
    ao_circle = Column(String(100), nullable=True)

    # File storage
    raw_pdf_path = Column(String(500), nullable=True)
    supporting_docs = Column(JSON, nullable=True)  # list of file paths

    # AI Results
    ai_strategy = Column(Enum(ResolutionStrategy), nullable=True)
    ai_strategy_reasoning = Column(Text, nullable=True)
    ai_draft_response = Column(Text, nullable=True)
    ai_doc_checklist = Column(JSON, nullable=True)
    agent_job_id = Column(String(100), nullable=True)

    # Timestamps
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)

    # Notes
    ca_notes = Column(Text, nullable=True)

    client = relationship("Client", back_populates="notices")
    proof_object = relationship("ProofObject", back_populates="notice", uselist=False)
    resolution_outcome = relationship("ResolutionOutcome", back_populates="notice", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="notice")


class ProofObject(Base):
    __tablename__ = "proof_objects"

    id = Column(String, primary_key=True, default=gen_uuid)
    notice_id = Column(String, ForeignKey("notices.id"), unique=True, nullable=False)

    # Evidence
    claim_items = Column(JSON, nullable=False)  # [{claim_description, claim_amount, source_document, source_line, our_value, match_confidence}]
    root_cause = Column(Enum(RootCause), nullable=True)
    total_discrepancy = Column(Float, default=0)
    overall_confidence = Column(Float, default=0)
    data_sources_used = Column(JSON, nullable=True)  # ["ITR", "26AS", "AIS"]

    # Raw extracted data
    notice_extracted_text = Column(Text, nullable=True)
    form_26as_data = Column(JSON, nullable=True)
    itr_data = Column(JSON, nullable=True)
    ais_data = Column(JSON, nullable=True)

    generated_at = Column(DateTime, default=datetime.utcnow)

    notice = relationship("Notice", back_populates="proof_object")


class ResolutionOutcome(Base):
    __tablename__ = "resolution_outcomes"

    id = Column(String, primary_key=True, default=gen_uuid)
    notice_id = Column(String, ForeignKey("notices.id"), unique=True, nullable=False)

    # Denormalized for fast querying (Resolution Intelligence)
    notice_type = Column(Enum(NoticeType), nullable=False)
    section = Column(Enum(NoticeSection), nullable=False)
    amount_bracket = Column(Enum(AmountBracket), nullable=True)
    strategy_used = Column(Enum(ResolutionStrategy), nullable=False)
    legal_arguments = Column(JSON, nullable=True)

    outcome = Column(Enum(ResolutionOutcomeEnum), default=ResolutionOutcomeEnum.PENDING)
    resolution_days = Column(Integer, nullable=True)
    ao_ward = Column(String(100), nullable=True)
    ao_circle = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    notice = relationship("Notice", back_populates="resolution_outcome")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    firm_id = Column(String, ForeignKey("firms.id"), nullable=False)
    notice_id = Column(String, ForeignKey("notices.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)

    action = Column(String(100), nullable=False)  # e.g. "NOTICE_UPLOADED", "DRAFT_APPROVED"
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    notice = relationship("Notice", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")
