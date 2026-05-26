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

## What Is Already Done

### Phase 0 — Orientation
Complete.

### Phase 1 — Spring Security Hardening + Feature Solidification
Complete. Key changes made:
- `GlobalExceptionHandler.java` — `AccessDeniedException` → 403, `AuthenticationException` → 401, `NoSuchElementException/IllegalArgumentException` → 404
- `AdminController.java` — fixed critical bug (`hasAnyAuthority` → `hasAnyRole`), added audit logging, added `GET /api/admin/users/{id}/key-status`
- `SecurityConfig.java` — `GET /api/health` is public endpoint
- `HealthController.java` — NEW, `GET /api/health` returns `{"status":"UP","service":"PangoChain Backend","timestamp":"..."}`
- `AuditService.java` — dual-write: Fabric `LogAuditEvent` first, PostgreSQL second, graceful fallback when Fabric unreachable
- `AuditLogRepository.java` — added `findByFabricTxId()`, `countByActorId()`
- `AuditController.java` — `@PreAuthorize` added (MANAGING_PARTNER, IT_ADMIN, REGULATOR only)
- `LedgerController.java` — NEW: `GET /api/ledger/events`, `GET /api/ledger/tx/{txId}`
- `AuthController.java` — `@PreAuthorize("isAuthenticated()")` on `GET /me` and `POST /logout`
- `Document.java` — added `category` (String, default "GENERAL") and `confidential` (boolean, default false)
- `DocumentController.java` — `@PreAuthorize` on all endpoints + `GET /{id}/history`, `PUT /{id}/metadata`
- `DocumentService.java` — added `getDocumentHistory()`, `updateMetadata()`
- `DocumentDto.java` — added `category`, `confidential`
- `CaseController.java` — `@PreAuthorize` on all endpoints + `GET /{id}/timeline`
- `CaseService.java` — added `getTimeline()`
- `MessageRepository.java` — added `markOneRead()`, `findConversationSummaries()`, `findThread()`
- `MessageController.java` — class-level `@PreAuthorize("isAuthenticated()")` + `GET /conversations`, `GET /conversation/{userId}`, `PUT /{id}/read`
- `MessageService.java` — added `conversationSummaries()`, `thread()`, `markOneRead()`
- `HearingController.java` — `@PreAuthorize` on all endpoints + `PUT /{id}`, `POST /{id}/remind`
- `AccessControlController.java` — `@PreAuthorize` on all 3 endpoints
- `UserController.java`, `ESignatureController.java`, `ReminderController.java`, `CaseEventController.java` — class-level `@PreAuthorize("isAuthenticated()")`
- `DashboardController.java` — `@PreAuthorize` on `/stats`, new `GET /lawyer`, new `GET /client`

### Phase 2 — Particles Background Site-Wide
Complete. Key changes made:
- `ParticlesBackground.tsx` — fixed `pointer-events-none` on canvas, mouse listeners moved to parent element (so repulse works without intercepting clicks), `prefers-reduced-motion` renders null, `app` variant: count=60, speed=0.8, dotOpacity=0.32, linkOpacity=0.15, colors=`['#1B3A6B','#0E7490','#1d6464','#1E3A5F']`, added `export default`
- `MainLayout.tsx` — lazy-loads `ParticlesBackground` via `React.lazy` + `Suspense fallback={null}`
- `package.json` — added `"type-check": "tsc --noEmit"` and `"test": "vitest run"`

### Phase 3 — Tests (Partial)
Only one file written so far:
- `AuthServiceTest.java` at `pangochain-backend/src/test/java/com/pangochain/backend/auth/AuthServiceTest.java`
  - Uses `@ExtendWith(MockitoExtension.class)`
  - Mocks: `UserRepository`, `FirmRepository`, `Pbkdf2Service`, `JwtTokenProvider`, `AuditService`
  - 8 tests: `register_validInput`, `register_duplicateEmail`, `login_valid`, `login_invalidCredentials`, `login_managingPartnerWithoutMfa` (→ `MfaSetupRequiredException`), `login_managingPartnerWithMfaEnabled` (→ `MfaChallengeRequiredException`), `refresh_valid`, `refresh_nonRefreshToken`

---

## What To Do Now — Resume Here

### Step 1: Read these source files before writing any tests

```
pangochain-backend/src/main/java/com/pangochain/backend/cases/CaseService.java
pangochain-backend/src/main/java/com/pangochain/backend/document/DocumentService.java
pangochain-backend/src/main/java/com/pangochain/backend/audit/AuditService.java
pangochain-backend/src/main/java/com/pangochain/backend/message/MessageService.java
pangochain-backend/src/main/java/com/pangochain/backend/hearing/HearingService.java
pangochain-backend/src/main/java/com/pangochain/backend/cases/Case.java
pangochain-backend/src/main/java/com/pangochain/backend/cases/CaseRepository.java
pangochain-backend/src/main/java/com/pangochain/backend/document/DocumentAccess.java
pangochain-backend/src/main/java/com/pangochain/backend/document/DocumentAccessRepository.java
pangochain-backend/src/main/java/com/pangochain/backend/blockchain/FabricGatewayService.java
pangochain-backend/src/main/java/com/pangochain/backend/ipfs/IpfsService.java
```

Also find the chaincode source:
```bash
find /home/angkon/Pangochain_AOOP/pangochain-chaincode -name "*.go" | head -20
```

And find the frontend crypto module:
```bash
find /home/angkon/Pangochain_AOOP/pangochain-frontend/src -name "*.ts" | xargs grep -l "SubtleCrypto\|encryptDocument\|AES-GCM" 2>/dev/null
```

---

### Step 2: Write Backend Unit Tests (JUnit 5 + Mockito)

Test directory root: `pangochain-backend/src/test/java/com/pangochain/backend/`

#### `cases/CaseServiceTest.java`

Mocks: `CaseRepository`, `DocumentRepository`, `FabricGatewayService`, `AuditService`, `ObjectMapper`

Tests:
- `createCase_savesToDbAndCallsFabric()` — verify `caseRepository.save()` and `fabricGatewayService.registerCase()` both called
- `createCase_writesAuditLogEntry()` — verify `auditService.log("CASE_REGISTERED", ...)` called
- `closeCase_updatesStatusAndAudits()` — verify status set to CLOSED, `auditService.log("CASE_CLOSED", ...)` called
- `closeCase_throwsIfNotFound()` — `caseRepository.findById()` returns empty → `IllegalArgumentException`
- `listByFirm_returnsOnlyCasesForFirm()` — verify `caseRepository.findByFirmId(firmId, ...)` called
- `searchCases_filtersBySearchTerm()` — non-blank q → verify `caseRepository.searchByFirm()` called

Key signatures: `create(CaseCreateRequest req, User creator)`, `close(UUID caseId, User closer)`, `listByFirm(UUID firmId, CaseStatus status, String q, int page, int size)`

#### `document/DocumentServiceTest.java`

Mocks: `DocumentRepository`, `DocumentAccessRepository`, `CaseRepository`, `IpfsService`, `FabricGatewayService`, `AuditService`, `ObjectMapper`

Tests:
- `upload_storesOnIpfsAndFabricAndAudits()` — verify `ipfsService.add()` called, `fabricGatewayService.registerDocument()` called, `accessRepository.save()` called with owner entry, `auditService.log("DOC_REGISTERED", ...)` called
- `upload_fabricUnavailable_continuesWithoutTxId()` — `fabricGatewayService.registerDocument()` throws `FabricException`, verify document still saved, audit written with null fabricTxId
- `downloadCiphertext_layer2Pass_returnsBytes()` — `fabricGatewayService.checkAccess()` returns true, verify `ipfsService.cat()` called and bytes returned
- `downloadCiphertext_layer2Fail_throwsAccessDenied()` — `fabricGatewayService.checkAccess()` returns false, verify `DocumentService.AccessDeniedException` thrown
- `downloadCiphertext_fabricUnavailable_fallsBackToDb_andLogsAclFabricFallback()` — Fabric throws `FabricException`, verify fallback to `accessRepository.findActiveEntry()`, verify `auditService.log("ACL_FABRIC_FALLBACK", ...)` called

**Important**: `DocumentService.AccessDeniedException` is a static inner class inside `DocumentService`.

#### `audit/AuditServiceTest.java`

Mocks: `AuditLogRepository`, `FabricGatewayService`

Tests:
- `log_writesToPostgres()` — verify `auditLogRepository.save()` called with correct eventType
- `log_fabricAvailable_anchorsToFabricFirst()` — verify `fabricGatewayService.submitTransaction("LogAuditEvent", ...)` called, then `auditLogRepository.save()` called
- `log_fabricUnavailable_stillWritesToPostgres()` — `fabricGatewayService.submitTransaction()` throws `FabricException`, verify `auditLogRepository.save()` still called with null fabricTxId

Note: `AuditService.log()` is `@Async` — in Mockito unit tests async has no effect, call it directly.

#### `message/MessageServiceTest.java`

Mocks: `MessageRepository`, `NotificationRepository`, `UserRepository`

Tests:
- `send_storesCiphertextAndCreatesNotification()` — verify `messageRepository.save()` called with `encryptedPayload` set, `notificationRepository.save()` called for recipient. The message must NEVER contain plaintext — only `encryptedPayload` + `wrappedKeyToken`.
- `send_recipientNotFound_throws()` — `userRepository.findById()` returns empty → `IllegalArgumentException`
- `unreadCount_returnsCorrectCount()` — `messageRepository.countByRecipientIdAndReadAtIsNull()` returns 5L, verify result is 5L
- `markOneRead_callsRepository()` — verify `messageRepository.markOneRead(messageId, any(Instant.class))` called

#### `hearing/HearingServiceTest.java`

Read `HearingService.java` first. Then write at minimum:
- `createHearing_savesAndReturns()`
- `getUpcomingHearings_returnsOnlyFuture()`
- If a `sendReminder()` method exists, test it too

#### `security/SecurityTest.java` (Spring Boot integration test)

```java
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"jwt.secret=test-secret-at-least-32-chars-long", "spring.datasource.url=..."})
class SecurityTest {
```

Tests:
- `unauthenticated_returns401()` — `GET /api/documents` without token → 401
- `expiredJwt_returns401()` — expired JWT → 401
- `invalidJwtSignature_returns401()` — tampered JWT → 401
- `wrongRole_returns403()` — ASSOCIATE_JUNIOR hits `POST /api/cases/{id}/close` → 403
- `validJwt_correctRole_returns2xx()` — valid token with correct role → not 401/403

Use H2 in-memory or `@MockBean` for repositories if DB is unavailable in CI.

---

### Step 3: Set Up Vitest and Write Frontend Tests

Install dependencies:
```bash
cd /home/angkon/Pangochain_AOOP/pangochain-frontend
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Add to `vite.config.ts` inside `defineConfig({...})`:
```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
}
```

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

Test files to create (find actual crypto module path first):

- **`crypto.test.ts`** — test `encryptDocument`, `decryptDocument`, `eciesWrapKey`, `eciesUnwrapKey` roundtrips using real WebCrypto (jsdom supports SubtleCrypto). Verify the output blob's first 12 bytes equal the IV used for encryption.
- **`SecureDownloadModal.test.tsx`** — mock download service, test 4-stage flow (fetching → decrypting → verifying → done), test integrity failure branch, test success branch
- **`authStore.test.ts`** — Zustand store: login sets token + user, logout clears state, `isAuthenticated` reflects correct state
- **`CaseList.test.tsx`** — render with loading state, render with case data, search input filters results, empty state renders correct message
- **`ParticlesBackground.test.tsx`** — renders `<canvas>`, canvas has `pointer-events: none` style, renders null when `window.matchMedia('(prefers-reduced-motion: reduce)')` returns true

---

### Step 4: Write Chaincode Go Tests

Read the chaincode source first (`legalcc.go` or similar). Then create `legalcc_test.go`.

Use `github.com/hyperledger/fabric-chaincode-go/shimtest` (mock stub).

Tests:
- `TestRegisterCase` — happy path, state key set correctly
- `TestRegisterDocument` — happy path
- `TestCheckAccess_Granted` — after `GrantAccess`, `CheckAccess` returns true
- `TestCheckAccess_Denied` — without `GrantAccess`, `CheckAccess` returns false
- `TestRecordAuditEvent` — `LogAuditEvent` stores entry, retrievable
- `TestGetHistoryForKey` — history returns correct sequence of values
- `TestRegisterCase_Duplicate` — second call with same case ID returns error

---

### Step 5: Run Full Test Suite

```bash
# Backend
cd /home/angkon/Pangochain_AOOP/pangochain-backend
./mvnw test

# Frontend
cd /home/angkon/Pangochain_AOOP/pangochain-frontend
npm run test
npm run type-check

# Chaincode
cd /home/angkon/Pangochain_AOOP/pangochain-chaincode
go test ./...
```

Fix any failures before moving to Phase 4.

---

### Step 6: Phase 4 — Documentation

Write these four files in `/home/angkon/Pangochain_AOOP/`:

- **`FEATURES.md`** — full feature matrix by role (all 12 roles, all features, access level)
- **`API.md`** — every REST endpoint: method, path, auth requirement, request body, response shape, error codes
- **`CRYPTO.md`** — full cryptographic design: AES-256-GCM with IV-prepend contract, ECIES P-256 key wrapping (packed format: `ephPubRaw(65) || iv(12) || wrapped(48)`), PBKDF2-SHA256 @ 600k iterations, ECDSA P-256 signing, two-layer ACL design, `ACL_FABRIC_FALLBACK` logging protocol
- **`TEST-REPORT.md`** — test inventory table (file, test name, type, pass/fail), total counts, coverage summary

---

## Key File Paths

```
pangochain-backend/src/main/java/com/pangochain/backend/
  auth/AuthService.java
  auth/JwtTokenProvider.java
  auth/MfaSetupRequiredException.java
  auth/MfaChallengeRequiredException.java
  cases/CaseService.java
  cases/CaseRepository.java
  cases/Case.java
  cases/CaseStatus.java
  document/DocumentService.java          ← AccessDeniedException is inner class here
  document/DocumentRepository.java
  document/DocumentAccessRepository.java
  document/DocumentAccess.java
  audit/AuditService.java                ← @Async dual-write
  audit/AuditLogRepository.java
  message/MessageService.java
  message/MessageRepository.java
  hearing/HearingService.java            ← read before writing tests
  blockchain/FabricGatewayService.java   ← optional bean (@Autowired required=false)
  ipfs/IpfsService.java

pangochain-backend/src/test/java/com/pangochain/backend/
  auth/AuthServiceTest.java              ← DONE

pangochain-frontend/src/
  layout/MainLayout.tsx
  components/ParticlesBackground.tsx
  (find crypto module path via grep before writing crypto tests)
```

---

## UserRole Enum Values (exact names in codebase)

```
MANAGING_PARTNER, PARTNER_SENIOR, PARTNER_JUNIOR,
ASSOCIATE_SENIOR, ASSOCIATE_JUNIOR, SECRETARY, IT_ADMIN,
PARALEGAL, REGULATOR, CLIENT_PRIMARY, CLIENT_SECONDARY, CLIENT_CORP_ADMIN
```

Roles starting with `CLIENT_` get client-scoped dashboard stats. All others get firm-wide stats. `MANAGING_PARTNER` requires MFA (TOTP via `com.warrenstrange:googleauth`).

---

Start by reading the source files listed in Step 1, then proceed through Steps 2–6 in order without asking questions.
