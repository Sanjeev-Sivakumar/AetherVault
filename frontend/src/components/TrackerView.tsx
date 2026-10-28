"use client";

import React, { useState } from "react";
import { CalendarClock, AlertTriangle, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";

interface TrackerViewProps {
  fdrs: any[];
  onSelectFdr: (fdr: any) => void;
  onOpenRenewal?: (fdr: any) => void;
  onRenewFdr?: (fdr: any) => void;
  onRefresh?: () => void;
  userRole?: string;
}

export default function TrackerView({
  fdrs,
  onSelectFdr,
  onOpenRenewal,
  onRenewFdr,
  onRefresh,
  userRole
}: TrackerViewProps) {
  const [isScanning, setIsScanning] = useState(false);

  const trackerList = fdrs.filter(
    (f) =>
      f.lifecycle_status === "EXPIRING_SOON" ||
      f.lifecycle_status === "MATURED" ||
      f.lifecycle_status === "ACTIVE"
  );

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const res = await api.triggerMaturityReminders();
      alert(`Maturity scan completed: Dispatched ${res.dispatched_count} reminder alerts via multi-channel router.`);
      onRefresh?.();
    } catch (e: any) {
      alert("Scan failed: " + e.message);
    } finally {
      setIsScanning(false);
    }
  };

  const getDaysLeft = (matDate: string) => {
    const today = new Date();
    const mat = new Date(matDate);
    const diffTime = mat.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Maturity & Renewals
          </h1>
          <p className="text-xs font-medium text-slate-500">
            {trackerList.length} Monitored Deposits
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="inline-flex items-center rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-800 cursor-pointer disabled:opacity-50"
        >
          <span>{isScanning ? "Scanning..." : "Run Maturity Scan"}</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">FDR Reference</th>
                <th className="py-2.5 px-3">Bank & Branch</th>
                <th className="py-2.5 px-3">Principal Amount</th>
                <th className="py-2.5 px-3">Maturity Date</th>
                <th className="py-2.5 px-3">Time Remaining</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Rollover Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {trackerList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No active instruments currently in tracking window.
                  </td>
                </tr>
              ) : (
                trackerList.map((f) => {
                  const days = getDaysLeft(f.maturity_date);
                  const isMatured = days <= 0;
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{f.fdr_number}</td>
                      <td className="py-2.5 px-3">
                        <div>{f.issuing_bank_name}</div>
                        <div className="text-[10px] text-slate-400">{f.branch_name}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        ₹ {f.principal_amount?.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{f.maturity_date}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            isMatured
                              ? "text-rose-700 font-bold"
                              : days <= 30
                              ? "text-amber-700 font-bold"
                              : "text-slate-600"
                          }`}
                        >
                          {isMatured ? `Matured (${Math.abs(days)}d ago)` : `${days} Days Left`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${
                            f.lifecycle_status === "MATURED"
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : f.lifecycle_status === "EXPIRING_SOON"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {f.lifecycle_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => onSelectFdr(f)}
                          className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => (onOpenRenewal || onRenewFdr)?.(f)}
                          className="rounded bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                        >
                          Renew 10-Yr
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
