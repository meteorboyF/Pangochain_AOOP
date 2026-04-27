# PangoChain v2 — Build Context

**Target Repo:** https://github.com/meteorboyF/Pangochain_AOOP.git  
**Stack:** React 18 + Spring Boot 3 (Java 21) + PostgreSQL 16 + Hyperledger Fabric 2.4 + IPFS Kubo  
**Purpose:** IEEE Access resubmission prototype (manuscript Access-2026-02049)  
**Theme note:** "antigravity" is the user's creative idea concept for the project.

---

## Phase Status

### ✅ Phase 1 — Foundation (COMPLETE)

**Spring Boot Backend (`pangochain-backend/`)**
- `pom.xml` — Spring Boot 3.2.5, Java 21, jjwt 0.12.5, Liquibase, PostgreSQL
- Main class: `PangochainApplication.java`
- `application.yml` — full config with env var placeholders
- **Auth:** `AuthController`, `AuthService`, `JwtTokenProvider`, `JwtAuthenticationFilter`
- **PBKDF2:** `Pbkdf2Service` — 600,000 iterations SHA-256 (spec compliant)
- **User model:** `User`, `UserRole` (12 roles), `AccountStatus`, `Firm`
- **Audit:** `AuditLog`, `AuditService` (async, separate transaction)
- **Security:** `SecurityConfig` (CORS localhost:3000/5173, stateless JWT)
- **Error handling:** `GlobalExceptionHandler` (RFC 9457 ProblemDetail)
- **Liquibase migration `001-initial-schema.sql`:**
  - Tables: `firms`, `users`, `cases`, `case_members`, `documents`, `document_access`,
    `messages`, `esignatures`, `notifications`, `audit_log`, `billing_matters`
  - **Append-only trigger** on `audit_log` (P4-A — blocks UPDATE/DELETE at DB level)
  - 4 default firms pre-seeded: FirmA, FirmB, FirmC, RegulatorMSP

**React Frontend (`pangochain-frontend/`)**
- Vite 5 + React 18 + TypeScript + Tailwind CSS 3
- Custom design system: white/gray professional theme, steel-blue primary (#1E3A5F)
- Font: Plus Jakarta Sans (headings) + Inter (body)
- **Routing:** React Router v6, protected routes, public-only routes
- **State:** Zustand with localStorage persistence (`authStore.ts`)
- **API client:** Axios with JWT interceptor + auto-refresh on 401
- **Pages:** Landing, Login (MFA-aware), Register (4-step wizard), Dashboard, Cases
- **Layout:** Sidebar (role-aware navigation), MainLayout
- **WebCrypto (`lib/crypto.ts`):**
  - `generateEciesKeypair(password)` — ECDH P-256 + PBKDF2 600k wrapping of private key
  - `encryptDocument(file)` — AES-256-GCM with fresh key/IV per document
  - `decryptDocument(...)` — AES-256-GCM with GCM tag verification
  - `eciesWrapKey(recipientPubKey, keyB64)` — ECDH + AES-GCM key wrapping
  - `eciesUnwrapKey(privateKey, wrappedToken)` — ECDH + AES-GCM unwrap
  - `verifyIntegrity(plaintext, expectedHash)` — SHA-256 re-hash check
  - `storeWrappedPrivateKey` / `loadWrappedPrivateKey` — localStorage persistence
- **Components:** EncryptionBadge, BlockchainBadge, Sidebar, MainLayout
- **Register flow:** 4 steps: Account → Keypair Generation (WebCrypto) → Role → Review

**Infrastructure**
- `docker-compose.yml` — postgres, backend, frontend (nginx), ipfs
- `pangochain-backend/Dockerfile` — multi-stage Maven → JRE build
- `pangochain-frontend/Dockerfile` — multi-stage npm → nginx
- `pangochain-frontend/nginx.conf` — SPA routing + API proxy
- `.gitignore` — excludes keys, node_modules, target/, swarm.key

---

### 🔲 Phase 2 — Fabric Integration (NEXT)

Tasks:
1. `pangochain-fabric/` — Docker Compose for 3-org Fabric network (FirmA, FirmB, Regulator)
   - crypto-config, configtx.yaml, channel creation scripts
   - CouchDB state DBs, Fabric CAs, single Raft orderer
2. `pangochain-chaincode/` — Golang chaincode (`legalcc`):
   - `RegisterDocument`, `GrantAccess`, `RevokeAccess`, `CheckAccess`
   - `GetHistoryForKey`, `UpdateDocument`, `LogAuditEvent`, `RegisterCase`
   - Evaluate Z-Version branch first for reusable logic
3. Spring Boot `FabricGatewayService` — Java Gateway SDK integration
4. PostgreSQL audit shadow log wiring to Fabric events

**Key files to create:**
- `pangochain-fabric/docker-compose.fabric.yml`
- `pangochain-fabric/configtx.yaml`
- `pangochain-fabric/scripts/start-network.sh`
- `pangochain-chaincode/legalcc/chaincode.go`
- `pangochain-backend/src/.../blockchain/FabricGatewayService.java`
- `pangochain-backend/src/.../blockchain/FabricConfig.java`

### 🔲 Phase 3 — Document Core

- Client-side AES-256-GCM encrypt in browser → POST ciphertext → IPFS upload
- `POST /api/documents/upload-ciphertext` endpoint
- `POST /api/documents/register` → RegisterDocument chaincode
- Two-layer download: JWT check + CheckAccess chaincode + IPFS fetch → browser decrypt
- `SecureDownloadModal` component with decryption progress + integrity check
- `DocumentUploadDropzone` with encryption progress indicators

### 🔲 Phase 4 — Access Control & Key Wrapping

- ECIES key wrapping in browser → GrantAccess flow
- Time-bounded access (expiry in chaincode)
- RevokeAccess + key rotation workflow (P3-C)
- Access request workflow (associate → partner approval queue)
- `AccessControlPanel` component

### 🔲 Phase 5 — Audit, Messaging, Admin

- Audit Trail UI (Fabric GetHistoryForKey + PostgreSQL shadow log)
- Ledger Explorer (raw Fabric block viewer)
- Client Portal (simplified matter view)
- E2E encrypted messaging (AES-GCM + ECIES per message)
- Admin panel + network status dashboards
- E-signature workflow (hash → client confirm → Fabric anchor)

### 🔲 Phase 6 — Experiments (Paper)

- Caliper load test scripts
- WAN latency simulation (tc netem)
- Experiment result collection automation

---

## Critical Rules (from spec)

1. **Plaintext NEVER leaves the browser** — AES-256-GCM in browser, server receives ciphertext only
2. **Every document access** must invoke `CheckAccess` chaincode (two-layer ACL)
3. **ECIES P-256** (not RSA-OAEP) for key wrapping
4. **PBKDF2 600,000 iterations** SHA-256 for password-based key derivation
5. **PostgreSQL audit_log is append-only** — INSERT-only trigger blocks UPDATE/DELETE

## API Base

- Frontend dev server: http://localhost:3000 (proxies /api → http://localhost:8080)
- Backend: http://localhost:8080
- IPFS API: http://localhost:5001
- PostgreSQL: localhost:5432 / db: pangochain / user: pangochain

## Environment Variables

```
DB_PASSWORD=pangochain_secret
JWT_SECRET=<256-bit string>
FABRIC_PEER_HOST=localhost
IPFS_API_HOST=http://localhost
```
