"use client";

import React, { useState, useEffect } from "react";
import { X, Undo2, AlertTriangle, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

interface ReleaseModalProps {
  fdr: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReleaseModal({ fdr, onClose, onSuccess }: ReleaseModalProps) {
  const [justificationType, setJustificationType] = useState("COMPLIANCE_TERM_COMPLETED");
  const [justification, setJustification] = useState("Institution completed 10-year regulatory compliance without infractions.");
  const [refundAccount, setRefundAccount] = useState("110022339901");
  const [refundBank, setRefundBank] = useState("Bharat National Bank");
  const [refundIfsc, setRefundIfsc] = useState("BNBK0009988");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<any>(null);
  const [isLoadingEligibility, setIsLoadingEligibility] = useState(true);

  useEffect(() => {
    if (fdr?.id) {
      fetch(`http://127.0.0.1:8000/api/releases/check-eligibility/${fdr.id}`)
        .then((res) => res.json())
        .then((data) => setEligibility(data))
        .catch(console.error)
        .finally(() => setIsLoadingEligibility(false));
    }
  }, [fdr?.id]);

  const isLocked = eligibility && !eligibility.eligible && justificationType !== "INSTITUTION_CLOSURE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      alert("Release submission blocked: " + eligibility.lock_reason);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitRelease({
        fdr_id: fdr.id,
        justification_type: justificationType,
        justification_details: justification,
        refund_account_no: refundAccount,
        refund_bank_ifsc: refundIfsc,
        refund_bank_name: refundBank
      });
      alert("Release & refund claim submitted for AICTE Maker-Checker scrutiny.");
      onSuccess();
    } catch (e: any) {
      alert("Release claim failed: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Release Instrument</h2>
            <p className="text-xs font-semibold text-slate-500">Initiate Release for #{fdr.fdr_number}</p>
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
            Close
          </button>
        </div>

        {/* Smart Release Engine Verification Banner */}
        {eligibility && (
          <div className={`p-4 text-xs border-b ${
            isLocked
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}>
            <div className="flex items-start space-x-2.5">
              {isLocked ? (
                <Lock className="h-4 w-4 text-rose-700 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              )}
              <div>
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  Smart Release Conditions Engine: {isLocked ? "Auto-Locked" : "Pre-Approved"}
                </span>
                <p className="mt-0.5 text-[11px]">
                  {isLocked
                    ? eligibility.lock_reason
                    : `Institution verified clean: ${eligibility.years_completed} years compliance completed. Zero active litigation or regulatory penalties.`}
                </p>
                {isLocked && (
                  <p className="mt-1 text-[10px] text-rose-700 font-semibold italic">
                    Note: To override, select category &apos;Approved Closure of Institution&apos; with formal Competent Authority sanction.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-800 text-xs block mb-1">Regulatory Justification Category</label>
            <select
              value={justificationType}
              onChange={(e) => setJustificationType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 focus:outline-hidden"
            >
              <option value="COMPLIANCE_TERM_COMPLETED">10-Year Mandatory Term Completed</option>
              <option value="INSTITUTION_CLOSURE">Approved Closure of Institution</option>
              <option value="EXCESS_DEPOSIT_REFUND">Excess Deposit Adjustment</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-800 text-xs block mb-1">Justification Details / Council Reference</label>
            <textarea
              required
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1">Refund Bank Name</label>
              <input
                type="text"
                required
                value={refundBank}
                onChange={(e) => setRefundBank(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1">Bank IFSC</label>
              <input
                type="text"
                required
                value={refundIfsc}
                onChange={(e) => setRefundIfsc(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-300 p-2 font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Refund Account Number</label>
            <input
              type="text"
              required
              value={refundAccount}
              onChange={(e) => setRefundAccount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLocked}
              className={`rounded-lg px-4 py-1.5 font-semibold text-white shadow-xs transition cursor-pointer ${
                isLocked
                  ? "bg-slate-400 cursor-not-allowed opacity-60"
                  : "bg-blue-700 hover:bg-blue-800 disabled:opacity-50"
              }`}
            >
              {isSubmitting ? "Submitting..." : isLocked ? "Auto-Locked by Compliance Engine" : "Submit Release Claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
