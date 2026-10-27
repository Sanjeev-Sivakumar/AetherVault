import os
import io
import csv
import json
import time
import random
import datetime
import asyncio
import secrets
import hmac
import hashlib
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from fastapi import (
    FastAPI, Depends, HTTPException, status, UploadFile, File, Form,
    WebSocket, WebSocketDisconnect, Request, Query
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_, and_

from .database import engine, Base, get_db, SessionLocal
from .models import (
    User, Institution, FDRInstrument, FDRRenewalHistory, ReleaseRefundRequest, AuditLog,
    Notification, WorkflowExecution, AutomationFailureQueue, ReminderConfig,
    InstrumentVersionHistory, NotificationDeliveryLog
)
from .schemas import (
    UserLogin, Token, UserResponse, InstitutionCreate,
    InstitutionResponse, FDRCreate, FDRResponse, FDRScrutinyAction,
    BankVerifyAction, FDRApprovalAction, FDRRenewalRequest, ReleaseRefundCreate,
    ReleaseScrutinyAction, ReleaseApprovalAction, ReleaseRefundResponse,
    ReminderConfigRule
)
from .auth import verify_password, hash_password, create_access_token, get_current_user, require_roles
from .crypto import encrypt_bytes, decrypt_bytes, compute_audit_hash, calculate_file_hash
from .ocr_engine import (
    inspect_document_quality, extract_fdr_fields_from_ocr,
    generate_three_way_reconciliation, scrutinize_aicte_lock_in_clause,
    audit_mathematical_consistency, perform_error_level_analysis,
    inspect_metadata_forensics, gemini_regulatory_audit,
    get_gemini_client, scrutinize_fdr_with_gemini
)
from .bank_service import query_bank_sfms_cbs, verify_branch_letter, generate_encrypted_financial_token
from .email_service import send_email_alert, send_smtp_email
from .n8n_bridge import trigger_n8n_workflow, N8N_ENGINE_URL, N8N_SECRET_TOKEN
from .legal_bundle import generate_court_ready_bundle_pdf
from .seed_data import seed_database

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AetherVault — AICTE Security Deposit & FDR Management Portal",
    description="Regulatory Portal for All India Council for Technical Education (AICTE)",
    version="2.0.0"
)

@app.on_event("startup")
def startup_event():
    seed_database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage_vault")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "AetherVault-Backend", "version": "2.0.0"}

# ----------------- WebSocket Connection Manager -----------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ----------------- Audit Trail & Notification Helpers -----------------
def log_audit_trail(db: Session, action: str, user_name: str, user_role: str, entity_type: str, entity_id: str, payload: dict, user_id: Optional[Any] = None):
    last_log = db.query(AuditLog).order_by(desc(AuditLog.log_index)).first()
    prev_hash = last_log.current_hash if last_log and last_log.current_hash else "GENESIS_ROOT_HASH_2026_AICTE"
    max_idx = db.query(func.max(AuditLog.log_index)).scalar() or 0
    next_index = max_idx + 1
    payload_str = json.dumps(payload, default=str)
    curr_hash = compute_audit_hash(prev_hash, action, user_name, entity_type, str(entity_id), payload_str)
    
    p_id = None
    try:
        p_id = int(user_id) if user_id is not None else None
    except Exception:
        p_id = None

    log = AuditLog(
        log_index=next_index,
        action=action,
        performed_by_name=user_name,
        performed_by_role=user_role,
        entity_type=entity_type,
        entity_id=str(entity_id),
        previous_hash=prev_hash,
        current_hash=curr_hash,
        payload=payload,
        performed_by_id=p_id
    )
    db.add(log)
    db.commit()

def create_notification(db: Session, title: str, message: str, notif_type: str, target_role: Optional[str] = None, user_id: Optional[Any] = None, fdr_id: Optional[Any] = None):
    u_id = None
    f_id = None
    try:
        u_id = int(user_id) if user_id is not None else None
    except Exception:
        pass
    try:
        f_id = int(fdr_id) if fdr_id is not None else None
    except Exception:
        pass

    notif = Notification(
        title=title,
        message=message,
        category=notif_type,
        target_role=target_role,
        user_id=u_id,
        fdr_id=f_id
    )
    db.add(notif)
    db.commit()

def serialize_fdr(fdr: FDRInstrument) -> dict:
    if not fdr:
        return {}
    return {
        "id": fdr.id,
        "fdr_number": fdr.fdr_number,
        "institution_id": fdr.institution_id,
        "issuing_bank_name": fdr.issuing_bank_name,
        "branch_name": fdr.branch_name,
        "ifsc_code": fdr.ifsc_code,
        "account_number": fdr.account_number,
        "principal_amount": fdr.principal_amount,
        "maturity_amount": fdr.maturity_amount,
        "interest_rate": fdr.interest_rate,
        "issue_date": str(fdr.issue_date),
        "maturity_date": str(fdr.maturity_date),
        "term_months": fdr.term_months,
        "lien_marked": fdr.lien_marked,
        "joint_account_title": fdr.joint_account_title,
        "lifecycle_status": fdr.lifecycle_status,
        "document_path": fdr.document_path,
        "document_sha256": fdr.document_sha256,
        "is_encrypted": fdr.is_encrypted,
        "original_filename": fdr.original_filename,
        "parent_fdr_id": fdr.parent_fdr_id,
        "renewal_count": fdr.renewal_count,
        "submitted_data": fdr.submitted_data or {},
        "ocr_data": fdr.ocr_data or {},
        "bank_verified_data": fdr.bank_verified_data or {},
        "discrepancy_details": fdr.discrepancy_details or [],
        "scrutiny_notes": fdr.scrutiny_notes,
        "approver_notes": fdr.approver_notes,
        "scrutinized_by": fdr.scrutinized_by,
        "approved_by": fdr.approved_by,
        "created_at": str(fdr.created_at),
        "updated_at": str(fdr.updated_at)
    }

def serialize_release(rel: ReleaseRefundRequest) -> dict:
    if not rel:
        return {}
    return {
        "id": rel.id,
        "request_reference_no": rel.request_reference_no,
        "fdr_id": rel.fdr_id,
        "institution_id": rel.institution_id,
        "request_date": str(rel.request_date),
        "justification_type": rel.justification_type,
        "justification_details": rel.justification_details,
        "refund_account_no": rel.refund_account_no,
        "refund_bank_ifsc": rel.refund_bank_ifsc,
        "refund_bank_name": rel.refund_bank_name,
        "status": rel.status,
        "scrutiny_remarks": rel.scrutiny_remarks,
        "approver_remarks": rel.approver_remarks,
        "discharge_voucher_no": rel.discharge_voucher_no,
        "discharge_date": str(rel.discharge_date) if rel.discharge_date else None,
        "discharge_amount": rel.discharge_amount,
        "created_at": str(rel.created_at),
        "updated_at": str(rel.updated_at)
    }

# ----------------- Auth Endpoints -----------------
@app.post("/api/auth/login")
def login(creds: UserLogin, request: Request, db: Session = Depends(get_db)):
    uname = (creds.username or "").strip()
    candidates = [uname]
    if uname.endswith("1") and len(uname) > 1:
        candidates.append(uname[:-1])
    else:
        candidates.append(f"{uname}1")
    if uname in ["maker", "maker1"]:
        candidates.extend(["scrutiny", "scrutiny1"])
    if uname in ["checker", "checker1"]:
        candidates.extend(["approver", "approver1"])
    if uname in ["bank", "bank1", "bankofficer"]:
        candidates.extend(["bank_officer", "bank_officer1"])
    
    user = db.query(User).filter(User.username.in_(candidates)).first()
    client_ip = request.client.host if (request and request.client) else "127.0.0.1"

    if not user or not verify_password(creds.password, user.hashed_password):
        try:
            log_audit_trail(
                db=db,
                action="SECURITY_LOGIN_FAILED_ATTEMPT",
                user_name=creds.username,
                user_role="UNAUTHENTICATED",
                entity_type="SECURITY_AUTH",
                entity_id=creds.username,
                payload={
                    "event": "FAILED_CREDENTIALS_REJECTED",
                    "attempted_username": creds.username,
                    "client_ip": client_ip,
                    "timestamp": datetime.datetime.utcnow().isoformat(),
                    "security_status": "ACCESS_DENIED"
                }
            )
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Cryptographic Security Operations
    session_id = f"SEC-{secrets.token_hex(8).upper()}"
    sec_key = os.getenv("JWT_SECRET", "aethervault-super-secure-jwt-secret-key-2026-aicte")
    session_signature = hmac.new(
        sec_key.encode("utf-8"),
        f"{user.id}:{user.username}:{session_id}:{int(time.time())}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    token = create_access_token({
        "sub": user.username,
        "role": user.role,
        "id": user.id,
        "session_id": session_id,
        "sec_sig": session_signature[:16]
    })

    # Reflect security operations directly in database SHA-256 Audit Ledger
    log_audit_trail(
        db=db,
        action="SECURITY_LOGIN_AUTHENTICATED",
        user_name=user.full_name,
        user_role=user.role,
        entity_type="USER_SECURITY_SESSION",
        entity_id=str(user.id),
        payload={
            "event": "CRYPTOGRAPHIC_LOGIN_AUTHENTICATION",
            "session_id": session_id,
            "session_signature": session_signature,
            "encryption_cipher": "AES-256-GCM & SHA-256 Merkle Chain",
            "auth_algorithm": "PBKDF2_SHA256_SALTED_CREDENTIALS",
            "role": user.role,
            "client_ip": client_ip,
            "security_clearance": "GRANTED",
            "timestamp": datetime.datetime.utcnow().isoformat()
        },
        user_id=user.id
    )

    # Also log a notification in database
    create_notification(
        db=db,
        title=f"Security Session Active: {user.full_name}",
        message=f"Role [{user.role}] authenticated. Encrypted session [{session_id}] sealed into SHA-256 ledger.",
        notif_type="SECURITY",
        target_role=user.role,
        user_id=user.id
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "session_id": session_id,
        "session_signature": session_signature,
        "encryption_cipher": "AES-256-GCM & SHA-256 Merkle Chain",
        "audit_block_recorded": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "email": user.email,
            "institution_id": user.institution_id
        }
    }

@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "email": current_user.email,
        "institution_id": current_user.institution_id
    }

class InstitutionUserRegister(BaseModel):
    username: str
    password: str
    full_name: str
    email: str
    aicte_permanent_id: str
    institution_name: Optional[str] = None

@app.post("/api/auth/register-institution-user")
def register_institution_user(payload: InstitutionUserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username.strip()).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    inst = db.query(Institution).filter(Institution.aicte_permanent_id == payload.aicte_permanent_id.strip()).first()
    if not inst:
        inst = Institution(
            aicte_permanent_id=payload.aicte_permanent_id.strip(),
            name=payload.institution_name.strip() if payload.institution_name else "Technical Institution",
            state="Delhi",
            district="New Delhi",
            institution_type="Engineering & Technology",
            contact_email=payload.email.strip(),
            contact_phone="9876543210",
            nodal_officer=payload.full_name.strip()
        )
        db.add(inst)
        db.flush()
    
    hashed_pwd = hash_password(payload.password)
    user = User(
        username=payload.username.strip(),
        email=payload.email.strip(),
        full_name=payload.full_name.strip(),
        hashed_password=hashed_pwd,
        role="INSTITUTION_USER",
        institution_id=inst.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "email": user.email,
            "institution_id": user.institution_id
        }
    }

# ----------------- Institutions Endpoints -----------------
@app.get("/api/institutions")
def get_institutions(db: Session = Depends(get_db)):
    return db.query(Institution).all()

@app.post("/api/institutions")
def create_institution(idata: InstitutionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["AICTE_ADMIN"]))):
    existing = db.query(Institution).filter(Institution.aicte_permanent_id == idata.aicte_permanent_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Institution with this AICTE ID already exists")
    inst = Institution(**idata.dict())
    db.add(inst)
    db.commit()
    db.refresh(inst)
    log_audit_trail(db, "INSTITUTION_REGISTERED", current_user.full_name, current_user.role, "INSTITUTION", str(inst.id), idata.dict(), current_user.id)
    return inst

# ----------------- FDR Registry & Lifecycle -----------------
@app.get("/api/fdrs")
def get_fdrs(
    status: Optional[str] = None,
    bank: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(FDRInstrument)
    if current_user.role == "INSTITUTION_USER" and current_user.institution_id:
        q = q.filter(FDRInstrument.institution_id == current_user.institution_id)
    if status and status != "ALL":
        q = q.filter(FDRInstrument.lifecycle_status == status)
    if bank and bank != "ALL":
        q = q.filter(FDRInstrument.issuing_bank_name == bank)
    if search:
        s = f"%{search}%"
        q = q.filter(
            or_(
                FDRInstrument.fdr_number.ilike(s),
                FDRInstrument.branch_name.ilike(s),
                FDRInstrument.account_number.ilike(s),
                FDRInstrument.issuing_bank_name.ilike(s)
            )
        )
    return [serialize_fdr(f) for f in q.order_by(desc(FDRInstrument.created_at)).all()]

@app.post("/api/fdrs/extract-document")
async def extract_fdr_document(
    file: Optional[UploadFile] = File(None),
    use_sample: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Forensic OCR & Parameter Extraction Engine for Ingesting FDR Documents.
    Extracts all fields, runs Pixel ELA, checks AICTE Handbook clause, and eliminates manual typing.
    """
    file_bytes = b""
    original_filename = "sample_synthetic_fdr.png"

    if file and file.filename:
        file_bytes = await file.read()
        original_filename = file.filename
    else:
        sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_synthetic_fdr.png")
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as sf:
                file_bytes = sf.read()
        else:
            file_bytes = b"AICTE_SYNTHETIC_FDR_MOCK_PAYLOAD_35_LAKHS"

    file_hash = calculate_file_hash(file_bytes) if file_bytes else "GEN_HASH_SAMPLE"
    extracted_data = extract_fdr_fields_from_ocr(file_bytes, fallback_fdr_num="", is_sample=use_sample)

    # Determine default/matching institution
    matched_inst = None
    if current_user.role == "INSTITUTION_USER" and current_user.institution_id:
        matched_inst = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
    if not matched_inst:
        matched_inst = db.query(Institution).first()

    inst_id = str(matched_inst.id) if matched_inst else "1"
    inst_name = matched_inst.name if matched_inst else "Delhi Institute of Engineering & Technology"
    inst_aicte_id = matched_inst.aicte_permanent_id if matched_inst else "1-9087654321"

    # Log document scanning event to database audit trail
    try:
        log_audit_trail(
            db=db,
            action="FDR_DOCUMENT_EXTRACTED",
            user_name=current_user.full_name,
            user_role=current_user.role,
            entity_type="FDR_INGESTION_OCR",
            entity_id=extracted_data.get("fdr_number", "EXTRACT"),
            payload={
                "filename": original_filename,
                "file_sha256": file_hash,
                "confidence_score": extracted_data.get("confidence_score", 0.98),
                "tamper_detected": extracted_data.get("ela_forensics", {}).get("tamper_detected", False),
                "principal_amount": extracted_data.get("principal_amount"),
                "issuing_bank": extracted_data.get("bank_name"),
                "status": "OCR_PARAM_SYNTHESIS_SUCCESS"
            },
            user_id=current_user.id
        )
    except Exception:
        pass

    # If document was rejected by forensic analysis (e.g. non-FDR screenshot)
    if extracted_data.get("is_valid_fdr") is False:
        return {
            "success": False,
            "is_valid_fdr": False,
            "error": extracted_data.get("rejection_reason", "Uploaded document is not a recognized Fixed Deposit Receipt."),
            "detected_type": extracted_data.get("detected_document_type", "Non-FDR Document"),
            "extracted_data": None
        }

    return {
        "success": True,
        "is_valid_fdr": True,
        "extracted_data": {
            "fdr_number": extracted_data.get("fdr_number") or "",
            "institution_id": inst_id,
            "institution_name": inst_name,
            "aicte_permanent_id": inst_aicte_id,
            "issuing_bank_name": extracted_data.get("bank_name") or "",
            "branch_name": extracted_data.get("branch_name") or "",
            "ifsc_code": extracted_data.get("ifsc_code") or "",
            "account_number": extracted_data.get("account_number") or "",
            "principal_amount": extracted_data.get("principal_amount"),
            "maturity_amount": extracted_data.get("maturity_amount"),
            "interest_rate": extracted_data.get("interest_rate"),
            "issue_date": extracted_data.get("issue_date") or "",
            "maturity_date": extracted_data.get("maturity_date") or "",
            "term_months": extracted_data.get("term_months", 120),
            "joint_account_title": extracted_data.get("joint_title") or "",
            "confidence_score": extracted_data.get("confidence_score", 0.98),
            "tamper_detected": extracted_data.get("ela_forensics", {}).get("tamper_detected", False),
            "clause_verified": extracted_data.get("clause_scrutiny", {}).get("clause_present", True),
            "filename": original_filename,
            "document_sha256": file_hash
        }
    }

@app.get("/api/fdrs/{fdr_id}")
def get_fdr_by_id(fdr_id: str, db: Session = Depends(get_db)):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR instrument not found")
    return serialize_fdr(fdr)

@app.post("/api/fdrs/register")
async def register_fdr(
    fdr_number: str = Form(...),
    institution_id: int = Form(...),
    issuing_bank_name: str = Form(...),
    branch_name: str = Form(...),
    ifsc_code: str = Form(...),
    account_number: str = Form(...),
    principal_amount: float = Form(...),
    maturity_amount: float = Form(...),
    interest_rate: float = Form(...),
    issue_date: str = Form(...),
    maturity_date: str = Form(...),
    term_months: int = Form(120),
    joint_account_title: str = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    fdr_clean = fdr_number.strip()
    existing = db.query(FDRInstrument).filter(FDRInstrument.fdr_number == fdr_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"FDR instrument #{fdr_clean} already registered in portal.")

    encrypted_path = None
    file_hash = None
    ocr_data = {}
    original_filename = None
    
    if file:
        file_bytes = await file.read()
        file_hash = calculate_file_hash(file_bytes)
        enc_bytes = encrypt_bytes(file_bytes)
        safe_num = "".join([c if c.isalnum() else "_" for c in fdr_clean])
        original_filename = file.filename
        filename = f"{safe_num}_{int(time.time())}.enc"
        encrypted_path = os.path.join(UPLOAD_DIR, filename)
        with open(encrypted_path, "wb") as f:
            f.write(enc_bytes)
            
        # Comprehensive OCR & AI Forensics Check
        ocr_data = extract_fdr_fields_from_ocr(file_bytes, fallback_fdr_num=fdr_clean, is_sample=False)
        if ocr_data.get("is_valid_fdr") is False:
            if os.path.exists(encrypted_path):
                try:
                    os.remove(encrypted_path)
                except Exception:
                    pass
            raise HTTPException(
                status_code=400,
                detail=f"Registration rejected: Uploaded document is not a valid Fixed Deposit Receipt (detected: {ocr_data.get('detected_document_type', 'Invalid Document')}). AICTE lodgement requires an authentic Scheduled Commercial Bank term deposit receipt."
            )
    else:
        # Default fallback document
        sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_synthetic_fdr.png")
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as sf:
                s_bytes = sf.read()
                file_hash = calculate_file_hash(s_bytes)
                ocr_data = extract_fdr_fields_from_ocr(s_bytes, fallback_fdr_num=fdr_clean, is_sample=True)
                encrypted_path = "sample_synthetic_fdr.png"
                original_filename = "sample_synthetic_fdr.png"

    parsed_issue = datetime.date.fromisoformat(issue_date)
    parsed_maturity = datetime.date.fromisoformat(maturity_date)

    submitted_dict = {
        "fdr_number": fdr_clean,
        "institution_id": institution_id,
        "issuing_bank_name": issuing_bank_name.strip(),
        "branch_name": branch_name.strip(),
        "ifsc_code": ifsc_code.strip().upper(),
        "account_number": account_number.strip(),
        "principal_amount": principal_amount,
        "maturity_amount": maturity_amount,
        "interest_rate": interest_rate,
        "issue_date": str(parsed_issue),
        "maturity_date": str(parsed_maturity),
        "term_months": term_months,
        "joint_account_title": joint_account_title.strip()
    }

    fdr = FDRInstrument(
        fdr_number=fdr_clean,
        institution_id=institution_id,
        issuing_bank_name=issuing_bank_name.strip(),
        branch_name=branch_name.strip(),
        ifsc_code=ifsc_code.strip().upper(),
        account_number=account_number.strip(),
        principal_amount=principal_amount,
        maturity_amount=maturity_amount,
        interest_rate=interest_rate,
        issue_date=parsed_issue,
        maturity_date=parsed_maturity,
        term_months=term_months,
        lien_marked=True,
        joint_account_title=joint_account_title.strip(),
        document_path=encrypted_path,
        document_sha256=file_hash,
        is_encrypted=True,
        original_filename=original_filename,
        lifecycle_status="UNDER_SCRUTINY",
        submitted_data=submitted_dict,
        ocr_data=ocr_data,
        bank_verified_data={},
        discrepancy_details=[]
    )
    db.add(fdr)
    db.flush()

    # Initial Version History Snapshot
    vh = InstrumentVersionHistory(
        fdr_id=fdr.id,
        version_number=1,
        snapshot_data=submitted_dict,
        change_action="INITIAL_REGISTRATION",
        changed_by_user=current_user.full_name
    )
    db.add(vh)
    db.commit()

    log_audit_trail(db, "FDR_REGISTERED", current_user.full_name, current_user.role, "FDR", str(fdr.id), submitted_dict, current_user.id)
    create_notification(db, "New Deposit Submitted", f"FDR #{fdr_clean} submitted for scrutiny verification.", "REGISTRATION", "AICTE_SCRUTINY_OFFICER", fdr_id=fdr.id)

    # Trigger n8n Workflow 1 (FDR Submission)
    trigger_n8n_workflow("fdr-submitted", {"fdr_id": fdr.id, "fdr_number": fdr.fdr_number}, db)

    return serialize_fdr(fdr)

@app.post("/api/fdrs/bulk-csv")
async def bulk_csv_fdr_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["AICTE_ADMIN", "AICTE_SCRUTINY_OFFICER"]))
):
    content = await file.read()
    try:
        text_content = content.decode("utf-8-sig")
    except Exception:
        text_content = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_content))
    fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]

    required_headers = ["fdr_number", "aicte_permanent_id", "principal_amount", "maturity_date", "issuing_bank_name", "ifsc_code"]
    missing_headers = [h for h in required_headers if h not in fieldnames]
    if missing_headers:
        raise HTTPException(
            status_code=400,
            detail=f"Malformed CSV: Missing required headers: {', '.join(missing_headers)}"
        )

    accepted = []
    rejected = []
    seen_in_batch = set()

    # Remap reader to handle stripped/lowercased fieldnames
    row_list = list(reader)

    for idx, raw_row in enumerate(row_list, start=2):
        row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}
        fdr_num = row.get("fdr_number", "").strip()
        aicte_id = row.get("aicte_permanent_id", "").strip()

        if not fdr_num:
            rejected.append({"row_index": idx, "fdr_number": "N/A", "reason": "Missing mandatory FDR Reference Number", "raw": raw_row})
            continue
        if not aicte_id:
            rejected.append({"row_index": idx, "fdr_number": fdr_num, "reason": "Missing mandatory AICTE Permanent ID", "raw": raw_row})
            continue

        if fdr_num in seen_in_batch:
            rejected.append({"row_index": idx, "fdr_number": fdr_num, "reason": f"Duplicate FDR #{fdr_num} detected within upload file", "raw": raw_row})
            continue
        seen_in_batch.add(fdr_num)

        existing = db.query(FDRInstrument).filter(FDRInstrument.fdr_number == fdr_num).first()
        if existing:
            rejected.append({"row_index": idx, "fdr_number": fdr_num, "reason": f"FDR #{fdr_num} already exists in registry", "raw": raw_row})
            continue

        inst = db.query(Institution).filter(Institution.aicte_permanent_id == aicte_id).first()
        if not inst:
            rejected.append({"row_index": idx, "fdr_number": fdr_num, "reason": f"Institution ID '{aicte_id}' not found in AICTE directory", "raw": raw_row})
            continue

        try:
            p_amount = float(str(row.get("principal_amount", "0")).replace(",", ""))
            if p_amount <= 0:
                raise ValueError("Principal amount must be positive")
        except Exception as e:
            rejected.append({"row_index": idx, "fdr_number": fdr_num, "reason": f"Invalid principal amount: {e}", "raw": raw_row})
            continue

        try:
            issue_str = row.get("issue_date", "").strip() or str(datetime.date.today())
            mat_str = row.get("maturity_date", "").strip()
            parsed_issue = datetime.date.fromisoformat(issue_str)
            parsed_maturity = datetime.date.fromisoformat(mat_str)
            if parsed_maturity <= parsed_issue:
                rejected.append({"row_index": idx, "fdr_number": fdr_num, "reason": "Maturity date must be after issue date", "raw": raw_row})
                continue
        except Exception as e:
            rejected.append({"row_index": idx, "fdr_number": fdr_num, "reason": f"Invalid date format (must be YYYY-MM-DD): {e}", "raw": raw_row})
            continue

        # Mathematical and Clause audit
        int_rate = float(row.get("interest_rate", 7.0))
        term_m = int(row.get("term_months", 120))
        mat_amount = float(str(row.get("maturity_amount", p_amount * 2.05)).replace(",", ""))
        
        math_audit = audit_mathematical_consistency(
            principal=p_amount,
            interest_rate=int_rate,
            term_months=term_m,
            maturity_amount=mat_amount,
            issue_date_str=str(parsed_issue),
            maturity_date_str=str(parsed_maturity)
        )
        clause_audit = scrutinize_aicte_lock_in_clause(row.get("joint_account_title", "RO AICTE & Principal"))

        try:
            fdr = FDRInstrument(
                fdr_number=fdr_num,
                institution_id=inst.id,
                issuing_bank_name=row.get("issuing_bank_name", "Scheduled Commercial Bank").strip(),
                branch_name=row.get("branch_name", "Main Branch").strip(),
                ifsc_code=row.get("ifsc_code", "SBIN0001000").strip().upper(),
                account_number=row.get("account_number", "100000000000").strip(),
                principal_amount=p_amount,
                maturity_amount=mat_amount,
                interest_rate=int_rate,
                issue_date=parsed_issue,
                maturity_date=parsed_maturity,
                term_months=term_m,
                lien_marked=True,
                joint_account_title=row.get("joint_account_title", "RO AICTE & Principal").strip(),
                lifecycle_status="UNDER_SCRUTINY",
                document_path="sample_synthetic_fdr.png",
                document_sha256="BULK_CSV_GENESIS_HASH",
                is_encrypted=True,
                original_filename=file.filename or "bulk.csv",
                submitted_data=dict(raw_row),
                ocr_data={
                    "bulk_uploaded": True,
                    "clause_scrutiny": clause_audit,
                    "mathematical_audit": math_audit
                },
                bank_verified_data={},
                discrepancy_details=[]
            )
            db.add(fdr)
            db.flush()

            vh = InstrumentVersionHistory(
                fdr_id=fdr.id,
                version_number=1,
                snapshot_data=dict(raw_row),
                change_action="BULK_CSV_IMPORT",
                changed_by_user=current_user.full_name
            )
            db.add(vh)
            accepted.append(fdr_num)
        except Exception as e:
            rejected.append({"row_index": idx, "fdr_number": fdr_num, "reason": str(e), "raw": raw_row})

    db.commit()

    rejected_csv_str = ""
    if rejected:
        rej_output = io.StringIO()
        rej_writer = csv.writer(rej_output)
        rej_writer.writerow(["row_index", "fdr_number", "rejection_reason"])
        for r in rejected:
            rej_writer.writerow([r["row_index"], r["fdr_number"], r["reason"]])
        rejected_csv_str = rej_output.getvalue()

    log_audit_trail(
        db, action="BULK_CSV_INGESTION_COMPLETED",
        user_name=current_user.full_name, user_role=current_user.role,
        entity_type="FDR_BATCH", entity_id=file.filename or "bulk.csv",
        payload={
            "total_rows_processed": len(accepted) + len(rejected),
            "accepted_count": len(accepted),
            "rejected_count": len(rejected),
            "sample_errors": [r["reason"] for r in rejected[:5]]
        },
        user_id=current_user.id
    )

    return {
        "success": True,
        "total_processed": len(accepted) + len(rejected),
        "accepted_count": len(accepted),
        "rejected_count": len(rejected),
        "accepted_fdrs": accepted,
        "rejected_rows": rejected,
        "rejected_csv_download": rejected_csv_str
    }

@app.get("/api/fdrs/{fdr_id}/document")
def get_decrypted_document(fdr_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    
    # Server-side authorization check
    if current_user.role == "INSTITUTION_USER" and current_user.institution_id != fdr.institution_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to institutional document.")
    
    doc_path = fdr.document_path
    if doc_path and os.path.exists(doc_path) and doc_path.endswith(".enc"):
        try:
            with open(doc_path, "rb") as f:
                enc = f.read()
            dec = decrypt_bytes(enc)
            media_type = "application/pdf" if doc_path.endswith(".pdf.enc") else "image/png"
            return Response(content=dec, media_type=media_type)
        except Exception as e:
            print(f"[Document Decrypt] Error: {e}")
    
    # Return synthetic sample if no encrypted file or if sample referenced
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_synthetic_fdr.png")
    if os.path.exists(sample_path):
        with open(sample_path, "rb") as f:
            return Response(content=f.read(), media_type="image/png")
            
    raise HTTPException(status_code=404, detail="Document not found")

@app.post("/api/fdrs/{fdr_id}/scrutiny")
def scrutiny_fdr(
    fdr_id: str,
    payload: FDRScrutinyAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["AICTE_SCRUTINY_OFFICER", "AICTE_ADMIN"]))
):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    
    fdr.scrutinized_by = current_user.full_name
    fdr.scrutiny_notes = payload.notes
    
    old_status = fdr.lifecycle_status
    if payload.action in ["APPROVE", "PASS_TO_BANK_VERIFICATION"]:
        fdr.lifecycle_status = "PENDING_APPROVAL"
        log_audit_trail(db, "SCRUTINY_PASSED", current_user.full_name, current_user.role, "FDR", str(fdr.id), payload.dict(), current_user.id)
    elif payload.action == "FLAG_DISCREPANCY":
        fdr.lifecycle_status = "DISCREPANCY_FLAGGED"
        log_audit_trail(db, "SCRUTINY_FLAGGED_DISCREPANCY", current_user.full_name, current_user.role, "FDR", str(fdr.id), payload.dict(), current_user.id)
    else:
        fdr.lifecycle_status = "REJECTED"
        log_audit_trail(db, "SCRUTINY_REJECTED", current_user.full_name, current_user.role, "FDR", str(fdr.id), payload.dict(), current_user.id)
    
    # Record version snapshot
    next_v = (db.query(func.max(InstrumentVersionHistory.version_number)).filter(InstrumentVersionHistory.fdr_id == fdr.id).scalar() or 1) + 1
    vh = InstrumentVersionHistory(
        fdr_id=fdr.id,
        version_number=next_v,
        snapshot_data={"status_transition": f"{old_status} -> {fdr.lifecycle_status}", "notes": payload.notes, "action": payload.action},
        change_action=f"SCRUTINY_{payload.action}",
        changed_by_user=current_user.full_name
    )
    db.add(vh)
    db.commit()
    return serialize_fdr(fdr)

@app.post("/api/fdrs/{fdr_id}/bank-verify")
def bank_verify_fdr(
    fdr_id: str,
    payload: BankVerifyAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["AICTE_SCRUTINY_OFFICER", "BANK_OFFICER", "AICTE_ADMIN"]))
):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    
    mode = getattr(payload, "verification_mode", None) or "SFMS_QUERY"
    if mode in ["SFMS_QUERY", "SFMS_CBS"]:
        bank_res = query_bank_sfms_cbs(fdr.fdr_number, fdr.ifsc_code, fdr.account_number, fdr.principal_amount)
    else:
        bank_res = verify_branch_letter(fdr.fdr_number, fdr.branch_name, current_user.full_name)
    
    fdr.bank_verified_data = bank_res
    
    # 3-Way Reconciliation
    reconciliation, has_discrepancy = generate_three_way_reconciliation(
        fdr.submitted_data or {},
        fdr.ocr_data or {},
        bank_res
    )
    fdr.discrepancy_details = reconciliation
    
    old_status = fdr.lifecycle_status
    if has_discrepancy:
        fdr.lifecycle_status = "DISCREPANCY_FLAGGED"
        trigger_n8n_workflow("ocr-discrepancy-detected", {"fdr_id": fdr.id, "discrepancies": reconciliation}, db)
    else:
        fdr.lifecycle_status = "BANK_VERIFIED"
    
    # Record version snapshot
    next_v = (db.query(func.max(InstrumentVersionHistory.version_number)).filter(InstrumentVersionHistory.fdr_id == fdr.id).scalar() or 1) + 1
    vh = InstrumentVersionHistory(
        fdr_id=fdr.id,
        version_number=next_v,
        snapshot_data={"verification_mode": mode, "bank_ref": bank_res.get("sfms_reference_id"), "has_discrepancy": has_discrepancy},
        change_action="BANK_CBS_VERIFICATION",
        changed_by_user=current_user.full_name
    )
    db.add(vh)
    db.commit()

    log_audit_trail(db, "BANK_SFMS_VERIFIED", current_user.full_name, current_user.role, "FDR", str(fdr.id), bank_res, current_user.id)
    return {"fdr": serialize_fdr(fdr), "reconciliation": reconciliation, "has_discrepancy": has_discrepancy, "bank_data": bank_res}

@app.post("/api/fdrs/{fdr_id}/approve")
def approve_fdr(
    fdr_id: str,
    payload: FDRApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["AICTE_APPROVER", "AICTE_ADMIN"]))
):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    
    fdr.approved_by = current_user.full_name
    fdr.approver_notes = payload.notes
    old_status = fdr.lifecycle_status
    
    if payload.action in ["APPROVE", "APPROVE_ACTIVATION"]:
        fdr.lifecycle_status = "ACTIVE"
        log_audit_trail(db, "COMPETENT_AUTHORITY_APPROVED", current_user.full_name, current_user.role, "FDR", str(fdr.id), payload.dict(), current_user.id)
    else:
        fdr.lifecycle_status = "REJECTED"
        log_audit_trail(db, "COMPETENT_AUTHORITY_REJECTED", current_user.full_name, current_user.role, "FDR", str(fdr.id), payload.dict(), current_user.id)
    
    next_v = (db.query(func.max(InstrumentVersionHistory.version_number)).filter(InstrumentVersionHistory.fdr_id == fdr.id).scalar() or 1) + 1
    vh = InstrumentVersionHistory(
        fdr_id=fdr.id,
        version_number=next_v,
        snapshot_data={"status_transition": f"{old_status} -> {fdr.lifecycle_status}", "notes": payload.notes, "action": payload.action},
        change_action=f"COMPETENT_AUTHORITY_{payload.action}",
        changed_by_user=current_user.full_name
    )
    db.add(vh)
    db.commit()
    return serialize_fdr(fdr)

class GeminiAdvisoryRequest(BaseModel):
    query: Optional[str] = None
    fdr_number: Optional[str] = None

@app.post("/api/fdrs/{fdr_id}/gemini-audit")
def fdr_gemini_audit(
    fdr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    
    fdr_data = {
        "fdr_number": fdr.fdr_number,
        "bank_name": fdr.issuing_bank_name,
        "principal_amount": fdr.principal_amount,
        "maturity_amount": fdr.maturity_amount,
        "interest_rate": fdr.interest_rate,
        "issue_date": str(fdr.issue_date),
        "maturity_date": str(fdr.maturity_date),
        "lien_marked_to_aicte": getattr(fdr, "lien_marked", True),
        "joint_title": fdr.joint_account_title
    }
    audit_res = gemini_regulatory_audit(fdr_data)

    ocr_meta = dict(fdr.ocr_data or {})
    ocr_meta["gemini_audit"] = audit_res
    fdr.ocr_data = ocr_meta

    log_audit_trail(
        db=db,
        action="GEMINI_REGULATORY_AUDIT",
        user_name=current_user.full_name,
        user_role=current_user.role,
        entity_type="FDR",
        entity_id=str(fdr.id),
        payload={
            "fdr_number": fdr.fdr_number,
            "verdict": audit_res.get("verdict"),
            "compliance_score": audit_res.get("compliance_score"),
            "compliance_status": audit_res.get("compliance_status")
        },
        user_id=current_user.id
    )
    db.commit()
    return {
        "status": "success",
        "fdr_id": str(fdr.id),
        "fdr_number": fdr.fdr_number,
        "audit": audit_res
    }

@app.post("/api/ai/regulatory-advisory")
def ai_regulatory_advisory(
    payload: GeminiAdvisoryRequest,
    current_user: User = Depends(get_current_user)
):
    client = get_gemini_client()
    query = payload.query or "What are the mandated AICTE security deposit requirements for establishing a technical institute?"
    if not client:
        return {
            "query": query,
            "response": "AICTE Approval Process Handbook mandates a 10-year term deposit in a Scheduled Commercial Bank, jointly in the name of the Regional Officer AICTE and the applicant institution, with an irrevocable lien marked to AICTE.",
            "model": "rule-engine"
        }
    try:
        prompt = (
            f"You are the AICTE Legal and Regulatory Assistant for the AetherVault Security Deposit Portal.\n"
            f"Answer the following user question strictly adhering to AICTE Approval Process Handbook, Indian banking regulations, and fixed deposit lien protocols:\n"
            f"{query}\n"
            f"Keep the answer concise (2-3 paragraphs max) and professional without bullet points or symbols."
        )
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
            contents=prompt
        )
        return {
            "query": query,
            "response": response.text.strip(),
            "model": os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
        }
    except Exception as e:
        return {
            "query": query,
            "response": "AICTE Approval Process Handbook mandates a 10-year term deposit in a Scheduled Commercial Bank, jointly in the name of the Regional Officer AICTE and the applicant institution, with an irrevocable lien marked to AICTE.",
            "model": "fallback"
        }

@app.post("/api/fdrs/{fdr_id}/renew")
def renew_fdr(
    fdr_id: str,
    payload: FDRRenewalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    parent_fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not parent_fdr:
        raise HTTPException(status_code=404, detail="Parent FDR not found")
    
    # Mark parent as replaced
    parent_fdr.lifecycle_status = "REPLACED_ROLLED_OVER"
    
    payload_dict = json.loads(payload.json())

    new_fdr = FDRInstrument(
        fdr_number=payload.new_fdr_number.strip(),
        institution_id=parent_fdr.institution_id,
        issuing_bank_name=parent_fdr.issuing_bank_name,
        branch_name=parent_fdr.branch_name,
        ifsc_code=parent_fdr.ifsc_code,
        account_number=parent_fdr.account_number,
        principal_amount=payload.new_principal_amount,
        maturity_amount=payload.new_maturity_amount,
        interest_rate=payload.new_interest_rate,
        issue_date=payload.new_issue_date,
        maturity_date=payload.new_maturity_date,
        term_months=payload.new_term_months,
        lien_marked=True,
        joint_account_title=parent_fdr.joint_account_title,
        parent_fdr_id=parent_fdr.id,
        renewal_count=parent_fdr.renewal_count + 1,
        document_path="sample_synthetic_fdr.png",
        document_sha256="RENEWAL_ROLLOVER_HASH",
        is_encrypted=True,
        original_filename="renewal_rollover.pdf",
        lifecycle_status="UNDER_SCRUTINY",
        submitted_data=payload_dict,
        ocr_data={"renewal_reference": parent_fdr.fdr_number},
        bank_verified_data={},
        discrepancy_details=[]
    )
    db.add(new_fdr)
    db.flush()

    # Create Linked Renewal History Record
    ren_hist = FDRRenewalHistory(
        original_fdr_id=parent_fdr.id,
        new_fdr_id=new_fdr.id,
        renewal_date=payload.new_issue_date,
        extended_maturity_date=payload.new_maturity_date,
        revised_amount=payload.new_principal_amount,
        officer_notes=payload.officer_notes or "Renewal rolled over via AetherVault"
    )
    db.add(ren_hist)

    # Initial Version History for new instrument
    vh = InstrumentVersionHistory(
        fdr_id=new_fdr.id,
        version_number=1,
        snapshot_data=payload_dict,
        change_action="RENEWAL_ROLLOVER_CREATED",
        changed_by_user=current_user.full_name
    )
    db.add(vh)
    db.commit()

    log_audit_trail(db, "FDR_RENEWAL_SUBMITTED", current_user.full_name, current_user.role, "FDR", str(new_fdr.id), payload_dict, current_user.id)
    trigger_n8n_workflow("renewal-submitted", {"parent_fdr_id": parent_fdr.id, "new_fdr_number": payload.new_fdr_number}, db)
    return serialize_fdr(new_fdr)

@app.get("/api/fdrs/{fdr_id}/history")
def get_fdr_history(fdr_id: str, db: Session = Depends(get_db)):
    snapshots = db.query(InstrumentVersionHistory).filter(InstrumentVersionHistory.fdr_id == fdr_id).order_by(InstrumentVersionHistory.version_number).all()
    # Also fetch renewal links
    renewals = db.query(FDRRenewalHistory).filter(
        or_(FDRRenewalHistory.original_fdr_id == fdr_id, FDRRenewalHistory.new_fdr_id == fdr_id)
    ).all()
    return [
        {
            "id": s.id,
            "fdr_id": s.fdr_id,
            "version_number": s.version_number,
            "snapshot_data": s.snapshot_data or {},
            "change_action": s.change_action,
            "changed_by_user": s.changed_by_user,
            "timestamp": str(s.timestamp)
        }
        for s in snapshots
    ]

@app.get("/api/fdrs/{fdr_id}/lineage")
def get_fdr_lineage(fdr_id: str, db: Session = Depends(get_db)):
    """
    Returns full parent-child chain of renewed/replaced instruments.
    """
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
        
    lineage = []
    # Trace parents
    curr = fdr
    while curr.parent_fdr_id:
        parent = db.query(FDRInstrument).filter(FDRInstrument.id == curr.parent_fdr_id).first()
        if parent:
            lineage.insert(0, {
                "id": parent.id,
                "fdr_number": parent.fdr_number,
                "role": "PARENT_ORIGINAL",
                "principal_amount": parent.principal_amount,
                "maturity_date": str(parent.maturity_date),
                "status": parent.lifecycle_status
            })
            curr = parent
        else:
            break

    # Add current
    lineage.append({
        "id": fdr.id,
        "fdr_number": fdr.fdr_number,
        "role": "CURRENT_INSTRUMENT",
        "principal_amount": fdr.principal_amount,
        "maturity_date": str(fdr.maturity_date),
        "status": fdr.lifecycle_status
    })

    # Find children
    children = db.query(FDRInstrument).filter(FDRInstrument.parent_fdr_id == fdr.id).all()
    for ch in children:
        lineage.append({
            "id": ch.id,
            "fdr_number": ch.fdr_number,
            "role": "CHILD_RENEWAL",
            "principal_amount": ch.principal_amount,
            "maturity_date": str(ch.maturity_date),
            "status": ch.lifecycle_status
        })

    return lineage

# ----------------- Court-Ready Invocation Bundle -----------------
@app.get("/api/fdrs/{fdr_id}/legal-invocation-bundle")
def get_legal_invocation_bundle(fdr_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
        
    inst = db.query(Institution).filter(Institution.id == fdr.institution_id).first()
    audit_logs = db.query(AuditLog).filter(AuditLog.entity_id == str(fdr.id)).order_by(desc(AuditLog.id)).limit(10).all()
    
    fdr_dict = {
        "fdr_number": fdr.fdr_number,
        "account_number": fdr.account_number,
        "issuing_bank_name": fdr.issuing_bank_name,
        "branch_name": fdr.branch_name,
        "ifsc_code": fdr.ifsc_code,
        "principal_amount": fdr.principal_amount,
        "maturity_amount": fdr.maturity_amount,
        "issue_date": fdr.issue_date,
        "maturity_date": fdr.maturity_date,
        "joint_account_title": fdr.joint_account_title,
        "lifecycle_status": fdr.lifecycle_status,
        "document_sha256": fdr.document_sha256
    }
    inst_dict = {
        "name": inst.name if inst else "Apex Technical Institution",
        "aicte_permanent_id": inst.aicte_permanent_id if inst else "1-9087654321"
    }
    audit_list = [
        {
            "timestamp": l.timestamp,
            "action": l.action,
            "performed_by_name": l.performed_by_name,
            "performed_by_role": l.performed_by_role,
            "current_hash": l.current_hash
        }
        for l in audit_logs
    ]
    
    pdf_bytes = generate_court_ready_bundle_pdf(
        fdr=fdr_dict,
        institution=inst_dict,
        audit_logs=audit_list,
        ocr_data=fdr.ocr_data or {},
        bank_data=fdr.bank_verified_data or {}
    )

    log_audit_trail(db, "LEGAL_INVOCATION_BUNDLE_COMPILED", current_user.full_name, current_user.role, "FDR", str(fdr.id), {"fdr_number": fdr.fdr_number}, current_user.id)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=AICTE_Court_Ready_Bundle_{fdr.fdr_number}.pdf"
        }
    )

# ----------------- Smart Release Conditions Engine & Release Workflow -----------------
@app.get("/api/releases/check-eligibility/{fdr_id}")
def check_release_eligibility(fdr_id: str, db: Session = Depends(get_db)):
    """
    Smart Release Conditions Engine:
    Cross-references institutional status, 10-year regulatory lock-in duration,
    ongoing student complaints, and closure penalties.
    """
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
        
    inst = db.query(Institution).filter(Institution.id == fdr.institution_id).first()
    today = datetime.date.today()
    tenure_days = (today - fdr.issue_date).days
    years_completed = round(tenure_days / 365.25, 1)

    blocking_reasons = []

    # Condition 1: 10-Year Tenure Mandate check
    is_ten_year_met = fdr.maturity_date <= today or years_completed >= 10.0

    # Condition 2: Institutional Sanctions check
    # Institutions with specific IDs or pharmacy/closed flags can have simulated regulatory blocks
    has_active_penalties = inst and "Pharmacy" in inst.institution_type and inst.state == "Karnataka"
    if has_active_penalties:
        blocking_reasons.append("Active Regulatory Penalty: Pending AICTE Executive Committee sanction order #EC-KT-2025-881.")

    has_ongoing_litigation = inst and "Architecture" in inst.institution_type
    if has_ongoing_litigation:
        blocking_reasons.append("Ongoing Judicial Litigation: High Court of Gujarat interim stay in WP No. 4491/2024.")

    if not is_ten_year_met:
        blocking_reasons.append(f"Maturity Tenure Incomplete: {years_completed} / 10.0 years completed (Matures on {fdr.maturity_date}). Course closure justification required.")

    is_eligible = len(blocking_reasons) == 0

    return {
        "eligible": is_eligible,
        "years_completed": years_completed,
        "is_ten_year_met": is_ten_year_met,
        "blocking_reasons": blocking_reasons,
        "institution_name": inst.name if inst else "N/A",
        "lock_reason": blocking_reasons[0] if blocking_reasons else None
    }

@app.get("/api/releases")
def get_releases(db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user)):
    q = db.query(ReleaseRefundRequest)
    if current_user and current_user.role == "INSTITUTION_USER" and current_user.institution_id:
        q = q.filter(ReleaseRefundRequest.institution_id == current_user.institution_id)
    return [serialize_release(r) for r in q.order_by(desc(ReleaseRefundRequest.created_at)).all()]

@app.post("/api/releases/request")
def request_release(
    payload: ReleaseRefundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    fdr = db.query(FDRInstrument).filter(FDRInstrument.id == payload.fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    
    # Check Smart Release Eligibility unless justified by course closure
    eligibility = check_release_eligibility(str(fdr.id), db)
    if not eligibility["eligible"] and payload.justification_type not in ["COURSE_CLOSURE", "INSTITUTION_CLOSURE"]:
        raise HTTPException(
            status_code=400,
            detail=f"Release Auto-Locked by Smart Release Conditions Engine: {eligibility['lock_reason']}"
        )

    fdr.lifecycle_status = "RELEASE_REQUESTED"
    ref_no = f"REL-AICTE-{int(time.time())}-{random.randint(100, 999)}"
    
    release = ReleaseRefundRequest(
        request_reference_no=ref_no,
        fdr_id=fdr.id,
        institution_id=fdr.institution_id,
        request_date=datetime.date.today(),
        justification_type=payload.justification_type,
        justification_details=payload.justification_details,
        refund_account_no=payload.refund_account_no,
        refund_bank_ifsc=payload.refund_bank_ifsc.upper(),
        refund_bank_name=payload.refund_bank_name,
        discharge_amount=fdr.principal_amount,
        status="PENDING_SCRUTINY"
    )
    db.add(release)
    db.commit()
    db.refresh(release)
    
    log_audit_trail(db, "RELEASE_CLAIM_SUBMITTED", current_user.full_name, current_user.role, "RELEASE", str(release.id), payload.dict(), current_user.id)
    trigger_n8n_workflow("release-requested", {"release_id": release.id, "fdr_id": fdr.id, "ref_no": ref_no}, db)
    return serialize_release(release)

@app.post("/api/releases/{release_id}/scrutiny")
def scrutiny_release(
    release_id: str,
    payload: ReleaseScrutinyAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["AICTE_SCRUTINY_OFFICER", "AICTE_ADMIN"]))
):
    rel = db.query(ReleaseRefundRequest).filter(ReleaseRefundRequest.id == release_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Release claim not found")
    
    rel.scrutiny_remarks = payload.remarks
    rel.status = "PENDING_APPROVAL" if payload.action in ["APPROVE", "RECOMMEND_APPROVAL"] else "REJECTED"
    db.commit()
    log_audit_trail(db, f"RELEASE_SCRUTINY_{payload.action}", current_user.full_name, current_user.role, "RELEASE", str(rel.id), payload.dict(), current_user.id)
    return serialize_release(rel)

@app.post("/api/releases/{release_id}/approve")
def approve_release(
    release_id: str,
    payload: ReleaseApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["AICTE_APPROVER", "AICTE_ADMIN"]))
):
    rel = db.query(ReleaseRefundRequest).filter(ReleaseRefundRequest.id == release_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Release claim not found")
    
    rel.approver_remarks = payload.remarks
    if payload.action in ["APPROVE", "COUNCIL_APPROVE"]:
        rel.status = "APPROVED"
        rel.discharge_voucher_no = payload.discharge_voucher_no or f"DV-AICTE-2026-{int(time.time())}"
        rel.discharge_amount = payload.discharge_amount or rel.discharge_amount
        rel.discharge_date = datetime.date.today()
        
        fdr = db.query(FDRInstrument).filter(FDRInstrument.id == rel.fdr_id).first()
        if fdr:
            fdr.lifecycle_status = "RELEASE_APPROVED"
            fdr.lien_marked = False
        log_audit_trail(db, "RELEASE_DISCHARGE_VOUCHER_ISSUED", current_user.full_name, current_user.role, "RELEASE", str(rel.id), payload.dict(), current_user.id)
    else:
        rel.status = "REJECTED"
        log_audit_trail(db, "RELEASE_APPROVAL_REJECTED", current_user.full_name, current_user.role, "RELEASE", str(rel.id), payload.dict(), current_user.id)
    
    db.commit()
    return serialize_release(rel)

# ----------------- Dashboard Metrics & Risk Matrix -----------------
@app.get("/api/dashboard/metrics")
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    fdr_q = db.query(FDRInstrument)
    if current_user and current_user.role == "INSTITUTION_USER" and current_user.institution_id:
        fdr_q = fdr_q.filter(FDRInstrument.institution_id == current_user.institution_id)
    elif current_user and current_user.role == "BANK_OFFICER" and current_user.bank_code:
        fdr_q = fdr_q.filter(FDRInstrument.issuing_bank_name.ilike(f"%{current_user.bank_code}%"))

    total_fdrs = fdr_q.count()
    active_fdrs = fdr_q.filter(FDRInstrument.lifecycle_status == "ACTIVE").count()
    expiring_soon = fdr_q.filter(FDRInstrument.lifecycle_status == "EXPIRING_SOON").count()
    matured = fdr_q.filter(FDRInstrument.lifecycle_status == "MATURED").count()
    under_scrutiny = fdr_q.filter(FDRInstrument.lifecycle_status.in_(["UNDER_SCRUTINY", "PENDING_APPROVAL"])).count()
    released = fdr_q.filter(FDRInstrument.lifecycle_status == "RELEASE_APPROVED").count()
    discrepancy_count = fdr_q.filter(FDRInstrument.lifecycle_status == "DISCREPANCY_FLAGGED").count()
    
    total_amt = fdr_q.with_entities(func.sum(FDRInstrument.principal_amount)).scalar() or 0.0
    active_amt = fdr_q.filter(FDRInstrument.lifecycle_status == "ACTIVE").with_entities(func.sum(FDRInstrument.principal_amount)).scalar() or 0.0
    total_inst = db.query(Institution).count() if not (current_user and current_user.role == "INSTITUTION_USER") else 1

    missing_docs = db.query(FDRInstrument).filter(
        or_(FDRInstrument.document_path == None, FDRInstrument.document_path == "")
    ).count()

    # System Integrity Score: % of value in verified liens
    integrity_score = round((active_amt / max(total_amt, 1.0)) * 100, 1)

    # 10-Year Rolling Liquidity Forecast (2024 to 2035)
    all_fdrs = db.query(FDRInstrument).all()
    forecast_map = {}
    current_year = datetime.date.today().year
    for y in range(current_year - 2, current_year + 10):
        forecast_map[str(y)] = 0.0

    for f in all_fdrs:
        y_str = str(f.maturity_date.year)
        if y_str in forecast_map:
            forecast_map[y_str] += round(f.principal_amount / 10000000.0, 2)  # In Crores

    forecast_list = [{"year": k, "volume_crores": round(v, 2)} for k, v in sorted(forecast_map.items())]

    # Dynamic Financial Risk Matrix
    risk_high = discrepancy_count + matured
    risk_amber = expiring_soon
    risk_green = active_fdrs

    return {
        "total_fdrs": total_fdrs,
        "active_fdrs": active_fdrs,
        "expiring_soon_count": expiring_soon,
        "matured_count": matured,
        "under_scrutiny_count": under_scrutiny,
        "released_count": released,
        "discrepancy_count": discrepancy_count,
        "missing_documents_count": missing_docs,
        "total_principal_amount": round(total_amt, 2),
        "active_principal_amount": round(active_amt, 2),
        "total_institutions": total_inst,
        "system_integrity_score": integrity_score,
        "liquidity_forecast_10yr": forecast_list,
        "risk_matrix": {
            "high_risk_count": risk_high,
            "medium_risk_count": risk_amber,
            "safe_count": risk_green
        }
    }

# ----------------- Audit Logs & Integrity -----------------
@app.get("/api/audit-logs")
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(desc(AuditLog.id)).limit(limit).all()

@app.get("/api/audit-logs/verify-chain")
def verify_audit_chain(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id).all()
    if not logs:
        return {"valid": True, "total_records": 0, "message": "Genesis chain empty"}
    
    prev_hash = "GENESIS_ROOT_HASH_2026_AICTE"
    for idx, l in enumerate(logs):
        if idx > 0 and l.previous_hash != prev_hash:
            return {"valid": False, "broken_at_id": l.id, "error": f"Hash chain mismatch at index {idx}", "total_records": len(logs)}
        prev_hash = l.current_hash
    return {"valid": True, "total_records": len(logs), "verified_hash": prev_hash}

@app.post("/api/audit-logs/self-heal")
def self_heal_audit_chain(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["AICTE_ADMIN"]))):
    logs = db.query(AuditLog).order_by(AuditLog.id).all()
    if not logs:
        return {"repaired": 0, "status": "Genesis chain empty", "valid": True}
    
    prev_hash = "GENESIS_ROOT_HASH_2026_AICTE"
    repaired_count = 0
    for idx, l in enumerate(logs):
        l.log_index = idx + 1
        if idx > 0 and l.previous_hash != prev_hash:
            l.previous_hash = prev_hash
            repaired_count += 1
        elif idx == 0:
            l.previous_hash = "GENESIS_ROOT_HASH_2026_AICTE"
            
        payload_data = l.payload if l.payload is not None else {}
        payload_str = json.dumps(payload_data, default=str)
        l.current_hash = compute_audit_hash(
            l.previous_hash,
            l.action,
            l.performed_by_name or "AICTE Authority",
            l.entity_type or "RECORD",
            str(l.entity_id or ""),
            payload_str
        )
        prev_hash = l.current_hash
    db.commit()
    return {"repaired": repaired_count, "total_records": len(logs), "verified_hash": prev_hash, "valid": True}

# ----------------- Notifications -----------------
@app.get("/api/notifications")
def get_notifications(db: Session = Depends(get_db)):
    return db.query(Notification).order_by(desc(Notification.created_at)).limit(50).all()

@app.post("/api/notifications/{id}/read")
def mark_notification_read(id: str, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"success": True}

# ----------------- Alerts & Idempotent Scanner -----------------
@app.post("/api/alerts/trigger-maturity-reminders")
def trigger_maturity_reminders(db: Session = Depends(get_db)):
    today = datetime.date.today()
    configs = db.query(ReminderConfig).filter(ReminderConfig.is_active == True).all()
    intervals = [c.days_before_maturity for c in configs] or [60, 30, 15, 7, 0]
    
    all_fdrs = db.query(FDRInstrument).filter(FDRInstrument.lifecycle_status.in_(["ACTIVE", "EXPIRING_SOON"])).all()
    reminders_dispatched = []

    for fdr in all_fdrs:
        days_left = (fdr.maturity_date - today).days
        for interval in intervals:
            if 0 <= days_left <= interval:
                idempotency_key = f"MSG-MAT-{fdr.id}-{interval}-{today.strftime('%Y-%m')}"
                existing_log = db.query(NotificationDeliveryLog).filter(NotificationDeliveryLog.message_id == idempotency_key).first()
                if not existing_log:
                    inst = db.query(Institution).filter(Institution.id == fdr.institution_id).first()
                    recipient = inst.contact_email if inst else "sanjeevkumaredu8@gmail.com"
                    
                    subject = f"AICTE Regulatory Alert: Security Deposit #{fdr.fdr_number} Maturing in {days_left} Days"
                    body = f"Notice to {inst.name if inst else 'Institution'}: Fixed Deposit Receipt #{fdr.fdr_number} of Principal Amount INR {fdr.principal_amount:,.2f} matures on {fdr.maturity_date}."
                    email_ok = send_email_alert(recipient, subject, body)
                    
                    d_log = NotificationDeliveryLog(
                        message_id=idempotency_key,
                        channel="SMTP_EMAIL",
                        recipient=recipient,
                        title=subject,
                        content_snippet=body[:200],
                        delivery_status="DELIVERED" if email_ok else "FAILED"
                    )
                    db.add(d_log)
                    
                    wa_key = f"WA-{idempotency_key}"
                    d_wa = NotificationDeliveryLog(
                        message_id=wa_key,
                        channel="WHATSAPP_CLOUD_API",
                        recipient=inst.contact_phone if inst else "+91 9900000000",
                        title="WhatsApp Advance Notice Template",
                        content_snippet="Automated WhatsApp Alert",
                        delivery_status="FALLBACK_LOGGED"
                    )
                    db.add(d_wa)
                    reminders_dispatched.append(fdr.fdr_number)
                    break

    db.commit()
    log_audit_trail(db, "SCHEDULED_MATURITY_SCAN_COMPLETED", "n8n Automation Engine", "SYSTEM_AUTOMATION", "SCANNER", "SCAN_JOB", {"dispatched_count": len(reminders_dispatched), "fdrs": reminders_dispatched})
    return {"success": True, "dispatched_count": len(reminders_dispatched), "fdrs": reminders_dispatched}

@app.post("/api/alerts/test-smtp")
def test_smtp(recipient: Optional[str] = None):
    target = recipient or "sanjeevkumaredu8@gmail.com"
    subject = "AICTE AetherVault — Live SMTP Dispatch Verification"
    body = f"This is an automated test verifying the live transactional SMTP relay configured for AICTE AetherVault.\nTimestamp: {datetime.datetime.now().isoformat()}"
    ok = send_email_alert(target, subject, body)
    return {"success": ok, "recipient": target, "relay": "smtp.gmail.com:465 (SSL)"}

# ----------------- Reports Export with Advanced Filters -----------------
@app.get("/api/reports/export")
def export_reports(
    format: str = "csv",
    status: Optional[str] = None,
    bank: Optional[str] = None,
    missing_documents: bool = False,
    overdue_only: bool = False,
    db: Session = Depends(get_db)
):
    q = db.query(FDRInstrument)
    if status and status != "ALL":
        q = q.filter(FDRInstrument.lifecycle_status == status)
    if bank and bank != "ALL":
        q = q.filter(FDRInstrument.issuing_bank_name == bank)
    if missing_documents:
        q = q.filter(or_(FDRInstrument.document_path == None, FDRInstrument.document_path == ""))
    if overdue_only:
        today = datetime.date.today()
        q = q.filter(and_(FDRInstrument.maturity_date < today, FDRInstrument.lifecycle_status != "RELEASE_APPROVED"))

    fdrs = q.order_by(desc(FDRInstrument.created_at)).all()

    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "fdr_number", "institution_id", "bank_name", "branch", "ifsc_code",
            "account_number", "principal_amount", "maturity_amount", "interest_rate",
            "issue_date", "maturity_date", "term_months", "joint_account_title",
            "lifecycle_status", "has_document", "is_lien_marked"
        ])
        for f in fdrs:
            writer.writerow([
                f.fdr_number, f.institution_id, f.issuing_bank_name, f.branch_name, f.ifsc_code,
                f.account_number, f.principal_amount, f.maturity_amount, f.interest_rate,
                f.issue_date, f.maturity_date, f.term_months, f.joint_account_title,
                f.lifecycle_status, bool(f.document_path), f.lien_marked
            ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=AICTE_FDR_Registry_Filtered_Report.csv"}
        )
    
    return [
        {
            "fdr_number": f.fdr_number,
            "institution_id": f.institution_id,
            "bank_name": f.issuing_bank_name,
            "branch_name": f.branch_name,
            "principal_amount": f.principal_amount,
            "maturity_amount": f.maturity_amount,
            "issue_date": str(f.issue_date),
            "maturity_date": str(f.maturity_date),
            "lifecycle_status": f.lifecycle_status,
            "has_document": bool(f.document_path)
        }
        for f in fdrs
    ]

# ----------------- Automation Center & n8n -----------------
@app.get("/api/automation/status")
def get_automation_status():
    try:
        import requests
        r = requests.get(f"{N8N_ENGINE_URL}/api/v1/health", timeout=2)
        return r.json()
    except Exception as e:
        return {"status": "ENGINE_RUNNING_LOCAL", "engine": "n8n Embedded Engine", "port": 5678, "note": str(e)}

@app.get("/api/automation/workflows")
def get_automation_workflows():
    try:
        import requests
        r = requests.get(f"{N8N_ENGINE_URL}/api/v1/workflows", timeout=2)
        return r.json()
    except Exception:
        return []

@app.get("/api/automation/executions")
def get_automation_executions(limit: int = 50):
    try:
        import requests
        r = requests.get(f"{N8N_ENGINE_URL}/api/v1/executions?limit={limit}", timeout=2)
        return r.json()
    except Exception:
        return []

@app.get("/api/automation/failures")
def get_automation_failures(db: Session = Depends(get_db)):
    return db.query(AutomationFailureQueue).order_by(desc(AutomationFailureQueue.created_at)).all()

@app.post("/api/automation/failures/{id}/retry")
def retry_automation_failure(id: str, db: Session = Depends(get_db)):
    fail = db.query(AutomationFailureQueue).filter(AutomationFailureQueue.id == id).first()
    if not fail:
        raise HTTPException(status_code=404, detail="Failure entry not found")
    
    target_path = fail.workflow_name or fail.event_type or "fdr-submitted"
    ok = trigger_n8n_workflow(target_path, fail.payload or {}, db)
    if ok:
        fail.status = "RESOLVED"
        fail.resolved_at = datetime.datetime.utcnow()
        db.commit()
    return {"success": ok, "status": fail.status}

@app.get("/api/automation/reminder-configs")
def get_reminder_configs(db: Session = Depends(get_db)):
    configs = db.query(ReminderConfig).order_by(desc(ReminderConfig.days_before_maturity)).all()
    # Normalize for frontend
    out = []
    for c in configs:
        out.append({
            "id": c.id,
            "rule_name": c.rule_name,
            "days_before": c.days_before_maturity,
            "days_before_maturity": c.days_before_maturity,
            "channel_smtp": c.channel_smtp,
            "channel_whatsapp": c.channel_whatsapp,
            "channel_ivr": c.channel_ivr,
            "is_active": c.is_active,
            "channels": c.channels,
            "escalation_grace_days": c.escalation_grace_days
        })
    return out

@app.post("/api/automation/reminder-configs")
def update_reminder_configs(rules: List[Dict[str, Any]], db: Session = Depends(get_db)):
    db.query(ReminderConfig).delete()
    for r in rules:
        days = r.get("days_before", r.get("days_before_maturity", 30))
        channels = []
        if r.get("channel_smtp", True):
            channels.append("EMAIL")
        if r.get("channel_whatsapp", True):
            channels.append("WHATSAPP")
        if r.get("channel_ivr", False):
            channels.append("VOICE")

        rc = ReminderConfig(
            rule_name=r.get("rule_name", f"{days}-Day Advance Regulatory Notice"),
            days_before_maturity=int(days),
            is_active=r.get("is_active", True),
            channels=channels or ["EMAIL", "IN_APP"],
            escalation_grace_days=r.get("escalation_grace_days", 7)
        )
        db.add(rc)
    db.commit()
    return get_reminder_configs(db)

@app.get("/api/automation/deliveries")
def get_notification_deliveries(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(NotificationDeliveryLog).order_by(desc(NotificationDeliveryLog.created_at)).limit(limit).all()

@app.post("/api/automation/trigger-workflow/{workflow_id}")
def trigger_workflow_manual(workflow_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["AICTE_ADMIN"]))):
    path_map = {
        "workflow_1_fdr_submission": "fdr-submitted",
        "workflow_2_maturity_reminders": "trigger-maturity-scan",
        "workflow_3_renewal_sync": "renewal-submitted",
        "workflow_4_release_workflow": "release-requested",
        "workflow_5_ocr_discrepancy": "ocr-discrepancy-detected",
        "workflow_6_multi_channel_notifications": "dispatch-multi-channel"
    }
    path = path_map.get(workflow_id, workflow_id)
    ok = trigger_n8n_workflow(path, {"manual_test": True, "workflow_id": workflow_id}, db)
    return {"success": ok, "delivered_to_n8n": ok, "workflow_id": workflow_id}

@app.post("/api/webhooks/n8n/callback")
async def n8n_callback_webhook(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("X-AetherVault-Token")
    if token != N8N_SECRET_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized n8n token")
    
    body = await request.json()
    event_type = body.get("event_type", "generic.callback")
    log_audit_trail(db, f"N8N_CALLBACK_{event_type.upper()}", "n8n Automation Engine", "AUTOMATION_ENGINE", "WORKFLOW", str(body.get("fdr_id", "N/A")), body)
    return {"status": "SUCCESS", "event_processed": event_type}
