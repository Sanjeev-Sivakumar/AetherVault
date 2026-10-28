"use client";

import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, Eye, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

interface ScrutinyViewProps {
  fdrs: any[];
  onSelectFdr: (fdr: any) => void;
  onRefresh?: () => void;
  userRole?: string;
}

export default function ScrutinyView({
  fdrs,
  onSelectFdr,
  onRefresh,
  userRole
}: ScrutinyViewProps) {
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const scrutinyList = fdrs.filter(
    (f) =>
      f.lifecycle_status === "UNDER_SCRUTINY" ||
      f.lifecycle_status === "PENDING_APPROVAL" ||
      f.lifecycle_status === "DISCREPANCY_FLAGGED"
  );

  const handleScrutinyAction = async (fdrId: string, action: string) => {
    setIsProcessing(fdrId);
    try {
      const notes = actionNotes[fdrId] || "Scrutiny assessment verified";
      await api.scrutinyFDR(fdrId, action, notes);
      if (onRefresh) onRefresh();
    } catch (e: any) {
      alert("Scrutiny action failed: " + e.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleApproveAction = async (fdrId: string, action: string) => {
    setIsProcessing(fdrId);
    try {
      const notes = actionNotes[fdrId] || "Approved by Competent Authority";
      await api.approveFDR(fdrId, action, notes);
      onRefresh?.();
    } catch (e: any) {
      alert("Approval action failed: " + e.message);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Scrutiny & Verification
        </h1>
        <p className="text-xs font-medium text-slate-500">
          {scrutinyList.length} Pending Records
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">FDR Instrument</th>
                <th className="py-2.5 px-3">Bank & Branch</th>
                <th className="py-2.5 px-3">Principal Amount</th>
                <th className="py-2.5 px-3">Current Status</th>
                <th className="py-2.5 px-3">Officer Remarks</th>
                <th className="py-2.5 px-3 text-right">Verification Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {scrutinyList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No instruments currently pending in the scrutiny queue.
                  </td>
                </tr>
              ) : (
                scrutinyList.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-slate-900">{f.fdr_number}</div>
                      <div className="text-[10px] text-slate-400">{f.account_number}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div>{f.issuing_bank_name}</div>
                      <div className="text-[10px] text-slate-400">{f.branch_name}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      ₹ {f.principal_amount?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        {f.lifecycle_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        placeholder="Add notes..."
                        value={actionNotes[f.id] || ""}
                        onChange={(e) =>
                          setActionNotes({ ...actionNotes, [f.id]: e.target.value })
                        }
                        className="rounded border border-slate-200 px-2 py-1 text-xs w-36 focus:outline-hidden focus:border-blue-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => onSelectFdr(f)}
                        className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
                      >
                        3-Way Review
                      </button>

                      {f.lifecycle_status === "UNDER_SCRUTINY" && (
                        <button
                          onClick={() => handleScrutinyAction(f.id, "APPROVE")}
                          disabled={isProcessing === f.id}
                          className="rounded bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer disabled:opacity-50"
                        >
                          Pass Scrutiny
                        </button>
                      )}

                      {f.lifecycle_status === "PENDING_APPROVAL" && (
                        <button
                          onClick={() => handleApproveAction(f.id, "APPROVE")}
                          disabled={isProcessing === f.id}
                          className="rounded bg-indigo-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-800 cursor-pointer disabled:opacity-50"
                        >
                          Council Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
