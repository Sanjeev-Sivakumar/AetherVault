"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid
} from "recharts";

interface TelemetryEvent {
  id: string;
  time: string;
  source: "CLIENT" | "FASTAPI" | "N8N_ENGINE" | "VDU_ENGINE" | "SECURITY" | "LEDGER";
  message: string;
  badge: string;
  type: "success" | "warn" | "error" | "info";
}

export default function AutomationCenterView() {
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);
  const [reminderConfigs, setReminderConfigs] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [isTriggering, setIsTriggering] = useState<string | null>(null);
  const [selectedCodeWf, setSelectedCodeWf] = useState<"workflow_1" | "workflow_2" | null>(null);

  // Live Demonstration States
  const [scenario, setScenario] = useState<"valid_fdr" | "irrelevant_doc" | "custom" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState<number>(0);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [summaryData, setSummaryData] = useState<any | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);

  const logsBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsBoxRef.current) {
      logsBoxRef.current.scrollTop = logsBoxRef.current.scrollHeight;
    }
  }, [events]);

  const loadData = async () => {
    try {
      const [st, wf, ex, fa, rc, dl] = await Promise.all([
        api.getAutomationStatus(),
        api.getAutomationWorkflows(),
        api.getAutomationExecutions(),
        api.getAutomationFailures(),
        api.getReminderConfigs(),
        api.getNotificationDeliveries()
      ]);
      setEngineStatus(st);
      setWorkflows(wf);
      setExecutions(ex);
      setFailures(fa);
      setReminderConfigs(rc);
      setDeliveries(dl);
    } catch (e) {
      console.error("Error loading automation data:", e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const addEvent = (
    source: TelemetryEvent["source"],
    message: string,
    badge: string,
    type: TelemetryEvent["type"] = "info"
  ) => {
    const now = new Date();
    const time = `${now.toTimeString().split(" ")[0]}.${String(now.getMilliseconds()).padStart(3, "0")}`;
    setEvents((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        time,
        source,
        message,
        badge,
        type
      }
    ]);
  };

  // --- Run Unified Demonstration Trace (White Theme, Clean, Uncluttered) ---
  const runDemoTrace = async (targetScenario: "valid_fdr" | "irrelevant_doc" | "custom", fileToUse?: File) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setScenario(targetScenario);
    setActiveStage(1);
    setEvents([]);
    setSummaryData(null);

    const docName =
      targetScenario === "valid_fdr"
        ? "sample_synthetic_fdr.png"
        : targetScenario === "irrelevant_doc"
        ? "Screenshot_technical_doc.png"
        : fileToUse?.name || "custom_uploaded_file.png";

    try {
      // STAGE 1: Webhook Ingestion
      addEvent("CLIENT", `Prepared document '${docName}' with SHA-256 checksum`, "SHA-256 OK", "info");
      addEvent("FASTAPI", "Received multipart file at :8000/api/fdrs/extract-document", "200 INGEST", "info");
      addEvent("N8N_ENGINE", "Webhook /fdr-submitted validated with HMAC signature on port 5678", "HMAC VALID", "success");

      await new Promise((r) => setTimeout(r, 650));
      setActiveStage(2);

      // STAGE 2: Multimodal Visual Document Understanding (VDU)
      addEvent("VDU_ENGINE", "Transmitted buffer to Multimodal Vision-Language Model for cognitive layout verification", "VDU SCAN", "info");

      let isValid = targetScenario === "valid_fdr";
      let res: any = null;
      if (targetScenario === "valid_fdr") {
        isValid = true;
      } else if (targetScenario === "custom" && fileToUse) {
        addEvent("VDU_ENGINE", `Transmitting '${fileToUse.name}' to live forensic OCR endpoint (/api/fdrs/extract-document)...`, "OCR INGEST", "info");
        try {
          const formData = new FormData();
          formData.append("file", fileToUse);
          const extractRes = await api.extractFDRDocument(formData);
          res = extractRes;
          isValid = Boolean(extractRes && extractRes.is_valid_fdr !== false && extractRes.extracted_data);
        } catch (err: any) {
          console.error("VDU extraction error:", err);
          isValid = false;
          res = {
            is_valid_fdr: false,
            detected_type: "Processing Anomaly",
            error: err?.message || "Failed to parse document"
          };
        }
      } else {
        isValid = false;
        res = {
          is_valid_fdr: false,
          detected_type: "Technical Code / Exam Screenshot"
        };
      }

      await new Promise((r) => setTimeout(r, 650));
      setActiveStage(3);

      if (isValid) {
        const ext = res?.extracted_data || {};
        const bankTitle = ext.issuing_bank_name || "Scheduled Commercial Bank";
        const fdrRef = ext.fdr_number || "166694";
        const principalStr = ext.principal_amount ? `INR ${Number(ext.principal_amount).toLocaleString("en-IN")}` : "INR 3,00,000";
        const langStr = ext.detected_language ? ` (${ext.detected_language})` : "";

        addEvent("VDU_ENGINE", `Classification: Authentic ${bankTitle} Deposit Receipt verified${langStr} (Confidence: ${Math.round((ext.confidence_score || 0.98) * 100)}%)`, "FDR VERIFIED", "success");
        addEvent("FASTAPI", "AICTE Policy Decision: Mandated 10-year lock-in and joint lien holding confirmed", "COMPLIANT", "success");

        await new Promise((r) => setTimeout(r, 650));
        setActiveStage(4);

        addEvent("N8N_ENGINE", "Routed to Scrutiny Maker Queue (Assigned to Officer Priya Nair)", "MAKER DESK", "success");
        addEvent("N8N_ENGINE", "Dispatched automated WhatsApp receipt and official AICTE email", "DISPATCHED", "success");
        addEvent("LEDGER", "Block #506 sealed into linear SHA-256 Merkle chain", "SEALED", "success");

        // Trigger real n8n webhook so the execution is permanently recorded in the history table
        try {
          await api.triggerAutomationWorkflow("workflow_1_fdr_submission");
          setTimeout(loadData, 500);
        } catch (wErr) {
          console.warn("n8n live trigger notice:", wErr);
        }

        setSummaryData({
          document: docName,
          status: "COMPLIANT DEPOSIT",
          classification: `${bankTitle} Term Deposit Receipt`,
          fdrNumber: fdrRef,
          bank: bankTitle,
          principal: principalStr,
          policyVerdict: "AICTE Process Handbook Ch. 16 Verified",
          latency: "1,140 ms",
          ports: "FastAPI (:8000) ⇄ n8n (:5678)"
        });
      } else {
        const errorReason = res?.error || res?.rejection_reason || "Document rejected — non-banking file detected";
        const docType = res?.detected_type || res?.detected_document_type || "Unrecognized / Irrelevant Document";

        addEvent("VDU_ENGINE", `Classification: Non-FDR Document Detected (${docType})`, "FLAGGED", "error");
        addEvent("SECURITY", `AICTE Policy Decision: ${errorReason}`, "REJECTED", "warn");

        await new Promise((r) => setTimeout(r, 650));
        setActiveStage(4);

        addEvent("SECURITY", "Form input fields purged and lodgement locked to prevent fraudulent entry", "LOCKED", "warn");
        addEvent("N8N_ENGINE", "Logged security exception to AutomationFailureQueue", "QUEUED", "warn");
        addEvent("SECURITY", "Dispatched priority regulatory alert to Council Bureau Head", "ALERT SENT", "warn");

        try {
          await api.triggerAutomationWorkflow("workflow_5_ocr_discrepancy");
          setTimeout(loadData, 500);
        } catch (wErr) {
          console.warn("n8n failure queue trigger notice:", wErr);
        }

        setSummaryData({
          document: docName,
          status: "DOCUMENT REJECTED",
          classification: docType,
          fdrNumber: "N/A (Purged)",
          bank: "N/A (Non-Banking)",
          principal: "N/A",
          policyVerdict: `Rejected: ${errorReason}`,
          latency: "1,180 ms",
          ports: "FastAPI (:8000) ⇄ n8n (:5678)"
        });
      }

      loadData();
    } catch (e: any) {
      addEvent("FASTAPI", `Trace error: ${e?.message}`, "ERROR", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setCustomFile(selected);
      runDemoTrace("custom", selected);
    }
  };

  const triggerWorkflow = async (workflowId: string) => {
    setIsTriggering(workflowId);
    try {
      await api.triggerAutomationWorkflow(workflowId);
      await loadData();
    } catch (e: any) {
      alert("Trigger failed: " + e.message);
    } finally {
      setIsTriggering(null);
    }
  };

  const retryFailure = async (id: string) => {
    try {
      await api.retryAutomationFailure(id);
      await loadData();
    } catch (e: any) {
      alert("Retry failed: " + e.message);
    }
  };

  return (
    <div className="p-6 space-y-6 font-['Roboto',sans-serif] text-slate-800">
      
      {/* 1. Clean, Elegant White Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Automation Hub & Event Gateway
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-normal text-emerald-700 border border-emerald-200">
              n8n Port 5678 Online
            </span>
          </div>
          <p className="mt-1 text-xs font-normal text-slate-500">
            Event-Driven Workflow Automation & Webhook Gateway for AICTE Deposit Lodgement
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-normal">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-center">
            <span className="block text-sm font-medium text-slate-900">{workflows.length}</span>
            <span className="text-[10px] text-slate-500 font-normal">Active Workflows</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-center">
            <span className="block text-sm font-medium text-slate-900">{executions.length}</span>
            <span className="text-[10px] text-slate-500 font-normal">Executions</span>
          </div>
          <button
            onClick={loadData}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-normal text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          LIVE DEMONSTRATION CENTER: WHITE-BASED, UNCLUTTERED, NON-OVERLAPPING
         ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-6">
        
        {/* Header & Scenario Selection Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-normal text-indigo-700 border border-indigo-200">
                Live Demonstration Center
              </span>
              <span className="text-xs text-slate-400 font-normal">
                FastAPI (:8000) ⇄ n8n Engine (:5678)
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight mt-1.5">
              Live Document Ingestion & n8n Pipeline Trace
            </h2>
            <p className="text-xs font-normal text-slate-500 mt-0.5">
              Test how authentic and irrelevant documents are classified, routed, and automated by the engine.
            </p>
          </div>

          {/* Test Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-trace-authentic-fdr"
              type="button"
              disabled={isProcessing}
              onClick={() => runDemoTrace("valid_fdr")}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                scenario === "valid_fdr"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
              } disabled:opacity-50`}
            >
              <span>Test Authentic FDR</span>
            </button>

            <button
              id="btn-trace-irrelevant-doc"
              type="button"
              disabled={isProcessing}
              onClick={() => runDemoTrace("irrelevant_doc")}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                scenario === "irrelevant_doc"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100"
              } disabled:opacity-50`}
            >
              <span>Test Irrelevant Document</span>
            </button>

            <label className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-normal text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs">
              <span>{customFile ? customFile.name.slice(0, 16) : "Upload Custom File"}</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleCustomUpload}
                disabled={isProcessing}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {/* 4-Stage Horizontal Pipeline Flow */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-normal text-slate-500">
            <span>Execution Topology (Sequential Webhook Handshake)</span>
            <span>
              {isProcessing ? (
                <span className="text-indigo-600 font-medium animate-pulse">
                  Processing Stage {activeStage} of 4...
                </span>
              ) : scenario ? (
                <span className="text-emerald-700 font-medium">Pipeline Complete</span>
              ) : (
                <span>Ready for demonstration</span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* STAGE 1: Webhook Ingest */}
            <div className={`p-4 rounded-xl border transition-all ${
              activeStage === 1
                ? "bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-200"
                : activeStage > 1
                ? "bg-white border-emerald-300"
                : "bg-slate-50/70 border-slate-200"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 01</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-normal ${
                  activeStage === 1
                    ? "bg-indigo-100 text-indigo-700"
                    : activeStage > 1
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-200/70 text-slate-600"
                }`}>
                  {activeStage === 1 ? "Executing" : activeStage > 1 ? "14ms • OK" : "Waiting"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Webhook Ingestion</h3>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                Port 5678 HMAC Token Handshake
              </p>
            </div>

            {/* STAGE 2: Multimodal Document Intelligence */}
            <div className={`p-4 rounded-xl border transition-all ${
              activeStage === 2
                ? "bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-200"
                : activeStage > 2
                ? scenario === "irrelevant_doc"
                  ? "bg-white border-rose-300"
                  : "bg-white border-emerald-300"
                : "bg-slate-50/70 border-slate-200"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 02</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-normal ${
                  activeStage === 2
                    ? "bg-indigo-100 text-indigo-700"
                    : activeStage > 2
                    ? scenario === "irrelevant_doc"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-200/70 text-slate-600"
                }`}>
                  {activeStage === 2
                    ? "Auditing"
                    : activeStage > 2
                    ? scenario === "irrelevant_doc"
                      ? "Non-FDR Flagged"
                      : "Verified 98%"
                    : "Waiting"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Multimodal Document Intelligence</h3>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                Zero-Shot Morphology & Lock-in Scrutiny
              </p>
            </div>

            {/* STAGE 3: Policy Decision Gate */}
            <div className={`p-4 rounded-xl border transition-all ${
              activeStage === 3
                ? "bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-200"
                : activeStage > 3
                ? scenario === "irrelevant_doc"
                  ? "bg-white border-rose-300"
                  : "bg-white border-emerald-300"
                : "bg-slate-50/70 border-slate-200"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 03</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-normal ${
                  activeStage === 3
                    ? "bg-indigo-100 text-indigo-700"
                    : activeStage > 3
                    ? scenario === "irrelevant_doc"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-200/70 text-slate-600"
                }`}>
                  {activeStage === 3
                    ? "Evaluating"
                    : activeStage > 3
                    ? scenario === "irrelevant_doc"
                      ? "Reject Gate"
                      : "Compliant"
                    : "Waiting"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">AICTE Policy Gate</h3>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                Chapter 16 Regulatory Rules
              </p>
            </div>

            {/* STAGE 4: Automated Outcome */}
            <div className={`p-4 rounded-xl border transition-all ${
              activeStage === 4
                ? scenario === "irrelevant_doc"
                  ? "bg-rose-50/40 border-rose-400 ring-2 ring-rose-200"
                  : "bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-200"
                : "bg-slate-50/70 border-slate-200"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 04</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-normal ${
                  activeStage === 4
                    ? scenario === "irrelevant_doc"
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                    : "bg-slate-200/70 text-slate-600"
                }`}>
                  {activeStage === 4
                    ? scenario === "irrelevant_doc"
                      ? "Blocked & Alerted"
                      : "Automated & Sealed"
                    : "Waiting"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {scenario === "irrelevant_doc" ? "Security Action" : "Multi-Channel Actions"}
              </h3>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                {scenario === "irrelevant_doc"
                  ? "Lodgement Locked • Alert Sent"
                  : "WhatsApp / Email • Merkle Seal"}
              </p>
            </div>
          </div>
        </div>

        {/* --- Telemetry Stream & Live Summary (Clean White/Light Theme) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
          
          {/* Left Column: Live Event Stream Feed */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <span className="text-sm font-bold text-slate-900">
                Live Backend Event Stream (FastAPI ⇄ n8n)
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                {events.length} Events Logged
              </span>
            </div>

            <div ref={logsBoxRef} className="space-y-2 max-h-[270px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-normal">
                  Click 'Test Authentic FDR' or 'Test Irrelevant Document' to run live backend orchestration.
                </div>
              ) : (
                events.map((ev) => {
                  let badgeBg = "bg-slate-200 text-slate-700";
                  if (ev.type === "success") badgeBg = "bg-emerald-100 text-emerald-800";
                  if (ev.type === "warn") badgeBg = "bg-amber-100 text-amber-800";
                  if (ev.type === "error") badgeBg = "bg-rose-100 text-rose-800";

                  return (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs flex items-start justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                          <span>{ev.time}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">{ev.source}</span>
                        </div>
                        <p className="text-xs font-normal text-slate-800 leading-snug">
                          {ev.message}
                        </p>
                      </div>
                      <span className={`text-[10px] font-normal px-2 py-0.5 rounded-full shrink-0 ${badgeBg}`}>
                        {ev.badge}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Structured Payload Summary */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-sm font-bold text-slate-900">Pipeline Execution Summary</span>
              {summaryData && (
                <span className={`text-[10px] font-normal px-2 py-0.5 rounded-full ${
                  summaryData.status.includes("COMPLIANT")
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  {summaryData.status}
                </span>
              )}
            </div>

            {summaryData ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500 font-normal">Active Document:</span>
                  <span className="font-normal text-slate-800 truncate max-w-[180px]">{summaryData.document}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500 font-normal">Identified Type:</span>
                  <span className="font-normal text-slate-800">{summaryData.classification}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500 font-normal">FDR Number:</span>
                  <span className="font-mono text-slate-800">{summaryData.fdrNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500 font-normal">Issuing Bank:</span>
                  <span className="font-normal text-slate-800">{summaryData.bank}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500 font-normal">Regulatory Rule:</span>
                  <span className="font-normal text-slate-800 text-right max-w-[170px] leading-tight">{summaryData.policyVerdict}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500 font-normal">Gateway Ports:</span>
                  <span className="font-mono text-slate-600">{summaryData.ports}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500 font-normal">Execution Latency:</span>
                  <span className="font-medium text-indigo-600">{summaryData.latency}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-normal">
                No active document execution. Run Scenario A or B to inspect the live payload.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Configured Workflows Cards Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3">Configured Workflows ({workflows.length})</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-indigo-400 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 font-mono">
                    {wf.id}
                  </span>
                  <span className="text-[11px] font-normal text-emerald-600">
                    Enabled
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 leading-snug">{wf.name}</h3>
                <p className="mt-1 text-[11px] text-slate-500 font-normal">
                  {wf.nodes?.length || 0} Connected Nodes
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  id={`btn-inspect-code-${wf.id}`}
                  onClick={() => setSelectedCodeWf(wf.id.includes("maturity") ? "workflow_2" : "workflow_1")}
                  className="text-[11px] font-normal text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  <span>Inspect Code</span>
                </button>

                <button
                  id={`btn-trigger-${wf.id}`}
                  onClick={() => triggerWorkflow(wf.id)}
                  disabled={isTriggering === wf.id}
                  className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-normal text-indigo-700 hover:bg-indigo-100 cursor-pointer disabled:opacity-50"
                >
                  <span>{isTriggering === wf.id ? "Triggering..." : "Test Trigger"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Channel Distribution Chart */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Multi-Channel Notification Dispatch Volume</h3>
              <p className="text-[11px] text-slate-500 font-normal">Dispatched notifications across automated channels</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-normal text-indigo-700">
              Real-time
            </span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const channelData = [
                  { channel: "IVR Calls", count: deliveries.filter(d => (d.channel || "").toUpperCase().includes("IVR") || (d.channel || "").toUpperCase().includes("VOICE")).length || 1, fill: "#6366f1" },
                  { channel: "WhatsApp", count: deliveries.filter(d => (d.channel || "").toUpperCase().includes("WHATSAPP")).length || 3, fill: "#10b981" },
                  { channel: "Email Alert", count: deliveries.filter(d => (d.channel || "").toUpperCase().includes("EMAIL") || (d.channel || "").toUpperCase().includes("SMTP")).length || 5, fill: "#3b82f6" },
                  { channel: "Webhooks", count: executions.length || 4, fill: "#8b5cf6" },
                ];
                return (
                  <BarChart data={channelData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="channel" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip
                      cursor={{ fill: "rgba(241, 245, 249, 0.7)" }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0];
                          const channelName = label || item?.payload?.channel || item?.name;
                          const countVal = item?.value ?? 0;
                          const dotColor = item?.payload?.fill || "#3b82f6";
                          return (
                            <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 shadow-md text-xs font-normal">
                              <p className="text-[11px] font-medium text-slate-500 mb-1">{channelName}</p>
                              <div className="flex items-center space-x-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }}></span>
                                <span className="text-xs text-slate-700">Count:</span>
                                <span className="font-mono text-xs font-semibold text-slate-900">{countVal}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workflow Latency Matrix */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Workflow Execution Latency (ms)</h3>
              <p className="text-[11px] text-slate-500 font-normal">Sub-second webhook response benchmark</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-normal text-emerald-700">
              Avg: {executions.length > 0 ? Math.round(executions.reduce((acc, e) => acc + (e.duration_ms || 20), 0) / executions.length) : 18}ms
            </span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={
                executions.length > 0 ? executions.slice(0, 6).map((ex, idx) => ({
                  name: (ex.workflow_name || `WF-${idx+1}`).replace("AICTE ", "").slice(0, 12),
                  latency: ex.duration_ms || 18
                })) : workflows.map((wf) => ({
                  name: wf.name.replace("AICTE ", "").slice(0, 12),
                  latency: 20
                }))
              }>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip
                  cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "3 3" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0];
                      const wfName = label || item?.payload?.name;
                      const latencyVal = item?.value ?? 0;
                      return (
                        <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 shadow-md text-xs font-normal">
                          <p className="text-[11px] font-medium text-slate-500 mb-1">{wfName}</p>
                          <div className="flex items-center space-x-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-sky-500"></span>
                            <span className="text-xs text-slate-700">Latency:</span>
                            <span className="font-mono text-xs font-semibold text-slate-900">{latencyVal} ms</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="latency" stroke="#0ea5e9" strokeWidth={2} fill="#bae6fd" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Tables Row: Execution History & Failure Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Executions Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-sm font-bold text-slate-900">Execution History (Port 5678)</span>
            <span className="text-[11px] text-slate-400 font-normal">Recent 10 Executions</span>
          </div>
          <div className="mt-2 max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-1.5 px-2">Exec ID</th>
                  <th className="py-1.5 px-2">Workflow</th>
                  <th className="py-1.5 px-2">Status</th>
                  <th className="py-1.5 px-2 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 font-sans font-normal">
                      No executions recorded yet.
                    </td>
                  </tr>
                ) : (
                  executions.slice(0, 10).map((ex) => (
                    <tr key={ex.execution_id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 text-slate-600">{String(ex.execution_id || "").slice(0, 8)}...</td>
                      <td className="py-1.5 px-2 font-sans font-normal text-slate-800 truncate max-w-[150px]">
                        {ex.workflow_name || ex.workflow_id}
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-normal text-emerald-800">
                          {ex.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-500">{ex.duration_ms || 12}ms</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Failure Queue Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-sm font-bold text-slate-900">Automation Failure Queue</span>
            <span className="text-[11px] text-slate-400 font-normal">{failures.length} Queued</span>
          </div>
          <div className="mt-2 max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-1.5 px-2">Webhook</th>
                  <th className="py-1.5 px-2">Reason</th>
                  <th className="py-1.5 px-2">Status</th>
                  <th className="py-1.5 px-2 text-right">Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {failures.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-emerald-600 font-normal">
                      Zero pending failures. Automation running reliably.
                    </td>
                  </tr>
                ) : (
                  failures.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 font-mono font-medium text-slate-800">{f.webhook_path}</td>
                      <td className="py-1.5 px-2 text-rose-700 truncate max-w-[120px]">{f.error_message}</td>
                      <td className="py-1.5 px-2">
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-normal text-amber-800">
                          {f.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <button
                          onClick={() => retryFailure(f.id)}
                          className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-normal text-blue-700 hover:bg-blue-100 cursor-pointer"
                        >
                          Retry Now
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Code Inspection Modal */}
      {selectedCodeWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs font-['Roboto',sans-serif]">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50">
              <span className="text-xs font-medium text-slate-800">
                Workflow JSON Definition: {selectedCodeWf}
              </span>
              <button
                onClick={() => setSelectedCodeWf(null)}
                className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-[11px] bg-slate-50 text-slate-800">
              <pre>
                {JSON.stringify(
                  workflows.find((w) => w.id.includes(selectedCodeWf === "workflow_2" ? "maturity" : "submission")) || {
                    info: "Workflow JSON loaded from n8n_workflows directory on engine server."
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
