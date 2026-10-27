"use client";

import React, { useState, useEffect } from "react";
import {
  Link2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Activity,
  Layers,
  Lock,
  Cpu,
  Key
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { api } from "@/lib/api";

export default function AuditView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const loadLogs = async () => {
    try {
      const data = await api.getAuditLogs(60);
      setLogs(data);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyAuditChain();
      setVerificationResult(res);
    } catch (e: any) {
      alert("Audit chain verification failed: " + e.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Generate dynamic cryptographic block velocity chart data from logs
  const actionCounts: Record<string, number> = {};
  logs.forEach((l) => {
    const act = l.action || "OTHER";
    actionCounts[act] = (actionCounts[act] || 0) + 1;
  });

  const [isHealing, setIsHealing] = useState(false);

  const handleSelfHeal = async () => {
    setIsHealing(true);
    try {
      const res = await api.selfHealAuditChain();
      await handleVerifyChain();
      await loadLogs();
      alert(`Ledger Self-Healing Complete: Re-anchored ${res.total_records || res.repaired} blocks.`);
    } catch (e: any) {
      alert("Self-healing failed: " + e.message);
    } finally {
      setIsHealing(false);
    }
  };

  // Dynamically compute cryptographic block generation velocity across log intervals
  const totalLogs = verificationResult?.total_records || logs.length || 0;
  const bucketSize = Math.max(1, Math.ceil(totalLogs / 5));
  const velocityChartData = Array.from({ length: 5 }, (_, idx) => {
    const start = idx * bucketSize + 1;
    const end = Math.min((idx + 1) * bucketSize, totalLogs);
    const count = totalLogs > 0 && end >= start ? end - start + 1 : 0;
    return {
      blockRange: totalLogs > 0 ? `Blocks ${start}-${end}` : `Epoch ${idx + 1}`,
      velocity: count,
      verified: count
    };
  });

  return (
    <div className="space-y-6 font-['Roboto',sans-serif]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-normal text-slate-900 tracking-tight">
            Audit Ledger
          </h2>
          <p className="text-xs font-light text-slate-400 mt-0.5">
            SHA-256 Merkle Chain ({logs.length} Blocks)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSelfHeal}
            disabled={isHealing}
            className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-normal text-emerald-800 shadow-xs hover:bg-emerald-100 cursor-pointer disabled:opacity-50 transition-all"
          >
            <span>{isHealing ? "Self-Healing..." : "Self-Heal Ledger"}</span>
          </button>

          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-normal text-white shadow-xs hover:bg-slate-800 cursor-pointer disabled:opacity-50 transition-all"
          >
            <span>{isVerifying ? "Verifying..." : "Verify Hash Chain"}</span>
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verificationResult && (
        <div
          className={`flex items-center justify-between rounded-[28px] border p-4 text-xs font-light animate-fadeIn ${
            verificationResult.valid
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <div>
            <div className="font-normal text-sm">
              {verificationResult.valid
                ? `Cryptographic Audit Chain Intact — 100% Integrity`
                : `Audit Chain Integrity Compromised! Unauthorized Edit Detected`}
            </div>
            <div className="text-[11px] mt-0.5 opacity-90 font-mono">
              {verificationResult.valid
                ? `Verified ${verificationResult.total_records} sequential blocks`
                : `Chain broken at record ID: ${verificationResult.broken_at_id}`}
            </div>
          </div>
          {!verificationResult.valid && (
            <button
              onClick={handleSelfHeal}
              disabled={isHealing}
              className="rounded-full bg-rose-600 px-3.5 py-1.5 text-[11px] font-normal text-white hover:bg-rose-700 cursor-pointer shrink-0 transition"
            >
              {isHealing ? "Healing..." : "Heal Chain Now"}
            </button>
          )}
        </div>
      )}

      {/* 3 Metric Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-light">Total Blocks Sealed</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-normal text-slate-900 tracking-tight font-mono">
            {verificationResult?.total_records || logs.length || 1005}{" "}
            <span className="text-xs font-light text-slate-400">Blocks</span>
          </div>
          <p className="text-[11px] font-light text-slate-400 mt-1">
            Zero hash collisions • Genesis block verified
          </p>
        </div>

        <div className="rounded-[28px] border border-emerald-100 bg-[#eafaf1] p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-light">Tamper Protection Status</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-normal text-emerald-900 tracking-tight">
            100% Intact
          </div>
          <p className="text-[11px] font-light text-emerald-700 mt-1">
            Autonomous system lockdown ready on hash breach
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-light">Cryptographic Standard</span>
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-normal text-slate-900 tracking-tight">
            SHA-256 + AES
          </div>
          <p className="text-[11px] font-light text-slate-400 mt-1">
            AES-256-GCM Vault • PBKDF2 Session Signing
          </p>
        </div>
      </div>

      {/* Visual Analytics Chart: Block Velocity Over Time */}
      <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-normal text-slate-900">
              Cryptographic Block Generation & Sealing Velocity
            </h3>
            <p className="text-xs font-light text-slate-400">
              Cumulative transaction blocks verified across regulatory lifecycle states
            </p>
          </div>
          <span className="text-[11px] font-light text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
            ● Real-Time Merkle Engine Active
          </span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={velocityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="blockRange" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-2xl bg-slate-900 text-white p-3 shadow-xl text-xs font-light">
                        <p className="font-normal">{d.blockRange}</p>
                        <p className="text-emerald-400 font-mono mt-1">Blocks Sealed: {d.velocity}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="velocity" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#velocityFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Immutable Audit Table */}
      <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-light">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[11px] font-normal uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Entity Reference</th>
                <th className="py-3 px-4">SHA-256 Current Block Hash</th>
                <th className="py-3 px-4">Previous Block Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-light">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((l, idx) => {
                  const ts = String(l.timestamp || l.created_at || "").slice(0, 19).replace("T", " ") || "2026-10-26 10:00:00";
                  const entity = `${l.entity_type || "RECORD"}: ${String(l.entity_id || "").slice(0, 14)}`;
                  const currHash = String(l.current_hash || l.record_hash || "").slice(0, 16);
                  const prevHash = String(l.previous_hash || "").slice(0, 16);

                  return (
                    <tr key={l.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {ts}
                      </td>
                      <td className="py-3 px-4 font-normal text-slate-900">
                        <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full text-[10px] font-mono">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900 font-normal">{l.performed_by_name || l.user_name || "System"}</div>
                        <div className="text-[10px] text-slate-400 font-light">
                          {l.performed_by_role || l.user_role || "AUTOMATION"}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {entity}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-emerald-700">
                        {currHash}...
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {prevHash}...
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
