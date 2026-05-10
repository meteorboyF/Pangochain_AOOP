# PangoChain — Linux Handoff Guide
**IEEE Access Manuscript Access-2026-02049**
*Generated: 2026-05-09. Continue from this document in a new Claude Code session on Linux.*

---

## What This Project Is

PangoChain is a secure legal document management system built for an IEEE Access paper. The stack is:

- **Frontend:** React 18 + TypeScript + Vite + Tailwind (`pangochain-frontend/`)
- **Backend:** Spring Boot 3.2.5 + Java 17 + PostgreSQL 16 + Liquibase (`pangochain-backend/`)
- **Blockchain:** Hyperledger Fabric 2.4 (3-org Raft consensus, CouchDB state DB) (`pangochain-fabric/`)
- **Storage:** IPFS Kubo (Dockerised)
- **Chaincode:** Go (`pangochain-chaincode/legalcc/`)

Read `context.md`, `FEATURES.md`, and `SETUP.md` in the repo root for full architecture details.

---

## Current State (as of handoff)

### What Was Completed in This Session

#### 1. Backend Prototype Hardening (8 IEEE reviewer fixes)
All code changes are committed and merged to `main`.

| Fix | Files Changed |
|-----|--------------|
| Client-side encryption documented explicitly | `DocumentController.java` |
| Two-layer ACL logging (Layer1=JWT + Layer2=Fabric) | `DocumentService.java` |
| Key rotation on revocation (`key_rotation_pending` flag, token obsolete) | `Document.java`, `DocumentAccess.java`, `AccessControlService.java`, `FabricEventHandler.java` |
| ECIES P-256 key wrap endpoint for wrapped key rotation completion | `DocumentController.java`, `DocumentService.java` |
| PBKDF2 600k iterations constant (`PBKDF2_ITERATIONS`) | `pangochain-frontend/src/lib/crypto.ts` |
| MFA/TOTP enrollment + verification endpoints | `MfaController.java` (new), `AuthService.java` |
| E-signature workflow | `ESignature.java`, `ESignatureService.java`, `ESignatureController.java` (all new) |
| Regulator portal with audit query endpoint | `AuditController.java`, `AuditLogRepository.java` |

#### 2. Frontend Pages Added
- `MfaSetup.tsx` — TOTP QR code setup + verification
- `RegulatorView.tsx` — Regulator-only audit portal
- `SignDocumentModal.tsx` — E-signature workflow (decrypt → hash → sign)
- Routes and sidebar links added in `App.tsx` and `Sidebar.tsx`

#### 3. Liquibase Migration Added
- `pangochain-backend/src/main/resources/db/changelog/changes/003-key-rotation.sql`
  - Adds `key_rotation_pending` to documents
  - Adds `token_obsolete` to document_access
  - Adds `document_hash` to esignatures

#### 4. Experiment Infrastructure
- `experiment_results.md` — Full results template for all 6 experiments
- `experiments/crypto-benchmark.html` — Browser WebCrypto benchmark
- `experiments/run-benchmark.mjs` — Node.js port (already run, results recorded)
- `experiments/measure-latency.sh` — Experiment 2 latency tool
- `experiments/measure-filesize.sh` — Experiment 3 file size tool
- `experiments/seed-audit-events.sh` — Experiment 4 seed script
- `experiments/measure-audit-verification.sh` — Experiment 4 verification tool
- `experiments/caliper/` — Caliper v0.5 config for Experiments 1-2

#### 5. Experiment 6 — COMPLETED (no server needed)
Results recorded in `experiment_results.md`:
- PBKDF2 600k iterations: **83ms** ✓ (well under 1000ms budget)
- AES-256-GCM 50MB encrypt: **56ms** ✓ (transparent to user)
- ECIES token: **125 bytes** vs RSA-OAEP 2048 **256 bytes** = **51.2% reduction** ✓

#### 6. Bug Fixes Applied
| Bug | Fix |
|-----|-----|
| Java version mismatch (pom.xml had 20, Temurin 17 installed) | Changed `<java.version>` to `17`, ran `mvnw clean` |
| Hibernate 6 rejects HQL enum literals in `@Query` | Changed to named parameter `:ownerCap` in `DocumentAccessRepository` |
| Stale Java-20 `.class` files in `target/` | `mvnw clean compile` |
| CRLF line endings breaking shell scripts in Linux containers | Added `.gitattributes`, converted all `.sh` to LF |
| Orderer crypto path mismatch (`orderer.orderer.pangochain.com` vs `orderer.pangochain.com`) | Changed `Domain: orderer.pangochain.com` → `Domain: pangochain.com` in `crypto-config.yaml`, updated all 6 path references |
| Docker DNS fails to resolve `.com` FQDNs on Docker Desktop for Windows | Added static IPs (172.20.0.x) + `extra_hosts` in `docker-compose.fabric.yml` |

### What Still Needs to Be Done

**Experiments 1–5 require the full stack running.** Experiment 6 is done.

| Experiment | Status | What to Run |
|-----------|--------|-------------|
| 1 — Scalability (TPS vs concurrent clients) | PENDING | `experiments/caliper/run-experiments.sh` |
| 2 — Function-level latency | PENDING | `experiments/measure-latency.sh` |
| 3 — File size impact | PENDING | `experiments/measure-filesize.sh` |
| 4 — Audit verification efficiency | PENDING | `experiments/seed-audit-events.sh` then `measure-audit-verification.sh` |
| 5 — WAN latency simulation | PENDING | `tc netem` on Linux (see `experiment_results.md`) |
| 6 — Crypto benchmark | **COMPLETE** | Results in `experiment_results.md` |

---

## Starting Fresh on Linux

### Prerequisites
```bash
# Install Java 17
sudo apt install openjdk-17-jdk   # Ubuntu/Debian
# or
sudo dnf install java-17-openjdk  # Fedora/RHEL

# Verify
java -version  # must show 17.x

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install nodejs

# Install Docker + Docker Compose
sudo apt install docker.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker

# Install Git, curl, Python3
sudo apt install git curl python3
```

### Clone / Transfer the Project
```bash
# Option A: if repo is on GitHub/GitLab
git clone <repo-url>
cd Pangochain_AOOP

# Option B: copy from Windows via SCP
scp -r /path/to/Pangochain_AOOP user@linux-host:~/
```

### Start Everything

**Terminal 1 — Postgres + IPFS:**
```bash
docker compose up postgres ipfs -d
```

**Terminal 2 — Hyperledger Fabric network:**
```bash
cd pangochain-fabric
bash scripts/start-network.sh        # generates crypto, starts containers, creates channel
bash scripts/deploy-chaincode.sh     # deploys legalcc chaincode
```

**Terminal 3 — Backend:**
```bash
cd pangochain-backend
./mvnw spring-boot:run
# Wait for: "Started PangochainBackendApplication"
```

**Terminal 4 — Frontend:**
```bash
cd pangochain-frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Smoke Test
```bash
# Get a JWT token
JWT=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pangolawfirm.com","password":"Admin123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

echo "JWT: $JWT"

# Should return 200 with user info
curl -s -H "Authorization: Bearer $JWT" http://localhost:8080/api/auth/me | python3 -m json.tool
```

---

## Running the Experiments

### Setup (run once after smoke test passes)
```bash
# Export credentials for all experiment scripts
export JWT=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pangolawfirm.com","password":"Admin123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

export CASE_ID=$(curl -s -H "Authorization: Bearer $JWT" \
  http://localhost:8080/api/cases \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

export DOC_ID=$(curl -s -H "Authorization: Bearer $JWT" \
  http://localhost:8080/api/documents \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('content') or d)[0]['id'])")

echo "CASE_ID=$CASE_ID  DOC_ID=$DOC_ID"
```

### Experiment 1 — Scalability
```bash
cd experiments/caliper
bash run-experiments.sh
# Takes ~30 minutes. Fill results into experiment_results.md Experiment 1 table.
```

### Experiment 2 — Latency
```bash
bash experiments/measure-latency.sh
# 100 samples per operation. Fill P50/P95/P99 into experiment_results.md.
```

### Experiment 3 — File Size Impact
```bash
bash experiments/measure-filesize.sh
# 10 samples per file size (1/5/10/20/30/50 MB). Fill table in experiment_results.md.
```

### Experiment 4 — Audit Verification
```bash
bash experiments/seed-audit-events.sh 1000    # ~10 min, generates 1k Fabric txns
bash experiments/measure-audit-verification.sh
# Fill results into experiment_results.md.
```

### Experiment 5 — WAN Latency (Linux only, requires root)
```bash
# Find Docker bridge interface
ip link show | grep docker

# Add artificial latency (run Experiments 1+2 after each)
sudo tc qdisc add dev docker0 root netem delay 50ms   # regional
# ... run exp 1+2 ...
sudo tc qdisc del dev docker0 root

sudo tc qdisc add dev docker0 root netem delay 100ms  # national
# ... run exp 1+2 ...
sudo tc qdisc del dev docker0 root

sudo tc qdisc add dev docker0 root netem delay 150ms  # international
# ... run exp 1+2 ...
sudo tc qdisc del dev docker0 root
```

### Experiment 6 — Already Done
Results are in `experiment_results.md`. No action needed.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `context.md` | Full architecture, design decisions, security model |
| `FEATURES.md` | Feature list and implementation status |
| `SETUP.md` | Original setup instructions |
| `experiment_results.md` | **Fill this in as you run experiments** |
| `pangochain-backend/src/main/resources/application.yml` | DB, Fabric, IPFS config |
| `pangochain-fabric/docker-compose.fabric.yml` | Fabric network containers (static IPs 172.20.0.2-5) |
| `pangochain-fabric/scripts/start-network.sh` | Network startup |
| `pangochain-fabric/scripts/deploy-chaincode.sh` | Chaincode deployment |
| `pangochain-chaincode/legalcc/` | Go chaincode (RegisterDocument, GrantAccess, RevokeAccess, CheckAccess, GetHistoryForKey, LogAuditEvent) |

---

## Known Issues / Gotchas

1. **`mvnw clean` before first run** — if you ever switch Java versions, always `./mvnw clean` first to purge stale `.class` files.

2. **Fabric network must be up before backend starts** — if `FABRIC_ENABLED=true` (default) and the gRPC connection to the peer fails, the backend will still start but all Fabric operations will fall back to DB-only mode. Check logs for `FabricGatewayService` connection errors.

3. **Liquibase runs automatically** — migrations in `db/changelog/changes/` run on backend startup. If you see Liquibase errors, check that Postgres is healthy first.

4. **Static IPs in docker-compose.fabric.yml** — orderer=172.20.0.2, peer0.firma=172.20.0.3, peer0.firmb=172.20.0.4, peer0.regulator=172.20.0.5, fabric-cli=172.20.0.10. These are only needed for Docker Desktop for Windows workaround; on Linux they're harmless.

5. **Caliper requires Node.js** — `run-experiments.sh` installs Caliper locally via npx. First run may take a few minutes to download.

6. **E-signature uses key-possession proof, not ECDSA** — documented in `experiment_results.md` Known Gaps. The paper should note this limitation.

---

## Git Log (recent)
```
7bd203f fix: static IPs + extra_hosts bypass Docker Desktop DNS FQDN bug
067c3f1 fix: disable set -e around IP injection loop
5128a2d fix: hostname -I (uppercase) lists network IPs
164e4d6 fix: get container IPs via docker exec hostname -i
fa0bfb9 fix: use docker network inspect to get container IPs
97b3331 fix: use network-specific IP in docker inspect for named network
280d76d fix: inject /etc/hosts into fabric-cli to bypass Docker DNS bug
668e717 fix: add network aliases to all Fabric services
05f4cfc fix: orderer crypto path mismatch - Domain pangochain.com
af70879 fix: CRLF line endings break shell scripts in Linux containers
49fcfb6 experiment: run Exp 6 crypto benchmark + add missing Exp 3/4 scripts
194bced fix: HQL enum literal rejected by Hibernate 6
fb33444 Merge: prototype hardening + Java 17 fix
```

---

*Hand this file to Claude Code on the Linux machine. Say: "Read HANDOFF.md and continue from where it left off."*
