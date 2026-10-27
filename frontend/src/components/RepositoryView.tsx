"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Download,
  FolderArchive,
  Eye,
  RefreshCw,
  Undo2,
  FileSpreadsheet,
  AlertCircle,
  FileX,
  Plus,
  Building,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  PieChart as PieIcon,
  TrendingUp,
  Landmark
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";

interface RepositoryViewProps {
  fdrs: any[];
  onSelectFdr: (fdr: any) => void;
  onOpenRegister: () => void;
  onOpenBulk: () => void;
  onRenewFdr: (fdr: any) => void;
  onReleaseFdr: (fdr: any) => void;
  userRole?: string;
}

export default function RepositoryView({
  fdrs,
  onSelectFdr,
  onOpenRegister,
  onOpenBulk,
  onRenewFdr,
  onReleaseFdr,
  userRole
}: RepositoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [bankFilter, setBankFilter] = useState("ALL");
  const [missingDocsOnly, setMissingDocsOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredFdrs = fdrs.filter((f) => {
    const matchesSearch =
      searchTerm === "" ||
      f.fdr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.issuing_bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.branch_name && f.branch_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.account_number && f.account_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || f.lifecycle_status === statusFilter;
    const matchesBank = bankFilter === "ALL" || f.issuing_bank_name === bankFilter;
    const matchesMissing = !missingDocsOnly || !f.document_path || f.document_path === "";
    const matchesOverdue = !overdueOnly || (f.maturity_date < todayStr && f.lifecycle_status !== "RELEASE_APPROVED");

    return matchesSearch && matchesStatus && matchesBank && matchesMissing && matchesOverdue;
  });

  const uniqueBanks = Array.from(new Set(fdrs.map((f) => f.issuing_bank_name))).filter(Boolean);

  const exportUrl = `http://127.0.0.1:8000/api/reports/export?format=csv&status=${statusFilter}&bank=${bankFilter}&missing_documents=${missingDocsOnly}&overdue_only=${overdueOnly}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-[#eafaf1] text-emerald-800 border-emerald-200/60";
      case "EXPIRING_SOON":
        return "bg-[#fef2eb] text-amber-800 border-orange-200/60";
      case "MATURED":
        return "bg-rose-50 text-rose-800 border-rose-200/60";
      case "UNDER_SCRUTINY":
      case "PENDING_APPROVAL":
        return "bg-[#eef5fc] text-blue-800 border-blue-200/60";
      case "RELEASE_APPROVED":
        return "bg-slate-100 text-slate-700 border-slate-200/60";
      case "DISCREPANCY_FLAGGED":
        return "bg-red-50 text-red-800 border-red-200/60";
      case "REPLACED_ROLLED_OVER":
        return "bg-[#f3eefa] text-purple-800 border-purple-200/60";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // Dynamic Bank Allocation & Volume Distribution
  const bankDataMap: Record<string, { count: number; volumeCrores: number }> = {};
  fdrs.forEach((f) => {
    const bName = f.issuing_bank_name || "Other Bank";
    const shortName = bName.replace("Bank of India", "SBI").replace("National Bank", "NB").replace("State Bank", "SBI");
    if (!bankDataMap[shortName]) {
      bankDataMap[shortName] = { count: 0, volumeCrores: 0 };
    }
    bankDataMap[shortName].count += 1;
    bankDataMap[shortName].volumeCrores += (Number(f.principal_amount) || 0) / 10000000;
  });

  const bankAnalyticsData = Object.entries(bankDataMap)
    .map(([name, d]) => ({
      name,
      count: d.count,
      volumeCrores: Number(d.volumeCrores.toFixed(2))
    }))
    .sort((a, b) => b.volumeCrores - a.volumeCrores)
    .slice(0, 5);

  // Status Distribution
  const statusDataMap: Record<string, number> = {};
  fdrs.forEach((f) => {
    const s = f.lifecycle_status || "OTHER";
    statusDataMap[s] = (statusDataMap[s] || 0) + 1;
  });
  const statusAnalyticsData = [
    { name: "Active", count: statusDataMap["ACTIVE"] || 0, color: "#10b981" },
    { name: "Scrutiny", count: (statusDataMap["UNDER_SCRUTINY"] || 0) + (statusDataMap["PENDING_APPROVAL"] || 0), color: "#3b82f6" },
    { name: "Expiring Soon", count: statusDataMap["EXPIRING_SOON"] || 0, color: "#f59e0b" },
    { name: "Matured", count: statusDataMap["MATURED"] || 0, color: "#ef4444" },
    { name: "Replaced", count: statusDataMap["REPLACED_ROLLED_OVER"] || 0, color: "#8b5cf6" }
  ];

  return (
    <div className="space-y-6 font-['Roboto',sans-serif]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-normal text-slate-900 tracking-tight">
            FDR Repository
          </h2>
          <p className="text-xs font-light text-slate-400 mt-0.5">
            {fdrs.length} Active Records
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <a
            href={exportUrl}
            download
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-light text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
          >
            <span>Export CSV</span>
          </a>

          <button
            onClick={onOpenRegister}
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-normal text-white hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
          >
            <span>Ingest Deposit</span>
          </button>
        </div>
      </div>

      {/* Visual Analytics Cards: Bank Exposure & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bank Capital Distribution Bar Chart */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-slate-900">
              Bank Allocation (₹ Crores)
            </h3>
            <p className="text-[11px] font-light text-slate-400">
              Capital concentration
            </p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bankAnalyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `₹${v}Cr`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-2xl bg-slate-900 text-white p-2.5 shadow-xl text-xs font-light">
                          <p className="font-normal">{d.name}</p>
                          <p className="text-emerald-400 font-mono mt-0.5">Volume: ₹{d.volumeCrores} Cr ({d.count} FDRs)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="volumeCrores" fill="#111217" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lifecycle Status Horizon */}
        <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-slate-900">
              Lifecycle Distribution
            </h3>
            <p className="text-[11px] font-light text-slate-400">
              Status breakdown
            </p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusAnalyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-2xl bg-slate-900 text-white p-2.5 shadow-xl text-xs font-light">
                          <p className="font-normal">{d.name}</p>
                          <p className="text-indigo-300 font-mono mt-0.5">Instruments: {d.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusAnalyticsData.map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-[28px] bg-white p-4 border border-slate-100 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search FDR number, bank name, branch or account..."
            className="w-full rounded-full border border-slate-200/80 bg-slate-50/80 px-4 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-slate-200/80 bg-slate-50/80 px-4 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-all"
        >
          <option value="ALL">All Statuses ▾</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="EXPIRING_SOON">EXPIRING_SOON (&lt;60d)</option>
          <option value="MATURED">MATURED</option>
          <option value="UNDER_SCRUTINY">UNDER_SCRUTINY</option>
          <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
          <option value="RELEASE_APPROVED">RELEASE_APPROVED</option>
          <option value="DISCREPANCY_FLAGGED">DISCREPANCY_FLAGGED</option>
          <option value="REPLACED_ROLLED_OVER">REPLACED_ROLLED_OVER</option>
        </select>

        <select
          value={bankFilter}
          onChange={(e) => setBankFilter(e.target.value)}
          className="rounded-full border border-slate-200/80 bg-slate-50/80 px-4 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-all"
        >
          <option value="ALL">All Banks ▾</option>
          {uniqueBanks.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <button
          onClick={() => setMissingDocsOnly(!missingDocsOnly)}
          className={`flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
            missingDocsOnly
              ? "bg-rose-50 border-rose-300 text-rose-800"
              : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>Missing Docs</span>
        </button>

        <button
          onClick={() => setOverdueOnly(!overdueOnly)}
          className={`flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
            overdueOnly
              ? "bg-amber-50 border-amber-300 text-amber-800"
              : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          <span>Overdue</span>
        </button>

        <span className="text-[11px] font-bold text-slate-400 ml-auto pr-1">
          {filteredFdrs.length} of {fdrs.length} Instruments
        </span>
      </div>

      {/* Main FDR Table Card */}
      <div className="overflow-hidden rounded-[26px] bg-white border border-slate-100 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-[#fbfcfd] font-bold text-slate-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Instrument / FDR #</th>
                <th className="py-3.5 px-4">Issuing Bank & Branch</th>
                <th className="py-3.5 px-4">Principal Amount</th>
                <th className="py-3.5 px-4">Maturity Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 font-medium text-slate-700">
              {filteredFdrs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching FDR instruments found in registry.
                  </td>
                </tr>
              ) : (
                filteredFdrs.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {f.fdr_number}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                        {f.joint_account_title || "Jointly in name of RO AICTE"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{f.issuing_bank_name}</div>
                      <div className="text-[10px] text-slate-400">
                        {f.branch_name} • IFSC: {f.ifsc_code}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900 font-mono text-sm">
                        ₹ {f.principal_amount?.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">
                        Maturity: ₹ {f.maturity_amount?.toLocaleString("en-IN")}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-800">{f.maturity_date}</div>
                      <div className="text-[10px] text-slate-400">Issued: {f.issue_date}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusBadge(f.lifecycle_status)}`}>
                        {f.lifecycle_status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onSelectFdr(f)}
                          className="rounded-full bg-slate-100 hover:bg-slate-900 hover:text-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                        >
                          Review
                        </button>

                        <button
                          onClick={() => onRenewFdr(f)}
                          className="rounded-full bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          Renew
                        </button>

                        <button
                          onClick={() => onReleaseFdr(f)}
                          className="rounded-full bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          Release
                        </button>
                      </div>
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
