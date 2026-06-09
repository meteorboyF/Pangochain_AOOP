# PangoChain Experiment Evidence Bundle

This file consolidates experiment evidence already present in the repository for the IEEE Access paper "A Secure and Auditable Framework for Legal Data Management: A Hybrid Approach Using Hyperledger Fabric and IPFS".

No experiments were rerun while creating this bundle. Existing scripts and result files were not modified.

## Evidence Priority Used

1. Raw CSV/JSON result files under `results/`.
2. Generated summaries under `results/*.summary.json`.
3. Campaign notes under `results/EXPERIMENT_PROGRESS.md` and `results/DELTAS.md`.
4. Older manuscript/results prose such as `experiment_results.md`, `results/paper_integration_notes.txt`, `results/p2a_summary.txt`, and `results/p2b_summary.txt`.
5. Script comments and configuration files.

Where old prose conflicts with later raw CSV/JSON or `DELTAS.md`, this bundle marks the old prose as superseded.

## Global Environment Found In Repository

| Item | Value | Source |
|---|---|---|
| Canonical platform | `linux_x86_64` | `results/*.csv` platform columns |
| Linux OS | Ubuntu 22.04.5 LTS | `experiment_results.md` |
| CPU | Intel Core Ultra 5 125H | `experiment_results.md` |
| RAM | 7.1 GB | `experiment_results.md` |
| Storage | NVMe SSD, `nvme0n1 ROTA=0` | `experiment_results.md` |
| Java | OpenJDK 21.0.10 | `experiment_results.md` |
| Node.js | v18.20.8 | `experiment_results.md` |
| Docker | 29.4.3 | `experiment_results.md` |
| Docker Compose | v5.1.3 | `experiment_results.md` |
| Spring Boot | 3.2.5 | `experiment_results.md`, `SESSION_HANDOFF.md` |
| Hyperledger Fabric | 2.4.x, Docker images `hyperledger/fabric-orderer:2.4`, `hyperledger/fabric-peer:2.4` | `experiment_results.md`, `pangochain-fabric/docker-compose.fabric.yml` |
| Ordering | EtcdRaft, 3 orderers | `pangochain-fabric/configtx.yaml` |
| Organizations | FirmA, FirmB, Regulator | `pangochain-fabric/configtx.yaml`, `pangochain-fabric/crypto-config.yaml` |
| Peers | `peer0.firma`, `peer0.firmb`, `peer0.regulator` | `pangochain-fabric/docker-compose.fabric.yml` |
| State DB | CouchDB 3.3 for each peer | `pangochain-fabric/docker-compose.fabric.yml` |
| Canonical `BatchTimeout` | `2s` | `pangochain-fabric/configtx.yaml`, `results/DELTAS.md` |
| Canonical block size field | `BatchSize.MaxMessageCount: 500` | `pangochain-fabric/configtx.yaml`, `results/DELTAS.md` |
| IPFS | Kubo v0.27.0, two nodes `pangochain-ipfs` and `pangochain-ipfs2` | `docker-compose.yml` |
| PostgreSQL | PostgreSQL 16 Alpine | `docker-compose.yml`, `SETUP.md` |

# Experiment 1: Scalability And Throughput

### Purpose

Measure committed transaction throughput as concurrent clients increase, comparing Fabric-backed mode against PostgreSQL-only mode. The canonical workload is an 80 percent `CheckAccess` read and 20 percent `RegisterDocument` write mix.

### Related manuscript claim

The framework should sustain the estimated 1,000-lawyer demand threshold of 16.7 TPS. Older prose in `experiment_results.md` claimed Fabric peak 26.7 TPS and PostgreSQL peak 481.4 TPS. Later campaign evidence in `results/DELTAS.md` supersedes this with Fabric about 66 to 70 TPS and PostgreSQL peak about 279 TPS under the current gateway/IPFS write path.

### Scripts used

- `experiments/run-exp1-fabric-sweep.sh`
- `experiments/run-throughput-sweep.sh`
- `experiments/run-exp1-batchtimeout.sh`
- `experiments/run-PG-throughput.sh`
- `experiments/caliper/pangochain-loadtest-configurable.js`
- `experiments/caliper/pangochain-loadtest.js`
- `experiments/caliper/pangochain-loadtest-wan.js`
- `experiments/caliper/pangochain-benchmark.yaml`
- `experiments/caliper/pangochain-loadtest-configurable.js`
- `experiments/caliper/workload/pangochain-workload.js`
- `experiments/setup-bench-data.py`
- `experiments/summarize.py`
- `figures/make_figures.py`

### Command / execution procedure

Exact campaign commands are partially documented in scripts and notes. Closest documented procedure:

```bash
docker-compose up postgres ipfs ipfs2 -d
cd pangochain-fabric
make up
make chaincode
make smoke
cd ..
cd pangochain-backend
./mvnw spring-boot:run
```

Fabric throughput sweep:

```bash
bash experiments/run-exp1-fabric-sweep.sh
```

Generic throughput sweep, inferred from script environment variables:

```bash
MODE=fabric METHOD=gateway BT_MS=2000 TOOL=fixedcount_x10 TRIALS=5 bash experiments/run-throughput-sweep.sh
```

PostgreSQL-only throughput:

```bash
bash experiments/run-PG-throughput.sh
```

Older Caliper-oriented instructions in `experiment_results.md`:

```bash
cd experiments/caliper
export PANGOCHAIN_JWT_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pangolawfirm.com","password":"Admin123!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
export PANGOCHAIN_TEST_CASE_ID=<case-id-from-GET-/api/cases>
export PANGOCHAIN_TEST_DOC_ID=<doc-id-from-GET-/api/documents>
bash run-experiments.sh
```

### Environment

- OS: Ubuntu 22.04.5 LTS.
- CPU: Intel Core Ultra 5 125H.
- Docker/Fabric version: Docker 29.4.3, Docker Compose v5.1.3, Hyperledger Fabric 2.4.x.
- Fabric configuration: 3 orgs, 3 orderers, 3 peers, CouchDB state DB, EtcdRaft.
- BatchTimeout: `2s` canonical.
- Block size: `MaxMessageCount=500`.
- Database: PostgreSQL 16 for baseline mode.
- IPFS node count: 2.
- Concurrency: Fabric fixedcount sweep uses 50, 100, 150, 200, 300, 400, 500, 600; duration60s cross-check at 50; PostgreSQL duration60s uses 50 through 600.
- Workload duration: 60 seconds for duration tool; fixedcount tool uses clients x 10 transactions.

### Raw result files

| Path | Type | Last modified | Description | Key metrics |
|---|---|---:|---|---|
| `results/exp1_throughput.csv` | CSV | 2026-06-01 13:10 | Raw per-trial throughput rows | mode, batch timeout, tool, concurrency, TPS, latency, errors, CPU/RAM, method |
| `results/exp1_throughput.summary.json` | JSON | 2026-06-01 13:13 | Generated summary by mode/tool/concurrency | mean, P50, min, max, stdev, raw TPS |
| `results/p2a_batchtimeout_tps.csv` | CSV | 2026-05-25 20:46 | Older Phase 2-A BatchTimeout TPS raw data | TPS at 500 ms and 250 ms |
| `results/p2a_summary.txt` | TXT | 2026-05-25 20:48 | Older Phase 2-A summary | mean/min/max/stddev by timeout/concurrency |
| `results/paper_integration_notes.txt` | TXT | 2026-05-25 21:43 | Older paper prose | older values later superseded |
| `results/DELTAS.md` | Markdown | 2026-06-01 13:54 | Authoritative mismatch log | manuscript deltas and supersession notes |
| `figures/fig1_scalability.pdf` | PDF | 2026-06-02 07:02 | Generated scalability figure | plotted from `exp1_throughput.csv` |

### Extracted metrics

| Metric | Value | Unit | Source file | Notes |
|---|---:|---|---|---|
| Fabric duration60s TPS at conc=50, 2s | 66.3 | TPS mean | `results/exp1_throughput.summary.json` | 5 trials, zero errors |
| Fabric fixedcount TPS at conc=50, 2s | 62.14 | TPS mean | `results/exp1_throughput.summary.json` | trial 0 warm-up excluded by summary |
| Fabric fixedcount TPS at conc=100, 2s | 63.46 | TPS mean | `results/exp1_throughput.summary.json` | 5 trials |
| Fabric fixedcount TPS at conc=150, 2s | 69.0 | TPS mean | `results/exp1_throughput.summary.json` | 5 trials |
| Fabric fixedcount TPS at conc=200, 2s | 66.92 | TPS mean | `results/exp1_throughput.summary.json` | 5 trials |
| Fabric fixedcount TPS at conc=300, 2s | 66.38 | TPS mean | `results/exp1_throughput.summary.json` | 5 trials |
| Fabric fixedcount TPS at conc=400, 2s | 69.98 | TPS mean | `results/exp1_throughput.summary.json` | 5 trials |
| Fabric fixedcount TPS at conc=500, 2s | 68.64 | TPS mean | `results/exp1_throughput.summary.json` | mean errors 0.6 |
| Fabric fixedcount TPS at conc=600, 2s | 68.22 | TPS mean | `results/exp1_throughput.summary.json` | mean errors 4.4 |
| PostgreSQL TPS at conc=50 | 272.14 | TPS mean | `results/exp1_throughput.summary.json` | stable, zero errors |
| PostgreSQL peak TPS at conc=100 | 279.3 | TPS mean | `results/exp1_throughput.summary.json` | stable, zero errors |
| PostgreSQL conc>=150 | 0 to 154.02 | TPS mean | `results/exp1_throughput.summary.json` | flagged as load-generator/socket-pool saturation in `DELTAS.md` |
| PostgreSQL vs Fabric ratio | about 4.1 | x | `results/DELTAS.md` | matched-tool conc=50: 272.1 / 66.3 |
| Estimated demand | 16.7 | TPS | `experiment_results.md`, `figures/make_figures.py` | 1,000 lawyers at 1 action/minute |

### Consistency check

POSSIBLE MISMATCH. `results/exp1_throughput.csv`, `results/exp1_throughput.summary.json`, `results/DELTAS.md`, and `figures/make_figures.py` agree on the current canonical Fabric regime of about 66 to 70 TPS and PostgreSQL peak of about 279 TPS. Older `experiment_results.md` reports Fabric peak 26.7 TPS and PostgreSQL peak 481.4 TPS; `results/DELTAS.md` explicitly says these old values are superseded by the current gateway/IPFS write path. `results/p2a_*` also contains older BatchTimeout sensitivity values that are superseded by `results/exp_batchtimeout_sens.*` for sustained duration60s throughput.

### Notes

The repository contains both Caliper naming and custom Node.js REST load testers. `experiment_results.md` says Caliper CLI was not used directly for the completed Experiment 1 and that `experiments/caliper/pangochain-loadtest.js` was used instead.

# Experiment 2: Function-Level Latency

### Purpose

Measure per-operation latency for `CheckAccess` and `RegisterDocument`, comparing Fabric/gateway mode to database-only access-check mode.

### Related manuscript claim

Read-path Fabric `CheckAccess` adds negligible overhead compared with PostgreSQL ACL lookup. Write-path `RegisterDocument` latency is dominated by the 2-second Raft `BatchTimeout`.

### Scripts used

- `experiments/measure-v2-latency.py`
- `experiments/measure-latency.sh`
- `experiments/measure-regdoc-rest.py`
- `experiments/measure-regdoc-rest.sh`
- `experiments/measure-regdoc-latency.sh`
- `experiments/caliper/checkaccess-latency.js`
- `figures/make_figures.py`

### Command / execution procedure

Canonical script:

```bash
python3 experiments/measure-v2-latency.py
```

Database-only CheckAccess top-up, inferred from `results/EXPERIMENT_PROGRESS.md`:

```bash
MODE=db_only OPS=checkaccess python3 experiments/measure-v2-latency.py
```

Older REST and CLI alternatives:

```bash
JWT=<token> DOC_ID=<id> CASE_ID=<id> bash experiments/measure-latency.sh
JWT=<token> CASE_ID=<id> python3 experiments/measure-regdoc-rest.py
bash experiments/measure-regdoc-latency.sh
```

### Environment

- OS/CPU/Docker/Fabric: same global Linux x86_64 environment.
- Fabric path: gateway preferred; CSV rows tag `method=gateway`.
- Samples: 20 warm-up discarded plus 100 measured according to `results/EXPERIMENT_PROGRESS.md`; CSV has 360 rows total because it contains fabric `checkaccess`, fabric `registerdoc`, and db-only `checkaccess`.
- BatchTimeout: 2s.

### Raw result files

| Path | Type | Last modified | Description | Key metrics |
|---|---|---:|---|---|
| `results/exp2_latency.csv` | CSV | 2026-06-01 12:25 | Raw per-sample latency rows | operation, mode, method, latency_ms, HTTP status |
| `results/exp2_latency.summary.json` | JSON | 2026-06-01 12:25 | Summary by mode and operation | cold/warmed mean, P50, min, max, stdev |
| `figures/fig2_latency.pdf` | PDF | 2026-06-02 07:03 | Generated latency figure | uses `exp2_latency.csv`, `exp7_history.csv`, and constants in script |

### Extracted metrics

| Metric | Value | Unit | Source file | Notes |
|---|---:|---|---|---|
| Fabric CheckAccess cold P50 | 7.502 | ms | `results/exp2_latency.summary.json` | n=100, bad=0 |
| Fabric CheckAccess warmed P50 | 6.509 | ms | `results/exp2_latency.summary.json` | n=100 |
| DB-only CheckAccess cold P50 | 7.998 | ms | `results/exp2_latency.summary.json` | n=100, bad=0 |
| DB-only CheckAccess warmed P50 | 7.162 | ms | `results/exp2_latency.summary.json` | n=100 |
| Fabric RegisterDocument cold P50 | 2084.117 | ms | `results/exp2_latency.summary.json` | n=100, bad=0 |
| Fabric RegisterDocument warmed P50 | 2083.931 | ms | `results/exp2_latency.summary.json` | n=100 |
| Fabric CheckAccess overhead vs DB | about -0.5 cold, -0.65 warmed | ms | `results/DELTAS.md` | within noise, confirms "<1 ms overhead" |

### Consistency check

CONSISTENT for current raw and summary files. POSSIBLE MISMATCH with older `experiment_results.md`, which reports older Linux values CheckAccess P50=10 ms and RegisterDocument P50=2080 ms. These are directionally consistent but not exact; current raw summary should be treated as canonical.

### Notes

`figures/make_figures.py` uses a hard-coded PostgreSQL RegisterDocument baseline of 46.0 ms for the latency figure. This value is not present in `results/exp2_latency.summary.json`; it appears to come from older `experiment_results.md`. Treat that plotted DB-write baseline as lower confidence than raw CSV metrics.

# Experiment 3: File Size Impact And IPFS Latency

### Purpose

Show that Fabric commit latency is approximately independent of document size because the ledger stores hashes/CIDs, while IPFS add/upload latency grows with file size.

### Related manuscript claim

Off-chain IPFS storage decouples ledger performance from document size. Fabric commit latency remains roughly constant at one 2-second BatchTimeout.

### Scripts used

- `experiments/measure-v3-filesize.py`
- `experiments/measure-filesize-cli.py`
- `experiments/measure-filesize-cli.sh`
- `experiments/measure-filesize-rest.py`
- `experiments/measure-filesize-rest.sh`
- `experiments/measure-filesize.sh`
- `experiments/measure-ipfs-latency.sh`
- `figures/make_figures.py`

### Command / execution procedure

Canonical current script:

```bash
python3 experiments/measure-v3-filesize.py
```

Older alternatives:

```bash
python3 experiments/measure-filesize-cli.py
bash experiments/measure-filesize-cli.sh
JWT=<token> CASE_ID=<id> python3 experiments/measure-filesize-rest.py
JWT=<token> CASE_ID=<id> bash experiments/measure-filesize-rest.sh
```

### Environment

- OS/CPU/Docker/Fabric: same global Linux x86_64 environment.
- IPFS API: direct Kubo HTTP.
- IPFS node count: 2 in Docker Compose; canonical script measures direct Kubo API and records CIDs.
- Fabric commit method: `peer_cli_invoke` in summary.
- File sizes: 1, 5, 10, 20, 30, 50 MB.
- Samples: IPFS 10 per size; Fabric commit 5 samples in current summary.

### Raw result files

| Path | Type | Last modified | Description | Key metrics |
|---|---|---:|---|---|
| `results/exp3_filesize.csv` | CSV | 2026-06-01 10:30 | Raw Fabric commit and IPFS add timings | kind, size_mb, sample, value_ms, CID |
| `results/exp3_filesize.summary.json` | JSON | 2026-06-01 10:30 | Summary by file size | IPFS P50/mean/min/max/stdev, Fabric commit, total P50 |
| `figures/fig3_filesize.pdf` | PDF | 2026-06-02 07:03 | Generated figure | plotted from `exp3_filesize.csv` |

### Extracted metrics

| Metric | Value | Unit | Source file | Notes |
|---|---:|---|---|---|
| Fabric commit P50 | 2131.73 | ms | `results/exp3_filesize.summary.json` | raw: 2135.43, 2131.73, 2129.74, 2136.9, 2128.63 |
| IPFS add P50, 1 MB | 10.14 | ms | `results/exp3_filesize.summary.json` | total P50 2141.87 ms |
| IPFS add P50, 5 MB | 17.26 | ms | `results/exp3_filesize.summary.json` | total P50 2148.99 ms |
| IPFS add P50, 10 MB | 29.86 | ms | `results/exp3_filesize.summary.json` | total P50 2161.59 ms |
| IPFS add P50, 20 MB | 42.2 | ms | `results/exp3_filesize.summary.json` | total P50 2173.94 ms |
| IPFS add P50, 30 MB | 68.0 | ms | `results/exp3_filesize.summary.json` | total P50 2199.73 ms |
| IPFS add P50, 50 MB | 94.7 | ms | `results/exp3_filesize.summary.json` | total P50 2226.43 ms |

### Consistency check

POSSIBLE MISMATCH. Current `results/exp3_filesize.*` says 50 MB IPFS P50 is 94.7 ms and total P50 is 2226.43 ms. Older `experiment_results.md` reports a 50 MB IPFS estimate of about 854 ms and total P50 2975 ms. Current raw CSV and summary should be treated as canonical for the latest campaign; older prose is a prior run.

### Notes

The current canonical script separates IPFS direct add timing from Fabric commit timing. The REST scripts include application/API overhead and may not be directly comparable.

# Experiment 4: Audit Verification Efficiency

### Purpose

Compare audit verification/query mechanisms: PostgreSQL audit query and manual CSV export plus SHA-256 chain verification. The generated figure also compares Fabric `GetHistoryForKey` using Experiment 7 history timing.

### Related manuscript claim

Audit records are efficiently queryable while retaining tamper-evident verification options.

### Scripts used

- `experiments/measure-v4-audit.sh`
- `experiments/measure-audit-verification.sh`
- `experiments/seed-audit-events.sh`
- `figures/make_figures.py`

### Command / execution procedure

Canonical current script:

```bash
bash experiments/measure-v4-audit.sh
```

Older API-based script:

```bash
JWT=<token> CASE_ID=<id> bash experiments/measure-audit-verification.sh
```

Audit event seeding:

```bash
JWT=<token> CASE_ID=<id> bash experiments/seed-audit-events.sh 1000
```

### Environment

- OS/CPU/Docker/Fabric: same global Linux x86_64 environment.
- Database: PostgreSQL.
- Rows: 1,000 events per trial.
- Trials: 10 per method in current raw CSV.
- Campaign note: audit_log had 108k rows at measurement time in `results/EXPERIMENT_PROGRESS.md`.

### Raw result files

| Path | Type | Last modified | Description | Key metrics |
|---|---|---:|---|---|
| `results/exp4_audit.csv` | CSV | 2026-06-01 10:31 | Raw audit query and CSV+SHA timings | method, trial, ms, rows |
| `results/exp4_audit.summary.json` | JSON | 2026-06-01 10:31 | Summary by method | mean, P50, min, max, stdev, raw |
| `figures/fig4_audit.pdf` | PDF | 2026-06-02 07:03 | Generated audit figure | combines `exp4_audit.csv` and `exp7_history.csv` |

### Extracted metrics

| Metric | Value | Unit | Source file | Notes |
|---|---:|---|---|---|
| PostgreSQL query P50, 1000 events | 3.85 | ms | `results/exp4_audit.summary.json` | mean 3.45 ms |
| PostgreSQL query min/max | 2.22 / 4.46 | ms | `results/exp4_audit.summary.json` | 10 trials |
| CSV + SHA-256 chain P50, 1000 events | 86.31 | ms | `results/exp4_audit.summary.json` | mean 87.44 ms |
| CSV + SHA-256 min/max | 75.51 / 102.45 | ms | `results/exp4_audit.summary.json` | 10 trials |
| Manual SHA chain vs PG query | about 22.4 | x | computed from summary | 86.31 / 3.85 |

### Consistency check

CONSISTENT between `results/exp4_audit.csv`, `results/exp4_audit.summary.json`, `results/DELTAS.md`, and `figures/make_figures.py`.

### Notes

The script title references Fabric `GetHistoryForKey`, but the current raw output only contains PostgreSQL query and CSV+SHA chain rows. Fabric history is measured separately in Experiment 7 and used in the figure.

# Experiment 5: WAN / Netem Resilience

### Purpose

Measure throughput and commit latency under injected WAN delay, distinguishing host Docker bridge delay from corrected per-orderer veth delay that affects inter-orderer Raft traffic.

### Related manuscript claim

The framework remains above the 16.7 TPS estimated demand threshold under WAN latency, though inter-orderer Raft delay increases commit latency and reduces throughput.

### Scripts used

- `experiments/run-W-wan-sweep.sh`
- `experiments/run-R-wan-reconcile.sh`
- `experiments/run-p2b.sh`
- `experiments/run-wan-exp5.sh`
- `experiments/run-wan-exp5-continue.sh`
- `experiments/run-wan-sim.sh`
- `experiments/caliper/run-wan-measurement.sh`
- `experiments/caliper/pangochain-loadtest-wan.js`
- `experiments/caliper/pangochain-loadtest-configurable.js`
- `figures/make_figures.py`

### Command / execution procedure

Canonical full WAN sweep:

```bash
bash experiments/run-W-wan-sweep.sh
```

0 ms reconciliation:

```bash
bash experiments/run-R-wan-reconcile.sh
```

Older P2-B corrected WAN run:

```bash
bash experiments/run-p2b.sh
```

Older bridge simulation:

```bash
JWT=<token> CASE_ID=<id> DOC_ID=<id> bash experiments/run-wan-exp5.sh
```

### Environment

- OS/CPU/Docker/Fabric: same global Linux x86_64 environment.
- BatchTimeout: 2s.
- WAN/netem configuration: RTT values 0, 50, 100, 150 ms; configs `bridge` and `bridge_veth`.
- Concurrency: canonical `run-W-wan-sweep.sh` uses `CONC=200`.
- Duration: canonical `DUR=60`.
- Repetitions: canonical `REPS=5`.
- Method: gateway write path.

### Raw result files

| Path | Type | Last modified | Description | Key metrics |
|---|---|---:|---|---|
| `results/exp5_wan.csv` | CSV | 2026-06-01 12:24 | Canonical full WAN sweep | rtt_ms, config, TPS, P50/P95, errors |
| `results/exp5_wan.summary.json` | JSON | 2026-06-01 12:24 | Summary by config/RTT | mean/P50/min/max/stdev |
| `results/p2b_wan_tps_raw.csv` | CSV | 2026-05-25 21:18 | Older P2-B raw TPS | veth_corrected and bridge_original TPS |
| `results/p2b_wan_latency_raw.csv` | CSV | 2026-05-25 21:18 | Older P2-B raw latency | RegisterDocument latency samples |
| `results/p2b_summary.txt` | TXT | 2026-05-25 21:18 | Older P2-B summary | mean TPS, P50 latency |
| `results/p2b_missing_points.txt` | TXT | 2026-05-25 22:07 | P2-B handoff note | confirms no missing 50/100 ms points |
| `figures/fig5_wan.pdf` | PDF | 2026-06-02 07:03 | Generated WAN figure | plotted from `exp5_wan.csv` |

### Extracted metrics

| Metric | Value | Unit | Source file | Notes |
|---|---:|---|---|---|
| Bridge 0 ms TPS | 68.24 | TPS mean | `results/exp5_wan.summary.json` | P50 latency 2138 ms |
| Bridge 50 ms TPS | 64.94 | TPS mean | `results/exp5_wan.summary.json` | P50 latency 2242 ms |
| Bridge 100 ms TPS | 62.28 | TPS mean | `results/exp5_wan.summary.json` | P50 latency 2357 ms |
| Bridge 150 ms TPS | 60.76 | TPS mean | `results/exp5_wan.summary.json` | P50 latency 2457 ms |
| Bridge_veth 0 ms TPS | 69.48 | TPS mean | `results/exp5_wan.summary.json` | P50 latency 2140 ms |
| Bridge_veth 50 ms TPS | 50.94 | TPS mean | `results/exp5_wan.summary.json` | P50 latency 2920 ms |
| Bridge_veth 100 ms TPS | 47.04 | TPS mean | `results/exp5_wan.summary.json` | P50 latency 3132 ms |
| Bridge_veth 150 ms TPS | 38.32 | TPS mean | `results/exp5_wan.summary.json` | P50 latency 3577 ms |
| Bridge_veth 150 ms errors | 195.2 | mean errors | `results/exp5_wan.summary.json` | p95 near client timeout in notes |

### Consistency check

POSSIBLE MISMATCH. Current `exp5_wan.*` supersedes older P2-B values. Older `results/p2b_summary.txt` reports veth_corrected 150 ms TPS 17.14 and P50 2744 ms, while current `exp5_wan.summary.json` reports bridge_veth 150 ms TPS 38.32 and P50 3577 ms. `results/DELTAS.md` explicitly says Task W supersedes the old 0 ms-only and old about-22 TPS regime.

### Notes

`bridge` delay affects the Docker bridge/host-container path. `bridge_veth` also delays each orderer veth and is treated in `DELTAS.md` as the corrected inter-orderer Raft delay case.

# Experiment 6: Cryptographic Operation Benchmark

### Purpose

Benchmark browser/JavaScript cryptographic operations such as key generation, encryption/decryption, signatures, hashing, or token handling.

### Related manuscript claim

The repository contains a crypto benchmark artifact, but no current raw result CSV/JSON was found for this experiment.

### Scripts used

- `experiments/crypto-benchmark.html`
- `CRYPTO.md`
- `pangochain-frontend/src/lib/crypto.ts`
- `pangochain-frontend/src/test/crypto.test.ts`

### Command / execution procedure

Exact command not found in repository. Closest likely procedure is to open `experiments/crypto-benchmark.html` in a browser and record displayed benchmark output.

### Environment

- Windows session for Experiment 6 is documented in `experiment_results.md`: Windows 11 Pro 22631, Java 17 Temurin 17.0.18, Node.js 24.13.1.
- Cryptographic design is documented in `CRYPTO.md`: ECDH P-256, ECDSA P-256, AES-GCM-256, PBKDF2-HMAC-SHA256, SHA-256.
- Raw benchmark environment for the HTML artifact: Not documented beyond `experiment_results.md`.

### Raw result files

No raw CSV/JSON/log result file for crypto benchmark was found in `results/`.

### Extracted metrics

| Metric | Value | Unit | Source file | Notes |
|---|---:|---|---|---|
| Key generation time | Not found | ms | n/a | No raw evidence found |
| Encryption/decryption time | Not found | ms | n/a | No raw evidence found |
| Token size | Not found | bytes | n/a | No raw evidence found |

### Consistency check

CANNOT VERIFY. The benchmark HTML exists, and cryptographic design docs exist, but no raw outputs were found.

### Notes

This is a missing-evidence item if the manuscript reports numeric crypto benchmark values.

# Experiment 7: GetDocumentHistory / Ledger History Depth

### Purpose

Measure Fabric `GetDocumentHistory` latency for a document with a known number of ledger history entries.

### Related manuscript claim

Ledger audit history remains queryable with acceptable latency for a depth of about 107 entries.

### Scripts used

- `experiments/measure-v5-history.sh`
- `figures/make_figures.py`

### Command / execution procedure

```bash
bash experiments/measure-v5-history.sh
```

Script comments and variables indicate default `TRIALS=10`; the script registers a document, grants access repeatedly to build history, and times `GetDocumentHistory`.

### Environment

- OS/CPU/Docker/Fabric: same global Linux x86_64 environment.
- BatchTimeout: 2s.
- History depth: 107.
- Trials: 10.

### Raw result files

| Path | Type | Last modified | Description | Key metrics |
|---|---|---:|---|---|
| `results/exp7_history.csv` | CSV | 2026-06-01 10:35 | Raw GetDocumentHistory timings | trial, latency_ms, depth |
| `results/exp7_history.summary.json` | JSON | 2026-06-01 10:35 | Summary | depth, raw values, mean, P50, min, max, stdev |
| `figures/fig7_gethistory.pdf` | PDF | 2026-06-02 07:04 | Generated history figure | plotted from `exp7_history.csv` |

### Extracted metrics

| Metric | Value | Unit | Source file | Notes |
|---|---:|---|---|---|
| History depth | 107 | entries | `results/exp7_history.summary.json` | recorded as string `"107"` |
| Mean latency | 134 | ms | `results/exp7_history.summary.json` | 10 trials |
| P50 latency | 135.5 | ms | `results/exp7_history.summary.json` | raw median |
| Min latency | 123 | ms | `results/exp7_history.summary.json` | raw values recorded |
| Max latency | 145 | ms | `results/exp7_history.summary.json` | raw values recorded |
| Stdev | 6.41 | ms | `results/exp7_history.summary.json` | 10 trials |

### Consistency check

CONSISTENT between CSV, summary, `results/DELTAS.md`, and `figures/make_figures.py`.

### Notes

This experiment is called V5 in `results/EXPERIMENT_PROGRESS.md` but outputs files named `exp7_history.*`.

# Experiment 8: BatchTimeout Sensitivity

### Purpose

Measure sustained throughput at different Raft `BatchTimeout` values and identify a practical sweet spot.

### Related manuscript claim

Reducing `BatchTimeout` can improve Fabric throughput relative to the 2s default, but lower is not always better.

### Scripts used

- `experiments/run-SENS-batchtimeout.sh`
- `experiments/run-exp1-batchtimeout.sh`
- `experiments/run-p2a.sh`
- `experiments/generate-p2-charts.py`
- `experiments/caliper/pangochain-loadtest-configurable.js`
- `figures/make_figures.py`

### Command / execution procedure

Canonical clean sensitivity run:

```bash
bash experiments/run-SENS-batchtimeout.sh
```

Script defaults:

```bash
CONC=50 DUR=60 REPS=10 bash experiments/run-SENS-batchtimeout.sh
```

Older P2-A run:

```bash
bash experiments/run-p2a.sh
```

### Environment

- OS/CPU/Docker/Fabric: same global Linux x86_64 environment.
- BatchTimeout values: 2000, 500, 250 ms.
- Concurrency: 50.
- Duration: 60 seconds.
- Repetitions: 10.
- Client CPU captured with `/usr/bin/time -v`.
- Network restored to 2s according to `results/EXPERIMENT_PROGRESS.md`.

### Raw result files

| Path | Type | Last modified | Description | Key metrics |
|---|---|---:|---|---|
| `results/exp_batchtimeout_sens.csv` | CSV | 2026-06-01 13:52 | Raw sustained sensitivity rows | timeout, TPS, P50/P95, errors, client CPU |
| `results/exp_batchtimeout_sens.summary.json` | JSON | 2026-06-01 13:54 | Summary by timeout | TPS mean/P50/min/max/stdev, CPU, errors |
| `results/p2a_batchtimeout_tps.csv` | CSV | 2026-05-25 20:46 | Older P2-A fixed data | 500 and 250 ms TPS |
| `results/p2a_summary.txt` | TXT | 2026-05-25 20:48 | Older P2-A summary | older values |
| `figures/fig8_sensitivity.pdf` | PDF | 2026-06-02 07:04 | Generated sensitivity figure | plotted from `exp_batchtimeout_sens.csv` |

### Extracted metrics

| Metric | Value | Unit | Source file | Notes |
|---|---:|---|---|---|
| 2000 ms BatchTimeout TPS | 67.68 | TPS mean | `results/exp_batchtimeout_sens.summary.json` | p50 67.6, errors_total 0 |
| 500 ms BatchTimeout TPS | 193.0 | TPS mean | `results/exp_batchtimeout_sens.summary.json` | p50 194.15, errors_total 0 |
| 250 ms BatchTimeout TPS | 179.79 | TPS mean | `results/exp_batchtimeout_sens.summary.json` | p50 180.75, errors_total 0 |
| Client CPU at 2000 ms | 2.0 | percent mean | `results/exp_batchtimeout_sens.summary.json` | not saturated |
| Client CPU at 500 ms | 11.2 | percent mean | `results/exp_batchtimeout_sens.summary.json` | not saturated |
| Client CPU at 250 ms | 14.1 | percent mean | `results/exp_batchtimeout_sens.summary.json` | not saturated |
| 500 ms improvement vs 2s | about 2.85 | x | computed | 193.0 / 67.68 |

### Consistency check

POSSIBLE MISMATCH. Canonical `exp_batchtimeout_sens.*` says 500 ms is higher than 250 ms for sustained duration60s throughput: 193.0 vs 179.79 TPS. Older `results/p2a_summary.txt` and `results/paper_integration_notes.txt` say 250 ms is higher than 500 ms: 150.92 vs 86.88 TPS at 50 clients. `results/DELTAS.md` explains the difference as tool methodology: fixedcount is latency-favoring, duration60s is canonical sustained throughput.

### Notes

`results/DELTAS.md` identifies 500 ms as the sustained-throughput sweet spot and says the 250 ms non-monotonicity is reproducible and not caused by client CPU saturation.

# Experiment 9: Fail-Open Fault Tolerance

### Purpose

Measure availability and audit behavior during a Fabric peer outage. The expected behavior is fail-open for access checks using database fallback, with fallback events recorded.

### Related manuscript claim

During Fabric access-control failure, the application remains available and records `ACL_FABRIC_FALLBACK` in audit logs.

### Scripts used

- `experiments/run-S2-failopen.sh`
- `experiments/s2-ciphertext-load.js`
- `figures/make_figures.py`

### Command / execution procedure

```bash
bash experiments/run-S2-failopen.sh
```

The script starts `s2-ciphertext-load.js` with:

```bash
PANGOCHAIN_CONCURRENCY=50 PANGOCHAIN_DURATION_SEC=150 node experiments/s2-ciphertext-load.js
```

It stops peers at second 30 and restarts them at second 75, based on the summary JSON.

### Environment

- OS/CPU/Docker/Fabric: same global Linux x86_64 environment.
- Concurrency: 50.
- Duration: 150 seconds.
- Peer outage window: second 30 to second 75.
- Workload: ciphertext/access path load generator.

### Raw result files

| Path | Type | Last modified | Description | Key metrics |
|---|---|---:|---|---|
| `results/exp_failopen.csv` | CSV | 2026-06-01 11:04 | Per-second outcomes | ok, HTTP 5xx, HTTP 403, err, inflight, events |
| `results/exp_failopen.audit.json` | JSON | 2026-06-01 11:05 | Sample fallback audit rows | `ACL_FABRIC_FALLBACK` entries |
| `results/exp_failopen.summary.json` | JSON | 2026-06-01 11:04 | Phase totals and fallback count | before/during/after OK/error counts |
| `figures/fig9_failopen.pdf` | PDF | 2026-06-02 07:04 | Generated fail-open figure | plotted from `exp_failopen.csv` |

### Extracted metrics

| Metric | Value | Unit | Source file | Notes |
|---|---:|---|---|---|
| Fallback rows delta | 1090 | rows | `results/exp_failopen.summary.json` | ACL_FABRIC_FALLBACK audit rows |
| Before outage OK | 469 | responses | `results/exp_failopen.summary.json` | h5=0, h403=0, err=0 |
| During outage OK | 649 | responses | `results/exp_failopen.summary.json` | h5=0, h403=0, err=0 |
| After recovery OK | 1417 | responses | `results/exp_failopen.summary.json` | h5=0, h403=0, err=0 |
| Peers stopped at | 30 | seconds | `results/exp_failopen.summary.json` | outage start |
| Peers started at | 75 | seconds | `results/exp_failopen.summary.json` | recovery start |

### Consistency check

CONSISTENT between summary, progress notes, audit JSON, and CSV structure. The audit JSON is a sample of fallback rows, not all 1090 rows.

### Notes

`results/EXPERIMENT_PROGRESS.md` says the original COPY FORMAT json was invalid for SELECTs and the audit JSON was re-extracted with 20 samples. The re-extraction is documented; no rerun was performed for this bundle.

# Blocked Experiments: SmartBFT And 6-Org Topology

## S1: Fabric v3 SmartBFT 4-Node Ordering

### Purpose

Evaluate a Fabric v3 SmartBFT ordering configuration.

### Status

BLOCKED. No raw output files exist.

### Evidence

`results/DELTAS.md` records blockers:

- No fourth orderer crypto; SmartBFT f=1 needs 3f+1=4 nodes.
- Pinned v3 Fabric tools image unavailable in the attempted form.
- Fabric v3 removed system-channel bring-up, requiring channel participation API and different scripts.
- Existing config is EtcdRaft, not BFT.

### Consistency check

CANNOT VERIFY. Manuscript BFT numbers are described as projections in `results/DELTAS.md`.

## S3: 6-Org Topology

### Purpose

Evaluate a six-organization topology.

### Status

BLOCKED. No raw output files exist.

### Evidence

`results/DELTAS.md` records blockers:

- Artifacts are 3-org only.
- Full crypto regeneration would be destructive to the validated 3-org network.
- Chaincode/backend configuration is 3-org-aware.

### Consistency check

CANNOT VERIFY. Any "3-org upper bound" manuscript text remains unsupported by a 6-org raw run in this repository.

# Master File Index

| Category | Path | Description |
|---|---|---|
| Experiment script | `experiments/run-exp1-fabric-sweep.sh` | Fabric throughput sweep |
| Experiment script | `experiments/run-throughput-sweep.sh` | Generic throughput sweep |
| Experiment script | `experiments/run-exp1-batchtimeout.sh` | BatchTimeout Phase B sweep and restore |
| Experiment script | `experiments/run-PG-throughput.sh` | PostgreSQL-only throughput |
| Experiment script | `experiments/measure-v2-latency.py` | Canonical latency measurement |
| Experiment script | `experiments/measure-v3-filesize.py` | Canonical file-size/IPFS measurement |
| Experiment script | `experiments/measure-v4-audit.sh` | Canonical audit verification measurement |
| Experiment script | `experiments/measure-v5-history.sh` | GetDocumentHistory measurement |
| Experiment script | `experiments/run-W-wan-sweep.sh` | Canonical WAN RTT sweep |
| Experiment script | `experiments/run-R-wan-reconcile.sh` | WAN 0 ms reconciliation |
| Experiment script | `experiments/run-SENS-batchtimeout.sh` | Clean BatchTimeout sensitivity run |
| Experiment script | `experiments/run-S2-failopen.sh` | Fail-open fault tolerance run |
| Experiment script | `experiments/s2-ciphertext-load.js` | Fail-open load generator |
| Experiment script | `experiments/setup-bench-data.py` | Creates/logs in benchmark data |
| Experiment script | `experiments/summarize.py` | Generic CSV summarizer |
| Experiment script | `experiments/run-p2a.sh` | Older BatchTimeout experiment |
| Experiment script | `experiments/run-p2b.sh` | Older corrected WAN experiment |
| Experiment script | `experiments/generate-p2-charts.py` | Older P2 chart generation |
| Experiment script | `experiments/measure-latency.sh` | Older latency script |
| Experiment script | `experiments/measure-regdoc-latency.sh` | CLI RegisterDocument latency |
| Experiment script | `experiments/measure-regdoc-rest.py` | REST RegisterDocument latency |
| Experiment script | `experiments/measure-regdoc-rest.sh` | REST RegisterDocument latency shell wrapper |
| Experiment script | `experiments/measure-filesize-cli.py` | CLI/IPFS file-size measurement |
| Experiment script | `experiments/measure-filesize-cli.sh` | CLI/IPFS file-size shell wrapper |
| Experiment script | `experiments/measure-filesize-rest.py` | REST file-size measurement |
| Experiment script | `experiments/measure-filesize-rest.sh` | REST file-size shell wrapper |
| Experiment script | `experiments/measure-filesize.sh` | Older end-to-end file-size script |
| Experiment script | `experiments/measure-ipfs-latency.sh` | Direct IPFS latency script |
| Experiment script | `experiments/measure-audit-verification.sh` | Older audit verification script |
| Experiment script | `experiments/seed-audit-events.sh` | Audit event seeding |
| Experiment script | `experiments/run-wan-exp5.sh` | Older WAN experiment |
| Experiment script | `experiments/run-wan-exp5-continue.sh` | Older WAN continuation |
| Experiment script | `experiments/run-wan-sim.sh` | Older bridge netem WAN simulation |
| Experiment script | `experiments/crypto-benchmark.html` | Browser crypto benchmark UI |
| Experiment script | `experiments/caliper/pangochain-loadtest-configurable.js` | Duration-based REST load tester |
| Experiment script | `experiments/caliper/pangochain-loadtest.js` | Fixed/older REST load tester |
| Experiment script | `experiments/caliper/pangochain-loadtest-wan.js` | WAN load tester |
| Experiment script | `experiments/caliper/checkaccess-latency.js` | CheckAccess latency helper |
| Experiment script | `experiments/caliper/run-experiments.sh` | Caliper experiment runner |
| Experiment script | `experiments/caliper/run-wan-measurement.sh` | Caliper WAN measurement helper |
| Experiment script | `experiments/caliper/workload/pangochain-workload.js` | Caliper workload module |
| Raw JSON result | `results/exp1_throughput.summary.json` | Throughput summary |
| Raw JSON result | `results/exp2_latency.summary.json` | Latency summary |
| Raw JSON result | `results/exp3_filesize.summary.json` | File-size/IPFS summary |
| Raw JSON result | `results/exp4_audit.summary.json` | Audit summary |
| Raw JSON result | `results/exp5_wan.summary.json` | WAN summary |
| Raw JSON result | `results/exp7_history.summary.json` | History summary |
| Raw JSON result | `results/exp_batchtimeout_sens.summary.json` | BatchTimeout sensitivity summary |
| Raw JSON result | `results/exp_failopen.summary.json` | Fail-open summary |
| Raw JSON result | `results/exp_failopen.audit.json` | Fail-open audit sample |
| CSV result | `results/exp1_throughput.csv` | Throughput raw rows |
| CSV result | `results/exp2_latency.csv` | Latency raw rows |
| CSV result | `results/exp3_filesize.csv` | File-size/IPFS raw rows |
| CSV result | `results/exp4_audit.csv` | Audit raw rows |
| CSV result | `results/exp5_wan.csv` | WAN raw rows |
| CSV result | `results/exp7_history.csv` | History raw rows |
| CSV result | `results/exp_batchtimeout_sens.csv` | BatchTimeout sensitivity raw rows |
| CSV result | `results/exp_failopen.csv` | Fail-open per-second rows |
| CSV result | `results/p2a_batchtimeout_tps.csv` | Older P2-A raw rows |
| CSV result | `results/p2b_wan_tps_raw.csv` | Older P2-B TPS raw rows |
| CSV result | `results/p2b_wan_latency_raw.csv` | Older P2-B latency raw rows |
| Log | `results/errors.log` | Older P2-A/P2-B errors |
| Plotting script | `figures/make_figures.py` | Current figure generation from CSV |
| Plotting script | `experiments/generate-p2-charts.py` | Older P2 chart generation |
| Generated figure/table | `figures/fig1_scalability.pdf` | Scalability figure |
| Generated figure/table | `figures/fig2_latency.pdf` | Latency figure |
| Generated figure/table | `figures/fig3_filesize.pdf` | File-size figure |
| Generated figure/table | `figures/fig4_audit.pdf` | Audit figure |
| Generated figure/table | `figures/fig5_wan.pdf` | WAN figure |
| Generated figure/table | `figures/fig7_gethistory.pdf` | GetHistory figure |
| Generated figure/table | `figures/fig8_sensitivity.pdf` | BatchTimeout sensitivity figure |
| Generated figure/table | `figures/fig9_failopen.pdf` | Fail-open figure |
| Generated figure/table | `results/p2a_tps_chart.pdf` | Older P2-A chart |
| Generated figure/table | `results/p2b_wan_chart.pdf` | Older P2-B chart |
| README/documentation | `experiment_results.md` | Older experiment report and environment |
| README/documentation | `results/EXPERIMENT_PROGRESS.md` | Campaign checkpoint and run status |
| README/documentation | `results/DELTAS.md` | Authoritative mismatch/delta log |
| README/documentation | `results/paper_integration_notes.txt` | Older manuscript prose |
| README/documentation | `results/p2a_summary.txt` | Older BatchTimeout summary |
| README/documentation | `results/p2b_summary.txt` | Older WAN summary |
| README/documentation | `results/p2b_missing_points.txt` | Older WAN missing-points note |
| README/documentation | `results/handoff-bundle.txt` | Bundled campaign handoff |
| README/documentation | `SETUP.md` | Setup and environment documentation |
| README/documentation | `CRYPTO.md` | Crypto design documentation |
| README/documentation | `SESSION_HANDOFF.md` | Architecture and environment notes |
| Config file | `experiments/caliper/pangochain-benchmark.yaml` | Caliper benchmark config |
| Config file | `experiments/caliper/networks/pangochain-network.yaml` | Caliper network config |
| Docker/Fabric/IPFS config | `docker-compose.yml` | PostgreSQL and two-node IPFS config |
| Docker/Fabric/IPFS config | `pangochain-fabric/configtx.yaml` | Fabric channel/orderer config |
| Docker/Fabric/IPFS config | `pangochain-fabric/crypto-config.yaml` | Fabric crypto topology |
| Docker/Fabric/IPFS config | `pangochain-fabric/docker-compose.fabric.yml` | Fabric Docker topology |
| Docker/Fabric/IPFS config | `pangochain-fabric/Makefile` | Fabric network commands |
| Docker/Fabric/IPFS config | `pangochain-fabric/scripts/start-network.sh` | Network startup |
| Docker/Fabric/IPFS config | `pangochain-fabric/scripts/deploy-chaincode.sh` | Chaincode deployment |
| Docker/Fabric/IPFS config | `pangochain-fabric/scripts/generate-artifacts.sh` | Artifact generation |
| Other | `pangochain-chaincode/legalcc/*` | Chaincode under test |
| Other | `pangochain-backend/src/main/java/com/pangochain/backend/blockchain/*` | Fabric gateway/backend integration |
| Other | `pangochain-backend/src/main/java/com/pangochain/backend/ipfs/*` | IPFS integration |

# Canonical Metrics Summary

| Claim / metric | Canonical value found | Source file | Confidence | Notes |
|---|---:|---|---|---|
| Demand threshold | 16.7 TPS | `experiment_results.md`, `figures/make_figures.py` | Medium | Derived workload assumption |
| Fabric sustained throughput at 2s, conc=50 | 66.3 TPS | `results/exp1_throughput.summary.json` | High | duration60s, 5 reps |
| Fabric fixedcount throughput range at 2s | 62.14 to 69.98 TPS mean | `results/exp1_throughput.summary.json` | High | conc 50 to 600 |
| PostgreSQL-only stable peak | 279.3 TPS | `results/exp1_throughput.summary.json` | High | conc=100, zero errors |
| PostgreSQL/Fabric matched ratio | about 4.1x | `results/DELTAS.md` | Medium | uses conc=50 matched tool |
| Fabric CheckAccess warmed P50 | 6.509 ms | `results/exp2_latency.summary.json` | High | n=100 |
| DB-only CheckAccess warmed P50 | 7.162 ms | `results/exp2_latency.summary.json` | High | n=100 |
| RegisterDocument warmed P50 | 2083.931 ms | `results/exp2_latency.summary.json` | High | gateway write path |
| Fabric commit constant for file-size test | 2131.73 ms | `results/exp3_filesize.summary.json` | High | peer CLI invoke |
| IPFS add P50 at 50 MB | 94.7 ms | `results/exp3_filesize.summary.json` | High | direct Kubo API |
| Audit PostgreSQL query P50 | 3.85 ms | `results/exp4_audit.summary.json` | High | 1000 events |
| Manual CSV+SHA audit P50 | 86.31 ms | `results/exp4_audit.summary.json` | High | 1000 events |
| WAN bridge_veth 150 ms TPS | 38.32 TPS | `results/exp5_wan.summary.json` | High | corrected Raft delay config |
| WAN bridge_veth 150 ms P50 commit | 3577 ms | `results/exp5_wan.summary.json` | High | corrected Raft delay config |
| GetDocumentHistory depth | 107 entries | `results/exp7_history.summary.json` | High | raw history experiment |
| GetDocumentHistory P50 | 135.5 ms | `results/exp7_history.summary.json` | High | 10 trials |
| BatchTimeout 2s TPS | 67.68 TPS | `results/exp_batchtimeout_sens.summary.json` | High | 10 reps, duration60s |
| BatchTimeout 500 ms TPS | 193.0 TPS | `results/exp_batchtimeout_sens.summary.json` | High | 10 reps, duration60s |
| BatchTimeout 250 ms TPS | 179.79 TPS | `results/exp_batchtimeout_sens.summary.json` | High | 10 reps, duration60s |
| Fail-open fallback rows | 1090 rows | `results/exp_failopen.summary.json` | High | audit delta |
| Fail-open during outage OK/error | 649 OK, 0 5xx, 0 403, 0 err | `results/exp_failopen.summary.json` | High | peer outage window |

# Mismatch Report

## Mismatch 1

- Metric: Fabric throughput ceiling
- Value A: 26.7 TPS at 50 concurrent clients
- Source A: `experiment_results.md`
- Value B: 66.3 TPS duration60s at conc=50; fixedcount means about 62 to 70 TPS across concurrencies
- Source B: `results/exp1_throughput.summary.json`, `results/DELTAS.md`
- Severity: major
- Recommendation: Use current raw CSV/summary and mark older `experiment_results.md` value as prior/superseded.

## Mismatch 2

- Metric: PostgreSQL-only throughput peak and Fabric ratio
- Value A: 481.4 TPS and about 18x Fabric
- Source A: `experiment_results.md`
- Value B: 279.3 TPS stable peak and about 4.0 to 4.1x Fabric
- Source B: `results/exp1_throughput.summary.json`, `results/DELTAS.md`
- Severity: major
- Recommendation: Replace manuscript/prose numbers with current gateway/IPFS write-path values; preserve the load-generator caveat for conc>=150.

## Mismatch 3

- Metric: BatchSize / MaxMessageCount
- Value A: BatchSize=50
- Source A: manuscript text as quoted in `results/DELTAS.md`
- Value B: `MaxMessageCount=500`
- Source B: `pangochain-fabric/configtx.yaml`, `results/DELTAS.md`
- Severity: critical
- Recommendation: Correct manuscript to `MaxMessageCount=500`; avoid calling it BatchSize=50.

## Mismatch 4

- Metric: BatchTimeout sensitivity ranking
- Value A: 250 ms higher than 500 ms, 150.92 TPS vs 86.88 TPS at conc=50
- Source A: `results/p2a_summary.txt`, `results/paper_integration_notes.txt`
- Value B: 500 ms higher than 250 ms for sustained throughput, 193.0 TPS vs 179.79 TPS
- Source B: `results/exp_batchtimeout_sens.summary.json`, `results/DELTAS.md`
- Severity: major
- Recommendation: Use `exp_batchtimeout_sens.*` as canonical sustained throughput; describe P2-A as fixedcount/older methodology.

## Mismatch 5

- Metric: WAN corrected 150 ms TPS and latency
- Value A: veth_corrected 150 ms TPS 17.14, P50 2744 ms
- Source A: `results/p2b_summary.txt`
- Value B: bridge_veth 150 ms TPS 38.32, P50 3577 ms
- Source B: `results/exp5_wan.summary.json`
- Severity: major
- Recommendation: Use Task W `exp5_wan.*` for current canonical WAN sweep; retain P2-B as older replacement run only.

## Mismatch 6

- Metric: File-size/IPFS 50 MB latency
- Value A: IPFS estimate about 854 ms and total P50 2975 ms
- Source A: `experiment_results.md`
- Value B: IPFS add P50 94.7 ms and total P50 2226.43 ms
- Source B: `results/exp3_filesize.summary.json`
- Severity: major
- Recommendation: Use `exp3_filesize.*` for current campaign; document older platform/run differences if manuscript retains prior values.

## Mismatch 7

- Metric: DB-only RegisterDocument latency in generated figure
- Value A: 46.0 ms hard-coded as PostgreSQL INSERT baseline
- Source A: `figures/make_figures.py`
- Value B: No current raw `db_only registerdoc` rows in `results/exp2_latency.csv`
- Source B: `results/exp2_latency.csv`
- Severity: minor
- Recommendation: Treat the plotted DB-write bar as medium/low confidence unless a raw DB-write run is added.

# Missing Evidence

- Crypto benchmark numeric results: `experiments/crypto-benchmark.html` exists, but no raw result file was found for key generation, encryption/decryption, signature, hashing, token size, or browser benchmark timing.
- Fabric v3 SmartBFT: blocked in `results/DELTAS.md`; no raw result files.
- 6-org topology: blocked in `results/DELTAS.md`; no raw result files.
- DB-only RegisterDocument raw latency for the current campaign: figure script uses a 46 ms constant, but `results/exp2_latency.csv` contains DB-only CheckAccess only.
- Manuscript source files: no `.tex`, `.docx`, or manuscript table source was found in the visible repo file list; only notes and generated figures were available.

# Reproduction Plan

## Common Prerequisites

1. Docker and Docker Compose installed.
2. Java 21 and Node.js installed.
3. Python 3 available.
4. Repository root is the working directory.
5. Start PostgreSQL and IPFS:

```bash
docker-compose up postgres ipfs ipfs2 -d
```

6. Start Fabric:

```bash
cd pangochain-fabric
make up
make chaincode
make smoke
cd ..
```

7. Start backend in Fabric mode:

```bash
cd pangochain-backend
./mvnw spring-boot:run
```

8. Validate results by checking generated `results/*.csv` row counts, regenerated `*.summary.json`, and figure generation with:

```bash
cd figures
python3 make_figures.py
```

## Experiment 1 Reproduction

1. Prerequisites: common setup, backend in Fabric mode.
2. Setup commands: scripts call `experiments/setup-bench-data.py`.
3. Run command:

```bash
bash experiments/run-exp1-fabric-sweep.sh
bash experiments/run-PG-throughput.sh
```

4. Expected output files: `results/exp1_throughput.csv`, `results/exp1_throughput.summary.json`.
5. Validate: compare mean TPS by mode/concurrency against summary; ignore PostgreSQL conc>=150 as harness-invalid if errors are large, per `DELTAS.md`.
6. Approximate runtime: duration60s runs are 60 seconds each plus setup; full runtime not otherwise documented.

## Experiment 2 Reproduction

1. Prerequisites: common setup, backend gateway write path working.
2. Setup commands: scripts call `experiments/setup-bench-data.py`.
3. Run command:

```bash
python3 experiments/measure-v2-latency.py
MODE=db_only OPS=checkaccess python3 experiments/measure-v2-latency.py
```

4. Expected output files: `results/exp2_latency.csv`, `results/exp2_latency.summary.json`.
5. Validate: 100 measured samples per operation/mode, HTTP 200, bad=0.
6. Approximate runtime: 120 write samples at about 2 seconds each plus reads; roughly several minutes, exact runtime not documented.

## Experiment 3 Reproduction

1. Prerequisites: common setup with IPFS API reachable.
2. Setup commands: none beyond common setup.
3. Run command:

```bash
python3 experiments/measure-v3-filesize.py
```

4. Expected output files: `results/exp3_filesize.csv`, `results/exp3_filesize.summary.json`.
5. Validate: 5 Fabric commit rows and 10 IPFS rows for each size 1/5/10/20/30/50 MB.
6. Approximate runtime: not documented.

## Experiment 4 Reproduction

1. Prerequisites: common setup and sufficient audit rows.
2. Setup commands:

```bash
JWT=<token> CASE_ID=<id> bash experiments/seed-audit-events.sh 1000
```

3. Run command:

```bash
bash experiments/measure-v4-audit.sh
```

4. Expected output files: `results/exp4_audit.csv`, `results/exp4_audit.summary.json`.
5. Validate: 10 rows for `pg_query_1000` and 10 rows for `csv_sha256_chain_1000`.
6. Approximate runtime: not documented.

## Experiment 5 Reproduction

1. Prerequisites: common setup; ability to apply `tc netem` rules, likely requiring sudo.
2. Setup commands: ensure no stale netem rules are active.
3. Run command:

```bash
bash experiments/run-W-wan-sweep.sh
```

4. Expected output files: `results/exp5_wan.csv`, `results/exp5_wan.summary.json`.
5. Validate: 40 rows, 2 configs x 4 RTT values x 5 reps.
6. Approximate runtime: 8 conditions x 5 reps x 60 seconds plus setup, at least about 40 minutes.

## Experiment 6 Reproduction

1. Prerequisites: browser capable of running Web Crypto.
2. Setup commands: none documented.
3. Run command: Exact command not found in repository. Closest likely step is to open `experiments/crypto-benchmark.html`.
4. Expected output files: Not documented.
5. Validate: Not documented.
6. Approximate runtime: Not documented.

## Experiment 7 Reproduction

1. Prerequisites: common Fabric setup.
2. Setup commands: script builds its own history by registering a document and granting access.
3. Run command:

```bash
bash experiments/measure-v5-history.sh
```

4. Expected output files: `results/exp7_history.csv`, `results/exp7_history.summary.json`.
5. Validate: 10 timing rows and summary depth 107.
6. Approximate runtime: not documented.

## Experiment 8 Reproduction

1. Prerequisites: common setup, ability to rebuild Fabric channel artifacts with modified BatchTimeout.
2. Setup commands: script handles timeout rebuilds and should restore 2s.
3. Run command:

```bash
bash experiments/run-SENS-batchtimeout.sh
```

4. Expected output files: `results/exp_batchtimeout_sens.csv`, `results/exp_batchtimeout_sens.summary.json`.
5. Validate: 30 rows, 3 timeout values x 10 reps, errors_total=0, network restored to 2s.
6. Approximate runtime: 3 timeout values x 10 reps x 60 seconds plus rebuilds, at least about 30 minutes.

## Experiment 9 Reproduction

1. Prerequisites: common setup, backend up, peer containers controllable.
2. Setup commands: script calls `experiments/setup-bench-data.py`.
3. Run command:

```bash
bash experiments/run-S2-failopen.sh
```

4. Expected output files: `results/exp_failopen.csv`, `results/exp_failopen.audit.json`, `results/exp_failopen.summary.json`.
5. Validate: 150 per-second rows, zero 5xx/403/err during outage, fallback rows delta positive.
6. Approximate runtime: 150 seconds plus setup/recovery.

## Blocked S1/S3 Reproduction

1. SmartBFT requires a separate Fabric v3 network with 4 orderers, new crypto, channel participation bring-up, pinned compatible tools, and BFT configtx.
2. 6-org topology requires new crypto-config, configtx, Docker compose, endorsement/backend MSP changes, and would destroy/rebuild current 3-org state.
3. No run command exists in the repository.
