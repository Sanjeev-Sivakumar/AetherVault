import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime, Text, JSON, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # AICTE_ADMIN, AICTE_APPROVER, AICTE_SCRUTINY_OFFICER, INSTITUTION_USER, BANK_OFFICER
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)
    bank_code = Column(String(50), nullable=True)  # e.g., 'SBI', 'PNB', 'HDFC'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    institution = relationship("Institution", back_populates="users")


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    aicte_permanent_id = Column(String(100), unique=True, index=True, nullable=False)  # e.g. 1-10928374
    name = Column(String(255), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False)
    institution_type = Column(String(100), nullable=False)  # Engineering & Technology, Management, Pharmacy, Polytechnic
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=True)
    nodal_officer = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="institution")
    fdrs = relationship("FDRInstrument", back_populates="institution")
    release_requests = relationship("ReleaseRefundRequest", back_populates="institution")


class FDRInstrument(Base):
    __tablename__ = "fdr_instruments"

    id = Column(Integer, primary_key=True, index=True)
    fdr_number = Column(String(100), unique=True, index=True, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)

    issuing_bank_name = Column(String(150), nullable=False, index=True)
    branch_name = Column(String(150), nullable=False)
    ifsc_code = Column(String(50), nullable=False, index=True)
    account_number = Column(String(100), nullable=False)

    principal_amount = Column(Float, nullable=False)
    maturity_amount = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)

    issue_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=False, index=True)
    term_months = Column(Integer, nullable=False)

    lien_marked = Column(Boolean, default=True)  # Lien in favor of Member Secretary / Regional Officer AICTE
    joint_account_title = Column(String(255), nullable=False)

    lifecycle_status = Column(String(50), default="SUBMITTED", index=True)
    # SUBMITTED, UNDER_SCRUTINY, BANK_VERIFICATION_PENDING, BANK_VERIFIED, DISCREPANCY_FLAGGED,
    # ACTIVE, EXPIRING_SOON, MATURED, RENEWAL_SUBMITTED, REPLACED, RELEASE_REQUESTED, RELEASE_APPROVED, RELEASED

    document_path = Column(String(500), nullable=True)
    document_sha256 = Column(String(100), nullable=True)
    is_encrypted = Column(Boolean, default=True)
    original_filename = Column(String(255), nullable=True)

    parent_fdr_id = Column(Integer, ForeignKey("fdr_instruments.id", ondelete="SET NULL"), nullable=True)
    renewal_count = Column(Integer, default=0)

    # Three-way data storage
    submitted_data = Column(JSON, default=dict)
    ocr_data = Column(JSON, default=dict)
    bank_verified_data = Column(JSON, default=dict)
    discrepancy_details = Column(JSON, default=list)

    scrutiny_notes = Column(Text, nullable=True)
    approver_notes = Column(Text, nullable=True)
    scrutinized_by = Column(String(150), nullable=True)
    approved_by = Column(String(150), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    institution = relationship("Institution", back_populates="fdrs")
    renewals = relationship("FDRRenewalHistory", foreign_keys="FDRRenewalHistory.original_fdr_id", back_populates="original_fdr")
    release_requests = relationship("ReleaseRefundRequest", back_populates="fdr")

    @property
    def document_encrypted_path(self):
        return self.document_path

    @document_encrypted_path.setter
    def document_encrypted_path(self, val):
        self.document_path = val

    @property
    def document_hash(self):
        return self.document_sha256

    @document_hash.setter
    def document_hash(self, val):
        self.document_sha256 = val

    @property
    def scrutiny_remarks(self):
        return self.scrutiny_notes

    @scrutiny_remarks.setter
    def scrutiny_remarks(self, val):
        self.scrutiny_notes = val

    @property
    def scrutiny_officer_id(self):
        return self.scrutinized_by

    @scrutiny_officer_id.setter
    def scrutiny_officer_id(self, val):
        self.scrutinized_by = str(val) if val else None

    @property
    def approver_id(self):
        return self.approved_by

    @approver_id.setter
    def approver_id(self, val):
        self.approved_by = str(val) if val else None

    @property
    def approver_remarks(self):
        return self.approver_notes

    @approver_remarks.setter
    def approver_remarks(self, val):
        self.approver_notes = val

    @property
    def bank_verification_ref(self):
        return (self.bank_verified_data or {}).get("sfms_reference_id")

    @bank_verification_ref.setter
    def bank_verification_ref(self, val):
        if not self.bank_verified_data:
            self.bank_verified_data = {}
        data = dict(self.bank_verified_data)
        data["sfms_reference_id"] = val
        self.bank_verified_data = data


class FDRRenewalHistory(Base):
    __tablename__ = "fdr_renewal_history"

    id = Column(Integer, primary_key=True, index=True)
    original_fdr_id = Column(Integer, ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False)
    new_fdr_id = Column(Integer, ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False)
    renewal_date = Column(Date, nullable=False)
    extended_maturity_date = Column(Date, nullable=False)
    revised_amount = Column(Float, nullable=False)
    officer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    original_fdr = relationship("FDRInstrument", foreign_keys=[original_fdr_id], back_populates="renewals")
    new_fdr = relationship("FDRInstrument", foreign_keys=[new_fdr_id])


class ReleaseRefundRequest(Base):
    __tablename__ = "release_refund_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_reference_no = Column(String(100), unique=True, index=True, nullable=False)
    fdr_id = Column(Integer, ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)

    request_date = Column(Date, nullable=False)
    justification_type = Column(String(100), nullable=False)  # COURSE_CLOSURE, 10_YEAR_EXPIRY, INSTITUTION_CLOSURE, NORMS_FULFILLMENT
    justification_details = Column(Text, nullable=False)

    refund_account_no = Column(String(100), nullable=False)
    refund_bank_ifsc = Column(String(50), nullable=False)
    refund_bank_name = Column(String(150), nullable=False)

    status = Column(String(50), default="PENDING_SCRUTINY", index=True)
    # PENDING_SCRUTINY, SCRUTINY_RECOMMENDED, SCRUTINY_REJECTED, APPROVED_BY_COUNCIL, DISCHARGED_REFUNDED, REJECTED

    scrutiny_remarks = Column(Text, nullable=True)
    approver_remarks = Column(Text, nullable=True)
    discharge_voucher_no = Column(String(100), nullable=True)
    discharge_date = Column(Date, nullable=True)
    discharge_amount = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    fdr = relationship("FDRInstrument", back_populates="release_requests")
    institution = relationship("Institution", back_populates="release_requests")

    @property
    def reason(self):
        return self.justification_details

    @reason.setter
    def reason(self, val):
        self.justification_details = val

    @property
    def amount_claimed(self):
        return self.discharge_amount or (self.fdr.principal_amount if self.fdr else 0.0)

    @amount_claimed.setter
    def amount_claimed(self, val):
        self.discharge_amount = val

    @property
    def requester_id(self):
        return None

    @requester_id.setter
    def requester_id(self, val):
        pass


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_index = Column(Integer, unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    action = Column(String(100), nullable=False, index=True)
    # FDR_SUBMISSION, OCR_ANALYSIS, SCRUTINY_PASS, SCRUTINY_FLAG, BANK_VERIFIED,
    # FDR_ACTIVATED, FDR_RENEWED, RELEASE_REQUESTED, RELEASE_APPROVED, REPORT_EXPORT
    performed_by_id = Column(Integer, nullable=True)
    performed_by_name = Column(String(150), nullable=False)
    performed_by_role = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)  # FDR, INSTITUTION, RELEASE, USER
    entity_id = Column(String(100), nullable=False)
    previous_hash = Column(String(100), nullable=False)
    current_hash = Column(String(100), nullable=False, index=True)
    payload = Column(JSON, default=dict)
    ip_address = Column(String(50), default="127.0.0.1")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    target_role = Column(String(50), nullable=True)  # If null, targeted to specific user
    user_id = Column(Integer, nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="SYSTEM")  # MATURITY_ALERT, VERIFICATION, DISCREPANCY, RELEASE, REMINDER
    fdr_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"

    id = Column(Integer, primary_key=True, index=True)
    workflow_name = Column(String(150), nullable=False, index=True)
    trigger_event = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="SUCCESS", index=True)  # SUCCESS, FAILED, RETRYING, PENDING
    execution_time_ms = Column(Float, default=120.0)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    n8n_execution_id = Column(String(100), nullable=True)
    payload = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AutomationFailureQueue(Base):
    __tablename__ = "automation_failure_queue"

    id = Column(Integer, primary_key=True, index=True)
    workflow_name = Column(String(150), nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, default=dict)
    error_reason = Column(Text, nullable=False)
    attempts = Column(Integer, default=1)
    max_attempts = Column(Integer, default=3)
    status = Column(String(50), default="QUEUED", index=True)  # QUEUED, RESOLVED, EXHAUSTED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    @property
    def webhook_path(self):
        return self.workflow_name or self.event_type

    @webhook_path.setter
    def webhook_path(self, val):
        self.workflow_name = val


class ReminderConfig(Base):
    __tablename__ = "reminder_configs"

    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String(100), nullable=False)
    days_before_maturity = Column(Integer, nullable=False, unique=True)  # 60, 30, 15, 7, 0
    is_active = Column(Boolean, default=True)
    channels = Column(JSON, default=list)  # ["EMAIL", "IN_APP", "WHATSAPP", "VOICE"]
    escalation_grace_days = Column(Integer, default=7)
    recipient_roles = Column(JSON, default=list)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    @property
    def days_before(self):
        return self.days_before_maturity

    @days_before.setter
    def days_before(self, val):
        self.days_before_maturity = val

    @property
    def channel_smtp(self):
        ch = self.channels or []
        return "EMAIL" in ch or "SMTP" in ch

    @channel_smtp.setter
    def channel_smtp(self, val):
        ch = list(self.channels or [])
        if val and "EMAIL" not in ch:
            ch.append("EMAIL")
        elif not val and "EMAIL" in ch:
            ch.remove("EMAIL")
        self.channels = ch

    @property
    def channel_whatsapp(self):
        ch = self.channels or []
        return "WHATSAPP" in ch

    @channel_whatsapp.setter
    def channel_whatsapp(self, val):
        ch = list(self.channels or [])
        if val and "WHATSAPP" not in ch:
            ch.append("WHATSAPP")
        elif not val and "WHATSAPP" in ch:
            ch.remove("WHATSAPP")
        self.channels = ch

    @property
    def channel_ivr(self):
        ch = self.channels or []
        return "VOICE" in ch or "IVR" in ch

    @channel_ivr.setter
    def channel_ivr(self, val):
        ch = list(self.channels or [])
        if val and "VOICE" not in ch:
            ch.append("VOICE")
        elif not val and "VOICE" in ch:
            ch.remove("VOICE")
        self.channels = ch


class InstrumentVersionHistory(Base):
    __tablename__ = "instrument_version_history"

    id = Column(Integer, primary_key=True, index=True)
    fdr_id = Column(Integer, ForeignKey("fdr_instruments.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    snapshot_data = Column(JSON, nullable=False)
    change_action = Column(String(100), nullable=False)
    changed_by_user = Column(String(150), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class NotificationDeliveryLog(Base):
    __tablename__ = "notification_delivery_logs"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(100), unique=True, index=True, nullable=False)
    channel = Column(String(50), nullable=False, index=True)  # SMTP, WHATSAPP, VOICE_SMS, IN_APP
    recipient = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    content_snippet = Column(Text, nullable=True)
    delivery_status = Column(String(50), default="DELIVERED", index=True)  # DELIVERED, FALLBACK_LOGGED, FAILED
    error_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

