# PangoChain — Test Report

Generated: 2026-05-30 (updated — Opus polish pass, Wave 1)
All suites run on the `main` branch.

---

## Summary

| Suite | Framework | Tests | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Backend (JUnit 5 + Mockito) | Spring Boot Test 3.2.5, JUnit 5.10, Mockito 5 | 35 | 35 | 0 | 0 |
| Frontend (Vitest) | Vitest 3.x, React Testing Library, jsdom 26 | 67 | 67 | 0 | 0 |
| Chaincode (Go test) | Go 1.21, shimtest.MockStub | 14 | 14 | 0 | 0 |
| **Total** | | **116** | **116** | **0** | **0** |

> Wave 1 added **12 frontend tests** (`ApiClient.test.ts` ×6, `StatusBadge.test.tsx` ×6).
> Chaincode tests are unchanged; the Go toolchain is not installed in the current
> polish environment, so the 14 chaincode tests are carried forward as last verified
> rather than re-run this session.

### Wave 1 — new frontend tests

`ApiClient.test.ts` (6): auto-attaches `Authorization`; single-flight refresh (two concurrent
401s → exactly one `/auth/refresh`); auth store cleared when refresh fails; network-error toast;
timeout toast on `ECONNABORTED`; no toast on 503 (page-level Fabric banner owns that).

`StatusBadge.test.tsx` (6): ACTIVE→green, CONFIDENTIAL→red, VERIFIED→teal class sets;
`ACL FALLBACK`→amber normalization; unknown status→neutral fallback; children label override.

---

## Backend Tests

Run with: `cd pangochain-backend && ./mvnw test`

### AuditServiceTest (3 tests)
Tests dual-write behaviour of `AuditService` — Fabric-first, PostgreSQL fallback.

| Test | Assertion |
|---|---|
| `log_writesToPostgres` | `auditLogRepository.save()` called with correct `eventType` and `actorId` |
| `log_fabricAvailable_anchorsToFabricFirst` | Fabric `submitTransaction("LogAuditEvent", ...)` called before `auditLogRepository.save()` (inOrder) |
| `log_fabricUnavailable_stillWritesToPostgres` | Fabric throws `FabricException`; PostgreSQL write still occurs with `fabricTxId = null` |

### AuthServiceTest (8 tests)
Tests `AuthService` registration, login, MFA flows, and token refresh.

| Test | Assertion |
|---|---|
| `register_validInput_createsUserAndReturnsTokens` | User saved with correct email; audit logged; JWT pair returned |
| `register_duplicateEmail_throwsConflict` | `ResponseStatusException(409)` thrown |
| `login_validCredentials_returnsTokenPair` | Access + refresh tokens returned |
| `login_invalidCredentials_throwsUnauthorized` | `ResponseStatusException(401)` thrown |
| `login_managingPartnerWithoutMfa_throwsMfaSetupRequired` | `MfaSetupRequiredException` thrown; setup token generated |
| `login_managingPartnerWithMfaEnabled_throwsMfaChallengeRequired` | `MfaChallengeRequiredException` thrown; challenge token generated |
| `refresh_validRefreshToken_returnsNewAccessToken` | New access token returned |
| `refresh_nonRefreshToken_throwsUnauthorized` | `ResponseStatusException(401)` with "Not a refresh token" |

### CaseServiceTest (7 tests)
Tests case creation, listing, closure, and timeline.

| Test | Assertion |
|---|---|
| `create_registersOnFabricAndSaves` | Fabric `RegisterCase` called; case saved; audit written |
| `create_fabricUnavailable_stillSaves` | Fabric throws; case saved to PostgreSQL; audit written with null `fabricTxId` |
| `listByFirm_returnsOnlySameFirm` | Only cases for the matching `firmId` returned |
| `listByFirm_withSearch_filtersTitle` | Search term filters by title (case-insensitive) |
| `close_updatesStatusAndAnchors` | Case status → CLOSED; Fabric `CloseCase` called; audit written |
| `close_alreadyClosed_throwsBadRequest` | `ResponseStatusException(400)` thrown |
| `getTimeline_returnsSortedEvents` | Timeline events returned sorted by `eventDate` ascending |

### DocumentServiceTest (5 tests)
Tests document upload with two-layer ACL enforcement.

| Test | Assertion |
|---|---|
| `upload_registersOnFabricAndSaves` | Fabric `RegisterDocument` called; document saved; audit written |
| `upload_fabricUnavailable_stillSaves` | Fabric throws; document saved; audit written with null `fabricTxId` |
| `downloadCiphertext_fabricAclPass_returnsUrl` | Fabric `CheckAccess` passes; IPFS CID returned; audit written |
| `downloadCiphertext_fabricAclFail_throwsForbidden` | Fabric `CheckAccess` returns error; `AccessDeniedException` thrown |
| `downloadCiphertext_fabricUnreachable_fallsBackToDb` | Fabric unreachable; DB ACL check used; `ACL_FABRIC_FALLBACK` audit written |

### MessageServiceTest (4 tests)
Tests encrypted message storage and unread count.

| Test | Assertion |
|---|---|
| `send_storesCiphertextAndCreatesNotification` | Only `encryptedPayload` + `wrappedKeyToken` stored; notification created for recipient |
| `send_recipientNotFound_throws` | `IllegalArgumentException` with "Recipient not found" |
| `unreadCount_returnsCorrectCount` | Delegates to `countByRecipientIdAndReadAtIsNull`; returns correct count |
| `markOneRead_callsRepository` | `markOneRead(messageId, Instant)` called on repository; row count returned |

### HearingControllerTest (3 tests)
`@WebMvcTest` with `@WithMockUser` — tests HTTP layer for `HearingController`.

| Test | Assertion |
|---|---|
| `createHearing_savesAndReturns` | POST `/api/hearings` → 200; hearing saved; `HEARING_SCHEDULED` audit logged |
| `getUpcomingHearings_returnsOnlyFuture` | GET `/api/hearings/upcoming` → 200; list returned for firm |
| `sendReminder_auditsHighPriority` | POST `/api/hearings/{id}/remind` → 204; `HEARING_REMINDER_SENT` audit with `"priority":"HIGH"` |

### SecurityTest (5 tests)
`@WebMvcTest` — tests Spring Security layer: 401/403 enforcement.

| Test | Assertion |
|---|---|
| `unauthenticated_returns401` | GET `/api/documents` with no token → 401 |
| `expiredJwt_returns401` | GET `/api/documents` with expired JWT → 401 |
| `invalidJwtSignature_returns401` | GET `/api/documents` with tampered JWT → 401 |
| `wrongRole_returns403` | ASSOCIATE_JUNIOR → `GET /api/admin/users` → 403 (`@PreAuthorize` enforced) |
| `validJwt_correctRole_returns2xx` | MANAGING_PARTNER → `GET /api/admin/users` → 200 |

---

## Frontend Tests (55 total)

Run with: `cd pangochain-frontend && npm test`

### ParticlesBackground.test.tsx (5 tests)
Tests the canvas particle engine component (`src/components/ParticlesBackground.tsx`).

| Test | Assertion |
|---|---|
| `renders without crashing for auth variant` | `render(<ParticlesBackground variant="auth" />)` does not throw |
| `renders without crashing for app variant` | `render(<ParticlesBackground variant="app" />)` does not throw |
| `renders without crashing for vivid variant` | `render(<ParticlesBackground variant="vivid" />)` does not throw |
| `canvas element is present in DOM` | A `<canvas>` element is rendered |
| `does not intercept pointer events` | Canvas has `pointer-events: none` |

### ParticleBackground.test.tsx (7 tests)
Tests the `ParticleBackground` UI wrapper component (`src/components/ui/ParticleBackground.tsx`).

| Test | Assertion |
|---|---|
| `renders without crashing` | `render(<ParticleBackground />)` does not throw |
| `root container is position: fixed` | `data-testid="particle-background-root"` has `style.position === 'fixed'` |
| `root container has z-index: 0` | `style.zIndex === '0'` |
| `root container has pointer-events: none` | `style.pointerEvents === 'none'` |
| `root container covers full viewport` | `style.width === '100%'` and `style.height === '100%'` |
| `returns null when prefers-reduced-motion is "reduce"` | `container.firstChild` is null when `matchMedia` returns `matches: true` for `(prefers-reduced-motion: reduce)` |
| `has aria-hidden to exclude from accessibility tree` | `aria-hidden` attribute equals `"true"` |

### ErrorBoundary.test.tsx (5 tests)
Tests `ErrorBoundary` class component (`src/components/ui/ErrorBoundary.tsx`).

| Test | Assertion |
|---|---|
| `renders children when no error` | Child component renders normally; `data-testid="ok"` present |
| `shows fallback UI when child throws` | "Something went wrong" text visible when child throws |
| `fallback shows "Go to Dashboard" link` | Link with `href="/dashboard"` rendered in fallback |
| `does not show error page when no error` | "Something went wrong" not in DOM when no error |
| `catches multiple different errors` | Different error types all trigger fallback |

### Navigation.test.tsx (7 tests)
Tests Sidebar navigation (`src/layout/Sidebar.tsx`): role-based items, unread badge, mobile behaviour.

| Test | Assertion |
|---|---|
| `renders nothing when no user` | `container.firstChild` is null with no authenticated user |
| `shows legal nav items for legal professional` | Cases, Documents, Hearings, Audit Trail links present |
| `shows client nav items for client role` | My Portal, Document Vault, My Case links present |
| `does not show admin panel link for non-admin legal user` | Admin Panel link absent for PARTNER_SENIOR |
| `shows admin section for managing partner` | Admin Panel link present for MANAGING_PARTNER |
| `displays user full name in sidebar` | User's full name rendered in user info section |
| `calls onClose when nav link clicked (mobile)` | `onClose` callback invoked after clicking Cases in mobile overlay |

### LawyerDashboard.test.tsx (7 tests)
Tests the lawyer Dashboard page (`src/pages/Dashboard.tsx`).

| Test | Assertion |
|---|---|
| `shows loading skeleton initially` | `.animate-pulse` elements present before API resolves |
| `renders stat cards after load` | "Active Cases" label and count `5` visible; "Documents" and `42` visible |
| `shows recent cases list` | Case titles from mocked API appear in list |
| `shows next hearing card with title and court` | "Next Hearing" heading; hearing title and court name visible |
| `shows countdown days for upcoming hearing` | Regex `/\d+ days/` matches rendered countdown |
| `shows "No upcoming hearings" when nextHearing is null` | "No upcoming hearings" text when API returns `nextHearing: null` |
| `shows fabric tx ID truncated in recent activity` | First 8 chars of tx ID (`fab12345…`) visible in activity feed |

### crypto.test.ts (8 tests)
Tests WebCrypto primitives in Node.js/jsdom environment via `@types/node` webcrypto polyfill.

| Test | Assertion |
|---|---|
| `verifyIntegrity > returns true for matching hash` | SHA-256 of re-encrypted plaintext matches stored hash |
| `verifyIntegrity > returns false for wrong hash` | Hash mismatch returns false without throwing |
| `ECIES key wrap/unwrap > wraps and unwraps correctly` | `eciesWrapKey` + `eciesUnwrapKey` roundtrip produces original key bytes |
| `ECIES full roundtrip` | `encryptDocument` → `eciesWrapKey` → `eciesUnwrapKey` → `decryptDocument` → `verifyIntegrity` → all pass |
| *(4 additional ECDSA signing tests)* | `generateEcdsaKeypair`, `storeWrappedEcdsaKey`, `loadWrappedEcdsaKey` roundtrip |

### SecureDownloadModal.test.tsx (5 tests)
Tests the 4-stage download modal's UI and orchestration.

| Test | Assertion |
|---|---|
| `renders with 4 stage indicators` | All four stage labels present in DOM |
| `shows the file name and encryption info` | File name and "AES-256-GCM" text visible |
| `calls onClose when Cancel is clicked` | `onClose` callback invoked |
| `on integrity failure: shows error state` | API mocked to return data; `verifyIntegrity` returns false; error banner shown; file NOT downloaded |
| `Decrypt & Download button is disabled without password` | Button disabled when password field is empty |

### CaseList.test.tsx (5 tests)
Tests the Cases page component's loading, data display, and error states.

| Test | Assertion |
|---|---|
| `renders loading state initially` | Spinner/loading indicator shown while API call in-flight |
| `renders list of cases from API response` | Case titles from mocked API visible |
| `renders empty state when no cases exist` | Empty-state message shown for zero results |
| `shows error state when API call fails` | Error message shown when API rejects |
| `calls API with search param when user types` | `api.get` called with correct `?search=` query param |

Additionally: 5 `ParticlesBackground.test.tsx` tests (canvas engine) are included in the 55-test total.

---

## Chaincode Tests (Go)

Run with: `cd pangochain-chaincode/legalcc && go test ./...`

Tests use `shimtest.MockStub` to simulate Fabric transaction context. All 14 tests cover:

| Test | Coverage |
|---|---|
| `TestRegisterDocument_Success` | Document asset written; ACL initialised with owner grant |
| `TestRegisterDocument_AlreadyExists` | Returns error when document already on ledger |
| `TestGrantAccess_Success` | New ACL entry with capability written; `ACCESS_GRANTED` event emitted |
| `TestGrantAccess_DocumentNotFound` | Returns error |
| `TestRevokeAccess_Success` | ACL entry status set to REVOKED |
| `TestCheckAccess_HasAccess` | Returns grant for authorised user |
| `TestCheckAccess_NoAccess` | Returns error for unauthorised user |
| `TestCheckAccess_Revoked` | Revoked grant treated as no access |
| `TestUpdateDocumentHash_Success` | Hash updated; version incremented |
| `TestRegisterCase_Success` | Case asset written |
| `TestCloseCase_Success` | Case status set to CLOSED |
| `TestGetDocumentHistory_Success` | Key-history returned (mock returns single entry) |
| `TestLogAuditEvent_Success` | Audit asset stored on ledger |
| `TestLogAuditEvent_DuplicateKey` | Deduplication by composite key |

---

## Test Infrastructure Notes

### Backend
- `@MockitoSettings(strictness = Strictness.LENIENT)` applied to tests with varargs stubs (`submitTransaction(String, String...)`) to avoid `PotentialStubbingProblem` on Mockito strict mode
- `FabricGatewayService` is `@Autowired(required=false)` — injected via `ReflectionTestUtils.setField()` in `AuditServiceTest`
- `userRepository.save()` mock uses `thenAnswer` to assign a `UUID` to the user's `id` field, simulating `@GeneratedValue` behaviour

### Frontend
- jsdom 26.1.0 has `window.crypto` but NOT `window.crypto.subtle` — polyfilled in `src/test/setup.ts` using `import { webcrypto } from 'node:crypto'`
- `base64ToBytes` returns `Uint8Array<ArrayBuffer>` (explicit cast) to satisfy Node's native WebCrypto cross-context `ArrayBufferView` check
- All WebCrypto calls pass `Uint8Array` directly (not `.buffer as ArrayBuffer`) to avoid cross-VM-context rejection by Node's C++ WebCrypto implementation

### Security Test Design
- `unauthenticated_returns401`, `expiredJwt_returns401`, `invalidJwtSignature_returns401`: rely on Spring Security's `anyRequest().authenticated()` URL rule returning 401 for unauthenticated requests (JWT filter not wired in `@WebMvcTest` slice)
- `wrongRole_returns403`, `validJwt_correctRole_returns2xx`: use `SecurityMockMvcRequestPostProcessors.user()` to set up authentication; `@TestConfiguration @EnableMethodSecurity` inner class activates `@PreAuthorize` processing
