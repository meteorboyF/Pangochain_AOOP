# PangoChain — Session Handoff

Read this entire file before writing a single line of code. This is a continuation prompt — pick up exactly where the last session left off without asking questions.

---

## Project Overview

**PangoChain** is a secure legal document management platform.

Stack:
- **Backend**: Spring Boot 3.2.5, Java 21, Spring Security (stateless JWT), PostgreSQL 16, Liquibase, Hyperledger Fabric 2.4, IPFS Kubo
- **Frontend**: React 18, TypeScript strict, Vite, Tailwind CSS, Zustand, WebCrypto API (SubtleCrypto)
- **Chaincode**: Go, `contractapi`
- **Working directory**: `/home/angkon/Pangochain_AOOP`
- **Frontend root**: `/home/angkon/Pangochain_AOOP/pangochain-frontend`

---

## Non-Negotiable Rules — Enforce Strictly, Never Violate

1. **Plaintext NEVER leaves the browser.** Server receives only ciphertext.
2. **IV (12 bytes) always prepended to ciphertext** before IPFS storage. Download always reads `bytes[0:12]` as IV.
3. **ECIES P-256 only** for key wrapping — never RSA-OAEP.
4. **PBKDF2-SHA256 @ 600,000 iterations** for all password-based key derivation.
5. **Every download**: IPFS fetch → ECIES unwrap → AES-GCM decrypt → SHA-256 verify.
6. **Two-layer ACL always**: Spring Security JWT (Layer 1) + Fabric `CheckAccess` chaincode (Layer 2). Fallback to DB ACL only if Fabric unreachable, logged as `ACL_FABRIC_FALLBACK` in **both** audit stores.
7. **PostgreSQL `audit_log` is append-only** (INSERT-only trigger). Never remove or bypass the trigger.
8. **Every backend endpoint writes an audit entry to BOTH PostgreSQL and Fabric.**
9. **No mock data in production code paths.** Demo mode only for `userId === 'demo-user-001'`.
10. **TypeScript strict mode — zero type errors.**
11. **Authority prefix**: JWT filter sets authorities as `ROLE_MANAGING_PARTNER`, etc. Always use `hasAnyRole()` not `hasAnyAuthority()` in `@PreAuthorize`.

---

## Current Test Status

**Frontend (Vitest)**: 55 tests, 9 test files, 0 failures
```
src/test/ParticleBackground.test.tsx     — 7 tests
src/test/ParticlesBackground.test.tsx    — 5 tests
src/test/ErrorBoundary.test.tsx          — 5 tests
src/test/Navigation.test.tsx             — 7 tests
src/test/CaseList.test.tsx               — 5 tests
src/test/SecureDownloadModal.test.tsx    — 5 tests
src/test/crypto.test.ts                  — 8 tests
src/test/LawyerDashboard.test.tsx        — 7 tests
```
Run: `cd pangochain-frontend && npm test`

**Backend (JUnit 5 + Mockito)**: 35 tests, BUILD SUCCESS
Run: `cd pangochain-backend && ./mvnw test`

**TypeScript**: Zero errors
Run: `cd pangochain-frontend && npm run type-check`

**Total across all suites**: 104 tests (35 backend + 55 frontend + 14 chaincode), 0 failures

---

## What Is Done — All Phases Complete

### Phase 1 — Spring Security Hardening — COMPLETE (commit 943cbc6)
All endpoints @PreAuthorize, dual-write audit, DashboardController /lawyer + /client, GlobalExceptionHandler, HealthController, LedgerController.

### Phase 2 — Particles Background Site-Wide — COMPLETE (commit 1eae3e5 + b7428c1)
- `src/components/ui/ParticleBackground.tsx`: position fixed, z-0, pointer-events none, memo, reduced-motion, aria-hidden
- App.tsx: mounted once before Routes; wrapped in ErrorBoundary
- Login.tsx/Register.tsx: semi-transparent bg

### Phase 3 — Frontend Hardening — COMPLETE (commits b7428c1, 78f6f0b)
All implemented:
- **ErrorBoundary** — class component, "Something went wrong" fallback with `/dashboard` link
- **AuditTrail** — ACL_FABRIC_FALLBACK amber badge + amber row bg + filter option
- **Dashboard** — next hearing card (HearingCountdown component), Fabric tx ID (8 chars) in activity feed, fetches /dashboard/lawyer
- **Sidebar** — unread message badge (from /dashboard/stats), mobile hamburger overlay with backdrop
- **MainLayout** — mobile sticky header with hamburger button
- **Documents** — category filter chips (ALL/GENERAL/CONTRACT/EVIDENCE/PLEADING/CORRESPONDENCE)
- All other pages assessed as complete (Cases, HearingManager, AdminPanel, LedgerExplorer, Messages, CaseDetail, ClientPortal, ClientCase, MfaSetup)

### Phase 4 — Tests — COMPLETE (commits b7428c1, 78f6f0b)
- ParticleBackground.test.tsx (7), ErrorBoundary.test.tsx (5), Navigation.test.tsx (7), LawyerDashboard.test.tsx (7)

### Phase 5 — Documentation — COMPLETE (commit 5ecc0ee)
- FEATURES.md: Phase 2 (particles) + Phase 3 (frontend hardening) tables added
- TEST-REPORT.md: count updated 29→55 frontend, 78→104 total; new test suite descriptions added

---

## What Remains — Potential Next Work

### Optional: Additional Test

**`src/test/SecureUploadProgress.test.tsx`**:
Read `DocumentUploadDropzone.tsx` first. If it has upload progress state (idle → uploading → success/error), write tests for those transitions. This is the only unwritten test from the original Phase 4 plan.

### Optional: Backend Tests
The backend tests written so far cover the core services. If more coverage is desired, test classes exist for:
- `src/test/java/com/pangochain/backend/cases/CaseServiceTest.java`
- `src/test/java/com/pangochain/backend/document/DocumentServiceTest.java`
- `src/test/java/com/pangochain/backend/message/MessageServiceTest.java`
- `src/test/java/com/pangochain/backend/hearing/HearingServiceTest.java`

### Optional: E2E Testing
No Playwright/Cypress tests exist. Could add integration tests covering the full upload/download/audit pipeline.

---

## Git Log (recent)
```
5ecc0ee  docs: Phase 5 — update FEATURES.md and TEST-REPORT.md for Phase 2+3 completions
18b51aa  docs: update SESSION_HANDOFF — Phase 3 fully complete, 55 tests, Phase 5 docs remaining
78f6f0b  feat: Phase 3 complete + Phase 4 LawyerDashboard tests — Documents category filter, Dashboard Fabric tx IDs, 55 tests
fa6b2b8  docs: update SESSION_HANDOFF with Phase 3 completion state and remaining tasks
b7428c1  feat: Phase 3 — ErrorBoundary, Dashboard next-hearing card, Sidebar unread badge + mobile hamburger, AuditTrail ACL_FABRIC_FALLBACK highlight
1eae3e5  feat: Phase 2 — particle effect rollout and config alignment
943cbc6  feat: Phase 1 — Spring Security hardening, missing endpoints, TS fixes
```

---

## Quick Verification Commands

```bash
cd /home/angkon/Pangochain_AOOP/pangochain-frontend
npm run type-check      # must output nothing (0 errors)
npm test                # must show 55 tests, 0 failures

cd /home/angkon/Pangochain_AOOP/pangochain-backend
./mvnw test -q          # must show BUILD SUCCESS
```

---

## Key File Locations

```
pangochain-frontend/src/
  App.tsx                              — root: ErrorBoundary + ParticleBackground + Routes
  layout/
    MainLayout.tsx                     — mobile hamburger (mobileOpen state)
    Sidebar.tsx                        — unread badge, mobile overlay drawer
  components/
    ui/
      ErrorBoundary.tsx                — class error boundary
      ParticleBackground.tsx           — global fixed particle wrapper (lazy + memo)
    ParticlesBackground.tsx            — vanilla canvas particle engine
    DocumentUploadDropzone.tsx         — drag-drop upload
    SecureDownloadModal.tsx            — IPFS + AES-GCM decrypt + SHA-256 verify
  pages/
    Dashboard.tsx                      — next-hearing card, HearingCountdown, tx ID in activity
    AuditTrail.tsx                     — ACL_FABRIC_FALLBACK amber highlight
    Documents.tsx                      — category filter chips
    [all others complete — no changes needed]
  test/
    ParticleBackground.test.tsx        — 7 tests
    ParticlesBackground.test.tsx       — 5 tests
    ErrorBoundary.test.tsx             — 5 tests
    Navigation.test.tsx                — 7 tests
    CaseList.test.tsx                  — 5 tests
    SecureDownloadModal.test.tsx       — 5 tests
    crypto.test.ts                     — 8 tests
    LawyerDashboard.test.tsx           — 7 tests

pangochain-backend/
  [all test classes in src/test/java/com/pangochain/backend/]
  API.md, CRYPTO.md, TEST-REPORT.md, FEATURES.md — in /home/angkon/Pangochain_AOOP/
```
