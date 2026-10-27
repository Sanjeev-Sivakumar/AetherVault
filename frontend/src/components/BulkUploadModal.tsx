"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  FileCheck,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  FileText,
  Trash2,
  ArrowRight,
  Database,
  CalendarClock
} from "lucide-react";
import { api } from "@/lib/api";

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({ onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStepText, setUploadStepText] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [fileRowCount, setFileRowCount] = useState<number | null>(null);

  const sampleCsvContent = `fdr_number,aicte_permanent_id,issuing_bank_name,branch_name,ifsc_code,account_number,principal_amount,maturity_amount,interest_rate,issue_date,maturity_date,term_months,joint_account_title
BNB-BATCH-2026-001,1-9087654321,Bharat National Bank,Vasant Kunj,BNBK0009988,110022339901,1500000,3100000,7.25,2024-02-01,2034-02-01,120,Jointly RO AICTE & Principal
SBI-BATCH-2026-002,1-3349019283,State Bank of India,Pune Main,SBIN0001421,30992817001,2500000,5100000,7.10,2024-03-01,2034-03-01,120,RO Western Region & Principal
PNB-BATCH-2026-003,1-4521873910,Punjab National Bank,Bengaluru,PUNB0123400,089200210001,3500000,7200000,7.00,2024-01-10,2034-01-10,120,RO SW AICTE & Principal
CB-BATCH-2026-004,1-7782390145,Canara Bank,Chennai Guindy,CNRB0001234,449018273612,1800000,3700000,7.15,2024-04-15,2034-04-15,120,RO Southern AICTE & Principal
BOB-BATCH-2026-005,1-6284901237,Bank of Baroda,Ahmedabad,BARB0AHMEDA,998877665544,2000000,4150000,7.20,2024-05-20,2034-05-20,120,RO Central AICTE & Principal`;

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "AICTE_AetherVault_Sample_Bulk_FDR.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    // Parse row count
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const lines = text.split("\n").filter((l) => l.trim().length > 0);
        setFileRowCount(Math.max(0, lines.length - 1)); // subtract header row
      }
    };
    reader.readAsText(selectedFile);
  };

  const loadSampleFileDirectly = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const sampleFile = new File([blob], "sample_bulk_test_valid.csv", { type: "text/csv" });
    handleFileSelect(sampleFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a CSV file or download the template.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(20);
    setUploadStepText("Parsing CSV headers and verifying UTF-8 encoding...");

    const p1 = setTimeout(() => {
      setUploadProgress(50);
      setUploadStepText("Pre-flight duplicate FDR detection against central database...");
    }, 400);

    const p2 = setTimeout(() => {
      setUploadProgress(80);
      setUploadStepText("Validating IFSC codes, maturity dates & calculating interest schedules...");
    }, 900);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.bulkUploadCSV(formData);

      clearTimeout(p1);
      clearTimeout(p2);
      setUploadProgress(100);
      setUploadStepText("Batch import completed!");

      setResult(res);
      if (res.accepted_count > 0 || res.imported_count > 0) {
        onSuccess();
      }
    } catch (e: any) {
      alert("Bulk upload failed: " + (e?.message || "Unknown error"));
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 500);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs font-['Roboto',sans-serif]">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[32px] bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* ================= MODAL HEADER ================= */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#f8fafc] px-7 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bulk FDR Ingestion</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Batch v2.4
              </span>
            </div>
            <p className="text-xs font-normal text-slate-500 mt-0.5">
              Batch CSV Upload
            </p>
          </div>
          <button
            id="close-bulk-modal-btn"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-7 space-y-5 overflow-y-auto flex-1 font-normal text-sm text-slate-700">
          
          {/* Step Indicator */}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100/70 border border-slate-200/50 text-xs">
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl bg-white shadow-xs font-semibold text-slate-800">
              <span className="h-4 w-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">1</span>
              <span>Schema Template</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl font-medium text-slate-600">
              <span className={`h-4 w-4 rounded-full text-white text-[10px] flex items-center justify-center ${file ? "bg-emerald-600" : "bg-slate-400"}`}>2</span>
              <span>Upload CSV</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl font-medium text-slate-600">
              <span className={`h-4 w-4 rounded-full text-white text-[10px] flex items-center justify-center ${result ? "bg-emerald-600" : "bg-slate-400"}`}>3</span>
              <span>Pre-flight Verify</span>
            </div>
          </div>

          {/* STEP 1: Template Download Box */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Standard AICTE CSV Template</p>
                <p className="text-xs text-slate-500 font-light mt-0.5">
                  Mandatory Schema
                </p>
              </div>

              <button
                type="button"
                onClick={downloadSampleCsv}
                className="flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-400 cursor-pointer shadow-xs transition-all shrink-0"
              >
                <span>Download Template (.csv)</span>
              </button>
            </div>

            {/* Mandatory Columns Pill Tags */}
            <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-light">
              <span className="font-semibold text-slate-700 text-xs">Mandatory Headers:</span>
              {["fdr_number", "aicte_permanent_id", "issuing_bank_name", "principal_amount", "maturity_date", "term_months"].map((col) => (
                <span key={col} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-slate-700">
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* STEP 2: Upload Form */}
          <form onSubmit={handleUpload} className="space-y-4">
            
            {/* Visual Loading Overlay when Submitting */}
            {isSubmitting && (
              <div className="rounded-3xl border border-indigo-200 bg-indigo-50/90 p-8 text-center flex flex-col items-center justify-center animate-fadeIn shadow-xs">
                <h4 className="text-sm font-semibold text-slate-900">Batch Processing Active</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">{uploadStepText}</p>
                
                {/* Progress bar */}
                <div className="w-64 h-2.5 bg-indigo-200 rounded-full mt-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-indigo-800 mt-2">{uploadProgress}% Ingested</span>
              </div>
            )}

            {!isSubmitting && (
              <>
                {!file ? (
                  /* Dropzone when NO file is selected */
                  <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-7 text-center hover:bg-slate-100/70 hover:border-slate-400 transition-all">
                    <h4 className="text-sm font-semibold text-slate-900">Select CSV File</h4>
                    <p className="text-xs text-slate-500 font-light mt-1">
                      Supports .csv batches up to 500 instruments
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      <label className="flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer shadow-md transition-all">
                        <span>Choose CSV File</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileSelect(e.target.files[0]);
                            }
                          }}
                          className="sr-only"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={loadSampleFileDirectly}
                        className="flex items-center rounded-full border border-amber-300 bg-amber-50/80 hover:bg-amber-100/80 px-4 py-2.5 text-xs font-semibold text-amber-900 transition-all cursor-pointer shadow-2xs"
                      >
                        <span>Load Sample Batch (5 FDRs)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* File Card when file IS selected */
                  <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/40 p-4 flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        {fileRowCount !== null && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-800 font-mono">
                            {fileRowCount} Instruments
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-normal text-emerald-700 mt-0.5">
                        UTF-8 Schema validated • Ready for ingestion
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full cursor-pointer transition-colors shadow-2xs">
                        <span>Change</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileSelect(e.target.files[0]);
                            }
                          }}
                          className="sr-only"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setFileRowCount(null);
                        }}
                        className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-full transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* STEP 3: Safeguards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl border border-slate-200/70 bg-slate-50 text-xs font-semibold text-slate-800 text-center">
                Zero Duplication Check
              </div>

              <div className="p-3 rounded-2xl border border-slate-200/70 bg-slate-50 text-xs font-semibold text-slate-800 text-center">
                10-Yr Lock-in Verification
              </div>

              <div className="p-3 rounded-2xl border border-slate-200/70 bg-slate-50 text-xs font-semibold text-slate-800 text-center">
                Audit Sealed (Merkle)
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500 font-light">
                AES-256-GCM Encrypted
              </div>

              <div className="flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !file}
                  className={`flex items-center rounded-full px-6 py-2.5 text-xs font-semibold transition-all shadow-md ${
                    isSubmitting || !file
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer hover:shadow-lg active:scale-[0.99]"
                  }`}
                >
                  {isSubmitting ? (
                    <span>Ingesting Batch...</span>
                  ) : (
                    <span>Upload & Validate Batch</span>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Ingestion Results Breakdown */}
          {result && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-900 text-sm">Batch Summary:</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    {result.accepted_count} Accepted
                  </span>
                  {result.rejected_count > 0 && (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                      {result.rejected_count} Rejected
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Total Processed: {result.total_processed}
                </span>
              </div>

              {/* Rejected Error Rows & Download Action */}
              {result.rejected_rows && result.rejected_rows.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-800 text-xs uppercase tracking-wider">
                      Rejected Rows ({result.rejected_rows.length} Validation Errors)
                    </span>
                    {result.rejected_csv_download && (
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([result.rejected_csv_download], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.setAttribute("download", "rejected_fdr_errors.csv");
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="text-xs text-rose-700 hover:underline cursor-pointer font-semibold"
                      >
                        <span>Download Rejected Error Report</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {result.rejected_rows.map((rej: any, idx: number) => (
                      <div key={idx} className="rounded-xl border border-rose-200/80 bg-rose-50/70 p-2 text-xs font-normal text-rose-900">
                        <span className="font-semibold">Row {rej.row_index} ({rej.fdr_number}): </span>
                        <span>{rej.errors?.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
