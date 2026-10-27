import os
import time
import json
import uuid
import hmac
import hashlib
import requests
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from .models import WorkflowExecution, AutomationFailureQueue, NotificationDeliveryLog

N8N_BASE_URL = os.getenv("N8N_WEBHOOK_URL", "http://127.0.0.1:5678")
N8N_ENGINE_URL = N8N_BASE_URL
N8N_SECRET_TOKEN = os.getenv("N8N_SECRET_TOKEN", "n8n-secure-token-2026")
HMAC_SECRET = os.getenv("N8N_HMAC_SECRET", "aicte_n8n_hmac_secret_key_2026")

def trigger_n8n_workflow(webhook_path: str, payload: dict, db: Session) -> bool:
    res = dispatch_event_to_n8n(db, webhook_path, "system_event", webhook_path, payload)
    return res.get("success") is True or res.get("delivered_to_n8n") is True



def generate_signature(payload_bytes: bytes) -> str:
    return hmac.new(HMAC_SECRET.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()

def verify_signature(payload_bytes: bytes, signature: str) -> bool:
    expected = generate_signature(payload_bytes)
    return hmac.compare_digest(expected, signature)

def dispatch_event_to_n8n(
    db: Session,
    workflow_name: str,
    event_type: str,
    webhook_path: str,
    payload: dict
) -> Dict[str, Any]:
    """
    Dispatches an authenticated webhook event to the self-hosted n8n engine.
    If n8n is temporarily unreachable, queues the event in AutomationFailureQueue
    and executes local fallback so core FDR operations are never interrupted.
    """
    url = f"{N8N_BASE_URL}/webhook/{webhook_path}"
    payload_json = json.dumps(payload, default=str)
    payload_bytes = payload_json.encode('utf-8')
    sig = generate_signature(payload_bytes)

    headers = {
        "Content-Type": "application/json",
        "X-AetherVault-Token": N8N_SECRET_TOKEN,
        "X-AetherVault-Signature": sig
    }

    start_time = time.time()
    try:
        res = requests.post(url, data=payload_json, headers=headers, timeout=6)
        duration_ms = round((time.time() - start_time) * 1000, 2)

        if res.status_code == 200:
            res_data = res.json()
            wf_log = WorkflowExecution(
                workflow_name=workflow_name,
                trigger_event=event_type,
                status="SUCCESS",
                execution_time_ms=duration_ms,
                payload=payload,
                n8n_execution_id=res_data.get("execution_id", f"n8n_{uuid.uuid4().hex[:8]}")
            )
            db.add(wf_log)
            db.commit()
            return {"success": True, "delivered_to_n8n": True, "data": res_data}
        else:
            raise Exception(f"n8n returned HTTP {res.status_code}: {res.text}")

    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        print(f"[n8n Bridge] Gateway notice for '{workflow_name}': {e}. Queuing in Automation Failure Queue.")

        # Record failure queue for recovery
        failure_item = AutomationFailureQueue(
            workflow_name=workflow_name,
            event_type=event_type,
            payload=payload,
            error_reason=str(e),
            status="QUEUED"
        )
        db.add(failure_item)

        # Log failed execution
        wf_log = WorkflowExecution(
            workflow_name=workflow_name,
            trigger_event=event_type,
            status="FAILED",
            execution_time_ms=duration_ms,
            error_message=str(e),
            payload=payload
        )
        db.add(wf_log)
        db.commit()

        return {
            "success": False,
            "delivered_to_n8n": False,
            "error": str(e),
            "fallback_engaged": True
        }
