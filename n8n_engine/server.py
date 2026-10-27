import os
import json
import time
import uuid
import threading
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI(
    title="n8n Self-Hosted Workflow Engine",
    description="Central Event-Driven Workflow Automation Engine for AICTE AetherVault",
    version="2.44.6"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WORKFLOWS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "n8n_workflows")
FASTAPI_CALLBACK_URL = os.getenv("FASTAPI_CALLBACK_URL", "http://127.0.0.1:8000/api/webhooks/n8n/callback")
N8N_SECRET_TOKEN = os.getenv("N8N_SECRET_TOKEN", "n8n-secure-token-2026")

workflows_store: Dict[str, Any] = {}
executions_history: List[Dict[str, Any]] = []

def load_workflows():
    global workflows_store
    workflows_store.clear()
    if not os.path.exists(WORKFLOWS_DIR):
        os.makedirs(WORKFLOWS_DIR, exist_ok=True)
    
    for filename in os.listdir(WORKFLOWS_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(WORKFLOWS_DIR, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    wf_id = filename.replace(".json", "")
                    data["id"] = wf_id
                    data["active"] = data.get("active", True)
                    data["filename"] = filename
                    workflows_store[wf_id] = data
            except Exception as e:
                print(f"[n8n Engine] Error loading {filename}: {e}")

load_workflows()

def dispatch_async(target_fn, *args, **kwargs):
    t = threading.Thread(target=target_fn, args=args, kwargs=kwargs, daemon=True)
    t.start()

def execute_workflow(workflow_id: str, payload: Dict[str, Any], trigger_name: str = "webhook") -> Dict[str, Any]:
    exec_id = str(uuid.uuid4())
    start_time = time.time()
    wf = workflows_store.get(workflow_id)
    
    execution_record = {
        "execution_id": exec_id,
        "workflow_id": workflow_id,
        "workflow_name": wf.get("name") if wf else workflow_id,
        "trigger": trigger_name,
        "payload": payload,
        "status": "RUNNING",
        "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "duration_ms": 0,
        "steps_executed": [],
        "error": None
    }
    executions_history.insert(0, execution_record)
    if len(executions_history) > 200:
        executions_history.pop()

    def run_nodes():
        try:
            # Simulate step execution through workflow nodes
            nodes = wf.get("nodes", []) if wf else []
            step_log = []
            for node in nodes:
                node_type = node.get("type", "")
                node_name = node.get("name", "")
                step_log.append({
                    "node": node_name,
                    "type": node_type,
                    "status": "SUCCESS",
                    "timestamp": time.strftime("%H:%M:%S")
                })
                
                # If httpRequest node targeting FastAPI callback
                params = node.get("parameters", {})
                url = params.get("url", "")
                if "api/webhooks/n8n/callback" in url:
                    headers = {"X-AetherVault-Token": N8N_SECRET_TOKEN, "Content-Type": "application/json"}
                    body_params = params.get("bodyParameters", {}).get("parameters", [])
                    callback_body = {}
                    for p in body_params:
                        k = p.get("name")
                        val = p.get("value", "")
                        if str(val).startswith("={{") and str(val).endswith("}}"):
                            # Resolve template variable from payload
                            var_path = val[3:-2].strip().replace("$json.body.", "")
                            callback_body[k] = payload.get(var_path, payload)
                        else:
                            callback_body[k] = val
                    
                    try:
                        requests.post(FASTAPI_CALLBACK_URL, json=callback_body, headers=headers, timeout=5)
                    except Exception as net_err:
                        print(f"[n8n Engine] Non-blocking callback warning: {net_err}")

            execution_record["status"] = "SUCCESS"
            execution_record["steps_executed"] = step_log
            execution_record["duration_ms"] = int((time.time() - start_time) * 1000)
        except Exception as e:
            execution_record["status"] = "FAILED"
            execution_record["error"] = str(e)
            execution_record["duration_ms"] = int((time.time() - start_time) * 1000)

    dispatch_async(run_nodes)
    return {
        "execution_id": exec_id,
        "workflow_id": workflow_id,
        "status": "ACCEPTED",
        "responseMode": "onReceived",
        "message": f"Workflow {workflow_id} accepted for non-blocking asynchronous execution."
    }

@app.post("/webhook/{path:path}")
async def handle_webhook(path: str, request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    
    # Map webhook path to workflow
    path_clean = path.strip("/").lower()
    matched_wf = None
    for w_id, wf in workflows_store.items():
        for node in wf.get("nodes", []):
            if node.get("type") == "n8n-nodes-base.webhook":
                node_path = node.get("parameters", {}).get("path", "").strip("/").lower()
                if node_path == path_clean or path_clean.startswith(w_id):
                    matched_wf = w_id
                    break
        if matched_wf:
            break
            
    if not matched_wf:
        # Fallback to direct workflow ID matching
        if path_clean in workflows_store:
            matched_wf = path_clean
        elif f"workflow_{path_clean}" in workflows_store:
            matched_wf = f"workflow_{path_clean}"
        else:
            matched_wf = "workflow_1_fdr_submission"

    result = execute_workflow(matched_wf, body, trigger_name=f"webhook:{path}")
    return result

@app.get("/health")
@app.get("/api/v1/health")
def health():
    return {
        "status": "HEALTHY",
        "engine": "n8n Self-Hosted Workflow Engine",
        "version": "2.44.6",
        "port": 5678,
        "active_workflows": len([w for w in workflows_store.values() if w.get("active", True)]),
        "total_executions": len(executions_history)
    }

@app.get("/api/v1/workflows")
def get_workflows():
    load_workflows()
    return list(workflows_store.values())

@app.get("/api/v1/executions")
def get_executions(limit: int = 50):
    return executions_history[:limit]

@app.post("/api/v1/executions/{exec_id}/retry")
def retry_execution(exec_id: str):
    for ex in executions_history:
        if ex.get("execution_id") == exec_id:
            return execute_workflow(ex["workflow_id"], ex.get("payload", {}), trigger_name="manual:retry")
    raise HTTPException(status_code=404, detail="Execution not found")

@app.post("/api/v1/workflows/{workflow_id}/activate")
def toggle_workflow(workflow_id: str):
    if workflow_id in workflows_store:
        curr = workflows_store[workflow_id].get("active", True)
        workflows_store[workflow_id]["active"] = not curr
        return {"workflow_id": workflow_id, "active": not curr}
    raise HTTPException(status_code=404, detail="Workflow not found")

@app.get("/", response_class=HTMLResponse)
def n8n_dashboard():
    wf_rows = "".join([
        f"<tr style='border-bottom: 1px solid #334155;'><td style='padding: 10px; font-weight: 600;'>{w.get('name')}</td><td style='padding: 10px; color: #94a3b8;'>{w.get('id')}</td><td style='padding: 10px;'><span style='background: #065f46; color: #34d399; padding: 3px 8px; border-radius: 4px; font-size: 11px;'>ACTIVE</span></td></tr>"
        for w in workflows_store.values()
    ])
    exec_rows = "".join([
        f"<tr style='border-bottom: 1px solid #334155;'><td style='padding: 8px; font-mono: monospace; font-size: 12px;'>{e.get('execution_id')[:8]}...</td><td style='padding: 8px;'>{e.get('workflow_name')}</td><td style='padding: 8px;'><span style='background: {'#065f46' if e.get('status') == 'SUCCESS' else '#881337'}; color: {'#34d399' if e.get('status') == 'SUCCESS' else '#f87171'}; padding: 2px 6px; border-radius: 4px; font-size: 10px;'>{e.get('status')}</span></td><td style='padding: 8px; color: #94a3b8; font-size: 12px;'>{e.get('duration_ms')}ms</td></tr>"
        for e in executions_history[:10]
    ])
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>n8n Automation Engine — AICTE AetherVault</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 1100px; margin: 0 auto; }}
            .card {{ background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155; }}
            h1 {{ font-size: 22px; color: #38bdf8; margin-top: 0; display: flex; align-items: center; gap: 10px; }}
            table {{ width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }}
            th {{ padding: 10px; background: #0f172a; color: #94a3b8; font-size: 11px; text-transform: uppercase; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <h1>⚡ n8n Self-Hosted Automation Engine v2.44.6</h1>
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">AICTE AetherVault Central Event-Driven Workflow Automation Hub & Non-Blocking Webhook Gateway.</p>
                <div style="display: flex; gap: 20px; margin-top: 16px;">
                    <div><strong>Port:</strong> 5678</div>
                    <div><strong>Status:</strong> <span style="color: #34d399;">● Online</span></div>
                    <div><strong>FastAPI Callback:</strong> {FASTAPI_CALLBACK_URL}</div>
                </div>
            </div>
            
            <div class="card">
                <h2 style="font-size: 16px; margin-top: 0; color: #f1f5f9;">Configured Workflows ({len(workflows_store)})</h2>
                <table>
                    <thead><tr><th>Workflow Name</th><th>Identifier</th><th>Status</th></tr></thead>
                    <tbody>{wf_rows}</tbody>
                </table>
            </div>

            <div class="card">
                <h2 style="font-size: 16px; margin-top: 0; color: #f1f5f9;">Recent Executions</h2>
                <table>
                    <thead><tr><th>Exec ID</th><th>Workflow</th><th>Status</th><th>Latency</th></tr></thead>
                    <tbody>{exec_rows or "<tr><td colspan='4' style='padding: 12px; color: #64748b; text-align: center;'>No executions recorded yet.</td></tr>"}</tbody>
                </table>
            </div>
        </div>
    </body>
    </html>
    """
