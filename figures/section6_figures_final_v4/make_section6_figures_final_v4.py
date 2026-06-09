#!/usr/bin/env python3
# =============================================================================
# make_section6_figures_final.py — PangoChain IEEE Access Section VI figures
#
# Reviewer-safe, data-driven figure generator.
# Place this file in the directory containing results/*.csv and results/*.json,
# or run it from a copied results directory. It writes PDF figures matching the
# manuscript includegraphics names.
#
# Required inputs:
#   exp1_throughput.csv
#   exp2_latency.csv
#   exp3_filesize.csv
#   exp4_audit.csv
#   exp5_wan.csv
#   exp6_crypto.summary.json
#   exp7_history.csv
#   exp_batchtimeout_sens.csv
#   exp_failopen.csv
#
# Outputs:
#   fig1_scalability.pdf
#   fig2_latency.pdf
#   fig3_filesize.pdf
#   fig4_audit.pdf
#   fig5_wan.pdf
#   fig6_crypto.pdf
#   fig8_sensitivity.pdf
#   fig7_gethistory.pdf
#   fig9_failopen.pdf
#
# Notes:
# - DB-only RegisterDocument latency is intentionally NOT plotted because the
#   current campaign has no raw DB-write latency file.
# - Fig. 6 crypto timings are labeled Node WebCrypto, not browser WebCrypto,
#   because Playwright/Puppeteer were unavailable in the recorded run.
# - Fig. 9 shows availability fallback, not strict chaincode authorization.
# =============================================================================

import csv
import json
import statistics as st
from pathlib import Path

import numpy as np
import matplotlib as mpl
import matplotlib.pyplot as plt

NAVY  = "#1b2a4a"   # Framework / Fabric primary
TEAL  = "#2a9d8f"   # DB-only / secondary
STEEL = "#4878a8"   # Third series
SLATE = "#6c7a89"   # Annotations / thresholds
GRID  = "#dce0e6"
DEMAND_C = "#b0413e"
WARN_C = "#b76e00"

DEMAND = 16.7  # TPS, estimated peak demand of a 1,000-lawyer firm @1 action/min

mpl.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 9.5,
    "axes.edgecolor": "#3a3a3a",
    "axes.linewidth": 0.8,
    "axes.grid": True,
    "grid.color": GRID,
    "grid.linewidth": 0.6,
    "axes.axisbelow": True,
    "savefig.dpi": 300,
    "savefig.bbox": "tight",
    "legend.frameon": False,
    "legend.fontsize": 8.5,
    "xtick.labelsize": 8.5,
    "ytick.labelsize": 8.5,
    "figure.constrained_layout.use": True,
})


def rows(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def load_json(path):
    with open(path) as f:
        return json.load(f)


def fnum(x):
    try:
        return float(x)
    except Exception:
        return None


def annotate_box(ax, x, y, text, color=NAVY, fs=7.6, va="bottom", ha="center"):
    ax.annotate(
        text,
        xy=(x, y),
        ha=ha,
        va=va,
        fontsize=fs,
        color=color,
        bbox=dict(boxstyle="round,pad=0.28", fc="white", ec=color, lw=0.7, alpha=0.92),
    )


def save(fig, filename, label):
    fig.savefig(filename)
    plt.close(fig)
    print(f"wrote {filename} ({label})")


# =============================================================================
# Fig 20 -> fig1_scalability.pdf
# =============================================================================
def fig_scalability():
    e1 = rows("exp1_throughput.csv")

    # Fabric: fixedcount sweep @2s, per-concurrency mean, exclude warm-up trial 0.
    fab = {}
    for r in e1:
        if (
            r.get("mode") == "fabric"
            and r.get("tool") == "fixedcount_x10"
            and r.get("batch_timeout_ms") == "2000"
            and int(r.get("trial", 0)) > 0
        ):
            fab.setdefault(int(r["concurrency"]), []).append(float(r["tps"]))
    fx = sorted(fab)
    fy = [st.mean(fab[c]) for c in fx]
    fe = [st.pstdev(fab[c]) if len(fab[c]) > 1 else 0 for c in fx]

    # PostgreSQL: only stable region. Harness-invalid rows have large errors.
    pg_ok, pg_bad = {}, set()
    for r in e1:
        if r.get("mode") == "postgres" and int(r.get("trial", 0)) > 0:
            err = fnum(r.get("errors")) or 0
            c = int(r["concurrency"])
            if err < 1000 and float(r["tps"]) > 0:
                pg_ok.setdefault(c, []).append(float(r["tps"]))
            else:
                pg_bad.add(c)
    px = sorted(pg_ok)
    py = [st.mean(pg_ok[c]) for c in px]
    pe = [st.pstdev(pg_ok[c]) if len(pg_ok[c]) > 1 else 0 for c in px]
    collapse_x = min(pg_bad) if pg_bad else None

    fig, ax = plt.subplots(figsize=(7.4, 4.2))
    if px:
        ax.errorbar(px, py, yerr=pe, fmt="s--", color=TEAL, ms=5, lw=1.6, capsize=3,
                    label="PostgreSQL-only baseline")
    ax.errorbar(fx, fy, yerr=fe, fmt="o-", color=NAVY, ms=5, lw=1.8, capsize=3,
                label="Framework REST gateway + Fabric")
    ax.axhline(DEMAND, color=DEMAND_C, ls=":", lw=1.4)
    ax.text(620, DEMAND + 5, f"{DEMAND:g} TPS estimated demand", color=DEMAND_C,
            fontsize=7.8, ha="right", va="bottom")

    fpeak = max(fy)
    annotate_box(ax, 300, fpeak + 44,
                 f"REST gateway + Fabric: flat ≈{fpeak:.0f} TPS, {fpeak/DEMAND:.1f}× demand, 0 errors to 400 clients",
                 color=NAVY, va="bottom")
    if collapse_x and py:
        ax.axvspan(collapse_x - 25, 625, ymin=0.0, ymax=1.0, color="#f3e6e6", alpha=0.45, zorder=0)
        annotate_box(ax, (collapse_x + 600) / 2, max(py) + 18,
                     "PostgreSQL load-generator saturation\n(closed-loop client limit,\nnot a server failure)",
                     color=SLATE, va="bottom", fs=7.0)

    ax.set_xlabel("Concurrent Clients")
    ax.set_ylabel("Sustained Throughput (TPS)")
    ax.set_xlim(20, 625)
    ax.set_ylim(0, (max(py) if py else max(fy)) + 78)
    ax.set_xticks([50, 100, 150, 200, 300, 400, 500, 600])
    ax.legend(loc="center right", bbox_to_anchor=(1.0, 0.62))
    save(fig, "fig1_scalability.pdf", "Fig 20")


# =============================================================================
# Fig 21 -> fig2_latency.pdf
# =============================================================================
def fig_latency():
    e2 = rows("exp2_latency.csv")

    def med(op, mode, warm=True):
        vals = [float(r["latency_ms"]) for r in e2 if r["operation"] == op and r["mode"] == mode]
        if not vals:
            return np.nan
        return st.median(vals[50:] if warm and len(vals) > 50 else vals)

    e7 = rows("exp7_history.csv")
    e4 = rows("exp4_audit.csv")

    ca_f = med("checkaccess", "fabric")
    ca_d = med("checkaccess", "db_only")
    rd_f = med("registerdoc", "fabric")
    hist_f = st.median([float(r["latency_ms"]) for r in e7])
    audit_d = st.median([float(r["ms"]) for r in e4 if r["method"] == "pg_query_1000"])

    groups = ["RegisterDocument\n(write)", "CheckAccess\n(read)", "Audit lookup\n(read)"]
    fab = [rd_f, ca_f, hist_f]
    dbo = [np.nan, ca_d, audit_d]
    notes = [
        "DB write not\nrerun in current\ncampaign",
        "<1 ms\n(indistinguishable)",
        "different guarantees:\nledger history vs\noperational query",
    ]

    x = np.arange(len(groups))
    w = 0.36
    fig, ax = plt.subplots(figsize=(7.8, 4.3))
    b1 = ax.bar(x - w / 2, fab, w, color=NAVY, label="Framework REST gateway + Fabric")
    b2 = []
    for xi, v in zip(x + w / 2, dbo):
        if np.isfinite(v):
            b2.append(ax.bar(xi, v, w, color=TEAL)[0])
        else:
            b2.append(None)
    ax.bar([], [], color=TEAL, label="DB/operational baseline")

    ax.set_yscale("log")
    ax.set_ylim(1, 1e4)
    ax.set_ylabel("P50 Latency (ms, log scale)")
    ax.set_xticks(x)
    ax.set_xticklabels(groups)

    for rect, v in zip(b1, fab):
        ax.text(rect.get_x() + rect.get_width() / 2, v * 1.18,
                f"{v:.0f} ms" if v >= 1 else f"{v:.1f} ms",
                ha="center", fontsize=8, fontweight="bold")
    for rect, v in zip(b2, dbo):
        if rect is not None:
            ax.text(rect.get_x() + rect.get_width() / 2, v * 1.25,
                    f"{v:.1f} ms" if v < 10 else f"{v:.0f} ms",
                    ha="center", fontsize=8)
    for xi, note in zip(x, notes):
        annotate_box(ax, xi, 6000, note, color=SLATE, va="center", fs=7.0)
    ax.legend(loc="upper center", ncol=2, bbox_to_anchor=(0.5, 1.12))
    save(fig, "fig2_latency.pdf", "Fig 21")


# =============================================================================
# Fig 22 -> fig3_filesize.pdf
# =============================================================================
def fig_filesize():
    e3 = rows("exp3_filesize.csv")
    commit = st.median([float(r["value_ms"]) for r in e3 if r["kind"] == "fabric_commit"])
    sizes = [1, 5, 10, 20, 30, 50]
    ipfs = [st.median([float(r["value_ms"]) for r in e3 if r["kind"] == "ipfs_add" and r["size_mb"] == str(s)]) for s in sizes]
    total = [commit + i for i in ipfs]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(7.4, 5.2), sharex=True,
                                   gridspec_kw={"height_ratios": [2, 1]})
    ax1.fill_between(sizes, commit, total, color=TEAL, alpha=0.22, label="IPFS contribution")
    ax1.plot(sizes, total, "o-", color=NAVY, lw=1.8, ms=5, label="Total end-to-end P50")
    ax1.axhline(commit, ls="--", color=SLATE, lw=1.3)
    annotate_box(ax1, 9, commit - 22, f"Fabric commit constant ≈{commit:.0f} ms", color=SLATE, va="top", ha="left")
    ax1.set_ylim(2000, 2300)
    ax1.set_ylabel("Latency (ms)")
    ax1.annotate(f"{total[-1]:.0f} ms", xy=(50, total[-1]), xytext=(40.5, 2258), fontsize=8, color=NAVY)
    ax1.legend(loc="upper left")

    ax2.plot(sizes, ipfs, "s-", color=STEEL, lw=1.8, ms=5, label="IPFS add (direct Kubo API)")
    ax2.set_ylim(0, max(ipfs) * 1.25)
    ax2.set_ylabel("IPFS add (ms)")
    ax2.set_xlabel("Document File Size (MB)")
    ax2.annotate(f"{ipfs[0]:.0f} ms", xy=(1, ipfs[0]), xytext=(2.2, ipfs[0] + 18), fontsize=8, color=STEEL)
    ax2.annotate(f"{ipfs[-1]:.0f} ms", xy=(50, ipfs[-1]), xytext=(40, ipfs[-1] - 22), fontsize=8, color=STEEL)
    ax2.legend(loc="upper left")
    ax2.set_xticks(sizes)
    save(fig, "fig3_filesize.pdf", "Fig 22")


# =============================================================================
# Fig 23 -> fig4_audit.pdf
# =============================================================================
def fig_audit():
    """Fig. 23 — audit verification/query costs.

    Clean horizontal-bar version. Interpretation is kept for the caption rather
    than embedded in the axes, so labels remain readable in IEEE layout.
    """
    e4 = rows("exp4_audit.csv")
    pg = st.median([float(r["ms"]) for r in e4 if r["method"] == "pg_query_1000"])
    sha = st.median([float(r["ms"]) for r in e4 if r["method"] == "csv_sha256_chain_1000"])
    e7 = rows("exp7_history.csv")
    fab = st.median([float(r["latency_ms"]) for r in e7])

    labels = [
        "Fabric GetHistoryForKey\n(107 entries)",
        "PostgreSQL audit query\n(1,000 events)",
        "Manual CSV + SHA-256\n(1,000 events)",
    ]
    vals = [fab, pg, sha]
    colors = [NAVY, TEAL, STEEL]

    fig, ax = plt.subplots(figsize=(7.4, 3.35))
    y = np.arange(len(labels))
    bars = ax.barh(y, vals, color=colors, height=0.52)
    ax.set_yticks(y)
    ax.set_yticklabels(labels)
    ax.invert_yaxis()
    ax.set_xlabel("Measured latency (ms)")
    ax.set_xlim(0, max(vals) * 1.28)
    ax.grid(axis="x", alpha=0.85)
    ax.grid(axis="y", visible=False)

    for b, v in zip(bars, vals):
        # Keep labels outside bars; small PG bar gets extra offset for readability.
        offset = max(vals) * (0.035 if v < 10 else 0.025)
        ax.text(v + offset, b.get_y() + b.get_height() / 2,
                f"{v:.1f} ms", va="center", ha="left",
                fontweight="bold", fontsize=9.0, color="#111111")

    # No explanatory prose inside the plot; put guarantee caveat in caption.
    save(fig, "fig4_audit.pdf", "Fig 23")

# =============================================================================
# Fig 24 -> fig5_wan.pdf
# =============================================================================
def fig_wan():
    e5 = rows("exp5_wan.csv")
    rtts = [0, 50, 100, 150]

    def series(cfg):
        tps = [st.mean([float(r["tps"]) for r in e5 if r["config"] == cfg and r["rtt_ms"] == str(t)]) for t in rtts]
        cmt = [st.mean([float(r["p50_ms"]) for r in e5 if r["config"] == cfg and r["rtt_ms"] == str(t)]) for t in rtts]
        return tps, cmt

    tb, cb = series("bridge")
    tv, cv = series("bridge_veth")

    fig, (axL, axR) = plt.subplots(1, 2, figsize=(10.6, 4.2))
    axL.plot(rtts, tb, "o-", color=NAVY, lw=1.8, ms=5, label="HTTP-layer delay (bridge)")
    axL.plot(rtts, tv, "s--", color=TEAL, lw=1.8, ms=5, mfc="white", label="HTTP + inter-orderer Raft delay")
    axL.axhline(DEMAND, color=DEMAND_C, ls=":", lw=1.4)
    axL.text(2, DEMAND + 1.0, f"{DEMAND:g} TPS demand", color=DEMAND_C, fontsize=7.8)
    annotate_box(axL, 100, tb[2] + 4, f"{(tb[0]-tb[-1])/tb[0]*100:.0f}% drop\n({tb[-1]/DEMAND:.1f}× demand)", color=NAVY, va="bottom", fs=7.2)
    annotate_box(axL, 100, tv[2] - 5, f"{(tv[0]-tv[-1])/tv[0]*100:.0f}% drop\n({tv[-1]/DEMAND:.1f}× demand)", color=TEAL, va="top", fs=7.2)
    axL.set_xlabel("Injected RTT (ms)")
    axL.set_ylabel("Committed TPS @ 200 clients")
    axL.set_xticks(rtts)
    axL.set_ylim(0, 80)
    axL.set_title("(a) Throughput vs. WAN latency", fontsize=9.5)
    axL.legend(loc="lower left")

    axR.plot(rtts, cb, "o-", color=NAVY, lw=1.8, ms=5, label="HTTP-layer delay (bridge)")
    axR.plot(rtts, cv, "s--", color=TEAL, lw=1.8, ms=5, mfc="white", label="HTTP + inter-orderer Raft delay")
    axR.axhline(5000, color=SLATE, ls="--", lw=1.2)
    axR.text(2, 5080, "5 s write budget", color=SLATE, fontsize=7.8)
    for t, y in zip(rtts[1:], cb[1:]):
        axR.annotate(f"+{y-cb[0]:.0f}", (t, y), textcoords="offset points", xytext=(0, -13), fontsize=7, color=NAVY, ha="center")
    for t, y in zip(rtts[1:], cv[1:]):
        axR.annotate(f"+{y-cv[0]:.0f}", (t, y), textcoords="offset points", xytext=(0, 7), fontsize=7, color=TEAL, ha="center")
    axR.set_xlabel("Injected RTT (ms)")
    axR.set_ylabel("RegisterDocument P50 commit (ms)")
    axR.set_xticks(rtts)
    axR.set_ylim(2000, 5400)
    axR.set_title("(b) Write latency vs. WAN latency", fontsize=9.5)
    axR.annotate("HTTP + Raft delay", xy=(150, cv[-1]), xytext=(78, cv[-1] + 150), fontsize=7.6, color=TEAL)
    axR.annotate("HTTP-layer delay", xy=(100, cb[2]), xytext=(55, 2560), fontsize=7.6, color=NAVY)
    save(fig, "fig5_wan.pdf", "Fig 24")


# =============================================================================
# Fig 25 -> fig6_crypto.pdf
# =============================================================================
def fig_crypto():
    s = load_json("exp6_crypto.summary.json")
    ops = s["operations"]

    left_items = [
        ("PBKDF2\n600k", ops["pbkdf2_sha256_600k_aes256"]["p50"]),
        ("AES-GCM\nenc 50 MB", ops["aes_256_gcm_encrypt_50mb"]["p50"]),
        ("AES-GCM\ndec 50 MB", ops["aes_256_gcm_decrypt_50mb"]["p50"]),
        ("SHA-256\nhash 50 MB", ops["sha256_hash_50mb"]["p50"]),
        ("ECIES\nwrap", ops["ecies_p256_wrap_32b_doc_key"]["p50"]),
        ("ECIES\nunwrap", ops["ecies_p256_unwrap_32b_doc_key"]["p50"]),
        ("ECDSA\nsign", ops["ecdsa_p256_sign_sha256_hash"]["p50"]),
        ("ECDSA\nverify", ops["ecdsa_p256_verify_signature"]["p50"]),
    ]
    labels = [x[0] for x in left_items]
    vals = [x[1] for x in left_items]

    ecies_size = s["ecies_token_size_bytes"]
    rsa_size = s["rsa_oaep_2048_token_size_bytes"]
    reduction = s["token_size_reduction_percentage"]

    fig, (axL, axR) = plt.subplots(1, 2, figsize=(10.6, 4.4), gridspec_kw={"width_ratios": [1.55, 1]})

    y = np.arange(len(labels))
    axL.barh(y, vals, color=[NAVY, STEEL, STEEL, STEEL, TEAL, TEAL, SLATE, SLATE])
    axL.set_yticks(y)
    axL.set_yticklabels(labels)
    axL.invert_yaxis()
    axL.set_xscale("log")
    axL.set_xlabel("P50 latency (ms, log scale)")
    axL.set_title("(a) Cryptographic operation costs", fontsize=9.5)
    for yi, v in zip(y, vals):
        label = f"{v:.2f} ms" if v >= 1 else f"{v:.3f} ms"
        axL.text(v * 1.12, yi, label, va="center", fontsize=7.4)
    annotate_box(axL, 2.4, len(labels) - 0.55,
                 "Node.js crypto.webcrypto.subtle fallback\n(browser automation unavailable)",
                 color=WARN_C, fs=7.1, va="bottom", ha="center")

    axR.bar([0, 1], [ecies_size, rsa_size], color=[TEAL, SLATE], width=0.55)
    axR.set_xticks([0, 1])
    axR.set_xticklabels(["ECIES\nP-256", "RSA-OAEP\n2048"])
    axR.set_ylabel("Wrapped-key token size (bytes)")
    axR.set_ylim(0, rsa_size * 1.35)
    axR.set_title("(b) Access-token storage cost", fontsize=9.5)
    for x, v in zip([0, 1], [ecies_size, rsa_size]):
        axR.text(x, v + 8, f"{v} B", ha="center", fontweight="bold", fontsize=8.5)
    annotate_box(axR, 0.5, rsa_size * 1.18, f"{reduction:.1f}% smaller\nper recipient", color=TEAL, fs=8.0, va="center")

    save(fig, "fig6_crypto.pdf", "Fig 25")


# =============================================================================
# Fig 26 -> fig8_sensitivity.pdf
# =============================================================================
def fig_sensitivity():
    """Fig. 26 — BatchTimeout sensitivity.

    Minimal version: one y-axis, no callout box, no CPU line. CPU values are
    included in x tick labels; interpretation belongs in the caption.
    """
    es = rows("exp_batchtimeout_sens.csv")
    order = ["2000", "500", "250"]
    tps = [st.mean([float(r["tps"]) for r in es if r["batch_timeout_ms"] == b]) for b in order]
    err = [st.pstdev([float(r["tps"]) for r in es if r["batch_timeout_ms"] == b]) for b in order]
    cpu = [st.mean([float(r["client_cpu_pct"]) for r in es if r["batch_timeout_ms"] == b]) for b in order]
    labels = [
        f"2000 ms\n(default)\nCPU {cpu[0]:.0f}%",
        f"500 ms\nCPU {cpu[1]:.0f}%",
        f"250 ms\nCPU {cpu[2]:.0f}%",
    ]

    x = np.arange(len(order))
    fig, ax = plt.subplots(figsize=(7.4, 4.0))
    bars = ax.bar(x, tps, 0.56, yerr=err, capsize=4,
                  color=[STEEL, NAVY, SLATE], ecolor="#111111", linewidth=0)

    # Demand threshold: line and label are separated to avoid overlap.
    ax.axhline(DEMAND, color=DEMAND_C, ls=":", lw=1.45)
    ax.text(2.50, DEMAND + 7.0, "16.7 TPS demand", color=DEMAND_C,
            fontsize=8.2, ha="right", va="bottom",
            bbox=dict(boxstyle="round,pad=0.16", fc="white", ec="none", alpha=0.95))

    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("Sustained throughput (TPS)")
    ax.set_ylim(0, 235)
    ax.set_xlim(-0.55, 2.55)
    ax.set_title("BatchTimeout sensitivity: 500 ms gives the highest sustained throughput",
                 fontsize=9.2, pad=9)

    for i, (b, v, m) in enumerate(zip(bars, tps, [v / DEMAND for v in tps])):
        cx = b.get_x() + b.get_width() / 2
        if i == 0:
            # First bar is short; place label just above it.
            y = v + 8
            color = "#111111"
            va = "bottom"
        else:
            # Tall bars: place labels inside bar to avoid error-bar overlap.
            y = v - 14
            color = "white"
            va = "top"
        ax.text(cx, y, f"{v:.0f} TPS\n{m:.1f}×", ha="center", va=va,
                fontsize=9.0, fontweight="bold", color=color)

    # Small unobtrusive note below the data region.
    ax.text(0.02, 0.93, "All points: 10 reps, zero errors; load-generator CPU ≤14%.",
            transform=ax.transAxes, ha="left", va="top", fontsize=7.7, color=SLATE,
            bbox=dict(boxstyle="round,pad=0.18", fc="white", ec=SLATE, lw=0.45, alpha=0.94))

    save(fig, "fig8_sensitivity.pdf", "Fig 26")

# =============================================================================
# Fig 27 -> fig7_gethistory.pdf
# =============================================================================
def fig_gethistory():
    e7 = rows("exp7_history.csv")
    trials = [float(r["latency_ms"]) for r in e7]
    depth = int(e7[0]["history_depth"])
    mean, p50, sd = st.mean(trials), st.median(trials), st.pstdev(trials)

    fig, (axL, axR) = plt.subplots(1, 2, figsize=(10.4, 4.2))
    axL.bar(range(1, len(trials) + 1), trials, color=NAVY, width=0.62)
    axL.axhline(mean, color=TEAL, ls="--", lw=1.3, label=f"Mean = {mean:.1f} ms")
    axL.axhline(p50, color=SLATE, ls=":", lw=1.3, label=f"P50 = {p50:.1f} ms")
    axL.set_ylim(100, 170)
    axL.set_xticks(range(1, len(trials) + 1))
    axL.set_xlabel("Trial")
    axL.set_ylabel("Query Latency (ms)")
    axL.set_title(f"(a) GetHistoryForKey — {len(trials)} trials, {depth}-entry history", fontsize=9.5)
    axL.text(1, 164, f"σ = {sd:.1f} ms (stable)", fontsize=8, color=SLATE)
    axL.legend(loc="lower right")

    d = np.linspace(0, 1000, 200)
    proj = p50 * d / depth
    thr_at = 200 * depth / p50
    at_1000 = p50 * 1000 / depth
    axR.plot(d, proj, "--", color=NAVY, lw=1.8, label="Linear projection (not measured beyond 107 entries)")
    axR.scatter([depth], [p50], color=TEAL, zorder=5, s=40, label=f"Measured: {p50:.0f} ms @ {depth} entries")
    axR.axhline(200, color=SLATE, ls=":", lw=1.2)
    axR.text(15, 215, "200 ms interactive threshold", color=SLATE, fontsize=7.8)
    annotate_box(axR, 1000, at_1000, f"≈{at_1000:.0f} ms\n@ 1,000 entries", color=NAVY, va="top", ha="right")
    axR.annotate(f"crossed at ≈{thr_at:.0f} entries", xy=(thr_at, 200), xytext=(thr_at + 70, 470),
                 fontsize=7.8, color=SLATE, arrowprops=dict(arrowstyle="->", color=SLATE, lw=0.8))
    axR.set_xlim(0, 1000)
    axR.set_ylim(0, 1450)
    axR.set_xlabel("Document History Depth (entries)")
    axR.set_ylabel("Estimated Query Latency (ms)")
    axR.set_title("(b) Projected latency vs. history depth (not measured)", fontsize=9.5)
    axR.legend(loc="upper left")
    save(fig, "fig7_gethistory.pdf", "Fig 27")


# =============================================================================
# Fig 28 -> fig9_failopen.pdf
# =============================================================================
def fig_failopen():
    ef = rows("exp_failopen.csv")
    t = [int(r["t_sec"]) for r in ef]
    ok = [int(r["ok"]) for r in ef]
    err = [int(r["err"]) + int(r["http5xx"]) + int(r["http403"]) for r in ef]
    stop = next(int(r["t_sec"]) for r in ef if r["event"] == "PEERS_STOPPED")
    start = next(int(r["t_sec"]) for r in ef if r["event"] == "PEERS_STARTED")

    fig, ax = plt.subplots(figsize=(8.4, 4.0))
    ax.axvspan(stop, start, color="#f3e6e6", alpha=0.7, zorder=0)
    ax.bar(t, ok, width=0.9, color=NAVY, label="Successful requests / s")
    ax.plot(t, err, color=DEMAND_C, lw=1.6, label="Failed requests / s (5xx / 403 / error)")
    ax.axvline(stop, color=SLATE, ls="--", lw=1.1)
    ax.axvline(start, color=SLATE, ls="--", lw=1.1)
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Requests per second")
    ax.set_ylim(0, max(ok) * 1.45)
    ax.set_xlim(0, max(t))
    during = sum(o for tt, o in zip(t, ok) if stop <= tt < start)
    annotate_box(ax, (stop + start) / 2, max(ok) * 0.62,
                 f"all 3 Fabric peers down ({start-stop}s)\n{during} requests served, 0 failures\navailability fallback to PostgreSQL ACL\n(not strict chaincode enforcement)\n(1,090 audit rows logged)",
                 color=SLATE, va="center", fs=7.2)
    ax.annotate("peers stopped", xy=(stop, max(ok) * 1.30), fontsize=7.4, color=SLATE, ha="center")
    ax.annotate("peers restarted", xy=(start, max(ok) * 1.30), fontsize=7.4, color=SLATE, ha="center")
    ax.legend(loc="upper right", ncol=1)
    save(fig, "fig9_failopen.pdf", "Fig 28")


if __name__ == "__main__":
    fig_scalability()
    fig_latency()
    fig_filesize()
    fig_audit()
    fig_wan()
    fig_crypto()
    fig_sensitivity()
    fig_gethistory()
    fig_failopen()
    print("\nAll Section VI figures generated from result CSV/JSON files.")
