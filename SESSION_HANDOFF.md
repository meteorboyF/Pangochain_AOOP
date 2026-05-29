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
src/test/ParticleBackground.test.tsx     — 7 tests (ParticleBackground ui wrapper)
src/test/ParticlesBackground.test.tsx    — 5 tests (canvas engine)
src/test/ErrorBoundary.test.tsx          — 5 tests
src/test/Navigation.test.tsx             — 7 tests (Sidebar: roles, badge, mobile)
src/test/CaseList.test.tsx               — 5 tests
src/test/SecureDownloadModal.test.tsx    — 5 tests
src/test/crypto.test.ts                  — 8 tests
src/test/LawyerDashboard.test.tsx        — 7 tests
```
Run: `cd pangochain-frontend && npm test`

**Backend (JUnit 5 + Mockito)**: BUILD SUCCESS
Run: `cd pangochain-backend && ./mvnw test`

**TypeScript**: Zero errors
Run: `cd pangochain-frontend && npm run type-check`

---

## What Is Already Done

### Phase 1 — Spring Security Hardening + Feature Solidification — COMPLETE
- `GlobalExceptionHandler`, `AdminController`, `SecurityConfig`, `HealthController`, `AuditService` (dual-write)
- `LedgerController` (GET /api/ledger/events, GET /api/ledger/tx/{txId})
- `DashboardController` (GET /lawyer, GET /client added)
- `DocumentController`, `CaseController`, `MessageController`, `HearingController` — all @PreAuthorize + new endpoints

### Phase 2 — Particles Background Site-Wide — COMPLETE
- `src/components/ui/ParticleBackground.tsx` — position fixed, z-0, pointer-events none, memo, prefers-reduced-motion, aria-hidden
- `App.tsx` — ParticleBackground mounted once before Routes; wrapped in ErrorBoundary; all pages in `relative z-10`
- `Login.tsx`, `Register.tsx` — semi-transparent bg (particles show through)
- `src/test/ParticleBackground.test.tsx` — 7 tests

### Phase 3 — Frontend Hardening — COMPLETE

All pages assessed and complete. Changes made this session:

**ErrorBoundary** (`src/components/ui/ErrorBoundary.tsx`):
- Class component, `getDerivedStateFromError` + `componentDidCatch`
- Fallback: AlertTriangle + "Something went wrong" + `<a href="/dashboard">Go to Dashboard</a>`

**AuditTrail.tsx**:
- `ACL_FABRIC_FALLBACK` event: amber badge (`bg-amber-100 text-amber-800 border border-amber-400`) + amber row bg
- Added to EVENT_TYPES filter list

**Dashboard.tsx**:
- Fetches `/dashboard/lawyer` via `Promise.allSettled` → `nextHearing` state
- `HearingCountdown` component: days/hours display (amber=today/tomorrow, teal=future)
- Next Hearing card in right column above Security Status
- Fabric Tx ID (first 8 chars + `…`) shown in Recent Activity per entry

**Sidebar.tsx** (`src/layout/Sidebar.tsx`):
- Unread badge: fetches `/dashboard/stats` on mount → shows teal circle count on Messages link
- Mobile hamburger: `hidden lg:flex` desktop + `fixed` overlay with backdrop for mobile
- Props: `mobileOpen?: boolean`, `onClose?: () => void`

**MainLayout.tsx**:
- Manages `mobileOpen` state; sticky mobile header with `<Menu>` hamburger + "PangoChain" title

**Documents.tsx**:
- `DocCategory` type: `ALL | GENERAL | CONTRACT | EVIDENCE | PLEADING | CORRESPONDENCE`
- Category filter chips UI + passes `?category=` param to `/documents` API

**Already-complete pages** (no changes needed):
- Cases.tsx, HearingManager.tsx, AuditTrail.tsx, AdminPanel.tsx, LedgerExplorer.tsx, Messages.tsx, CaseDetail.tsx, ClientPortal.tsx, ClientCase.tsx, MfaSetup.tsx ✅

### Phase 4 — Tests — MOSTLY COMPLETE
- `LawyerDashboard.test.tsx`: 7 tests (stat cards, recent cases, next hearing, countdown, no-hearing, tx ID)
- All other Phase 4 tests done in previous sessions

---

## What Remains — Resume Here

### Priority 1: Phase 5 — Documentation Updates

**1. Update `FEATURES.md`**
Path: `/home/angkon/Pangochain_AOOP/pangochain-frontend/FEATURES.md` (or check if it's in root `/home/angkon/Pangochain_AOOP/FEATURES.md`)
Add these sections:
- **Phase 2 — Site-wide Particle Background**: global fixed canvas (position: fixed, z-0, pointer-events: none), respects `prefers-reduced-motion`, mounted once in App.tsx above Routes
- **Phase 3 — Frontend Hardening**:
  - ErrorBoundary wrapping entire app
  - Audit Trail: ACL_FABRIC_FALLBACK amber highlight
  - Dashboard: next hearing countdown card, Fabric tx ID in activity feed
  - Sidebar: unread message badge, mobile hamburger drawer
  - Documents: category filter (GENERAL, CONTRACT, EVIDENCE, PLEADING, CORRESPONDENCE)

**2. Update `TEST-REPORT.md`**
Path: `/home/angkon/Pangochain_AOOP/TEST-REPORT.md`
- Update frontend test count: 29 → 55
- Add test descriptions for:
  - `ParticleBackground.test.tsx` (7 tests): renders, position fixed, z-index 0, pointer-events none, full viewport, reduced-motion returns null, aria-hidden
  - `ErrorBoundary.test.tsx` (5 tests): renders children normally, shows fallback when child throws, "Go to Dashboard" link href, no error page when no error, catches different errors
  - `Navigation.test.tsx` (7 tests): no user renders nothing, legal nav items, client nav items, no admin for non-admin, admin section for managing partner, shows full name, onClose called on link click
  - `LawyerDashboard.test.tsx` (7 tests): loading skeleton, stat cards, recent cases, next hearing card, countdown days, no upcoming hearings, tx ID truncation

### Priority 2: Phase 4 — Remaining Test

**`src/test/SecureUploadProgress.test.tsx`**:
First read `DocumentUploadDropzone.tsx` to understand its props and state. Then test:
- renders idle state (drop zone visible)
- shows progress/uploading state when upload in progress
- shows success state after upload completes
- shows error state on failure

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
    ParticlesBackground.tsx            — vanilla canvas particle engine (3 variants)
    DocumentUploadDropzone.tsx         — drag-drop upload with ECIES key wrapping
    SecureDownloadModal.tsx            — IPFS + AES-GCM decrypt + SHA-256 verify
    TeamAccessPanel.tsx                — ACL management per document
    SignDocumentModal.tsx              — ECDSA signing
  pages/
    Dashboard.tsx                      — next-hearing card, HearingCountdown, tx ID in activity
    Cases.tsx                          — search + filter + pagination
    CaseDetail.tsx                     — 4-tab view
    AuditTrail.tsx                     — ACL_FABRIC_FALLBACK amber row highlight
    HearingManager.tsx                 — upcoming/past separation
    AdminPanel.tsx                     — activate/suspend users
    Messages.tsx                       — E2E encrypted messaging
    Documents.tsx                      — category filter (ALL/GENERAL/CONTRACT/EVIDENCE/PLEADING/CORRESPONDENCE)
    LedgerExplorer.tsx                 — expandable Fabric events
    MfaSetup.tsx                       — TOTP enrollment (complete)
    client/
      ClientPortal.tsx                 — hearing countdown, reminders
      ClientDocuments.tsx              — document vault
      ClientCase.tsx                   — privacy rights, blockchain timeline
  test/
    ParticleBackground.test.tsx        — 7 tests
    ParticlesBackground.test.tsx       — 5 tests
    ErrorBoundary.test.tsx             — 5 tests
    Navigation.test.tsx                — 7 tests
    CaseList.test.tsx                  — 5 tests
    SecureDownloadModal.test.tsx       — 5 tests
    crypto.test.ts                     — 8 tests
    LawyerDashboard.test.tsx           — 7 tests
```

---

## Git Log (recent)
```
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
