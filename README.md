# AetherVault: Regulatory Security Deposit and FDR Management System

AetherVault is an enterprise-grade regulatory security deposit and Fixed Deposit Receipt (FDR) lifecycle management platform engineered for the All India Council for Technical Education (AICTE). The system automates end-to-end statutory deposit operations, including multimodal forensic document analysis, 3-way reconciliation against Core Banking Systems (CBS) and Structured Financial Messaging Systems (SFMS), multi-signature Maker-Checker scrutiny, 10-year rolling maturity lineage, automated release lock-in governance, and tamper-evident SHA-256 blockchain-style audit logging.

---

## Architecture Overview

AetherVault is built with a decoupled three-tier microservice architecture:

1. **Frontend Presentation Layer (Port 3000)**:
   - Framework: Next.js 16 (App Router), React 19, TypeScript
   - Styling: Modern clean light-mode design system with TailwindCSS and custom tokens
   - Visual Analytics: Recharts for interactive liquidity, maturity, and release funnel analytics
   - State & Security: Role-Based Access Control (RBAC) supporting 5 distinct operational desks

2. **Backend API and Forensics Gateway (Port 8000)**:
   - Framework: FastAPI (Python 3.10+)
   - Data Layer: SQLAlchemy ORM with SQLite (WAL mode) or PostgreSQL
   - Cryptography: PBKDF2 with SHA-256 credential hashing, AES-256-GCM storage encryption
   - Document Intelligence: Zero-shot visual document understanding, Error Level Analysis (ELA), and pixel-level forensic scrutiny
   - Legal Engine: ReportLab for court-ready invocation PDF bundles

3. **Automation and Dispatch Engine (Port 5678)**:
   - Service: Self-hosted n8n-compatible automation server
   - Authentication: HMAC-SHA256 token handshake
   - Workflows: 6 event-driven workflows executing deposit ingestion, OCR validation, maturity alerting, multi-channel dispatch, and exception handling

---

## Core Capabilities

- **Zero-Touch Document Intelligence**:
  Automatically extracts bank name, FDR number, principal amount, deposit date, maturity date, interest rate, and AICTE co-joint lien clauses from uploaded certificates. Non-FDR or irrelevant documents are identified and rejected with HTTP 400 before registration.

- **Dual-Consent 3-Way Reconciliation**:
  Cross-references institution claims, OCR document extraction, and simulated Core Banking System / SFMS records to compute a deterministic Trust Score and identify discrepancies in tenure, lien clauses, or principal amounts.

- **Regulatory Maker-Checker Progression**:
  Implements multi-signature segregation of duties. Scrutiny officers verify affidavits and bank lien confirmations before passing petitions to Council Approvers for digital discharge vouchers.

- **10-Year Rolling Maturity Tracking**:
  Maintains complete parent-child lineage when FDRs are renewed across rolling tenures, preventing orphan certificates and tracking cumulative compound yields.

- **Smart Release and Legal Invocation Engine**:
  Enforces statutory 10-year lock-in rules under AICTE regulations. Premature claims or claims with pending litigations are automatically locked. For non-compliant institutions, officers can generate a 1-click court-ready invocation dossier with verified exhibits.

- **Self-Healing SHA-256 Audit Ledger**:
  Every authentication, ingestion, approval, and release is sealed into a cryptographic Merkle hash chain. An automated integrity verification mechanism detects tampering and restores compromised blocks.

---

## Directory Structure

```
.
|-- backend/
|   |-- auth.py               # PBKDF2/SHA-256 authentication and JWT token handling
|   |-- bank_service.py       # Core Banking System (CBS) and SFMS bridge simulation
|   |-- crypto.py             # AES-256-GCM encryption and audit hash computations
|   |-- database.py           # Database engine connection and session management
|   |-- email_service.py      # SMTP dispatch and multi-channel notification sender
|   |-- legal_bundle.py       # Court invocation dossier PDF generation engine
|   |-- main.py               # FastAPI application routers and REST endpoints
|   |-- models.py             # SQLAlchemy relational database models
|   |-- n8n_bridge.py         # HMAC-secured webhook dispatch to automation engine
|   |-- ocr_engine.py         # Multimodal document intelligence and forensics
|   |-- schemas.py            # Pydantic request and response schemas
|   |-- seed_data.py          # Pre-seeded regulatory entities, institutions, and FDRs
|   `-- synthetic_fdr.py      # Compliant test FDR PDF/image generator
|-- frontend/
|   |-- src/
|   |   |-- app/              # Next.js App Router (layout, globals, main dashboard)
|   |   |-- components/       # UI views (Overview, Repository, Releases, Automation, etc.)
|   |   `-- lib/              # API client, permission matrices, and formatters
|   |-- package.json          # Node.js dependencies
|   |-- tsconfig.json         # TypeScript configuration
|   `-- next.config.ts        # Next.js runtime configuration
|-- n8n_engine/
|   `-- server.py             # Self-hosted n8n automation engine and webhook runner
|-- n8n_workflows/
|   |-- workflow_1_fdr_submission.json
|   |-- workflow_2_maturity_reminders.json
|   |-- workflow_3_renewal_sync.json
|   |-- workflow_4_release_workflow.json
|   |-- workflow_5_ocr_discrepancy.json
|   `-- workflow_6_multi_channel_notifications.json
|-- requirements.txt          # Python dependencies
|-- .env.example              # Environment variables template
`-- README.md                 # Project documentation
```

---

## Prerequisites

- **Python**: Version 3.10 or higher
- **Node.js**: Version 18.18 or higher (LTS recommended)
- **npm**: Version 9.0 or higher
- **Git**: Installed and configured

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Sanjeev-Sivakumar/AetherVault.git
cd AetherVault
```

### 2. Configure Environment Variables

Create your environment configuration by copying the template:

```bash
cp .env.example .env
```

The default settings will run immediately with SQLite without requiring external credentials.

### 3. Install Backend Dependencies

It is recommended to use a virtual environment:

```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv venv
source venv/bin/activate

# Install required packages
pip install -r requirements.txt
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Running the Application

To run the complete system, start the three services in separate terminals:

### Terminal 1: Backend API Gateway

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The database will be initialized and seeded with test institutions and FDRs on startup.
API documentation will be available at: `http://127.0.0.1:8000/docs`

### Terminal 2: n8n Automation Engine

```bash
python -m uvicorn n8n_engine.server:app --host 127.0.0.1 --port 5678 --reload
```
Automation webhook dashboard will be active at: `http://127.0.0.1:5678`

### Terminal 3: Frontend Web Portal

```bash
cd frontend
npm run dev
```
Access the user interface at: `http://localhost:3000`

---

## Test Accounts and Roles

The application includes role-based access control with pre-seeded demo accounts:

| Role | Username | Password | Operational Access |
| :--- | :--- | :--- | :--- |
| **Council Admin / Bureau Head** | `admin` | `Password@123` | Full system governance, terminal HUD, release approval |
| **Scrutiny Officer (RO)** | `scrutiny_ro` | `Password@123` | Document validation, CBS SFMS recon, scrutiny endorsement |
| **Council Approver** | `approver_chair` | `Password@123` | Final approval, legal invocation dossiers, discharge vouchers |
| **Bank Liaison Officer** | `bank_pnb` | `Password@123` | SFMS confirmation, tripartite lien verification |
| **Institution Registrar** | `apex_inst` | `Password@123` | Single-institution deposit submission and release petition |

You can also use the 1-Click Demo selector on the login page for instant role-based access without typing.

---

## API Summary

- `POST /api/auth/login`: Authenticate and issue JWT session token
- `GET /api/dashboard/stats`: Aggregated financial exposure, compliance ratios, and maturity distributions
- `POST /api/fdrs/upload`: Ingest FDR document with automated OCR extraction and quality inspection
- `POST /api/fdrs/bulk-csv`: Bulk process CSV deposit schedules with row-level validation
- `GET /api/fdrs/{id}/reconciliation`: Perform real-time 3-way reconciliation (Claim vs OCR vs Bank SFMS)
- `POST /api/fdrs/{id}/scrutiny`: Submit Maker scrutiny recommendation
- `POST /api/fdrs/{id}/approve`: Execute Council Approver sign-off
- `GET /api/releases`: Retrieve active release petitions and status distribution
- `POST /api/releases/court-invocation-bundle`: Generate court-ready invocation PDF with legal affidavits
- `GET /api/audit/verify-chain`: Verify SHA-256 Merkle chain integrity across all historical blocks
- `POST /api/audit/self-heal`: Automatically repair compromised ledger entries using previous hash links

---

## Production Deployment Notes

1. Set `DATABASE_URL` in `.env` to a managed PostgreSQL cluster:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/aethervault
   ```
2. Set a high-entropy string for `JWT_SECRET` and `AES_STORAGE_KEY` (32 bytes).
3. Build the Next.js production bundle:
   ```bash
   cd frontend && npm run build && npm run start
   ```

---

## Technical Architecture Standard

This project adheres strictly to AICTE Approval Process Handbook (APH) compliance standards, Section 1.9 regulations governing mandatory joint fixed deposits, and statutory 10-year lock-in governance.
