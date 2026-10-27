"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  FolderArchive,
  FileUp,
  ShieldCheck,
  CalendarClock,
  Undo2,
  Link2,
  BellRing,
  Building2,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  LogOut,
  Moon,
  Sun,
  ShieldAlert,
  Sparkles,
  Lock
} from "lucide-react";
import { getRoleConfig, isTabAllowed } from "@/lib/permissions";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser?: any;
  onSignOut?: () => void;
}

export default function Sidebar({
  currentTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  currentUser,
  onSignOut
}: SidebarProps) {
  const [darkMode, setDarkMode] = useState(false);
  const roleConfig = getRoleConfig(currentUser?.role);

  const mainNav = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "repository", label: "FDR Repository", icon: FolderArchive },
    { id: "scrutiny", label: "Bank Verify & Recon", icon: ShieldCheck },
    { id: "tracker", label: "Maturity & Renewals", icon: CalendarClock },
    { id: "releases", label: "Release & Refund", icon: Undo2 },
    { id: "automation", label: "n8n Automation", icon: Cpu },
    { id: "audit", label: "Immutable Ledger", icon: Link2 },
  ];

  const secondaryNav = [
    { id: "register", label: currentUser?.role === "INSTITUTION_USER" ? "Submit Deposit" : "Ingest Deposit", icon: FileUp },
    { id: "institutions", label: "Institutions Directory", icon: Building2 },
    { id: "sample_fdr", label: "Sample Fictional FDR", icon: FileCheck2 },
    { id: "reminders", label: "Alert Schedules", icon: BellRing },
  ];

  // Filter navigation items strictly based on role permissions
  const visibleMainNav = mainNav.filter((item) => isTabAllowed(currentUser?.role, item.id));
  const visibleSecondaryNav = secondaryNav.filter((item) => isTabAllowed(currentUser?.role, item.id));

  const displayName = currentUser?.full_name?.split("(")[0]?.trim() || "Dr. Arvind Kumar";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AK";

  return (
    <aside
      className={`relative flex flex-col justify-between bg-[#fbfcfd] border-r border-slate-100 transition-all duration-300 select-none ${
        collapsed ? "w-20 px-3" : "w-64 px-5"
      } py-6`}
    >
      {/* Brand & Logo */}
      <div>
        <div className="flex items-center space-x-3 mb-6 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111217] text-white shadow-md shadow-slate-900/10 shrink-0">
            <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              AV
            </span>
          </div>
          {!collapsed && (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-slate-900">AetherVault</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                  AICTE
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 -mt-0.5">Zero-Trust FDR Shield</p>
            </div>
          )}
        </div>

        {/* User Profile Card with Dynamic Role Badge */}
        {!collapsed ? (
          <div className="mb-6 p-3 rounded-2xl bg-white border border-slate-100/80 shadow-xs flex items-center space-x-3">
            <div className="relative">
              <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-amber-200 via-rose-200 to-emerald-200 p-0.5">
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-xs font-black text-slate-800">
                  {initials}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 truncate">{displayName}</h4>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 truncate">
                  {roleConfig.badge}
                </span>
              </div>
              <p className="text-[9px] font-light text-slate-400 truncate mt-0.5">{roleConfig.clearanceLevel}</p>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex justify-center">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-200 via-rose-200 to-emerald-200 p-0.5" title={`${displayName} (${roleConfig.badge})`}>
              <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-xs font-black text-slate-800">
                {initials}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Section 1: Permitted Core Operations */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Authorized Operations
              </p>
              <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">
                RBAC
              </span>
            </div>
          )}
          {visibleMainNav.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-100 text-slate-950 font-bold shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80"
                }`}
              >
                <span className="truncate">{collapsed ? item.label.slice(0, 3) : item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation Section 2: Management & Submissions (if permitted) */}
        {visibleSecondaryNav.length > 0 && (
          <div className="mt-5 space-y-1">
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                Management Desk
              </p>
            )}
            {visibleSecondaryNav.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`flex w-full items-center rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-100 text-slate-950 font-bold shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80"
                  }`}
                >
                  <span className="truncate">{collapsed ? item.label.slice(0, 3) : item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Preferences & Clearance Banner */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        {/* Role Clearance Pill */}
        {!collapsed && (
          <div className="mx-1 mb-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 text-[10px] text-slate-600 font-light">
            <div className="font-semibold text-slate-700 mb-0.5 truncate">
              {roleConfig.clearanceLevel}
            </div>
            <p className="line-clamp-1 text-[9px] text-slate-400">
              {roleConfig.tagline}
            </p>
          </div>
        )}

        {/* Theme Toggle */}
        {!collapsed && (
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-500">Theme</span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                darkMode ? "bg-slate-900 justify-end" : "bg-slate-200 justify-start"
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md flex items-center justify-center text-[10px]">
                {darkMode ? "D" : "L"}
              </div>
            </button>
          </div>
        )}

        {/* Collapse and Sign Out Row */}
        <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "justify-between"} px-1`}>
          <button
            onClick={() => {
              if (onSignOut) {
                onSignOut();
              } else {
                onTabChange("dashboard");
              }
            }}
            className="flex items-center text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors p-2 rounded-lg cursor-pointer"
            title="Sign out"
          >
            <span>Sign out</span>
          </button>

          <button
            onClick={onToggleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>
      </div>
    </aside>
  );
}
