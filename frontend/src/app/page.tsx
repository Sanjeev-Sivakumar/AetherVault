"use client";

import React, { useState, useEffect } from "react";
import Header, { personas } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import DashboardView from "@/components/DashboardView";
import RepositoryView from "@/components/RepositoryView";
import ScrutinyView from "@/components/ScrutinyView";
import TrackerView from "@/components/TrackerView";
import ReleasesView from "@/components/ReleasesView";
import AuditView from "@/components/AuditView";
import RemindersView from "@/components/RemindersView";
import InstitutionsView from "@/components/InstitutionsView";
import SampleFDRView from "@/components/SampleFDRView";
import AutomationCenterView from "@/components/AutomationCenterView";
import ThreeWayModal from "@/components/ThreeWayModal";
import RegisterFDRModal from "@/components/RegisterFDRModal";
import BulkUploadModal from "@/components/BulkUploadModal";
import RenewalModal from "@/components/RenewalModal";
import ReleaseModal from "@/components/ReleaseModal";
import LoginView from "@/components/LoginView";
import TerminalHUD from "@/components/TerminalHUD";
import { api, setToken, getToken } from "@/lib/api";
import { isTabAllowed, getRoleConfig } from "@/lib/permissions";
import { ShieldAlert, ArrowRight } from "lucide-react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<any>(null);
  const [fdrs, setFdrs] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedFdrForReview, setSelectedFdrForReview] = useState<any>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [fdrForRenewal, setFdrForRenewal] = useState<any>(null);
  const [fdrForRelease, setFdrForRelease] = useState<any>(null);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [m, f, r, inst, notif] = await Promise.all([
        api.getMetrics().catch(() => null),
        api.getFDRs().catch(() => []),
        api.getReleases().catch(() => []),
        api.getInstitutions().catch(() => []),
        api.getNotifications().catch(() => [])
      ]);
      setMetrics(m);
      setFdrs(f);
      setReleases(r);
      setInstitutions(inst);
      setNotifications(notif);
    } catch (e) {
      console.error("Error loading app data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("logout")) {
      setToken(null);
      setCurrentUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("aethervault_token");
      setIsLoading(false);
      return;
    }

    // Check if token exists in localStorage
    const existingToken = getToken();
    if (existingToken) {
      api.getMe()
        .then((user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          loadAllData();
        })
        .catch(() => {
          setToken(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        });
    } else {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentTab === "register") {
      setShowRegisterModal(true);
      setCurrentTab("repository");
    }
  }, [currentTab]);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    loadAllData();
  };

  const handleSignOut = () => {
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("aethervault_token");
    }
  };

  // IF NOT AUTHENTICATED: RENDER DEDICATED LOGIN SCREEN FIRST
  if (!isAuthenticated || !currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen w-screen bg-[#eef1f5] p-2.5 sm:p-4 lg:p-5 flex items-center justify-center font-sans antialiased overflow-hidden">
      {/* Floating Main Container (Exact match to iBanKo reference UI shell) */}
      <div className="w-full max-w-[1760px] h-[calc(100vh-2rem)] bg-white rounded-[32px] shadow-2xl shadow-slate-300/40 flex overflow-hidden border border-slate-100/80">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />

        {/* Right Application Workspace */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* Top Navbar */}
          <Header
            currentUser={currentUser}
            onUserChange={setCurrentUser}
            notifications={notifications}
            onOpenBulkUpload={() => setShowBulkModal(true)}
            onOpenRegisterModal={() => setShowRegisterModal(true)}
          />

          {/* Main View Area */}
          <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 bg-white">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
                  <span className="text-xs font-normal text-slate-500">Syncing AetherVault Surveillance Fabric...</span>
                </div>
              </div>
            ) : !isTabAllowed(currentUser?.role, currentTab) ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="h-16 w-16 rounded-3xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
                  <ShieldAlert className="h-8 w-8" />
                </div>

                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 mb-2">
                  RBAC Security Policy Violation
                </span>

                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Higher Security Clearance Required
                </h3>

                <p className="text-xs text-slate-500 font-light mt-2 leading-relaxed">
                  Your authenticated persona <strong className="text-slate-800">{currentUser?.full_name}</strong> holds the role <strong className="text-slate-800">{currentUser?.role}</strong> which lacks authorization to access the <strong className="text-slate-800 uppercase font-mono">[{currentTab}]</strong> module.
                </p>

                <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-left w-full text-xs font-light space-y-1.5 text-slate-600">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">YOUR CLEARANCE:</span>
                    <span className="font-semibold text-slate-700">{getRoleConfig(currentUser?.role).clearanceLevel}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ASSIGNED JURISDICTION:</span>
                    <span className="font-semibold text-emerald-700">{getRoleConfig(currentUser?.role).tagline}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => setCurrentTab("dashboard")}
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-all shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <span>Return to Permitted Overview</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {currentTab === "dashboard" && (
                  <DashboardView
                    metrics={metrics}
                    fdrs={fdrs}
                    onSelectFdr={setSelectedFdrForReview}
                    onNavigate={setCurrentTab}
                  />
                )}

                {currentTab === "repository" && (
                  <RepositoryView
                    fdrs={fdrs}
                    onSelectFdr={setSelectedFdrForReview}
                    onOpenRegister={() => setShowRegisterModal(true)}
                    onOpenBulk={() => setShowBulkModal(true)}
                    onRenewFdr={(f) => setFdrForRenewal(f)}
                    onReleaseFdr={(f) => setFdrForRelease(f)}
                    userRole={currentUser?.role}
                  />
                )}

                {currentTab === "scrutiny" && (
                  <ScrutinyView
                    fdrs={fdrs}
                    onSelectFdr={setSelectedFdrForReview}
                    onRefresh={() => loadAllData()}
                    userRole={currentUser?.role}
                  />
                )}

                {currentTab === "tracker" && (
                  <TrackerView
                    fdrs={fdrs}
                    onSelectFdr={setSelectedFdrForReview}
                    onRenewFdr={(f: any) => setFdrForRenewal(f)}
                    onRefresh={() => loadAllData()}
                    userRole={currentUser?.role}
                  />
                )}

                {currentTab === "releases" && (
                  <ReleasesView
                    releases={releases}
                    fdrs={fdrs}
                    onReleaseRequested={() => loadAllData()}
                    onRefresh={() => loadAllData()}
                    userRole={currentUser?.role}
                  />
                )}

                {currentTab === "audit" && (
                  <AuditView />
                )}

                {currentTab === "reminders" && (
                  <RemindersView />
                )}

                {currentTab === "institutions" && (
                  <InstitutionsView
                    institutions={institutions}
                    userRole={currentUser?.role}
                  />
                )}

                {currentTab === "sample_fdr" && (
                  <SampleFDRView />
                )}

                {currentTab === "automation" && (
                  <AutomationCenterView />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Global Modals */}
      {selectedFdrForReview && (
        <ThreeWayModal
          fdr={selectedFdrForReview}
          onClose={() => setSelectedFdrForReview(null)}
          onRefresh={loadAllData}
          currentUser={currentUser}
          onOpenRenewal={(f: any) => setFdrForRenewal(f)}
          onOpenRelease={(f: any) => setFdrForRelease(f)}
        />
      )}

      {showRegisterModal && (
        <RegisterFDRModal
          institutions={institutions}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            loadAllData();
          }}
        />
      )}

      {showBulkModal && (
        <BulkUploadModal
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            loadAllData();
          }}
        />
      )}

      {fdrForRenewal && (
        <RenewalModal
          fdr={fdrForRenewal}
          onClose={() => setFdrForRenewal(null)}
          onSuccess={() => {
            setFdrForRenewal(null);
            loadAllData();
          }}
        />
      )}

      {fdrForRelease && (
        <ReleaseModal
          fdr={fdrForRelease}
          onClose={() => setFdrForRelease(null)}
          onSuccess={() => {
            setFdrForRelease(null);
            loadAllData();
          }}
        />
      )}

      {/* Interactive System Database Terminal HUD */}
      <TerminalHUD />
    </div>
  );
}
