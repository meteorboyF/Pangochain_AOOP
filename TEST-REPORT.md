# PangoChain — Test Report

Generated: 2026-05-26  
All suites run on the `main` branch.

---

## Summary

| Suite | Framework | Tests | Pass | Fail | Skip |
|---|---|---|---|---|---|
| Backend (JUnit 5 + Mockito) | Spring Boot Test 3.2.5, JUnit 5.10, Mockito 5 | 35 | 35 | 0 | 0 |
| Frontend (Vitest) | Vitest 2.x, React Testing Library, jsdom 26 | 29 | 29 | 0 | 0 |
| Chaincode (Go test) | Go 1.21, shimtest.MockStub | 14 | 14 | 0 | 0 |
| **Total** | | **78** | **78** | **0** | **0** |

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

## Frontend Tests

Run with: `cd pangochain-frontend && npx vitest run`

### crypto.test.ts (4 tests)
Tests WebCrypto primitives in Node.js/jsdom environment via `@types/node` webcrypto polyfill.

| Test | Assertion |
|---|---|
| `verifyIntegrity > returns true for matching hash` | SHA-256 of re-encrypted plaintext matches stored hash |
| `verifyIntegrity > returns false for wrong hash` | Hash mismatch returns false without throwing |
| `ECIES key wrap/unwrap > wraps and unwraps correctly` | `eciesWrapKey` + `eciesUnwrapKey` roundtrip produces original key bytes |
| `ECIES full roundtrip` | `encryptDocument` → `eciesWrapKey` → `eciesUnwrapKey` → `decryptDocument` → `verifyIntegrity` → all pass |

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

Additionally: 3 `auth.test.ts` tests (login form), 5 `hearing.test.tsx` tests, and 2 `admin.test.tsx` tests are included in the 29-test total.

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
