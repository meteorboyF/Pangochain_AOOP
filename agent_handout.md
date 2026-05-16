# PangoChain Session Handout — IEEE Access-2026-02049
**Last updated: 2026-05-16 (mid-session, Exp 1 Fabric-mode running)**

---

## What Is Complete (DO NOT RE-RUN)

| Exp | Status | Git commit |
|-----|--------|-----------|
| Exp 2 (Linux) | ✅ committed | 1e4bf71 |
| Exp 3 (Linux) | ✅ committed | d23636f |
| Exp 4 (Linux) | ✅ committed | 0f29e50 |
| Exp 6 (Linux) | ✅ committed | af7cc5e |

---

## Infrastructure State (as of this session)

### Fabric network
- **Rebuilt fresh** by `make up` before this session — new crypto-config, new channel, new TLS certs.
- All Fabric containers running (up ~40 min as of writing): orderer, peer0.firma, peer0.firmb, peer0.regulator, 3× CouchDB, 3× CA, fabric-cli.
- `/etc/hosts` confirmed correct — 4 pangochain entries (172.20.0.2–5).
- Chaincode `legalcc` deployed and smoke-tested successfully (`make chaincode && make smoke` passed).

### Backend TLS certs
- Fresh certs copied from new crypto-config into `pangochain-backend/config/fabric/crypto/`:
  - `admin-cert.pem` ← `crypto-config/.../Admin@firma.pangochain.com/msp/signcerts/Admin@firma.pangochain.com-cert.pem`
  - `admin-key.pem` ← `crypto-config/.../Admin@firma.pangochain.com/msp/keystore/priv_sk`
  - `tls-ca-cert.pem` ← `crypto-config/.../peers/peer0.firma.pangochain.com/tls/ca.crt`
- These files are root-owned. Copy with `sudo cp`.
- Checksums verified matching after copy.

### Backend
- Running: `cd pangochain-backend && ./mvnw spring-boot:run 2>&1 | tee /tmp/pangochain-backend.log`
- JWT expiry **temporarily extended to 7200s (2h)** in `application.yml` for Caliper run.
  - After ALL experiments done, restore to `900` (15 min).
  - Line to restore: `access-token-expiry: 900        # 15 minutes in seconds`
- Sync verified: POST /api/documents/upload → HTTP 200 ✓, GET /api/documents/{id}/wrapped-key → HTTP 200 ✓

### Known IDs (valid for current network)
- CASE_ID: `0a8c2e1a-76c4-4ca5-96f7-28468df0460e`
- DOC_ID: `418e9e6d-fc82-4b48-aed2-30e824d5e8d4` (sync test upload, usable for CheckAccess reads)

---

## Experiment 1 — Scalability (IN PROGRESS as of writing)

### What Is Running Right Now
```bash
# Background process writing to /tmp/exp1-fabric.log
node /home/angkon/Pangochain_AOOP/experiments/caliper/pangochain-loadtest.js
```
Log: `/tmp/exp1-fabric.log`

**Why custom script, not Caliper CLI:**
- Caliper v0.5 requires `--caliper-networkconfig` with a Fabric connection profile (`connection-firma.yaml`), which was missing.
- The workload module uses pure REST (axios), not Fabric SDK — Caliper's Fabric connector setup is dead weight.
- Custom Node.js script (`experiments/caliper/pangochain-loadtest.js`) produces identical metrics: TPS, P50/P95 latency, CPU%, RAM.

### Fabric-mode results so far (partial — still running)
| Concurrent Clients | Mean TPS | P50 Latency (ms) | P95 Latency (ms) | CPU % | RAM (MB) |
|-------------------|----------|-----------------|-----------------|-------|---------|
| 50  | 26.7 | 2075 | 4145  | 8.7  | 648 |
| 100 | 24.1 | 4147 | 8282  | 9.2  | 658 |
| 150 | 23.1 | 6226 | 10409 | 9.6  | 669 |
| 200 | — (running) | — | — | — | — |
| 300 | — | — | — | — | — |
| 400 | — | — | — | — | — |
| 500 | — | — | — | — | — |
| 600 | — | — | — | — | — |

### After Fabric-mode completes
1. Fill in all numbers into `experiment_results.md` (Fabric mode table).
2. Switch backend to DB-only mode:
   - Edit `pangochain-backend/src/main/resources/application.yml`: set `fabric.enabled: false`
   - Restart backend: `cd pangochain-backend && ./mvnw spring-boot:run 2>&1 | tee /tmp/pangochain-backend.log`
   - Wait for `Started PangochainBackendApplication`
3. Re-export JWT (fresh):
   ```bash
   export PANGOCHAIN_JWT_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"admin@pangolawfirm.com","password":"Admin123!"}' | \
     python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
   export PANGOCHAIN_TEST_CASE_ID="0a8c2e1a-76c4-4ca5-96f7-28468df0460e"
   export PANGOCHAIN_TEST_DOC_ID="418e9e6d-fc82-4b48-aed2-30e824d5e8d4"
   ```
   *(CASE_ID/DOC_ID may need re-fetching after backend restart if DB was wiped — get fresh ones from GET /api/cases and GET /api/documents)*
4. Run DB-only mode:
   ```bash
   node /home/angkon/Pangochain_AOOP/experiments/caliper/pangochain-loadtest.js \
     2>&1 | tee /tmp/exp1-dbonly.log
   ```
5. Fill in DB-only table in `experiment_results.md`.
6. Switch fabric.enabled back to `true`, restart backend.
7. Commit:
   ```bash
   cd /home/angkon/Pangochain_AOOP
   git add experiment_results.md
   git commit -m "exp1(linux): add Experiment 1 Caliper scalability results — Linux x86_64"
   ```
8. Confirm commit hash before starting Exp 5.

---

## Experiment 5 — WAN Latency (NOT STARTED)

**Prerequisites:** Exp 1 committed. Backend in Fabric mode (fabric.enabled=true). Fresh JWT.

### Step-by-step

```bash
# Find Docker bridge interface
ip link show | grep docker
# Usually: docker0 or br-XXXXXX

# Re-export JWT + IDs (get fresh DOC_ID after backend restart)
export PANGOCHAIN_JWT_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pangolawfirm.com","password":"Admin123!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
export PANGOCHAIN_TEST_CASE_ID="0a8c2e1a-76c4-4ca5-96f7-28468df0460e"
export PANGOCHAIN_TEST_DOC_ID="418e9e6d-fc82-4b48-aed2-30e824d5e8d4"
export PANGOCHAIN_API_URL="http://localhost:8080/api"
```

For each RTT in 50ms, 100ms, 150ms:
```bash
# Apply latency
sudo tc qdisc add dev <bridge_iface> root netem delay <RTT>ms

# Run load test at 200 concurrent clients (5 runs — run the script 5 times, take mean)
for i in 1 2 3 4 5; do
  node /home/angkon/Pangochain_AOOP/experiments/caliper/pangochain-loadtest-wan.js \
    2>&1 | tee /tmp/exp5-wan-${RTT}ms-run${i}.log
done

# Measure RegisterDocument latency (20 samples)
cd /home/angkon/Pangochain_AOOP/experiments
JWT=$PANGOCHAIN_JWT_TOKEN DOC_ID=$PANGOCHAIN_TEST_DOC_ID CASE_ID=$PANGOCHAIN_TEST_CASE_ID \
  bash measure-latency.sh 2>&1 | tee /tmp/exp5-latency-${RTT}ms.log

# Remove latency
sudo tc qdisc del dev <bridge_iface> root
```

**Note:** A `pangochain-loadtest-wan.js` script (200-client only, 5 runs) needs to be created — copy `pangochain-loadtest.js`, remove the ROUNDS array and replace with just `[200]`, and run the outer loop 5 times in bash.

Record into `experiment_results.md` table:
| RTT Added | TPS @ 200 clients | RegisterDocument P50 (ms) | RegisterDocument P95 (ms) |
|-----------|-------------------|--------------------------|--------------------------|
| 0ms (baseline) | (from Exp 1 @ 200 clients) | (from Exp 1) | (from Exp 1) |
| 50ms | — | — | — |
| 100ms | — | — | — |
| 150ms | — | — | — |

After recording, commit:
```bash
git add experiment_results.md
git commit -m "exp5(linux): add Experiment 5 WAN latency results — Linux x86_64"
```

---

## Final Steps After Both Experiments

```bash
# 1. Restore JWT expiry to 15 min in application.yml
#    access-token-expiry: 900        # 15 minutes in seconds

# 2. Restore fabric.enabled: true (if left in DB-only mode)

# 3. Final commit
cd /home/angkon/Pangochain_AOOP
git add experiment_results.md
git commit -m "results: all 6 experiments complete after restart recovery"
git push origin main
```

---

## Recovery Checklist (if session interrupted mid-stream)

1. **Check what's committed:** `git log --oneline -10`
2. **Check containers:** `docker ps` — all Fabric containers should be up; if not, `cd pangochain-fabric && make up`
3. **Check chaincode:** `cd pangochain-fabric && make smoke` — if fails, `make chaincode` first
4. **Copy TLS certs** (if Fabric was rebuilt):
   ```bash
   CRYPTO_BASE=/home/angkon/Pangochain_AOOP/pangochain-fabric/crypto-config/peerOrganizations/firma.pangochain.com
   BACKEND=/home/angkon/Pangochain_AOOP/pangochain-backend/config/fabric/crypto
   sudo cp "$CRYPTO_BASE/users/Admin@firma.pangochain.com/msp/signcerts/Admin@firma.pangochain.com-cert.pem" "$BACKEND/admin-cert.pem"
   sudo cp "$CRYPTO_BASE/users/Admin@firma.pangochain.com/msp/keystore/priv_sk" "$BACKEND/admin-key.pem"
   sudo cp "$CRYPTO_BASE/peers/peer0.firma.pangochain.com/tls/ca.crt" "$BACKEND/tls-ca-cert.pem"
   ```
5. **Start backend:** `cd pangochain-backend && ./mvnw spring-boot:run 2>&1 | tee /tmp/pangochain-backend.log`
6. **Sync gate:** POST upload → HTTP 200 and GET wrapped-key → HTTP 200 before any experiment
7. **JWT expires every 15 min** (currently extended to 2h in application.yml — check before starting long runs)
8. **Resume from the first experiment with dashes** in `experiment_results.md`

---

## Key File Paths

| File | Purpose |
|------|---------|
| `experiment_results.md` | Main results file — fill in dashes |
| `experiments/caliper/pangochain-loadtest.js` | Custom load test (replaces Caliper CLI) |
| `experiments/caliper/pangochain-benchmark.yaml` | Original Caliper config (reference only) |
| `experiments/measure-latency.sh` | RegisterDocument / CheckAccess latency (Exp 2/5) |
| `experiments/measure-filesize.sh` | File size impact (Exp 3) |
| `pangochain-backend/src/main/resources/application.yml` | Backend config — fabric.enabled, jwt expiry |
| `/tmp/exp1-fabric.log` | Live log of current Fabric-mode load test |
| `/tmp/pangochain-backend.log` | Backend log |
