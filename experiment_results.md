# PangoChain — Experiment Results
**IEEE Access Manuscript Access-2026-02049**

---

## Environment

| Item | Value |
|------|-------|
| **Date** | 2026-05-09 |
| **OS** | Windows 11 Pro (22631) |
| **CPU** | (record: e.g., AMD Ryzen 9 5900X / Intel Core i9-13900K) |
| **RAM** | (record: e.g., 32 GB DDR5) |
| **Storage** | (record: NVMe SSD yes/no) |
| **Docker Desktop** | (record version, e.g., 4.29.0) |
| **Java** | 20 (Temurin) |
| **Node.js** | 18 or 20 LTS |
| **Hyperledger Fabric** | 2.4.x (3-org Raft, CouchDB state DB) |
| **Fabric peer** | peer0.firma.pangochain.com:7051 |
| **IPFS** | Kubo (Dockerised) |
| **Spring Boot** | 3.2.5 |

> **Network topology:** Single-machine deployment. All Fabric peers, orderer, and application containers run on the same host. WAN latency simulation is documented separately (Experiment 5).

---

## Experiment 1 — Scalability Under Load

**Goal:** Measure committed TPS as concurrent clients increase. Compare Fabric mode vs PostgreSQL-only (DB fallback) mode.

**Traffic mix:** 20% `RegisterDocument` writes, 80% `CheckAccess` reads.
**Each data point:** mean of 5 independent runs with 2-minute warm-up period.
**Tool:** Hyperledger Caliper v0.5 targeting Spring Boot REST API.

**Config:** `experiments/caliper/pangochain-benchmark.yaml`

### Status
> **PENDING — requires running Fabric network + backend.**
> Run `experiments/caliper/run-experiments.sh` after starting the full stack.
> Record results below.

### Instructions to Run
```bash
# Terminal 1: Start infrastructure
docker-compose up postgres ipfs -d
cd pangochain-fabric && make up && make chaincode && make smoke

# Terminal 2: Start backend (Fabric mode)
cd pangochain-backend && ./mvnw spring-boot:run

# Terminal 3: Run Caliper
cd experiments/caliper
export PANGOCHAIN_JWT_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pangolawfirm.com","password":"Admin123!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
export PANGOCHAIN_TEST_CASE_ID=<case-id-from-GET-/api/cases>
export PANGOCHAIN_TEST_DOC_ID=<doc-id-from-GET-/api/documents>
bash run-experiments.sh

# For PostgreSQL-only mode: set FABRIC_ENABLED=false in application.yml, restart backend, re-run
```

### Raw Data (FILL IN AFTER RUNNING)

#### Fabric Mode
| Concurrent Clients | Mean TPS | P50 Latency (ms) | P95 Latency (ms) | CPU % | RAM (MB) |
|-------------------|----------|-----------------|-----------------|-------|---------|
| 50 | — | — | — | — | — |
| 100 | — | — | — | — | — |
| 150 | — | — | — | — | — |
| 200 | — | — | — | — | — |
| 300 | — | — | — | — | — |
| 400 | — | — | — | — | — |
| 500 | — | — | — | — | — |
| 600 | — | — | — | — | — |

#### PostgreSQL-Only Mode (FABRIC_ENABLED=false)
| Concurrent Clients | Mean TPS | P50 Latency (ms) | P95 Latency (ms) |
|-------------------|----------|-----------------|-----------------|
| 50 | — | — | — |
| 100 | — | — | — |
| 150 | — | — | — |
| 200 | — | — | — |
| 300 | — | — | — |
| 400 | — | — | — |
| 500 | — | — | — |
| 600 | — | — | — |

### Observations
*(Record after running: saturation point, CPU bottleneck, error rate at high concurrency, etc.)*

### Expected Finding for Paper
Fabric saturates at a TPS ceiling driven by the Raft orderer's `BatchTimeout` (default 2s). A realistic 1,000-lawyer firm operating at 1 document action/minute = ~16.7 TPS peak. The saturation point is expected to be 100–180 TPS on a single machine, providing a safety margin of 6–10× over realistic legal workload.

### Conclusion for Paper
*(Fill in after running. Template: "PangoChain sustained X TPS under Fabric mode at Y concurrent clients before saturation, compared to Z TPS for PostgreSQL-only. This exceeds the estimated peak demand of 16.7 TPS for a 1,000-lawyer firm by a factor of N×.")*

---

## Experiment 2 — Function-Level Latency

**Goal:** Per-operation latency across modes. Log-scale comparison for paper figure.

**Operations:**
1. `RegisterDocument` (write) — encrypt → IPFS upload → Fabric chaincode
2. `GrantAccess` (write) — ECIES key wrap + Fabric GrantAccess
3. `CheckAccess` (read) — Fabric CheckAccess evaluate only
4. `GetDocumentHistory` (read) — Fabric GetHistoryForKey for doc with 50 events

**Samples:** 100 per operation.
**File sizes for RegisterDocument:** 1 MB, 5 MB, 20 MB.

### Status
> **PENDING — requires running Fabric network + backend.**

### Instructions to Run
```bash
# Use Apache JMeter (GUI or CLI) with the test plan at experiments/jmeter/pangochain-latency.jmx
# OR use the curl timing script:
bash experiments/measure-latency.sh

# Set env vars first:
export JWT="<your-token>"
export DOC_ID="<test-doc-id>"
export CASE_ID="<test-case-id>"
```

### Raw Data (FILL IN AFTER RUNNING)

| Operation | Mode | File Size | P50 (ms) | P95 (ms) | P99 (ms) | Mean (ms) |
|-----------|------|-----------|----------|----------|----------|-----------|
| RegisterDocument | Fabric | 1 MB | — | — | — | — |
| RegisterDocument | Fabric | 5 MB | — | — | — | — |
| RegisterDocument | Fabric | 20 MB | — | — | — | — |
| RegisterDocument | DB-only | 1 MB | — | — | — | — |
| RegisterDocument | DB-only | 5 MB | — | — | — | — |
| RegisterDocument | DB-only | 20 MB | — | — | — | — |
| GrantAccess | Fabric | — | — | — | — | — |
| GrantAccess | DB-only | — | — | — | — | — |
| CheckAccess | Fabric | — | — | — | — | — |
| CheckAccess | DB-only | — | — | — | — | — |
| GetDocumentHistory (50 events) | Fabric | — | — | — | — | — |

### Observations
The ~2100ms write latency expected for Fabric operations is caused by the Raft orderer's `BatchTimeout=2s` — the orderer waits up to 2 seconds to batch transactions before cutting a block. This is a configuration choice (lower BatchTimeout = lower latency but fewer TPS per block). Document this explicitly in the paper as the source of write latency, not a design flaw.

### Conclusion for Paper
*(Fill in after running. Template: "RegisterDocument P50 latency was Xms (Fabric) vs Yms (DB-only). The Raft BatchTimeout accounts for ~2000ms of write latency. Read latency (CheckAccess evaluate) was Zms P50.")*

---

## Experiment 3 — File Size Impact on Latency

**Goal:** Confirm that Fabric ledger latency is constant (only hashes stored) while IPFS latency grows linearly with file size.

**Method:** Upload documents of 1, 5, 10, 20, 30, 50 MB. Measure IPFS upload time and Fabric commit time separately. 10 samples per size.

### Status
> **PENDING — requires running IPFS + Fabric + backend.**

### Instructions to Run
```bash
# Generate test files
dd if=/dev/urandom of=/tmp/test-1mb.bin  bs=1M  count=1
dd if=/dev/urandom of=/tmp/test-5mb.bin  bs=1M  count=5
dd if=/dev/urandom of=/tmp/test-10mb.bin bs=1M  count=10
dd if=/dev/urandom of=/tmp/test-20mb.bin bs=1M  count=20
dd if=/dev/urandom of=/tmp/test-30mb.bin bs=1M  count=30
dd if=/dev/urandom of=/tmp/test-50mb.bin bs=1M  count=50

# Instrument the backend: set PANGOCHAIN_MEASURE_IPFS=true to split IPFS vs Fabric timing
# See DocumentService.java upload() — add System.nanoTime() markers around ipfsService.add() and fabricGatewayService.registerDocument()
bash experiments/measure-filesize.sh
```

### Raw Data (FILL IN AFTER RUNNING)

| File Size | IPFS Upload (ms) P50 | IPFS Upload (ms) P95 | Fabric Commit (ms) P50 | Fabric Commit (ms) P95 |
|-----------|---------------------|---------------------|----------------------|----------------------|
| 1 MB | — | — | — | — |
| 5 MB | — | — | — | — |
| 10 MB | — | — | — | — |
| 20 MB | — | — | — | — |
| 30 MB | — | — | — | — |
| 50 MB | — | — | — | — |

### Expected Finding
IPFS latency should grow roughly linearly (dominated by network/disk I/O of the ciphertext).
Fabric latency should remain approximately constant (±200ms) across all file sizes because only the 64-byte SHA-256 hash and 128-byte IPFS CID are written to the ledger.

### Conclusion for Paper
*(Fill in after running. Template: "Fabric commit latency was X±Yms across all file sizes (1MB–50MB), confirming that the off-chain design decouples ledger performance from document size. IPFS latency grew from Ams (1MB) to Bms (50MB), consistent with linear growth.")*

---

## Experiment 4 — Audit Verification Efficiency

**Goal:** Compare verification time: Fabric GetHistoryForKey vs PostgreSQL append-only log vs simulated manual process.

**Seed:** 1,000 audit events for a single test case (200 DOC_REGISTERED, 400 ACCESS_GRANTED, 200 ACCESS_REVOKED, 200 DOC_DOWNLOADED). These must be real Fabric transactions.

### Status
> **PENDING — requires seeding 1,000 real Fabric transactions.**

### Instructions to Run
```bash
# Seed 1,000 audit events (run the seed script)
bash experiments/seed-audit-events.sh 1000 <case-id>

# Then run verification comparison
bash experiments/measure-audit-verification.sh <case-id>
```

### Seeding Script Location
`experiments/seed-audit-events.sh` — calls `POST /api/case-events` and document operations to generate real Fabric transactions.

### Raw Data (FILL IN AFTER RUNNING)

| Method | Time (seconds) | Events Verified | Hash Chain Valid |
|--------|---------------|-----------------|-----------------|
| Fabric GetHistoryForKey | — | 1,000 | — |
| PostgreSQL SELECT + chain verify | — | 1,000 | — |
| Manual export (CSV + SHA-256) | — | 1,000 | — |

### Observations
*(Record: was PostgreSQL faster for real-time dashboard? Was Fabric more trustworthy? Any discrepancies between methods?)*

### Expected Finding
Automated (Fabric + DB) should be 10–20× faster than manual CSV export + hash computation. PostgreSQL should be faster for raw query speed. Fabric provides independent verifiability by any consortium peer — the block hashes are verifiable without trusting the application server.

### Conclusion for Paper
*(Fill in after running. Template: "Fabric audit verification took Xs for 1,000 events. PostgreSQL chain verification took Ys. Manual baseline (CSV export + SHA-256) took Zs. Automated verification was Nx faster than manual. The Fabric path offers independent verifiability not possible with the PostgreSQL-only approach.")*

---

## Experiment 5 — WAN Latency Simulation

**Goal:** Simulate geographically distributed Fabric nodes and measure throughput/latency degradation.

### Status
> **SKIPPED — requires Linux `tc netem` (not available on Windows 11 without WSL2).**
>
> **To run on a Linux machine or WSL2 instance:**

```bash
# Find the Docker bridge interface
ip link show | grep docker

# Baseline (no added latency) — use Experiment 1 at 200 clients as baseline

# Regional (50ms RTT)
sudo tc qdisc add dev docker0 root netem delay 50ms
# Run: Experiment 1 at 200 concurrent clients (5 runs)
# Run: Experiment 2 RegisterDocument (20 samples)
sudo tc qdisc del dev docker0 root

# National (100ms RTT)
sudo tc qdisc add dev docker0 root netem delay 100ms
# Run experiments...
sudo tc qdisc del dev docker0 root

# International (150ms RTT)
sudo tc qdisc add dev docker0 root netem delay 150ms
# Run experiments...
sudo tc qdisc del dev docker0 root
```

### Raw Data Template (fill in when run on Linux)

| RTT Added | TPS @ 200 clients | RegisterDocument P50 (ms) | RegisterDocument P95 (ms) |
|-----------|-------------------|--------------------------|--------------------------|
| 0ms (baseline) | — (from Exp 1) | — (from Exp 2) | — |
| 50ms (regional) | — | — | — |
| 100ms (national) | — | — | — |
| 150ms (international) | — | — | — |

### Expected Finding
Each 50ms RTT hop adds approximately 50ms to write latency (two consensus round-trips). At 150ms RTT, write latency is expected to approach 2300–2600ms (BatchTimeout 2000ms + 2×150ms round-trip). Performance becomes "unacceptable" (>5s write latency) at approximately 300–400ms RTT, which exceeds practical cross-border WAN latency for most consortium deployments.

### Conclusion for Paper
*(Fill in when run on Linux. Template: "At 150ms RTT (simulating international cross-border consortium), RegisterDocument P50 latency was Xms and TPS at 200 clients dropped to Y. The system remains operationally viable (write latency <5s) for deployments with RTT ≤ 300ms.")*

---

## Experiment 6 — Crypto Benchmark

**Goal:** Justify ECIES P-256 choice over RSA-OAEP 2048 with measured numbers.
**Tool:** Browser WebCrypto API (`window.crypto.subtle`). Run `experiments/crypto-benchmark.html` in a browser.

### Status
> **READY TO RUN — open `experiments/crypto-benchmark.html` in Chrome/Firefox.**
> Copy the console output into the table below.

### Instructions
1. Open `experiments/crypto-benchmark.html` in a browser (no server required — file:// works)
2. Click "Run All Benchmarks"
3. Copy the output from the page into the Raw Data table below

### Raw Data (FILL IN FROM BROWSER OUTPUT)

| Operation | Iterations/Size | Mean (ms) | Min (ms) | Max (ms) |
|-----------|----------------|-----------|----------|----------|
| PBKDF2 SHA-256 | 600,000 iter | — | — | — |
| ECDH P-256 keygen | 1 key pair | — | — | — |
| ECIES P-256 key wrap | 32-byte doc key | — | — | — |
| RSA-OAEP 2048 key wrap | 32-byte doc key | — | — | — |
| AES-256-GCM encrypt | 1 MB | — | — | — |
| AES-256-GCM encrypt | 10 MB | — | — | — |
| AES-256-GCM encrypt | 50 MB | — | — | — |

### Token Size Comparison (verifiable by inspection)

| Scheme | Token Size | Breakdown |
|--------|-----------|-----------|
| ECIES P-256 | 125 bytes | 65 (uncompressed P-256 ephemeral pubkey) + 12 (AES-GCM IV) + 48 (32-byte key + 16-byte GCM tag) |
| RSA-OAEP 2048 | 256 bytes | Modulus length in bytes |
| **Reduction** | **51.2%** | **(256 − 125) / 256** |

### Observations
- PBKDF2 600k iterations should complete in <1000ms on modern hardware (paper claims <800ms P50)
- ECIES P-256 key wrap should be significantly faster than RSA-OAEP 2048 (expected 3–10×)
- AES-256-GCM 50MB encryption should complete in <200ms (WebCrypto uses hardware AES-NI)

### Conclusion for Paper
*(Fill in from browser output. Template: "ECIES P-256 key wrapping took Xms vs RSA-OAEP 2048 at Yms — a Zx speedup. The ECIES wrapped token is 125 bytes vs 256 bytes for RSA-OAEP 2048, a 51.2% reduction. PBKDF2 600k iterations completed in Ams, well within the <1000ms UX threshold per NIST SP 800-132 (2023).")*

---

## Key Findings for Paper

> *(Fill in after all experiments are run. These are the numbers the authors will use to rewrite the evaluation section.)*

- **Safety margin for legal workloads (Exp 1):** Fabric saturated at X TPS. Realistic 1,000-lawyer firm peak demand ≈ 16.7 TPS. Safety margin = X / 16.7 = N×.
- **Exact write latency and cause (Exp 2):** RegisterDocument P50 = Xms. The dominant source is Raft orderer BatchTimeout (default 2s). Reducing BatchTimeout to 500ms would lower write latency to ~500ms + network overhead.
- **Off-chain design validated (Exp 3):** Fabric commit latency was X±Yms across 1MB–50MB files. Ledger performance is independent of document size.
- **Audit verification speedup (Exp 4):** Automated (Fabric/DB) verification was Nx faster than manual CSV+SHA-256 baseline.
- **WAN latency effect (Exp 5):** System remains viable (write <5s) for RTT ≤ ~300ms. At 150ms RTT, TPS at 200 clients = X.
- **Crypto efficiency (Exp 6):** ECIES P-256 wrap Xms vs RSA-OAEP 2048 Yms (Zx faster). Token 125B vs 256B (51.2% smaller).

---

## Claims Now Supported By Evidence

| Paper Claim | Supporting Experiment | Measured Value |
|-------------|----------------------|----------------|
| "Fabric maintains acceptable latency for legal workflows" | Exp 2 | RegisterDocument P50 = ___ ms |
| "System supports realistic 1,000-lawyer firm workloads" | Exp 1 | Saturation at ___ TPS; legal peak ≈ 16.7 TPS; margin = ___× |
| "Ledger latency decoupled from document file size" | Exp 3 | Fabric commit ΔP50 = ___ ms across 1MB–50MB |
| "Automated audit verification faster than manual" | Exp 4 | Fabric=___s, Manual=___s, speedup=___× |
| "WAN-resilient for cross-border consortium" | Exp 5 | Viable (write <5s) at RTT ≤ ___ ms |
| "ECIES P-256 reduces key token size vs RSA-OAEP 2048" | Exp 6 | RSA=256B, ECIES=125B, reduction=51.2% |
| "PBKDF2 600k iterations within UX budget" | Exp 6 | PBKDF2 = ___ ms (<1000ms) |
| "AES-256-GCM encryption transparent to user" | Exp 6 | 50MB encrypt = ___ ms |

---

## Known Gaps — Honest Disclosure

These are items the prototype does not fully implement. The paper's **Framework vs. Prototype** table should list these explicitly.

| Gap | Impact | Required for Full Implementation |
|-----|--------|----------------------------------|
| **Single IPFS node** | No replication — IPFS node failure loses all ciphertext. | IPFS cluster with ≥3 nodes and pinning service |
| **Custodial Fabric wallets** | Admin identity used for all Fabric transactions. Production needs per-user X.509 certs in HSM-backed wallets. | Hardware Security Module (HSM) integration + per-user Fabric identity enrollment |
| **Key rotation: server-side re-encryption impossible** | When a user is revoked, re-encryption of the AES document key requires the document owner's browser (server never holds plaintext key). The system sets `key_rotation_pending=true` and notifies the owner, but does not auto-rotate. | Threshold encryption or proxy re-encryption scheme |
| **MFA enforcement: enrollment not yet required on login** | MFA is opt-in (users call `/mfa/setup` themselves). The login flow enforces MFA only after `mfa_enabled=true` — it does not block login for users who haven't enrolled yet. | Admin-enforced enrollment deadline + login gate |
| **E-signature uses ECIES key possession as proof** | The signature is `AES-GCM_encrypt(docHash, docKey)` — proof that the signer possessed the document key. A proper digital signature would use ECDSA over the document hash. | Replace with `window.crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'}, signingKey, docHashBytes)` using a separate per-user ECDSA key pair |
| **WAN simulation not run on Windows** | Experiment 5 skipped (requires Linux `tc netem`). | Run on Linux VM or WSL2 |
| **Single orderer node** | The Raft orderer is a single container — not crash-fault-tolerant. Production needs 3 or 5 orderer nodes. | Deploy 3+ Raft orderer containers |
| **No hardware TLS attestation** | Fabric TLS uses software certificates. | Replace with hardware-attested certificates (TPM/HSM) |
| **Real-time notifications via polling** | Messages and reminders polled on page load. | WebSocket / SSE push |

---

*Last updated: 2026-05-09*
*To append results: edit this file and fill in the dashes (—) with measured values.*
