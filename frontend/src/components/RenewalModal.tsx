"use client";

import React, { useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

interface RenewalModalProps {
  fdr: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RenewalModal({ fdr, onClose, onSuccess }: RenewalModalProps) {
  const [newFdrNumber, setNewFdrNumber] = useState(`${fdr.fdr_number}-R1`);
  const [principalAmount, setPrincipalAmount] = useState(fdr.principal_amount || 1500000);
  const [maturityAmount, setMaturityAmount] = useState(fdr.maturity_amount || 3100000);
  const [interestRate, setInterestRate] = useState(7.2);
  const [issueDate, setIssueDate] = useState(fdr.maturity_date || "2024-02-01");
  const [maturityDate, setMaturityDate] = useState("2034-02-01");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.renewFDR(fdr.id, {
        new_fdr_number: newFdrNumber,
        new_principal_amount: principalAmount,
        new_maturity_amount: maturityAmount,
        new_interest_rate: interestRate,
        new_issue_date: issueDate,
        new_maturity_date: maturityDate,
        new_term_months: 120
      });
      alert("FDR 10-year rollover renewal submitted successfully with parent-child lineage.");
      onSuccess();
    } catch (e: any) {
      alert("Renewal failed: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Renew Instrument</h2>
            <p className="text-xs font-semibold text-slate-500">Replaces #{fdr.fdr_number}</p>
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-800 text-xs block mb-1">New FDR Instrument Reference</label>
            <input
              type="text"
              required
              value={newFdrNumber}
              onChange={(e) => setNewFdrNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1">Principal Amount (INR)</label>
              <input
                type="number"
                required
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1">Maturity Amount (INR)</label>
              <input
                type="number"
                required
                value={maturityAmount}
                onChange={(e) => setMaturityAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1">New Issue Date</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1">New Maturity Date (10-Yr)</label>
              <input
                type="date"
                required
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-700 px-4 py-1.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting Rollover..." : "Execute Rollover & Version Linkage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
