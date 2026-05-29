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
11. **Authority prefix**: The JWT filter sets authorities as `ROLE_MANAGING_PARTNER`, etc. Always use `hasAnyRole()` not `hasAnyAuthority()` in `@PreAuthorize`.

---

## Current Test Status

**Frontend (Vitest)**: 48 tests, 8 test files, 0 failures
```
src/test/ParticleBackground.test.tsx     — 7 tests (ParticleBackground ui wrapper)
src/test/ParticlesBackground.test.tsx    — 5 tests (canvas engine)
src/test/ErrorBoundary.test.tsx          — 5 tests
src/test/Navigation.test.tsx             — 7 tests (Sidebar: roles, badge, mobile)
src/test/CaseList.test.tsx               — 5 tests
src/test/SecureDownloadModal.test.tsx    — 5 tests
src/test/crypto.test.ts                  — 8 tests
src/test/ParticleBackground.test.tsx     — 7 tests
```
Run: `cd pangochain-frontend && npm test`

**Backend (JUnit 5 + Mockito)**: All fixed, BUILD SUCCESS
Run: `cd pangochain-backend && ./mvnw test`

**TypeScript**: Zero errors
Run: `cd pangochain-frontend && npm run type-check`

---

## What Is Already Done

### Phase 1 — Spring Security Hardening + Feature Solidification
Complete. Key changes:
- `GlobalExceptionHandler.java` — AccessDeniedException → 403, AuthenticationException → 401
- `AdminController.java` — critical bug fixed (hasAnyAuthority → hasAnyRole), audit logging added
- `SecurityConfig.java` — GET /api/health is public
- `HealthController.java` — NEW, GET /api/health
- `AuditService.java` — dual-write: Fabric LogAuditEvent first, PostgreSQL second, graceful fallback
- `LedgerController.java` — NEW: GET /api/ledger/events, GET /api/ledger/tx/{txId}
- `DashboardController.java` — @PreAuthorize on /stats, new GET /lawyer, new GET /client
- `DocumentController.java` — @PreAuthorize on all + GET /{id}/history, PUT /{id}/metadata
- `CaseController.java` — @PreAuthorize on all + GET /{id}/timeline
- `MessageController.java` — GET /conversations, GET /conversation/{userId}, PUT /{id}/read
- `HearingController.java` — @PreAuthorize on all + PUT /{id}, POST /{id}/remind

### Phase 2 — Particles Background Site-Wide
Complete. Key changes:
- `src/components/ui/ParticleBackground.tsx` — position fixed, z-0, pointer-events none, memo, prefers-reduced-motion guard, aria-hidden, data-testid="particle-background-root"
- `App.tsx` — mounts `<ParticleBackground />` ONCE before Routes, all pages in `relative z-10`; wrapped in `<ErrorBoundary>`
- `MainLayout.tsx` — bg-surface/80 semi-transparent
- `Login.tsx` — right panel bg-surface/90; left dark teal panel keeps its own inline auth particles
- `Register.tsx` — bg-surface/90

### Phase 3 — Frontend Hardening (Completed)

**ErrorBoundary** (`src/components/ui/ErrorBoundary.tsx`):
- Class component, `getDerivedStateFromError` + `componentDidCatch`
- Fallback: AlertTriangle icon + "Something went wrong" + "Go to Dashboard" `<a href="/dashboard">`
- Wraps entire app in App.tsx

**AuditTrail.tsx**:
- `ACL_FABRIC_FALLBACK` event type: amber badge (`bg-amber-100 text-amber-800 border border-amber-400`)
- Amber row background (`bg-amber-50/50`) for these rows
- Added to EVENT_TYPES filter list

**Dashboard.tsx**:
- Fetches `/dashboard/lawyer` via `Promise.allSettled`
- `NextHearing` interface + `HearingCountdown` component (days/hours, amber=today/tomorrow, teal=future)
- Next Hearing card in right column above Security Status; shows "No upcoming hearings" when null

**Sidebar.tsx** (`src/layout/Sidebar.tsx`):
- Unread message badge: fetches `/dashboard/stats` on mount, shows teal circle count on Messages link
- Mobile hamburger: sidebar splits into `hidden lg:flex` desktop + `fixed` overlay with backdrop for mobile
- Props: `mobileOpen?: boolean`, `onClose?: () => void`
- Nav link `onClick={onClose}` closes mobile drawer on navigation

**MainLayout.tsx** (`src/layout/MainLayout.tsx`):
- Manages `mobileOpen` state (useState)
- Mobile header bar (`lg:hidden`): sticky, hamburger `<Menu>` + "PangoChain" title

**Pages already complete** (assessed, no changes needed):
- Cases.tsx — search, debounced filter, status chips, loading, error, empty ✅
- HearingManager.tsx — upcoming/past separation, create form, delete, send reminder ✅
- AdminPanel.tsx — activate/suspend per-row, toasts, MFA column ✅
- LedgerExplorer.tsx — event filter, search, expandable JSON, pagination ✅
- Messages.tsx — password-unlock, per-message decrypt, compose, empty state ✅
- CaseDetail.tsx — 4 tabs (documents/hearings/team/timeline), loading, not-found ✅
- ClientPortal.tsx — HearingCountdown, stats, reminders, loading, error ✅

---

## What Remains — Resume Here

### Priority 1: Phase 3 remaining minor items

**3-C Dashboard — Fabric Tx ID in Recent Activity**
In `Dashboard.tsx` Recent Activity section (around line ~246), add truncated tx ID for each audit entry that has `fabricTxId`. Show `e.fabricTxId.slice(0,8) + '…'` in a `code` element next to the resourceId.

**3-B MFA Setup page** (`src/pages/MfaSetup.tsx`)
Read this file first. Check it has:
1. Fetches QR code from `GET /mfa/setup` 
2. Input for 6-digit TOTP code
3. Calls `POST /mfa/verify` with code
4. Success toast + redirect
If anything is missing, add it.

**3-F Documents page** (`src/pages/Documents.tsx`)
Read this file. Verify it has:
- Category filter (GENERAL, CONTRACT, EVIDENCE, PLEADING, CORRESPONDENCE)
- `SecureDownloadModal` wired to download action
- Loading skeleton, error banner, empty state
Add what's missing.

**3-L Client Case page** (`src/pages/client/ClientCase.tsx`)
Read this file. Add if missing:
- Privacy rights section (client's right to view own docs, right to encryption key)
- Blockchain timeline of case events (fetch from `GET /cases/{id}/timeline`)

### Priority 2: Phase 4 — Tests to Write

**`src/test/LawyerDashboard.test.tsx`**:
```
Mock api.get for /dashboard/stats, /cases, /audit, /dashboard/lawyer
Tests:
- renders stat cards (Active Cases, Documents, etc.)
- shows next hearing card with countdown when hearing data present
- shows "No upcoming hearings" when nextHearing is null
- shows loading skeleton initially
- shows Recent Cases list entries
```

**`src/test/SecureUploadProgress.test.tsx`**:
Read `DocumentUploadDropzone.tsx` first. Test upload state transitions (idle → uploading → complete/error).

### Priority 3: Phase 5 — Documentation

1. Update `/home/angkon/Pangochain_AOOP/pangochain-frontend/FEATURES.md` — add Phase 2 particle background + Phase 3 hardening items
2. Update `/home/angkon/Pangochain_AOOP/TEST-REPORT.md` — update frontend test count to 48, add ErrorBoundary (5) and Navigation (7) test descriptions

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
      EncryptionBadge.tsx              — client encryption status badge
    ParticlesBackground.tsx            — vanilla canvas particle engine (3 variants: vivid/auth/app)
    DocumentUploadDropzone.tsx         — drag-drop upload with ECIES key wrapping
    SecureDownloadModal.tsx            — IPFS + AES-GCM decrypt + SHA-256 verify
    TeamAccessPanel.tsx                — ACL management per document
    SignDocumentModal.tsx              — ECDSA signing
  pages/
    Dashboard.tsx                      — next-hearing card, HearingCountdown component
    Cases.tsx                          — search + filter + pagination
    CaseDetail.tsx                     — 4-tab view
    AuditTrail.tsx                     — ACL_FABRIC_FALLBACK amber highlight
    HearingManager.tsx                 — upcoming/past separation
    AdminPanel.tsx                     — activate/suspend users
    Messages.tsx                       — E2E encrypted messaging
    LedgerExplorer.tsx                 — expandable Fabric events
    MfaSetup.tsx                       — TOTP enrollment (may need work)
    Documents.tsx                      — document vault (may need work)
    client/
      ClientPortal.tsx                 — hearing countdown, reminders
      ClientDocuments.tsx              — document vault
      ClientCase.tsx                   — case timeline (may need work)
  lib/
    api.ts                             — axios instance (JWT interceptor + refresh)
    crypto.ts                          — WebCrypto: ECIES, AES-GCM, PBKDF2, ECDSA
    mockData.ts                        — demo-user-001 fixture data only
  store/
    authStore.ts                       — Zustand: user, accessToken, refreshToken
  test/
    ParticleBackground.test.tsx        — 7 tests (ui wrapper)
    ParticlesBackground.test.tsx       — 5 tests (canvas engine)
    ErrorBoundary.test.tsx             — 5 tests
    Navigation.test.tsx                — 7 tests (Sidebar)
    CaseList.test.tsx                  — 5 tests
    SecureDownloadModal.test.tsx       — 5 tests
    crypto.test.ts                     — 8 tests
```

---

## Git Log (recent)
```
b7428c1  feat: Phase 3 — ErrorBoundary, Dashboard next-hearing card, Sidebar unread badge + mobile hamburger, AuditTrail ACL_FABRIC_FALLBACK highlight
1eae3e5  feat: Phase 2 — particle effect rollout and config alignment
943cbc6  feat: Phase 1 — Spring Security hardening, missing endpoints, TS fixes
```

---

## Quick Verification Commands

```bash
cd /home/angkon/Pangochain_AOOP/pangochain-frontend
npm run type-check      # must output nothing (0 errors)
npm test                # must show 48 tests, 0 failures

cd /home/angkon/Pangochain_AOOP/pangochain-backend
./mvnw test -q          # must show BUILD SUCCESS
```
