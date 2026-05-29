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
- Backend: **38** JUnit (`./mvnw test`) — was 35; +3 `ChatCryptoServiceTest`.
- Frontend: **67** Vitest (`npm test`) — was 55; +6 `ApiClient`, +6 `StatusBadge`.
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

## TODO / NEXT (agreed roadmap)
- **Feature 2 — Bulk access distribution + delegation (Jira-style):** multi-select docs × members × capability × expiry → batched `GrantAccess`; per-case delegation chain capped at granter's capability (decision: per-case, no global org chart). Reuses existing versioning + audit.
- **Feature 3 — Case-journey tree:** `case_nodes` (parent edges, author, date, linked docs) + git-graph visualization converging on a Hearing node; click → detail panel. (Decision: **visual convergence first**, real "merge into filing" later.)
- Optional: first-login key provisioning (unblocks E2E for seeded users); WebSocket-push for the old DM; flip `open-in-view:false` with fetch-boundary audit; Resilience4j circuit breaker + Bucket4j rate limiting (needs dep approval); React Query migration of pages; SecureDownloadModal stage-timing redesign.

## Decisions locked (this session)
- Realtime transport: **WebSocket/STOMP**. Chat crypto: **TLS + encrypted-at-rest** (documents stay E2E). Delegation: **per-case chain**. Tree merge: **visual-first**. Color palette: **keep existing tokens** (`#1d6464`/`#1E3A5F`). Tokens in sessionStorage approved.
