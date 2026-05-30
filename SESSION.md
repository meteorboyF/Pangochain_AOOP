# PangoChain — Session Handoff (Opus polish + features)

_Last updated: 2026-05-30. Keep this current so work can resume across session limits._

## How to run
- **Backend:** `cd pangochain-backend && ./mvnw spring-boot:run` (port 8080). Needs local Postgres (`pangochain`/`pangochain_secret`). Fabric/IPFS optional — app uses DB fallback if down.
- **Frontend:** `cd pangochain-frontend && npm run dev` (port 3000, proxies `/api` and `/ws` → 8080).
- Both are currently running in the background (logs: `/tmp/pangochain-backend.log`, `/tmp/pangochain-frontend.log`). To reclaim them in your own terminal, kill the bg PIDs and start them yourself.

## Seed credentials (DataSeeder) — full table in FEATURES.md
- Managing Partner: `admin@pangolawfirm.com` / `Admin123!` (MFA required)
- Senior Associate: `lawyer@pangolawfirm.com` / `Lawyer123!` (lead, Chen v. Meridian)
- Paralegal: `paralegal@pangolawfirm.com` / `Paralegal123!`
- Associates A–D: `a@pangolawfirm.com` … `d@pangolawfirm.com` / `Assoc123!` (subordinates for delegation demo)
- Clients: `client@demo.com` / `Client123!` · `client2@demo.com` / `Client123!`
- **First-login key provisioning** auto-generates E2E keypairs on first browser login, so every account above is E2E-capable (chat, documents, signing).

## Test status
- Backend: **44** JUnit (`./mvnw test`) — was 35; +3 `ChatCryptoServiceTest`, +4 `RateLimitTest`, +2 `FabricCircuitBreakerTest`.
- Frontend: **69** Vitest (`npm test`) — was 55; +6 `ApiClient`, +6 `StatusBadge`, +2 `SecureDownloadModal` pipeline.
- Chaincode: 14 Go (unverified here — Go toolchain not installed).
- TypeScript: 0 errors (`npm run type-check`).

## DONE
### Wave 1 — hardening
- `application.yml`: HikariCP tuning, Tomcat threads, JDBC batching, actuator `when-authorized`. (`open-in-view` left **true** — see Known issues.)
- `GlobalExceptionHandler`: `error`/`timestamp`/`path` on ProblemDetails; `FabricException`→503, `IpfsException`→503, `DataIntegrityViolation`→409.
- `SecurityConfig`: CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy; `/ws/**` permitted.
- `005-performance-indexes.sql`: missing hot-path indexes.
- Frontend `api.ts`: single-flight 401 refresh, 30s timeout (kept **quiet** — no global toasts/redirects; pages own error UX).
- `authStore`: `hasHydrated` gate (no login flash), **sessionStorage** for tokens, selectors.
- `Skeleton.tsx`, `StatusBadge.tsx` (+ tests).

### Regression fixes (both were mine, fixed + verified)
- API interceptor was spamming toasts/redirects on 403/5xx → made quiet.
- `open-in-view:false` caused `LazyInitializationException` 500s (dashboard/hearings) → reverted to `true`.

### UI polish
- Logo cropped to pangolin mark (`public/logo-mark.png`, via PIL), bigger, wordmark/text removed in sidebar + mobile header.
- Particles now visible app-wide (transparent `MainLayout`; `app` variant brightened; Login panel lightened).
- Client **Document Vault** crash fixed (`/documents` returns a Page → read `.content`).
- Messages: 10s polling (later superseded by real-time chat).

### Feature 1 — Real-time team chat (Phase 1 COMPLETE)
- Backend `chat` package: `Conversation`/`ConversationMember`/`ChatMessage` + repos; `ChatService` (lazy auto-provision of CASE + FIRM channels, membership sync); `ChatController` REST; `ChatCryptoService` (AES-256-GCM **encrypted at rest**, server-readable per design); `WebSocketConfig` (STOMP `/ws`, `/topic/conversations/{id}`, `/app`); `StompAuthChannelInterceptor` (JWT on CONNECT, membership check on SUBSCRIBE). Migration `006-chat.sql`. Added `spring-boot-starter-websocket`.
- Frontend: `pages/Chat.tsx` (channel sidebar + live message pane), `lib/chatSocket.ts` (@stomp/stompjs + sockjs-client), `/messages` route now → Chat. Vite proxy `/ws` + `define global`.
- **Verified live:** lawyer auto-sees CASE channels + FIRM channel; messages persist encrypted, broadcast over STOMP.

## DONE — Seeded accounts + first-login key provisioning
- `PUT /api/users/me/public-keys` upserts the current user's ECIES + ECDSA public keys.
- Frontend `lib/provisionKeys.ts` `ensureUserKeys()` runs on login: if no local wrapped key, generates ECIES+ECDSA, wraps to localStorage (PBKDF2), uploads public keys. Wired into `Login.storeAndRedirect`. Makes any account (incl. seeded) E2E-capable on first browser login.
- `DataSeeder` now additive/idempotent: seeds Associates A–D into FirmA + Chen v. Meridian team, plus starter chat messages in the case + firm channels. **Verified live** (A sees both channels with decrypted seeded messages).

## KNOWN ISSUES / LIMITATIONS
- ~~E2E for seeded users~~ → **RESOLVED** via first-login key provisioning above.
- `open-in-view: true` is a stopgap; flipping to `false` (the prod target) needs `@Transactional`/`JOIN FETCH` boundaries on controllers that touch lazy associations (e.g. `user.getFirm()`).
- Chaincode Go tests can't be run in this environment (Go not installed).
- `src/pages/Messages.tsx` is now dead code (route repointed to Chat) — left in place; safe to delete later.

## Feature 2 — Bulk access distribution + delegation (COMPLETE)
- Backend: capability-capped delegation in `AccessControlService.grant()` (owner>write>read); `POST /api/access/grant-batch` (per-item txns, partial success); `GET /api/cases/{id}/members` (case team for the UI).
- Frontend: `pages/DistributeAccess.tsx` at `/cases/:id/distribute` (linked from CaseDetail header "Distribute Access"). Matrix of documents × team members; unlock key → per-doc unwrap + per-grantee ECIES re-wrap → `grant-batch`; capability + expiry; per-pair results. Grantees are case members with a public key (others shown as "must log in once").
- Verified: `/cases/{id}/members` returns the seeded team. Full E2E test needs the lawyer to upload a doc + associates to have logged in once (to provision keys).
- Backend 38 tests, frontend 67, 0 TS errors.

## Feature 3 — Case-journey tree (COMPLETE)
- Backend `casenode` package: `CaseNode` (parentId tree edge, mergeIntoId dashed convergence edge, author, type ROOT/FINDING/EVIDENCE/RESEARCH/LOOPHOLE/HEARING/FILING, title, description, linkedDocId, nodeDate); `CaseNodeService` (auto-provisions ROOT dated to case open; create logs CASE_NODE_ADDED audit); `GET/POST /api/cases/{id}/nodes`; migration `007-case-journey.sql`.
- Frontend `pages/CaseJourney.tsx` at `/cases/:id/journey` (linked from CaseDetail "Journey"): depth-layered git-graph (SVG solid parent edges + dashed merge-into edges), type-colored node cards, click→detail panel (date/author/type/description/linked doc), add-node modal (type, branch-from, converges-into, details). Visual convergence per decision; operational merge deferred.
- Verified live: ROOT auto-created, finding nodes add + render.

## DONE — SecureDownloadModal redesign (Area 4-F)
- Numbered stage circles (pending→active→done/error), per-stage technical detail + "Completed in Nms" timing, distinct decryption-failure vs **integrity-failure** banners (exact tamper-warning copy), success banner with filename+size, auto-download 500ms after verify. +2 pipeline tests (69 frontend total). Findings can link a case document (CaseJourney add-node + detail panel).

## DONE — StatusBadge rollout
- `StatusBadge` is now used for status chips in Cases, Dashboard (recent cases), and AdminPanel (user status); removed each page's inline `STATUS_COLORS` map. Added a `PENDING_APPROVAL` variant. AuditTrail left as-is (event-type taxonomy, not status). 69 frontend tests still green.

## DONE — Skeleton loaders rollout
- `Skeleton` helpers `CardGridSkeleton` + `ListSkeleton` added; wired into Cases (card grid), Documents and ClientDocuments (list rows), replacing page-load spinners. CaseList.test loading assertion updated from `.animate-spin` → `.animate-pulse`. Removed now-unused `Loader2` imports. 69 frontend tests green, type-check clean.

## DONE — open-in-view: false (production DB-connection correctness)
- Flipped `spring.jpa.open-in-view` to **false** so a Hikari connection is no longer pinned for the whole request (critical with multi-second Fabric calls).
- Fetch-boundary fixes so no lazy access happens outside a transaction:
  - `User.firm` → **EAGER** (principal loaded once/request in JWT filter; used across many controllers + AdminController UserSummary).
  - `HearingRepository.findByLegalCaseId*` + `findUpcomingByFirm` → `JOIN FETCH legalCase + createdBy` (HearingDto.from).
  - `CaseEventRepository` timeline → `LEFT JOIN FETCH actor`.
  - `ReminderRepository.findByRecipientId*` → `JOIN FETCH sender + legalCase` (ReminderDto.from).
- Verified live under open-in-view=false: dashboard/stats, dashboard/lawyer, hearings/upcoming, hearings/by-case, cases (list/my-cases/detail/members), reminders (+unread), case-events/by-case timeline, chat/conversations, client reminders + dashboard/client — all 200, **zero LazyInitializationException** in logs. Backend 38 tests green.
- Dead code left as-is: `findUpcomingForClient` (native, no callers), `findFirstByLegalCaseIdAndHearingDateAfter...` (no callers).

## DONE — Resilience4j circuit breaker + rate limiting
- Added deps: `spring-boot-starter-aop` + `resilience4j-spring-boot3:2.2.0`.
- `@CircuitBreaker(name="fabric", fallback=...)` + `@Retry(name="fabric")` on `FabricGatewayService.submitTransaction` & `evaluateTransaction`; fallback methods always throw `FabricException` so existing service-layer DB/ACL fallback (ACL_FABRIC_FALLBACK) behaviour is unchanged — just fires fast when the breaker is OPEN. Config in application.yml: 10s window, 5 min calls, 50% failure rate → OPEN 30s → HALF_OPEN 3 trial calls; retry 3×/500ms on FabricException.
- Rate limiting: hand-rolled in-memory token bucket (no Bucket4j dep). `RateLimitFilter` (added before UsernamePasswordAuthenticationFilter; auto-registration disabled via FilterRegistrationBean). Limits per IP: login 10/min, refresh 20/min, mfa 5/min → 429 + Retry-After + JSON body.
- **Verified live:** 11th login from same IP → 429 Retry-After:6; circuit fallback log fires on Fabric submit while case creation still returns 200 via DB. Backend 44 tests (+4 RateLimitTest, +2 FabricCircuitBreakerTest).
- IMPORTANT GOTCHA fixed: Spring Security can't order a custom filter relative to another custom filter ("does not have a registered order") — both must anchor on a registered type (UsernamePasswordAuthenticationFilter), insertion order decides precedence.
- Fallback point if regression: prior good = ef2c9a4.

## Feature — React Query migration (IN PROGRESS)
- QueryClient defaults tuned (staleTime 30s, gcTime 5m, retry 2 w/ backoff, no focus refetch); added `lib/queryKeys.ts` taxonomy.
- Converted: **Cases**, **Dashboard** (4 independent useQuery, tolerant), **Documents** (useQuery + refetch on upload), **ClientDocuments** (useQuery + refetch on upload), **AdminPanel** (useQuery + useMutation activate/suspend with invalidateQueries), **AuditTrail** (useQuery + debounced search + pagination in key). Both tested pages' render helpers wrapped in QueryClientProvider (retry off). 69 frontend tests green, type-check clean.
- REMAINING pages still on useEffect+useState+api: HearingManager, LedgerExplorer, CaseDetail, RegulatorView, client/ClientPortal, client/ClientCase, Sidebar(unread), MfaSetup, NewCase, Profile, Login (auth flows — leave as-is). Convert incrementally; only Cases/CaseList + Dashboard/LawyerDashboard have tests to keep in sync.

## TODO / NEXT (optional / deferred)
- Operational "merge into filing" for the journey tree.
- WebSocket-push for old 1:1 DM; IPFS streaming uploads + @Async Fabric executor.

## Decisions locked (this session)
- Realtime transport: **WebSocket/STOMP**. Chat crypto: **TLS + encrypted-at-rest** (documents stay E2E). Delegation: **per-case chain**. Tree merge: **visual-first**. Color palette: **keep existing tokens** (`#1d6464`/`#1E3A5F`). Tokens in sessionStorage approved.
