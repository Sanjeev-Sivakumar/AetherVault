export type UserRole =
  | "AICTE_ADMIN"
  | "AICTE_SCRUTINY_OFFICER"
  | "AICTE_APPROVER"
  | "BANK_OFFICER"
  | "INSTITUTION_USER";

export interface RoleCapabilities {
  canIngestFdr: boolean;
  canBulkIngest: boolean;
  canScrutinize: boolean;
  canApproveFdr: boolean;
  canBankVerify: boolean;
  canPetitionRelease: boolean;
  canScrutinizeRelease: boolean;
  canApproveRelease: boolean;
  canBankDischarge: boolean;
  canTriggerAutomation: boolean;
  canSelfHealLedger: boolean;
  canManageInstitutions: boolean;
  canManageAlertSchedules: boolean;
  isIsolatedToInstitution: boolean;
  isIsolatedToBank: boolean;
}

export interface RoleConfig {
  role: UserRole;
  title: string;
  badge: string;
  clearanceLevel: string;
  tagline: string;
  jurisdiction: string;
  allowedTabs: string[];
  capabilities: RoleCapabilities;
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  AICTE_ADMIN: {
    role: "AICTE_ADMIN",
    title: "AICTE Central Bureau Head / Admin",
    badge: "Council Admin",
    clearanceLevel: "Tier-1 Superadmin",
    tagline: "Total Regulatory & System Jurisdiction",
    jurisdiction: "Full regulatory oversight across all 863 national FDR deposits, escrow releases, bank CBS reconciliation, n8n automations, and cryptographic ledger integrity.",
    allowedTabs: [
      "dashboard",
      "repository",
      "scrutiny",
      "tracker",
      "releases",
      "automation",
      "audit",
      "register",
      "institutions",
      "sample_fdr",
      "reminders"
    ],
    capabilities: {
      canIngestFdr: true,
      canBulkIngest: true,
      canScrutinize: true,
      canApproveFdr: true,
      canBankVerify: true,
      canPetitionRelease: true,
      canScrutinizeRelease: true,
      canApproveRelease: true,
      canBankDischarge: true,
      canTriggerAutomation: true,
      canSelfHealLedger: true,
      canManageInstitutions: true,
      canManageAlertSchedules: true,
      isIsolatedToInstitution: false,
      isIsolatedToBank: false
    }
  },
  AICTE_SCRUTINY_OFFICER: {
    role: "AICTE_SCRUTINY_OFFICER",
    title: "Finance Scrutiny Officer (Maker Desk)",
    badge: "Maker Desk",
    clearanceLevel: "Tier-2 Forensic Maker",
    tagline: "Document Ingestion, OCR Verification & Scrutiny",
    jurisdiction: "Primary document verification, OCR text extraction, ELA image forensics, and initial scrutiny of release petitions. Cannot issue final council approvals (Checker duty).",
    allowedTabs: [
      "dashboard",
      "repository",
      "scrutiny",
      "tracker",
      "releases",
      "register",
      "sample_fdr",
      "audit"
    ],
    capabilities: {
      canIngestFdr: true,
      canBulkIngest: false,
      canScrutinize: true,
      canApproveFdr: false, // Segregation of duties: Maker cannot Check
      canBankVerify: false,
      canPetitionRelease: false,
      canScrutinizeRelease: true,
      canApproveRelease: false,
      canBankDischarge: false,
      canTriggerAutomation: false,
      canSelfHealLedger: false,
      canManageInstitutions: false,
      canManageAlertSchedules: false,
      isIsolatedToInstitution: false,
      isIsolatedToBank: false
    }
  },
  AICTE_APPROVER: {
    role: "AICTE_APPROVER",
    title: "Competent Authority / Approver (Checker Desk)",
    badge: "Checker Desk",
    clearanceLevel: "Tier-1 Sanction Checker",
    tagline: "Council Sanction & Final Release Authority",
    jurisdiction: "Competent sanctioning council granting final approvals, issuing AICTE Sanction Orders & Discharge Vouchers, and authorizing lien revocation. Cannot perform initial maker scrutiny.",
    allowedTabs: [
      "dashboard",
      "repository",
      "tracker",
      "releases",
      "institutions",
      "audit"
    ],
    capabilities: {
      canIngestFdr: false,
      canBulkIngest: false,
      canScrutinize: false, // Segregation of duties: Checker does not Make
      canApproveFdr: true,
      canBankVerify: false,
      canPetitionRelease: false,
      canScrutinizeRelease: false,
      canApproveRelease: true,
      canBankDischarge: false,
      canTriggerAutomation: false,
      canSelfHealLedger: false,
      canManageInstitutions: false,
      canManageAlertSchedules: false,
      isIsolatedToInstitution: false,
      isIsolatedToBank: false
    }
  },
  BANK_OFFICER: {
    role: "BANK_OFFICER",
    title: "Bank Nodal Officer (CBS / SFMS Bridge)",
    badge: "CBS Bridge",
    clearanceLevel: "Escrow Bank Officer",
    tagline: "Core Banking Lien & SFMS 799/760 Confirmation",
    jurisdiction: "Authorized bank officer performing Core Banking System (CBS) balance confirmation, joint lien assertion, SFMS MT799/760 feed updates, and lien discharge execution.",
    allowedTabs: [
      "dashboard",
      "repository",
      "scrutiny",
      "releases",
      "audit"
    ],
    capabilities: {
      canIngestFdr: false,
      canBulkIngest: false,
      canScrutinize: false,
      canApproveFdr: false,
      canBankVerify: true,
      canPetitionRelease: false,
      canScrutinizeRelease: false,
      canApproveRelease: false,
      canBankDischarge: true,
      canTriggerAutomation: false,
      canSelfHealLedger: false,
      canManageInstitutions: false,
      canManageAlertSchedules: false,
      isIsolatedToInstitution: false,
      isIsolatedToBank: true
    }
  },
  INSTITUTION_USER: {
    role: "INSTITUTION_USER",
    title: "Participating Technical College / Principal",
    badge: "College SPOC",
    clearanceLevel: "Institution Nodal Officer",
    tagline: "Security Deposit Lodgement & Status Tracking",
    jurisdiction: "Technical institution administrator lodging mandatory FDR deposit instruments, monitoring 10-year lock-in maturity, submitting renewal proofs, and filing release petitions.",
    allowedTabs: [
      "dashboard",
      "repository",
      "register",
      "tracker",
      "releases"
    ],
    capabilities: {
      canIngestFdr: true, // Can submit own deposit
      canBulkIngest: false,
      canScrutinize: false,
      canApproveFdr: false,
      canBankVerify: false,
      canPetitionRelease: true,
      canScrutinizeRelease: false,
      canApproveRelease: false,
      canBankDischarge: false,
      canTriggerAutomation: false,
      canSelfHealLedger: false,
      canManageInstitutions: false,
      canManageAlertSchedules: false,
      isIsolatedToInstitution: true,
      isIsolatedToBank: false
    }
  }
};

export function getRoleConfig(role?: string): RoleConfig {
  if (!role) return ROLE_CONFIGS.AICTE_ADMIN;
  const normalized = role.toUpperCase().trim() as UserRole;
  return ROLE_CONFIGS[normalized] || ROLE_CONFIGS.AICTE_ADMIN;
}

export function isTabAllowed(role: string | undefined, tabId: string): boolean {
  const config = getRoleConfig(role);
  return config.allowedTabs.includes(tabId);
}

export function hasCapability(
  role: string | undefined,
  capability: keyof RoleCapabilities
): boolean {
  const config = getRoleConfig(role);
  return !!config.capabilities[capability];
}
