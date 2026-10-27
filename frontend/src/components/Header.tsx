"use client";

import React, { useState } from "react";
import {
  Bell,
  Search,
  Settings,
  ChevronDown,
  UserCircle,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Building2,
  Landmark,
  Scale
} from "lucide-react";
import { setToken, api } from "@/lib/api";
import { getRoleConfig } from "@/lib/permissions";

export const personas = [
  { username: "admin", label: "Dr. Arvind Kumar", role: "AICTE_ADMIN", badge: "Council Admin", desc: "Tier-1 Superadmin • Full System Oversight" },
  { username: "scrutiny", label: "Priya Nair", role: "AICTE_SCRUTINY_OFFICER", badge: "Maker Desk", desc: "Tier-2 Forensic OCR & Claim Scrutiny" },
  { username: "approver", label: "M. S. Raghavan", role: "AICTE_APPROVER", badge: "Checker Desk", desc: "Tier-1 Sanction Council & Digital Signatures" },
  { username: "bank_officer", label: "Rajeshwar Rao", role: "BANK_OFFICER", badge: "CBS Bridge", desc: "Core Banking System & Lien Reconciliation" },
  { username: "institution1", label: "Apex Institute SPOC", role: "INSTITUTION_USER", badge: "College SPOC", desc: "Institution Deposit Lodgement & Status" }
];

interface HeaderProps {
  currentUser: any;
  onUserChange: (user: any) => void;
  notifications: any[];
  onOpenBulkUpload: () => void;
  onOpenRegisterModal: () => void;
}

export default function Header({
  currentUser,
  onUserChange,
  notifications,
  onOpenBulkUpload,
  onOpenRegisterModal
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const roleConfig = getRoleConfig(currentUser?.role);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const firstName = currentUser?.full_name?.split(" ")[0]?.replace("Dr.", "")?.trim() || "Arvind";

  const switchPersona = async (username: string) => {
    try {
      const res = await api.login(username, "Password@123");
      setToken(res.access_token);
      onUserChange(res.user);
      setShowPersonaMenu(false);
    } catch (e: any) {
      alert("Failed to switch persona: " + e.message);
    }
  };

  const getSubtitle = () => {
    switch (currentUser?.role) {
      case "INSTITUTION_USER":
        return "College Portal";
      case "BANK_OFFICER":
        return "CBS Bridge Desk";
      case "AICTE_SCRUTINY_OFFICER":
        return "Scrutiny Desk";
      case "AICTE_APPROVER":
        return "Approval Desk";
      default:
        return "Surveillance Console";
    }
  };

  return (
    <header className="flex h-20 w-full items-center justify-between px-8 bg-white border-b border-slate-100">
      {/* Left: Greeting with Dynamic Subtitle */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-800">
          Hello {firstName}
        </h1>
        <p className="text-xs font-normal text-slate-400 mt-0.5">
          {getSubtitle()}
        </p>
      </div>

      {/* Center: Upload & Ingest Action Buttons */}
      <div className="flex items-center space-x-2.5">
        {roleConfig.capabilities.canBulkIngest && (
          <button
            onClick={onOpenBulkUpload}
            className="flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
          >
            <span>Bulk Ingest (CSV)</span>
          </button>
        )}

        {roleConfig.capabilities.canIngestFdr && (
          <button
            onClick={onOpenRegisterModal}
            className="flex items-center rounded-full bg-[#111217] px-4 py-2 text-xs font-medium text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 transition-all cursor-pointer"
          >
            {currentUser?.role === "INSTITUTION_USER" ? (
              <span>Submit Deposit</span>
            ) : (
              <span>Ingest FDR</span>
            )}
          </button>
        )}
      </div>

      {/* Right: Persona Selector & Alerts */}
      <div className="flex items-center space-x-3.5">
        {/* Account / Role Dropdown with Clearance Indicator */}
        <div className="relative">
          <button
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="flex items-center space-x-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100/80 transition-all cursor-pointer shadow-2xs"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="max-w-[150px] truncate">{roleConfig.badge}</span>
          </button>

          {showPersonaMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Regulatory Perspective (RBAC)
                </p>
                <p className="text-[11px] font-light text-slate-500 mt-0.5">
                  Select an authenticated role to evaluate permission boundaries
                </p>
              </div>

              <div className="space-y-1">
                {personas.map((p) => {
                  const isCurrent = currentUser?.username === p.username;
                  return (
                    <button
                      key={p.username}
                      onClick={() => switchPersona(p.username)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all cursor-pointer text-left ${
                        isCurrent
                          ? "bg-slate-100 text-slate-900 font-bold border border-slate-200/60"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold">{p.label}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/60 text-slate-700">
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-[10px] font-light text-slate-400 truncate mt-0.5">
                          {p.desc}
                        </p>
                      </div>
                      {isCurrent && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Alerts Button */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-100">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center rounded-full bg-slate-50 border border-slate-200/60 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>Alerts</span>
              {unreadCount > 0 && (
                <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-84 rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-900">Notifications ({unreadCount})</span>
                </div>
                <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">All notifications clear</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-xl p-2.5 text-xs transition-colors ${
                          n.is_read ? "bg-slate-50/60 text-slate-500" : "bg-blue-50/60 text-slate-800 font-medium"
                        }`}
                      >
                        <p className="font-bold text-slate-900 text-xs">{n.title}</p>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
