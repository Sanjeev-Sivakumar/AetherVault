const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
let authToken: string | null = null;

if (typeof window !== "undefined") {
  authToken = localStorage.getItem("aethervault_token");
}

export function setToken(token: string | null) {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("aethervault_token", token);
    } else {
      localStorage.removeItem("aethervault_token");
    }
  }
}

export function getToken(): string | null {
  if (typeof window !== "undefined" && !authToken) {
    authToken = localStorage.getItem("aethervault_token");
  }
  return authToken;
}

export function clearToken() {
  setToken(null);
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "Request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail || `HTTP error ${response.status}`);
  }

  // Handle empty or text responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  getMe: () => request("/api/auth/me"),

  // Dashboard Metrics
  getMetrics: () => request("/api/dashboard/metrics"),

  // Institutions
  getInstitutions: () => request("/api/institutions"),
  createInstitution: (data: any) =>
    request("/api/institutions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // FDRs (Fixed Deposit Receipts)
  getFDRs: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          searchParams.append(k, String(v));
        }
      });
    }
    const query = searchParams.toString();
    return request(`/api/fdrs${query ? `?${query}` : ""}`);
  },
  getFDRById: (id: string | number) => request(`/api/fdrs/${id}`),
  extractFDRDocument: (formData: FormData) =>
    request("/api/fdrs/extract-document", {
      method: "POST",
      body: formData,
    }),
  registerFDR: (formData: FormData) =>
    request("/api/fdrs/register", {
      method: "POST",
      body: formData,
    }),
  bulkUploadCSV: (formData: FormData) =>
    request("/api/fdrs/bulk-csv", {
      method: "POST",
      body: formData,
    }),
  scrutinyFDR: (id: string | number, action: string, notes?: string) =>
    request(`/api/fdrs/${id}/scrutiny`, {
      method: "POST",
      body: JSON.stringify({ action, notes }),
    }),
  bankVerifyFDR: (id: string | number, payload: any) =>
    request(`/api/fdrs/${id}/bank-verify`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  approveFDR: (id: string | number, action: string, notes?: string) =>
    request(`/api/fdrs/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ action, notes }),
    }),
  renewFDR: (id: string | number, payload: any) =>
    request(`/api/fdrs/${id}/renew`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  geminiAuditFDR: (id: string | number) =>
    request(`/api/fdrs/${id}/gemini-audit`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  geminiRegulatoryAdvisory: (query: string, fdrNumber?: string) =>
    request("/api/ai/regulatory-advisory", {
      method: "POST",
      body: JSON.stringify({ query, fdr_number: fdrNumber }),
    }),
  getFDRHistory: (fdrId: string | number) => request(`/api/fdrs/${fdrId}/history`),
  getFDRLineage: (fdrId: string | number) => request(`/api/fdrs/${fdrId}/lineage`),
  getDocumentUrl: (fdrId: string | number) => `${API_BASE}/api/fdrs/${fdrId}/document`,
  getLegalInvocationBundleUrl: (fdrId: string | number) =>
    `${API_BASE}/api/fdrs/${fdrId}/legal-invocation-bundle`,

  // Releases & Refunds
  getReleases: () => request("/api/releases"),
  checkReleaseEligibility: (fdrId: string | number) =>
    request(`/api/releases/check-eligibility/${fdrId}`),
  submitRelease: (data: any) =>
    request("/api/releases/request", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  scrutinyRelease: (id: string | number, action: string, remarks?: string) =>
    request(`/api/releases/${id}/scrutiny`, {
      method: "POST",
      body: JSON.stringify({ action, remarks }),
    }),
  approveRelease: (
    id: string | number,
    action: string,
    remarks?: string,
    voucher_no?: string,
    amount?: number
  ) =>
    request(`/api/releases/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({
        action,
        remarks,
        discharge_voucher_no: voucher_no,
        discharge_amount: amount,
      }),
    }),

  // Audit Logs & Tamper-Evident SHA-256 Ledger
  getAuditLogs: (limit = 60) => request(`/api/audit-logs?limit=${limit}`),
  verifyAuditChain: () => request("/api/audit-logs/verify-chain"),
  selfHealAuditChain: () =>
    request("/api/audit-logs/self-heal", {
      method: "POST",
    }),

  // Notifications
  getNotifications: () => request("/api/notifications"),
  markNotificationRead: (id: string | number) =>
    request(`/api/notifications/${id}/read`, {
      method: "POST",
    }),

  // Alerts & SMTP Scanner
  triggerMaturityReminders: () =>
    request("/api/alerts/trigger-maturity-reminders", {
      method: "POST",
    }),
  testSMTP: (recipient?: string) =>
    request(
      `/api/alerts/test-smtp${recipient ? `?recipient=${encodeURIComponent(recipient)}` : ""}`,
      {
        method: "POST",
      }
    ),

  // Automation Center & n8n Engine
  getAutomationStatus: () => request("/api/automation/status"),
  getAutomationWorkflows: () => request("/api/automation/workflows"),
  getAutomationExecutions: (limit = 50) =>
    request(`/api/automation/executions?limit=${limit}`),
  getAutomationFailures: () => request("/api/automation/failures"),
  retryAutomationFailure: (id: string | number) =>
    request(`/api/automation/failures/${id}/retry`, {
      method: "POST",
    }),
  getReminderConfigs: () => request("/api/automation/reminder-configs"),
  updateReminderConfigs: (rules: any) =>
    request("/api/automation/reminder-configs", {
      method: "POST",
      body: JSON.stringify(rules),
    }),
  getNotificationDeliveries: (limit = 50) =>
    request(`/api/automation/deliveries?limit=${limit}`),
  triggerAutomationWorkflow: (workflowId: string) =>
    request(`/api/automation/trigger-workflow/${workflowId}`, {
      method: "POST",
    }),

  // Export Reports
  getExportReportUrl: (format = "csv", status?: string) =>
    `${API_BASE}/api/reports/export?format=${format}${status ? `&status=${status}` : ""}`,
};
