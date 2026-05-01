# PangoChain — Feature Status

> IEEE Access manuscript Access-2026-02049 · Stack: React 18 + Spring Boot 3 + PostgreSQL 16 + Hyperledger Fabric 2.4 + IPFS Kubo

---

## ✅ Done — Core Security Infrastructure

| Feature | Details |
|---------|---------|
| **AES-256-GCM browser encryption** | Plaintext never leaves the browser. IV (12 bytes) prepended to ciphertext before IPFS upload. |
| **ECIES P-256 key wrapping** | Per-user document key wrapped with recipient's public key for secure multi-party access. |
| **PBKDF2 key derivation** | 600,000 iterations SHA-256. Private key encrypted in localStorage, unlocked by password in-browser only. |
| **WebCrypto API integration** | All crypto operations via `window.crypto.subtle` — no third-party crypto libs. |
| **Append-only audit log** | PostgreSQL `audit_log` table with INSERT-only trigger — UPDATE/DELETE blocked at DB level. |
| **JWT authentication** | Access token + refresh token. Spring Security filter chain. |
| **PBKDF2 password hashing** | Server-side PBKDF2 hash for login credential verification (separate from key derivation). |

---

## ✅ Done — Hyperledger Fabric Network

| Feature | Details |
|---------|---------|
| **3-org Fabric network** | FirmA, FirmB, Regulator — Raft orderer, CouchDB state DB |
| **`legalcc` chaincode (Go)** | 10 functions: RegisterDocument, GrantAccess, RevokeAccess, CheckAccess, GetDocumentHistory, UpdateDocument, RegisterCase, LogAuditEvent, RevokeUserCertificate, logAuditInternal |
| **Chaincode event listener** | Spring Boot `FabricEventHandler` subscribes to chaincode events |
| **FabricGatewayService** | Spring Boot gateway service — submits/evaluates transactions via Fabric Gateway SDK |
| **Two-layer ACL** | JWT (Spring Security) + `CheckAccess` chaincode. Graceful fallback to DB if Fabric unreachable |
| **Containerised network setup** | `make up/chaincode/smoke/down` — no local Fabric binaries needed (works on Windows via Docker) |
| **Blockchain document anchoring** | Every uploaded document registered on Fabric ledger with SHA-256 hash |
| **Blockchain case anchoring** | Case creation anchored via `RegisterCase` chaincode |

---

## ✅ Done — Document Management

| Feature | Details |
|---------|---------|
| **Secure document upload** | Browser encrypts → IV+ciphertext → IPFS → RegisterDocument chaincode |
| **Secure document download** | Fetch from IPFS → unwrap AES key via ECIES → AES-GCM decrypt → SHA-256 integrity verify |
| **SecureDownloadModal** | 4-stage progress UI: Fetch → Unwrap key → Decrypt → Verify integrity |
| **Document categories** | GENERAL, EVIDENCE, CONTRACT, CORRESPONDENCE, CONFESSION, MEDICAL, FINANCIAL |
| **Confidential flag** | CONFIDENTIAL badge + red styling for sensitive documents |
| **Document versioning** | `previous_version_id` chain in DB, `UpdateDocument` chaincode |
| **Per-document ACL** | `document_access` table tracks capability (owner/write/read), expiry, revocation |
| **TeamAccessPanel** | Per-document access management UI — grant (ECIES key wrap), revoke, expiry date |
| **IPFS storage** | Encrypted ciphertext stored on IPFS Kubo node |

---

## ✅ Done — Client Portal

| Feature | Details |
|---------|---------|
| **Client dashboard** | Next hearing countdown, unread reminders, document/message/audit stats |
| **Next hearing countdown** | Days/hours remaining displayed prominently |
| **Secure document vault** | Client uploads with category + confidential flag; full encrypt → IPFS pipeline |
| **My Case view** | Hearings list (past/today/future colour-coded), case selector for multiple cases |
| **Privacy rights panel** | 5-point client rights checklist |
| **Encryption status panel** | Live display of AES-256-GCM / ECIES P-256 / PBKDF2 / Fabric 2.4 status |
| **Blockchain audit trail** | Case event timeline with Fabric tx IDs visible to client |
| **Client-case association** | `case_clients` table + `POST /api/cases/{id}/clients` + `GET /api/cases/my-cases` |
| **Role-based navigation** | Clients see simplified sidebar (Portal / Document Vault / My Case / Messages) |

---

## ✅ Done — Lawyer / Legal Professional Portal

| Feature | Details |
|---------|---------|
| **Case management** | Create, list, search, close cases — Fabric-anchored |
| **Case detail (4 tabs)** | Documents · Hearings · Team Access · Timeline |
| **Hearing scheduler** | Create hearings (type, court, location, datetime, notes), delete |
| **Send reminders to clients** | Email lookup → `POST /api/reminders` with priority (HIGH/NORMAL) |
| **HearingManager page** | Calendar-style date badges, upcoming/past separation |
| **Document access grants** | TeamAccessPanel: grant ECIES-wrapped access, set expiry, revoke |
| **Audit Trail page** | Paginated real audit log with eventType/resourceId filters |
| **LedgerExplorer page** | Blockchain audit browser — expandable rows with Fabric tx IDs and context JSON |
| **Dashboard stats** | Active cases, total documents, next hearing, unread reminders |

---

## ✅ Done — Secure Messaging

| Feature | Details |
|---------|---------|
| **E2E encrypted messages** | AES-256-GCM + ECIES P-256 — plaintext never stored or transmitted |
| **In-browser encryption** | Compose: encrypt in browser → wrap key with recipient's ECIES pubkey → POST ciphertext |
| **In-browser decryption** | Unlock private key with password (PBKDF2) → ECIES unwrap → AES-GCM decrypt → display |
| **Conversation threads** | Messages grouped by sender/recipient, expandable |
| **Unread count** | Badge in sidebar, `GET /api/messages/unread-count` |
| **Client ↔ Lawyer messaging** | Both roles share the same Messages page — any user can message any other |

---

## ✅ Done — Admin Features

| Feature | Details |
|---------|---------|
| **Admin panel** | User management table with role/status display |
| **Activate / Suspend users** | `POST /api/admin/users/{id}/activate` and `/suspend` |
| **Role-based access** | MANAGING_PARTNER, IT_ADMIN, REGULATOR roles see admin nav |
| **Key rotation UI** | Profile page shows key status (public key fingerprint) |

---

## ✅ Done — Developer & Ops

| Feature | Details |
|---------|---------|
| **DataSeeder** | On startup seeds 4 users, 3 cases, 5 hearings, 4 reminders, timeline events |
| **Liquibase migrations** | `001-initial-schema.sql` + `002-client-features.sql` — reproducible DB setup |
| **Docker Compose** | `postgres`, `ipfs` services — single command startup |
| **Fabric Makefile** | `make up/chaincode/smoke/down/clean` |
| **TypeScript strict** | Zero TS errors (`npx tsc --noEmit` clean) |

---

## 🔲 Planned — Phase 7 (Experiments for Paper)

| Feature | Details |
|---------|---------|
| **Hyperledger Caliper benchmarks** | Throughput + latency load tests against live Fabric network (RegisterDocument, CheckAccess, GrantAccess workloads) |
| **WAN latency simulation** | `tc netem` on Docker bridge — 0 / 50 / 100 / 200ms RTT scenarios |
| **Experiment result collection** | CSV export of Caliper results + Python chart generator for paper figures |
| **E2E latency comparison** | With / without blockchain overhead measurement |

---

## 🔲 Planned — Future Features

| Feature | Priority | Notes |
|---------|----------|-------|
| **E-signature workflow** | High | `esignatures` table exists. Need: client browser sign → document hash → Fabric `esignatures` anchor → PDF stamp |
| **MFA enrollment (TOTP)** | High | `mfa_secret` in User entity exists. Need `/mfa/setup` endpoint + QR code UI (Google Authenticator compatible) |
| **Message reply threading** | Medium | Quick-reply box in conversation — pre-fills composeTo. Full thread reply needs `parent_id` on messages table |
| **Real-time notifications** | Medium | WebSocket / SSE push for new messages and reminders (currently poll on page load) |
| **Document versioning UI** | Medium | Show version history chain in CaseDetail Documents tab |
| **Bulk document operations** | Low | Select multiple → bulk grant access / bulk download |
| **Billing matters UI** | Low | `billing_matters` table exists — no frontend yet |
| **Regulator read-only portal** | Low | Regulator role can query any case's Fabric audit log for oversight |
| **Key rotation workflow** | Low | Generate new ECIES keypair, re-wrap all document keys with new public key |
| **Caliper CI integration** | Low | Run benchmarks automatically in CI on Fabric changes |

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Managing Partner (Admin) | `admin@pangolawfirm.com` | `Admin123!` |
| Senior Associate (Lawyer) | `lawyer@pangolawfirm.com` | `Lawyer123!` |
| Paralegal | `paralegal@pangolawfirm.com` | `Paralegal123!` |
| Client (Primary) | `client@demo.com` | `Client123!` |
| Client 2 | `client2@demo.com` | `Client123!` |

> **Note:** These accounts are created by the DataSeeder on first backend startup. All accounts are set to `ACTIVE` status — no approval step needed for demo.

---

## How to Run

```bash
# 1. Start PostgreSQL + IPFS
docker-compose up postgres ipfs

# 2. Start Spring Boot backend (seeds data on first run)
cd pangochain-backend
./mvnw spring-boot:run

# 3. Start React frontend
cd pangochain-frontend
npm install
npm run dev
# → http://localhost:5173

# 4. (Optional) Start Fabric network — requires WSL2 / Git Bash + Docker Desktop
cd pangochain-fabric
make up          # ~3 min — crypto + channel + peers
make chaincode   # ~2 min — build, package, install, approve, commit
make smoke       # verify
```

### Environment variables (`.env` or system)

```
DB_PASSWORD=pangochain_secret
JWT_SECRET=<any 256-bit base64 string>
IPFS_API_HOST=http://localhost
# Fabric (only if running Fabric network):
FABRIC_PEER_ENDPOINT=peer0.firma.pangochain.com:7051
FABRIC_MSP_ID=FirmAMSP
FABRIC_CERT_PATH=config/fabric/crypto/admin-cert.pem
FABRIC_KEY_PATH=config/fabric/crypto/admin-key.pem
FABRIC_TLS_CERT_PATH=config/fabric/crypto/tls-ca-cert.pem
FABRIC_CHANNEL=legal-channel
FABRIC_CHAINCODE=legalcc
```

> Without Fabric running, the app degrades gracefully — document uploads skip blockchain anchoring, downloads use DB-only ACL check. All other features work normally.
