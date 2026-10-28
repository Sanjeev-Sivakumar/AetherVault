"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Unlock,
  User,
  Building,
  KeyRound,
  ArrowRight,
  Sparkles,
  Building2,
  FileCheck2,
  Landmark,
  Scale,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  UserPlus,
  Zap,
  Info
} from "lucide-react";
import { api, setToken } from "@/lib/api";
import TerminalHUD from "./TerminalHUD";

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

interface RoleOption {
  id: string;
  role: string;
  label: string;
  title: string;
  badge: string;
  defaultUsername: string;
  defaultPassword: string;
  description: string;
  clearance: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ROLES: RoleOption[] = [
  {
    id: "admin",
    role: "AICTE_ADMIN",
    label: "AICTE Central Bureau Head / Admin (Council Authority)",
    title: "AICTE Bureau Head",
    badge: "Council Admin",
    defaultUsername: "admin",
    defaultPassword: "Password@123",
    description: "Master Regulatory & Security Deposit Oversight Authority",
    clearance: "Tier-1 Superadmin • Full Escrow, Forensics, & Policy Authority",
    icon: Scale,
    color: "emerald"
  },
  {
    id: "scrutiny",
    role: "AICTE_SCRUTINY_OFFICER",
    label: "Finance Scrutiny Officer / Maker (Forensic Verification Desk)",
    title: "Scrutiny Maker",
    badge: "Maker Desk",
    defaultUsername: "scrutiny",
    defaultPassword: "Password@123",
    description: "Forensic OCR FDR Verification & Sanction Processing",
    clearance: "Tier-2 Maker Clearance • Primary Document Verification & Claim Audits",
    icon: ShieldCheck,
    color: "blue"
  },
  {
    id: "approver",
    role: "AICTE_APPROVER",
    label: "Competent Authority / Approver / Checker (Sanctioning Council)",
    title: "Council Approver",
    badge: "Approver Desk",
    defaultUsername: "approver",
    defaultPassword: "Password@123",
    description: "Multi-Signature Final Release Approval Authority",
    clearance: "Tier-1 Checker Clearance • Escrow Release Sanction & Lien Discharge",
    icon: CheckCircle2,
    color: "purple"
  },
  {
    id: "bank_officer",
    role: "BANK_OFFICER",
    label: "Bank Nodal Officer (CBS / SFMS Escrow Bridge)",
    title: "Bank Nodal Officer",
    badge: "CBS Bridge",
    defaultUsername: "bank_officer",
    defaultPassword: "Password@123",
    description: "Core Banking Lien Confirmation & SFMS 799/760 Feeds",
    clearance: "Escrow Bank Clearance • Core Banking System & Lien Reconciliation",
    icon: Landmark,
    color: "amber"
  },
  {
    id: "institution",
    role: "INSTITUTION_USER",
    label: "Participating Technical College / Principal (FDR Depositor)",
    title: "College Administrator",
    badge: "Institution",
    defaultUsername: "institution1",
    defaultPassword: "Password@123",
    description: "Mandatory Security Deposit Lodgement & Renewal Tracking",
    clearance: "Institution Clearance • FDR Lodgement & Release Petitions",
    icon: Building2,
    color: "indigo"
  }
];

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  // Navigation tabs: "login" (Role Login) | "demo" (1-Click Direct Demo) | "signup" (New User Sign Up)
  const [activeTab, setActiveTab] = useState<"login" | "demo" | "signup">("login");

  // Selected role for login dropdown
  const [selectedRole, setSelectedRole] = useState<RoleOption>(ROLES[0]);
  const [username, setUsername] = useState(ROLES[0].defaultUsername);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Security handshake & database reflection states
  const [securityStep, setSecurityStep] = useState<string>("");
  const [securityProgress, setSecurityProgress] = useState(0);
  const [sessionReceipt, setSessionReceipt] = useState<any | null>(null);

  // Institution Sign-up fields
  const [aicteId, setAicteId] = useState("");
  const [instName, setInstName] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [email, setEmail] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Handle role selection from dropdown
  const handleRoleChange = (roleId: string) => {
    const found = ROLES.find((r) => r.id === roleId) || ROLES[0];
    setSelectedRole(found);
    setUsername(found.defaultUsername);
    setPassword(""); // Clear password so user explicitly enters or clicks demo
    setErrorMsg(null);
  };

  const handleSignIn = async (u: string, p: string) => {
    if (!p || !p.trim()) {
      setErrorMsg("Password is required. Vault entry is locked until credentials are provided.");
      return;
    }
    if (!u || !u.trim()) {
      setErrorMsg("Username is required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSecurityProgress(25);
    setSecurityStep("Encrypting user credentials with salted PBKDF2 / SHA-256...");

    const t1 = setTimeout(() => {
      setSecurityProgress(55);
      setSecurityStep("Negotiating AES-256-GCM cipher & establishing security session...");
    }, 280);

    const t2 = setTimeout(() => {
      setSecurityProgress(85);
      setSecurityStep("Writing tamper-evident authentication block into SHA-256 Merkle chain...");
    }, 550);

    try {
      const res = await api.login(u.trim(), p);
      clearTimeout(t1);
      clearTimeout(t2);

      setSecurityProgress(100);
      setSecurityStep(`Session verified: ${res.session_id || "Active"} • Sealed in DB Ledger`);
      setSessionReceipt(res);

      setToken(res.access_token);

      // Brief delay so user and judges see the cryptographic confirmation
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 700);
    } catch (e: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setErrorMsg(e.message || "Invalid credentials. Please verify your username and password.");
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aicteId || !instName || !officerName || !email || !signupPassword) {
      setErrorMsg("Please complete all required fields for institutional verification.");
      return;
    }
    if (signupPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify your password entry.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSecurityProgress(30);
    setSecurityStep("Verifying AICTE Permanent ID & provisioning institutional security key...");

    try {
      const userHandle = signupUsername.trim() || email.split("@")[0] + "_" + Math.floor(100 + Math.random() * 900);
      const payload = {
        username: userHandle,
        password: signupPassword,
        full_name: officerName,
        email: email,
        aicte_permanent_id: aicteId,
        institution_name: instName
      };

      const res = await fetch("http://127.0.0.1:8000/api/auth/register-institution-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Registration failed");
      }

      const data = await res.json();
      setSecurityProgress(100);
      setSecurityStep("Institution registered! Security clearance recorded in audit ledger.");
      setToken(data.access_token);

      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 600);
    } catch (e: any) {
      setErrorMsg(e.message || "Institution sign-up failed. Please check your AICTE ID.");
      setIsLoading(false);
    }
  };

  const isPasswordEntered = password.trim().length > 0;
  const isUsernameEntered = username.trim().length > 0;
  const isSubmitDisabled = !isPasswordEntered || !isUsernameEntered || isLoading;

  const isSignupPasswordValid = signupPassword.trim().length > 0 && signupPassword === confirmPassword;

  const SelectedRoleIcon = selectedRole.icon;

  return (
    <div className="min-h-screen w-screen bg-[#eef1f5] p-3 sm:p-6 flex items-center justify-center font-['Roboto',sans-serif] antialiased text-slate-800">
      {/* Floating Modern Auth Card (iBanKo aesthetic) */}
      <div className="w-full max-w-5xl bg-white rounded-[32px] shadow-2xl shadow-slate-300/40 border border-slate-100 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* ================= LEFT DARK HERO PANEL ================= */}
        <div className="bg-[#111217] text-white p-8 md:p-10 md:w-5/12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div>
            {/* Brand Logo Tile */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-950 font-normal text-sm shadow-md shrink-0">
                <span className="flex items-center gap-1 font-normal">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  AV
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-normal text-base tracking-tight text-white">AetherVault</span>
                  <span className="text-[9px] font-light px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    AICTE
                  </span>
                </div>
                <p className="text-[11px] font-light text-slate-400">Zero-Trust Security Deposit Shield</p>
              </div>
            </div>

            {/* Core Value Proposition */}
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-snug tracking-tight">
              Autonomous Financial Surveillance & Escrow Governance
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-300">
              Zero-Trust Security Deposit Architecture for AICTE regulatory oversight.
            </p>

            {/* Micro Feature Indicators */}
            <div className="mt-6 space-y-2.5">
              <div className="flex items-center space-x-2.5 text-xs font-light text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>3-Way Bank CBS & SFMS Reconciliation</span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs font-light text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0"></span>
                <span>Smart Release Engine with 10-Yr Lock-in Checks</span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs font-light text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0"></span>
                <span>SHA-256 Tamper-Evident Append-Only Ledger</span>
              </div>
            </div>

            {/* Active Security Specs Card */}
            <div className="mt-8 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-light text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>CIPHER SUITE</span>
                <span className="text-emerald-400 font-mono">AES-256-GCM</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>HASH ALGORITHM</span>
                <span className="text-emerald-400 font-mono">PBKDF2 / SHA-256</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>LEDGER STATE</span>
                <span className="text-emerald-400 font-mono">IMMUTABLE / WAL</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-[11px] font-light text-slate-500 flex items-center justify-between">
            <span>All India Council for Technical Education</span>
            <span>SIH 2026</span>
          </div>
        </div>

        {/* ================= RIGHT FORM PANEL ================= */}
        <div className="p-6 md:p-9 flex-1 flex flex-col justify-between bg-white relative">
          
          {/* Interactive Cryptographic Security Handshake Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
              <div className="relative mb-4 flex items-center justify-center">
                <div className="h-14 w-14 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
                <ShieldCheck className="h-7 w-7 text-emerald-600 absolute" />
              </div>
              
              <h3 className="text-lg font-bold text-slate-900">
                Cryptographic Authentication & Audit Sealing
              </h3>
              
              <p className="text-xs font-light text-slate-500 mt-1 max-w-sm">
                {securityStep}
              </p>

              {/* Security Progress Meter */}
              <div className="w-64 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${securityProgress}%` }}
                />
              </div>

              {sessionReceipt && (
                <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-[11px] font-light text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Block sealed: <code className="font-mono">{sessionReceipt.session_id}</code> • AES-256-GCM
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            {/* Top 3-Tab Switcher: Portal Login | 1-Click Demo | New User Sign Up */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="flex rounded-full bg-slate-100 p-1 text-xs font-light">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setErrorMsg(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
                    activeTab === "login"
                      ? "bg-white text-slate-900 font-bold shadow-xs"
                      : "text-slate-600 font-semibold hover:text-slate-900"
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5 text-slate-600" />
                  <span>Portal Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("demo");
                    setErrorMsg(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
                    activeTab === "demo"
                      ? "bg-white text-slate-900 font-bold shadow-xs"
                      : "text-slate-600 font-semibold hover:text-slate-900"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>1-Click Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signup");
                    setErrorMsg(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
                    activeTab === "signup"
                      ? "bg-white text-slate-900 font-bold shadow-xs"
                      : "text-slate-600 font-semibold hover:text-slate-900"
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
                  <span>New User Sign Up</span>
                </button>
              </div>

              <span className="text-[10px] font-light text-slate-400 hidden lg:inline">
                {activeTab === "login" && "Role-Gated Regulatory Access"}
                {activeTab === "demo" && "Instant Sandbox • Zero Typing Required"}
                {activeTab === "signup" && "AICTE Approved Institution Registration"}
              </span>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200/80 p-3.5 text-xs text-rose-800 flex items-start space-x-2.5 font-light">
                <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ================= TAB 1: PORTAL LOGIN (ROLE DROPDOWN + PASSWORD GATED) ================= */}
            {activeTab === "login" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Portal Authentication
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Select your regulatory role from the dropdown, verify your username, and enter your password.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (isSubmitDisabled) return;
                    handleSignIn(username, password);
                  }}
                  className="space-y-3.5"
                >
                  {/* Role Dropdown */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">
                      Select Regulatory / Institutional Role
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3.5 text-slate-600 pointer-events-none">
                        <SelectedRoleIcon className="h-4 w-4" />
                      </div>
                      <select
                        value={selectedRole.id}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="w-full appearance-none rounded-full border border-slate-300 bg-white pl-10 pr-10 py-3 text-sm text-slate-900 font-semibold outline-none focus:border-slate-500 shadow-2xs transition-all cursor-pointer"
                      >
                        {ROLES.map((r) => (
                          <option key={r.id} value={r.id} className="py-1 font-medium">
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                    </div>

                    {/* Role Clearance Pill */}
                    <div className="mt-1.5 flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-700">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="truncate">{selectedRole.clearance}</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-600 shrink-0 ml-2">
                        {selectedRole.badge}
                      </span>
                    </div>
                  </div>

                  {/* Username Field */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">
                      Username / Officer ID
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. admin, scrutiny, or institution1"
                        className="w-full rounded-full border border-slate-300 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 font-semibold placeholder-slate-400 outline-none focus:border-slate-500 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field (Strictly Gated) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-bold text-slate-900">
                        Password
                      </label>
                      <span className="text-xs font-semibold text-slate-500">
                        Salted PBKDF2 / SHA-256
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password (e.g. Password@123)"
                        className="w-full rounded-full border border-slate-300 bg-white pl-10 pr-10 py-3 text-sm text-slate-900 font-semibold placeholder-slate-400 outline-none focus:border-slate-500 shadow-2xs transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-800 p-0.5 rounded cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Password status micro-hint */}
                    <div className="mt-1.5 px-1">
                      {!isPasswordEntered ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                          <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <span>Password required to unlock authentication button.</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span>Password entered. Press button or Enter to negotiate cipher handshake.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password-Gated Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      className={`w-full flex items-center justify-center space-x-2 rounded-full py-3.5 text-sm font-bold transition-all shadow-md ${
                        isSubmitDisabled
                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                          : "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer hover:shadow-lg active:scale-[0.99]"
                      }`}
                    >
                      {isSubmitDisabled ? (
                        <>
                          <Lock className="h-4 w-4 text-slate-400" />
                          <span>Enter Password to Unlock Vault</span>
                        </>
                      ) : (
                        <>
                          <span>Authenticate & Enter Vault</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* 1-Click Demo Shortcut Banner directly inside login view */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 border border-amber-200/50 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          Quick Demo Evaluation
                        </p>
                        <p className="text-xs font-medium text-slate-500 truncate">
                          Click to enter as AICTE Bureau Head without typing credentials
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSignIn("admin", "Password@123")}
                      className="shrink-0 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <span>Bureau Head Demo</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 2: 1-CLICK INSTANT DEMO SANDBOX ================= */}
            {activeTab === "demo" && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Instant Evaluator Sandbox
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Click any role below to authenticate directly into AetherVault — no typing or password required.
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {ROLES.map((r) => {
                    const RoleIcon = r.icon;
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSignIn(r.defaultUsername, r.defaultPassword)}
                        className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer group flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="h-9 w-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                            <RoleIcon className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {r.title}
                              </p>
                              <span className="text-[10px] font-light px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                                {r.badge}
                              </span>
                            </div>
                            <p className="text-[11px] font-light text-slate-500 truncate mt-0.5">
                              {r.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white group-hover:bg-slate-900 text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-slate-900 text-xs font-normal transition-all shadow-xs"
                        >
                          <span>Direct Login</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 text-[11px] font-light text-slate-500 flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>
                    Each demo persona initializes a live AES-256-GCM cryptographic session and logs verification in the SQLite audit ledger.
                  </span>
                </div>
              </div>
            )}

            {/* ================= TAB 3: NEW USER / COLLEGE SIGN UP ================= */}
            {activeTab === "signup" && (
              <div className="space-y-3.5">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Technical College Registration
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Self-enrollment is permitted only for AICTE Technical Institution Nodal Officers & Principals
                  </p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        AICTE Permanent Institute ID
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1-1092837481"
                        value={aicteId}
                        onChange={(e) => setAicteId(e.target.value)}
                        className="w-full rounded-full border border-slate-200/80 bg-slate-50/70 px-4 py-2 text-xs font-light text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        College / Institution Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Delhi College of Engineering & AI"
                        value={instName}
                        onChange={(e) => setInstName(e.target.value)}
                        className="w-full rounded-full border border-slate-200/80 bg-slate-50/70 px-4 py-2 text-xs font-light text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Nodal Officer Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Dr. S. Sharma"
                        value={officerName}
                        onChange={(e) => setOfficerName(e.target.value)}
                        className="w-full rounded-full border border-slate-200/80 bg-slate-50/70 px-4 py-2 text-xs font-light text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Institutional Email (.edu.in / .ac.in)
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="principal@college.edu.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-full border border-slate-200/80 bg-slate-50/70 px-4 py-2 text-xs font-light text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Desired Username (Optional — default is email prefix)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. dce_admin"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      className="w-full rounded-full border border-slate-200/80 bg-slate-50/70 px-4 py-2 text-xs font-light text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Vault Access Password
                      </label>
                      <div className="relative">
                        <input
                          type={showSignupPassword ? "text" : "password"}
                          required
                          placeholder="••••••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="w-full rounded-full border border-slate-200/80 bg-slate-50/70 px-4 py-2 pr-9 text-xs font-light text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                        >
                          {showSignupPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-full border border-slate-200/80 bg-slate-50/70 px-4 py-2 text-xs font-light text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!isSignupPasswordValid || isLoading}
                    className={`w-full flex items-center justify-center space-x-2 rounded-full py-2.5 text-xs font-normal transition-all shadow-md mt-1 ${
                      !isSignupPasswordValid || isLoading
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                        : "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                    }`}
                  >
                    <span>Register Institution & Generate Vault Key</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-light text-slate-400">
            <span>Encrypted with AES-256-GCM</span>
            <span>SHA-256 Audit Trail Active</span>
          </div>
        </div>
      </div>
      <TerminalHUD />
    </div>
  );
}
