# PangoChain v2 — Build Context

**Target Repo:** https://github.com/meteorboyF/Pangochain_AOOP.git  
**Stack:** React 18 + Spring Boot 3 (Java 21) + PostgreSQL 16 + Hyperledger Fabric 2.4 + IPFS Kubo  
**Purpose:** IEEE Access resubmission prototype (manuscript Access-2026-02049)

---

## Phase Status

### ✅ Phase 1 — Foundation (COMPLETE)
Spring Boot skeleton, JWT auth, PBKDF2 600k, PostgreSQL schema (11 tables + append-only audit trigger), React 18 + Vite + Tailwind, WebCrypto lib (AES-256-GCM, ECIES P-256, PBKDF2), Zustand auth store, 4-step register wizard.

### ✅ Phase 2 — Fabric Integration (COMPLETE)
Fabric network (3 orgs: FirmA, FirmB, Regulator), Raft orderer, Golang chaincode `legalcc` (10 functions: RegisterDocument, GrantAccess, RevokeAccess, CheckAccess, GetDocumentHistory, UpdateDocument, RegisterCase, LogAuditEvent, RevokeUserCertificate, logAuditInternal), FabricGatewayService in Spring Boot, chaincode event listener.

### ✅ Phase 3 — Document Core (COMPLETE)
Browser AES-256-GCM encrypt → IPFS upload (IV prepended to ciphertext), RegisterDocument chaincode, two-layer download (JWT + CheckAccess chaincode + IPFS → browser decrypt + SHA-256 verify), DocumentUploadDropzone, SecureDownloadModal.

### ✅ Phase 4 — Access Control & Key Wrapping (COMPLETE)
ECIES P-256 key wrapping, GrantAccess/RevokeAccess chaincode integration, AccessControlController, AccessControlPanel component.

### ✅ Phase 5 — Audit, Messaging, Admin (COMPLETE)
AuditTrail (real API, paginated), Messages (E2E encrypted AES-256-GCM + ECIES), AdminPanel (user management, activate/suspend), Dashboard (real stats), Profile (key status).

### ✅ Phase 6A — Fabric Network Fix (COMPLETE)

**Critical bugs fixed:**
- `configtx.yaml`: profile name mismatch (`PangoChainGenesis` vs `LegalOrdererGenesis`) — fixed
- `configtx.yaml`: `ApplicationCapabilities: V2_5: true` breaks Fabric 2.4 — downgraded to `V2_0: true`
- `docker-compose.fabric.yml`: orderer used `BOOTSTRAPMETHOD: none` (channel participation API) but scripts used genesis block approach — fixed to `BOOTSTRAPMETHOD: file` + genesis block mount
- `deploy-chaincode.sh`: broken `&&` chain in package install — fixed
- Added `scripts/generate-artifacts.sh` — runs cryptogen + configtxgen inside `hyperledger/fabric-tools:2.4` container (no local binaries needed on Windows)
- Updated `scripts/start-network.sh` — containerized artifact generation, clean tear-down, correct channel join sequence
- Added `Makefile` — `make up`, `make chaincode`, `make smoke`, `make down`, `make clean`

**To run the Fabric network (WSL2 or Git Bash on Windows with Docker Desktop):**
```bash
cd pangochain-fabric
make up          # generates crypto + channel artifacts, starts all containers, joins channel
make chaincode   # builds legalcc image, packages, installs, approves, commits, starts ccaas server
make smoke       # verify chaincode is live
```

### ✅ Phase 6B — Client Portal & Feature Expansion (COMPLETE)

**New DB migration (`002-client-features.sql`):**
- `hearings` table (id, case_id, title, hearing_date, location, court_name, hearing_type, notes, created_by)
- `reminders` table (id, case_id, sender_id, recipient_id, title, body, due_at, is_read, priority)
- `case_events` table (id, case_id, event_type, title, description, fabric_tx_id, actor_id)
- `case_clients` table (case_id, client_id, added_by) — client portal association
- `documents.category` column (GENERAL, EVIDENCE, CONTRACT, CORRESPONDENCE, CONFESSION, MEDICAL, FINANCIAL)
- `documents.confidential` column (boolean)

**New backend files:**
- `hearing/Hearing.java` + `HearingRepository.java` + `HearingDto.java` + `HearingCreateRequest.java` + `HearingController.java`
  - `GET /api/hearings/by-case/{caseId}` — hearings for a case
  - `GET /api/hearings/upcoming` — upcoming hearings for current user's firm
  - `POST /api/hearings` — schedule hearing (triggers audit log)
  - `DELETE /api/hearings/{id}`
- `reminder/Reminder.java` + `ReminderRepository.java` + `ReminderDto.java` + `ReminderCreateRequest.java` + `ReminderController.java`
  - `GET /api/reminders` — all reminders for current user
  - `GET /api/reminders/unread-count`
  - `POST /api/reminders` — lawyer sends reminder to client
  - `PATCH /api/reminders/{id}/read` — mark as read
- `caseevent/CaseEvent.java` + `CaseEventRepository.java` + `CaseEventController.java`
  - `GET /api/case-events/by-case/{caseId}` — timeline events
  - `POST /api/case-events` — add event
- `dashboard/DashboardController.java` — updated: client-specific stats (totalDocuments by owner, unreadReminders), nextHearing included in response for legal professionals
- `document/DocumentRepository.java` — added `countByOwnerId(UUID)`

**New frontend files:**
- `pages/client/ClientPortal.tsx` — full client dashboard:
  - Welcome hero with encryption status badge
  - Next hearing countdown card (days/hours remaining, prominent)
  - Stats row: documents, messages, reminders, audit events
  - Reminders from lawyer (click to mark read, HIGH priority badge)
  - Quick action cards: Upload, Message, Document Vault, Case Timeline
  - Privacy notice with AES-256-GCM / ECIES / PBKDF2 details
- `pages/client/ClientDocuments.tsx` — secure document vault:
  - Category filter tabs: ALL, EVIDENCE, CONTRACT, CORRESPONDENCE, CONFESSION, MEDICAL, FINANCIAL, GENERAL
  - Inline upload modal with category + confidential checkbox
  - Full encrypt → wrap → upload pipeline (same as DocumentUploadDropzone)
  - CONFIDENTIAL badge + red styling for sensitive docs
  - SecureDownloadModal integration
- `pages/client/ClientCase.tsx` — case view:
  - Upcoming hearings list with past/today/future highlighting
  - Privacy rights panel (5-point checklist)
  - Encryption status panel (AES-256-GCM, ECIES P-256, PBKDF2, Fabric 2.4)
  - Blockchain audit trail timeline with event type icons and Fabric tx IDs
- `pages/HearingManager.tsx` — lawyer hearing scheduler:
  - Create hearing form (case selector, type dropdown, datetime, court, location, notes)
  - Upcoming / past hearing list with calendar-style date badges
  - Send reminder modal: lookup client by email → POST /api/reminders with HIGH priority
  - Delete hearing button
- `pages/LedgerExplorer.tsx` — blockchain ledger browser:
  - Filter by event type + resource ID
  - Expandable rows showing full context JSON, Fabric tx ID, actor
  - Pagination
- `components/TeamAccessPanel.tsx` — per-document access management:
  - Shows current ACL with capability badges (owner/write/read)
  - Grant form: email lookup → ECIES key wrap → POST /api/access/grant
  - Revoke button → DELETE /api/access/{docId}/user/{userId}
  - Expiry date support, revoked history

**Updated frontend files:**
- `layout/Sidebar.tsx`:
  - Client nav: My Portal, Document Vault, My Case, Messages
  - Legal nav: Dashboard, Cases, Documents, Messages, Hearings (new), Audit Trail
  - Admin nav: Admin Panel, Users, Key Rotation, Ledger Explorer (new)
  - Branding footer with crypto spec line
- `App.tsx` — new routes: `/hearings`, `/ledger`, `/client/portal`, `/client/documents`, `/client/case`
- `pages/CaseDetail.tsx` — tabbed interface:
  - Documents tab (with per-row team access panel toggle)
  - Hearings tab (inline schedule form + hearing list)
  - Team Access tab (TeamAccessPanel for all docs)
  - Timeline tab (CaseEvent blockchain timeline)
- `components/SecureDownloadModal.tsx` — added optional `expectedHash` prop

**Commit:** Phase 6A+6B pushed to GitHub

---

### 🔲 Phase 7 — Experiments (Paper)

- **Hyperledger Caliper load test scripts** — throughput + latency benchmarks against live Fabric network
- **WAN latency simulation** — `tc netem` on Docker bridge network (0ms / 50ms / 100ms / 200ms RTT scenarios)
- **Experiment result collection** — CSV export + Python chart generation for paper figures
- **E-signature workflow** — client browser sign → document hash → Fabric anchor (`esignatures` table exists)
- **MFA enrollment UI** — TOTP setup flow (`mfaSecret` field in User entity exists, no `/mfa/setup` endpoint yet)
- **Client Portal — case association** — `case_clients` table exists; need endpoint to link client user to a case

---

## Critical Rules (NEVER violate)

1. **Plaintext NEVER leaves the browser** — AES-256-GCM in browser, server receives ciphertext only
2. **Every document download** must invoke `CheckAccess` chaincode (two-layer ACL); falls back to DB only if Fabric unreachable
3. **ECIES P-256** (not RSA-OAEP) for key wrapping
4. **PBKDF2 600,000 iterations** SHA-256 for password-based key derivation
5. **PostgreSQL audit_log is append-only** — INSERT-only trigger blocks UPDATE/DELETE at DB level
6. **IV packaging** — IV (12 bytes) always prepended to ciphertext before IPFS; download always splits `bytes[0:12]` as IV
7. **No mock data in production flow** — demo mode only if `user.id === 'demo-user-001'`

---

## API Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | JWT login |
| POST | /api/auth/register | Register + keypair |
| GET | /api/dashboard/stats | Stats (role-aware: includes nextHearing, unreadReminders) |
| GET | /api/cases | Paginated case list |
| POST | /api/cases | Create case → RegisterCase chaincode |
| GET | /api/cases/{id} | Case detail |
| POST | /api/cases/{id}/close | Close case |
| POST | /api/documents/upload | Ciphertext + IV + hash → IPFS → RegisterDocument |
| GET | /api/documents/{id}/ciphertext | Raw bytes (IV prepended) |
| GET | /api/documents/{id}/wrapped-key | ECIES-wrapped doc key for caller |
| GET | /api/documents/by-case/{caseId} | Documents in case |
| GET | /api/documents | All accessible by current user |
| POST | /api/access/grant | Grant ECIES-wrapped access |
| DELETE | /api/access/{docId}/user/{userId} | Revoke access |
| GET | /api/access/{docId} | List ACL entries |
| GET | /api/hearings/by-case/{caseId} | Hearings for a case |
| GET | /api/hearings/upcoming | Upcoming hearings for firm |
| POST | /api/hearings | Schedule hearing |
| DELETE | /api/hearings/{id} | Delete hearing |
| GET | /api/reminders | Reminders for current user |
| GET | /api/reminders/unread-count | Unread reminder count |
| POST | /api/reminders | Send reminder to user |
| PATCH | /api/reminders/{id}/read | Mark reminder read |
| GET | /api/case-events/by-case/{caseId} | Case timeline events |
| POST | /api/case-events | Add timeline event |
| GET | /api/audit | Audit log (eventType?, resourceId?, paginated) |
| POST | /api/messages | Send encrypted message |
| GET | /api/messages | Inbox |
| POST | /api/messages/mark-read | Bulk mark read |
| GET | /api/messages/unread-count | Unread count |
| GET | /api/users/{id}/public-key | ECIES public key JWK |
| GET | /api/users/by-email | User lookup |
| GET | /api/admin/users | All users (MANAGING_PARTNER/IT_ADMIN only) |
| POST | /api/admin/users/{id}/activate | Activate user |
| POST | /api/admin/users/{id}/suspend | Suspend user |

## Client-Side Routes

| Path | Component | Role |
|------|-----------|------|
| /client/portal | ClientPortal | CLIENT_* |
| /client/documents | ClientDocuments | CLIENT_* |
| /client/case | ClientCase | CLIENT_* |
| /hearings | HearingManager | Legal professionals |
| /ledger | LedgerExplorer | Admin roles |
| /cases/:id | CaseDetail (4 tabs: Documents, Hearings, Team Access, Timeline) | Legal professionals |

## To Run

```bash
# App stack
docker-compose up postgres ipfs          # Terminal 1
cd pangochain-backend && ./mvnw spring-boot:run   # Terminal 2
cd pangochain-frontend && npm run dev    # Terminal 3

# Fabric network (WSL2 or Git Bash)
cd pangochain-fabric
make up          # ~3 minutes
make chaincode   # ~2 minutes
make smoke       # quick verify
```

## Environment Variables

```
DB_PASSWORD=pangochain_secret
JWT_SECRET=<256-bit string>
FABRIC_PEER_ENDPOINT=peer0.firma.pangochain.com:7051
FABRIC_PEER_HOST_OVERRIDE=peer0.firma.pangochain.com
FABRIC_MSP_ID=FirmAMSP
FABRIC_CERT_PATH=config/fabric/crypto/admin-cert.pem
FABRIC_KEY_PATH=config/fabric/crypto/admin-key.pem
FABRIC_TLS_CERT_PATH=config/fabric/crypto/tls-ca-cert.pem
FABRIC_CHANNEL=legal-channel
FABRIC_CHAINCODE=legalcc
IPFS_API_HOST=http://localhost
```
