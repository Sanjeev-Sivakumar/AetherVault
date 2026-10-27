from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    full_name: str
    role: str
    institution_id: Optional[int] = None
    bank_code: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str
    institution_id: Optional[int] = None
    bank_code: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    institution_id: Optional[int] = None
    bank_code: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Institution ---
class InstitutionBase(BaseModel):
    aicte_permanent_id: str
    name: str
    state: str
    district: str
    institution_type: str
    contact_email: str
    contact_phone: str
    address: Optional[str] = None
    nodal_officer: Optional[str] = None

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionResponse(InstitutionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- FDR Instrument ---
class FDRCreate(BaseModel):
    fdr_number: str
    institution_id: int
    issuing_bank_name: str
    branch_name: str
    ifsc_code: str
    account_number: str
    principal_amount: float
    maturity_amount: float
    interest_rate: float
    issue_date: date
    maturity_date: date
    term_months: int
    lien_marked: bool = True
    joint_account_title: str

class FDRResponse(BaseModel):
    id: int
    fdr_number: str
    institution_id: int
    institution_name: Optional[str] = None
    aicte_permanent_id: Optional[str] = None
    issuing_bank_name: str
    branch_name: str
    ifsc_code: str
    account_number: str
    principal_amount: float
    maturity_amount: float
    interest_rate: float
    issue_date: date
    maturity_date: date
    term_months: int
    lien_marked: bool
    joint_account_title: str
    lifecycle_status: str
    document_path: Optional[str] = None
    document_sha256: Optional[str] = None
    is_encrypted: bool
    original_filename: Optional[str] = None
    parent_fdr_id: Optional[int] = None
    renewal_count: int
    submitted_data: Dict[str, Any]
    ocr_data: Dict[str, Any]
    bank_verified_data: Dict[str, Any]
    discrepancy_details: List[Any]
    scrutiny_notes: Optional[str] = None
    approver_notes: Optional[str] = None
    scrutinized_by: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FDRScrutinyAction(BaseModel):
    action: str  # "PASS_TO_BANK_VERIFICATION", "FLAG_DISCREPANCY", "REQUEST_RESUBMISSION"
    notes: Optional[str] = None

class BankVerifyAction(BaseModel):
    is_valid: bool
    bank_confirmation_ref: str
    verification_mode: str = "SFMS_QUERY"  # "SFMS_QUERY", "API_INTEGRATION", "MANUAL_BRANCH_LETTER"
    officer_name: str
    lien_confirmed: bool = True
    remarks: Optional[str] = None

class FDRApprovalAction(BaseModel):
    action: str  # "APPROVE_ACTIVATION", "REJECT"
    notes: Optional[str] = None

class FDRRenewalRequest(BaseModel):
    new_fdr_number: str
    new_issue_date: date
    new_maturity_date: date
    new_principal_amount: float
    new_maturity_amount: float
    new_interest_rate: float
    new_term_months: int
    officer_notes: Optional[str] = None

# --- Release / Refund ---
class ReleaseRefundCreate(BaseModel):
    fdr_id: int
    justification_type: str
    justification_details: str
    refund_account_no: str
    refund_bank_ifsc: str
    refund_bank_name: str

class ReleaseScrutinyAction(BaseModel):
    action: str  # "RECOMMEND_APPROVAL", "REJECT"
    remarks: str

class ReleaseApprovalAction(BaseModel):
    action: str  # "COUNCIL_APPROVE", "REJECT", "DISCHARGE_EXECUTE"
    remarks: str
    discharge_voucher_no: Optional[str] = None
    discharge_amount: Optional[float] = None

class ReleaseRefundResponse(BaseModel):
    id: int
    request_reference_no: str
    fdr_id: int
    fdr_number: Optional[str] = None
    institution_id: int
    institution_name: Optional[str] = None
    request_date: date
    justification_type: str
    justification_details: str
    refund_account_no: str
    refund_bank_ifsc: str
    refund_bank_name: str
    status: str
    scrutiny_remarks: Optional[str] = None
    approver_remarks: Optional[str] = None
    discharge_voucher_no: Optional[str] = None
    discharge_date: Optional[date] = None
    discharge_amount: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Dashboard & Stats ---
class DashboardMetrics(BaseModel):
    total_fdrs: int
    total_deposit_value: float
    active_count: int
    expiring_soon_count: int
    matured_count: int
    pending_scrutiny_count: int
    pending_bank_verification_count: int
    discrepancy_count: int
    renewal_pending_count: int
    release_requests_pending: int
    total_institutions: int
    state_distribution: List[Dict[str, Any]]
    status_distribution: List[Dict[str, Any]]
    bank_distribution: List[Dict[str, Any]]
    upcoming_maturities: List[Dict[str, Any]]

# --- Audit Log ---
class AuditLogResponse(BaseModel):
    id: int
    log_index: int
    timestamp: datetime
    action: str
    performed_by_name: str
    performed_by_role: str
    entity_type: str
    entity_id: str
    previous_hash: str
    current_hash: str
    payload: Dict[str, Any]
    ip_address: str

    class Config:
        from_attributes = True

# --- Notification ---
class NotificationResponse(BaseModel):
    id: int
    target_role: Optional[str] = None
    user_id: Optional[int] = None
    title: str
    message: str
    category: str
    fdr_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ReminderConfigRule(BaseModel):
    days_before: int
    channel_smtp: bool = True
    channel_whatsapp: bool = True
    channel_ivr: bool = False
    is_active: bool = True

