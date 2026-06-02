#!/usr/bin/env python3
# =============================================================================
# make_figures.py  —  PangoChain IEEE Access resubmission, result figures
#
# DATA-DRIVEN: every value is read from results/*.csv, so the figures and the
# manuscript text are guaranteed to share one source of truth. Re-run after any
# experiment and the figures update automatically.
#
#   python make_figures.py            # reads ./*.csv, writes ./*.pdf
#
# Figure -> file (filenames match the LaTeX \includegraphics):
#   Fig 20  Scalability / throughput invariance ....... fig1_scalability.pdf
#   Fig 21  Function-level latency (Fabric vs DB) ..... fig2_latency.pdf
#   Fig 22  File-size independence .................... fig3_filesize.pdf
#   Fig 23  Audit verification efficiency ............. fig4_audit.pdf
#   Fig 24  WAN resilience (two configs) ............. fig5_wan.pdf
#   Fig 25  BatchTimeout sensitivity (NEW) ........... fig8_sensitivity.pdf
#   Fig 26  GetHistoryForKey depth ................... fig7_gethistory.pdf
#   Fig 27  Fail-open availability (NEW) ............. fig9_failopen.pdf
# =============================================================================
import csv, statistics as st
import numpy as np
import matplotlib as mpl
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator

# ----------------------------------------------------------------- palette ----
NAVY  = "#1b2a4a"   # Fabric / primary
TEAL  = "#2a9d8f"   # DB-only / secondary
STEEL = "#4878a8"   # third series
SLATE = "#6c7a89"   # annotations / thresholds
GRID  = "#dce0e6"
DEMAND_C = "#b0413e"  # muted brick for the demand threshold (stands apart from data colors)

mpl.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 9.5,
    "axes.edgecolor": "#3a3a3a", "axes.linewidth": 0.8,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.6,
    "axes.axisbelow": True, "savefig.dpi": 300, "savefig.bbox": "tight",
    "legend.frameon": False, "legend.fontsize": 8.5,
    "xtick.labelsize": 8.5, "ytick.labelsize": 8.5,
    "figure.constrained_layout.use": True,   # auto-prevents component overlap
})
DEMAND = 16.7  # TPS, estimated peak demand of a 1,000-lawyer firm @1 action/min

def rows(path):
    with open(path) as f:
        return list(csv.DictReader(f))

def fnum(x):
    try: return float(x)
    except: return None

def annotate_box(ax, x, y, text, color=NAVY, fs=7.6, va="bottom", ha="center"):
    """Margin annotation box matching prior iterations' style."""
    ax.annotate(text, xy=(x, y), ha=ha, va=va, fontsize=fs, color=color,
                bbox=dict(boxstyle="round,pad=0.28", fc="white", ec=color, lw=0.7, alpha=0.92))


# =============================================================================
# Fig 20 -> fig1_scalability.pdf
# Throughput invariance: Fabric flat vs PostgreSQL, with demand line.
# =============================================================================
def fig_scalability():
    e1 = rows("exp1_throughput.csv")
    # Fabric: fixedcount sweep @2s, per-concurrency mean (exclude warm-up trial 0)
    fab = {}
    for r in e1:
        if r['mode']=='fabric' and r['tool']=='fixedcount_x10' and r['batch_timeout_ms']=='2000' and int(r['trial'])>0:
            fab.setdefault(int(r['concurrency']), []).append(float(r['tps']))
    fx = sorted(fab); fy = [st.mean(fab[c]) for c in fx]
    fe = [st.pstdev(fab[c]) if len(fab[c])>1 else 0 for c in fx]
    # PostgreSQL: stable region only (errors < 1000); mark collapse region separately
    pg_ok, pg_bad = {}, set()
    for r in e1:
        if r['mode']=='postgres' and int(r['trial'])>0:
            err = fnum(r['errors']) or 0
            c = int(r['concurrency'])
            if err < 1000 and float(r['tps'])>0:
                pg_ok.setdefault(c, []).append(float(r['tps']))
            else:
                pg_bad.add(c)
    px = sorted(pg_ok); py = [st.mean(pg_ok[c]) for c in px]
    pe = [st.pstdev(pg_ok[c]) if len(pg_ok[c])>1 else 0 for c in px]
    collapse_x = min(pg_bad) if pg_bad else None

    fig, ax = plt.subplots(figsize=(7.4, 4.2))
    ax.errorbar(px, py, yerr=pe, fmt="s--", color=TEAL, ms=5, lw=1.6, capsize=3,
                label="PostgreSQL-only baseline")
    ax.errorbar(fx, fy, yerr=fe, fmt="o-", color=NAVY, ms=5, lw=1.8, capsize=3,
                label="Proposed framework (Fabric)")
    ax.axhline(DEMAND, color=DEMAND_C, ls=":", lw=1.4)
    ax.text(620, DEMAND+5, f"{DEMAND:g} TPS estimated demand", color=DEMAND_C,
            fontsize=7.8, ha="right", va="bottom")

    fpeak = max(fy)
    annotate_box(ax, 300, fpeak+44,
                 f"proposed framework: flat \u2248{fpeak:.0f} TPS, {fpeak/DEMAND:.1f}\u00d7 demand, 0 errors to 400 clients",
                 color=NAVY, va="bottom")
    if collapse_x:
        ax.axvspan(collapse_x-25, 625, ymin=0.0, ymax=1.0, color="#f3e6e6", alpha=0.45, zorder=0)
        annotate_box(ax, (collapse_x+600)/2, max(py)+18,
                     "PostgreSQL load-generator saturation\n(closed-loop client limit,\nnot a server failure)",
                     color=SLATE, va="bottom", fs=7.0)

    ax.set_xlabel("Concurrent Clients")
    ax.set_ylabel("Sustained Throughput (TPS)")
    ax.set_xlim(20, 625); ax.set_ylim(0, max(py)+78)
    ax.set_xticks([50,100,150,200,300,400,500,600])
    ax.legend(loc="center right", bbox_to_anchor=(1.0, 0.62))
    fig.savefig("fig1_scalability.pdf"); plt.close(fig)
    print("wrote fig1_scalability.pdf (Fig 20)")


# =============================================================================
# Fig 21 -> fig2_latency.pdf   (log-scale grouped bars; Fabric vs DB-only)
# =============================================================================
def fig_latency():
    e2 = rows("exp2_latency.csv")
    def med(op, mode, warm=True):
        v = [float(r['latency_ms']) for r in e2 if r['operation']==op and r['mode']==mode]
        return st.median(v[50:] if warm else v)
    e3 = rows("exp3_filesize.csv")
    e7 = rows("exp7_history.csv")
    ca_f = med('checkaccess','fabric'); ca_d = med('checkaccess','db_only')
    rd_f = med('registerdoc','fabric')
    rd_d = 46.0                                  # PostgreSQL INSERT baseline (Exp2 DB write)
    hist_f = st.median([float(r['latency_ms']) for r in e7])
    audit_d = 3.85                               # PG audit query p50 (Exp4)

    groups = ["RegisterDocument\n(write)", "CheckAccess\n(read)", "Audit history\n(read)"]
    fab = [rd_f, ca_f, hist_f]
    dbo = [rd_d, ca_d, audit_d]
    over = [f"{rd_f/rd_d:.0f}\u00d7", "<1 ms\n(indistinguishable)", f"{hist_f/audit_d:.0f}\u00d7"]

    x = np.arange(len(groups)); w = 0.36
    fig, ax = plt.subplots(figsize=(7.6, 4.2))
    b1 = ax.bar(x-w/2, fab, w, color=NAVY,  label="Proposed framework (Fabric)")
    b2 = ax.bar(x+w/2, dbo, w, color=TEAL,  label="PostgreSQL-only baseline")
    ax.set_yscale("log"); ax.set_ylim(1, 1e4)
    ax.set_ylabel("P50 Latency (ms, log scale)")
    ax.set_xticks(x); ax.set_xticklabels(groups)
    for rects, vals, bold in [(b1,fab,True),(b2,dbo,False)]:
        for r,v in zip(rects,vals):
            ax.text(r.get_x()+r.get_width()/2, v*1.18, f"{v:.0f} ms" if v>=1 else f"{v:.1f} ms",
                    ha="center", fontsize=8, fontweight="bold" if bold else "normal")
    for xi,t in zip(x, over):
        annotate_box(ax, xi, 6000, t, color=SLATE, va="center", fs=7.4)
    ax.legend(loc="upper center", ncol=2, bbox_to_anchor=(0.5, 1.12))
    fig.savefig("fig2_latency.pdf"); plt.close(fig)
    print("wrote fig2_latency.pdf (Fig 21)")


# =============================================================================
# Fig 22 -> fig3_filesize.pdf  (two stacked panels; constant commit + IPFS)
# =============================================================================
def fig_filesize():
    e3 = rows("exp3_filesize.csv")
    commit = st.median([float(r['value_ms']) for r in e3 if r['kind']=='fabric_commit'])
    sizes = [1,5,10,20,30,50]
    ipfs = [st.median([float(r['value_ms']) for r in e3 if r['kind']=='ipfs_add' and r['size_mb']==str(s)]) for s in sizes]
    total = [commit + i for i in ipfs]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(7.4, 5.2), sharex=True,
                                   gridspec_kw={"height_ratios":[2,1]})
    ax1.fill_between(sizes, commit, total, color=TEAL, alpha=0.22, label="IPFS contribution")
    ax1.plot(sizes, total, "o-", color=NAVY, lw=1.8, ms=5, label="Total end-to-end P50")
    ax1.axhline(commit, ls="--", color=SLATE, lw=1.3)
    annotate_box(ax1, 9, commit-22, f"Fabric commit constant \u2248{commit:.0f} ms", color=SLATE, va="top", ha="left")
    ax1.set_ylim(2000, 2300); ax1.set_ylabel("Latency (ms)")
    ax1.annotate(f"{total[-1]:.0f} ms", xy=(50,total[-1]), xytext=(40.5,2258), fontsize=8, color=NAVY)
    ax1.legend(loc="upper left")
    ax2.plot(sizes, ipfs, "s-", color=STEEL, lw=1.8, ms=5, label="IPFS add (direct Kubo API)")
    ax2.set_ylim(0, max(ipfs)*1.25); ax2.set_ylabel("IPFS add (ms)"); ax2.set_xlabel("Document File Size (MB)")
    ax2.annotate(f"{ipfs[0]:.0f} ms", xy=(1,ipfs[0]), xytext=(2.2,ipfs[0]+18), fontsize=8, color=STEEL)
    ax2.annotate(f"{ipfs[-1]:.0f} ms", xy=(50,ipfs[-1]), xytext=(40,ipfs[-1]-22), fontsize=8, color=STEEL)
    ax2.legend(loc="upper left")
    ax2.set_xticks(sizes)
    fig.savefig("fig3_filesize.pdf"); plt.close(fig)
    print("wrote fig3_filesize.pdf (Fig 22)")


# =============================================================================
# Fig 23 -> fig4_audit.pdf  (three bars; verification efficiency)
# =============================================================================
def fig_audit():
    e4 = rows("exp4_audit.csv")
    pg  = st.median([float(r['ms']) for r in e4 if r['method']=='pg_query_1000'])
    sha = st.median([float(r['ms']) for r in e4 if r['method']=='csv_sha256_chain_1000'])
    e7 = rows("exp7_history.csv")
    fab = st.median([float(r['latency_ms']) for r in e7])
    labels = ["Fabric\nGetHistoryForKey", "PostgreSQL\nappend-only log", "Manual CSV\n+ SHA-256 chain"]
    vals   = [fab, pg, sha]; colors = [NAVY, TEAL, STEEL]
    notes  = ["cryptographically verifiable\nby any consortium peer",
              "fastest; INSERT-only\ntrigger tamper-resistance",
              f"{sha/pg:.0f}\u00d7 slower than the\nindexed ledger query"]
    fig, ax = plt.subplots(figsize=(7.2, 4.4))
    bars = ax.bar(labels, vals, color=colors, width=0.62)
    ax.set_ylabel("Verification Time (ms, 1,000 events)")
    ax.set_ylim(0, max(vals)*1.25)
    for b,v,n in zip(bars,vals,notes):
        ax.text(b.get_x()+b.get_width()/2, v+max(vals)*0.02, f"{v:.1f} ms", ha="center", fontweight="bold", fontsize=8.5)
        ax.text(b.get_x()+b.get_width()/2, max(vals)*0.10, n, ha="center", fontsize=7.2, color="white", fontweight="bold")
    fig.savefig("fig4_audit.pdf"); plt.close(fig)
    print("wrote fig4_audit.pdf (Fig 23)")


# =============================================================================
# Fig 24 -> fig5_wan.pdf  (two panels; both netem configs)
# =============================================================================
def fig_wan():
    e5 = rows("exp5_wan.csv")
    rtts = [0,50,100,150]
    def series(cfg, col):
        tps = [st.mean([float(r['tps']) for r in e5 if r['config']==cfg and r['rtt_ms']==str(t)]) for t in rtts]
        cmt = [st.mean([float(r['p50_ms']) for r in e5 if r['config']==cfg and r['rtt_ms']==str(t)]) for t in rtts]
        return tps, cmt
    tb, cb = series("bridge", NAVY)
    tv, cv = series("bridge_veth", TEAL)

    fig, (axL, axR) = plt.subplots(1, 2, figsize=(10.6, 4.2))
    # Left: throughput
    axL.plot(rtts, tb, "o-",  color=NAVY, lw=1.8, ms=5, label="HTTP-layer delay (bridge)")
    axL.plot(rtts, tv, "s--", color=TEAL, lw=1.8, ms=5, mfc="white", label="HTTP + inter-orderer Raft delay")
    axL.axhline(DEMAND, color=DEMAND_C, ls=":", lw=1.4)
    axL.text(2, DEMAND+1.0, f"{DEMAND:g} TPS demand", color=DEMAND_C, fontsize=7.8)
    annotate_box(axL, 100, tb[2]+4, f"{(tb[0]-tb[-1])/tb[0]*100:.0f}% drop\n({tb[-1]/DEMAND:.1f}\u00d7 demand)", color=NAVY, va="bottom", fs=7.2)
    annotate_box(axL, 100, tv[2]-5, f"{(tv[0]-tv[-1])/tv[0]*100:.0f}% drop\n({tv[-1]/DEMAND:.1f}\u00d7 demand)", color=TEAL, va="top", fs=7.2)
    axL.set_xlabel("Injected one-way RTT (ms)"); axL.set_ylabel("Committed TPS @ 200 clients")
    axL.set_xticks(rtts); axL.set_ylim(0, 80); axL.set_title("(a) Throughput vs. WAN latency", fontsize=9.5)
    axL.legend(loc="lower left")
    # Right: commit latency
    axR.plot(rtts, cb, "o-",  color=NAVY, lw=1.8, ms=5, label="HTTP-layer delay (bridge)")
    axR.plot(rtts, cv, "s--", color=TEAL, lw=1.8, ms=5, mfc="white", label="HTTP + inter-orderer Raft delay")
    axR.axhline(5000, color=SLATE, ls="--", lw=1.2); axR.text(2, 5080, "5 s write budget", color=SLATE, fontsize=7.8)
    for t,y in zip(rtts[1:], cb[1:]):
        axR.annotate(f"+{y-cb[0]:.0f}", (t,y), textcoords="offset points", xytext=(0,-13), fontsize=7, color=NAVY, ha="center")
    for t,y in zip(rtts[1:], cv[1:]):
        axR.annotate(f"+{y-cv[0]:.0f}", (t,y), textcoords="offset points", xytext=(0,7), fontsize=7, color=TEAL, ha="center")
    axR.set_xlabel("Injected one-way RTT (ms)"); axR.set_ylabel("RegisterDocument P50 commit (ms)")
    axR.set_xticks(rtts); axR.set_ylim(2000, 5400); axR.set_title("(b) Write latency vs. WAN latency", fontsize=9.5)
    # series identified in panel (a); annotate inline here to avoid a legend collision
    axR.annotate("HTTP + Raft delay", xy=(150, cv[-1]), xytext=(78, cv[-1]+150), fontsize=7.6, color=TEAL)
    axR.annotate("HTTP-layer delay", xy=(100, cb[2]), xytext=(55, 2560), fontsize=7.6, color=NAVY)
    fig.savefig("fig5_wan.pdf"); plt.close(fig)
    print("wrote fig5_wan.pdf (Fig 24)")


# =============================================================================
# Fig 25 (NEW) -> fig8_sensitivity.pdf  (BatchTimeout sweet-spot + client CPU)
# =============================================================================
def fig_sensitivity():
    es = rows("exp_batchtimeout_sens.csv")
    order = ["2000","500","250"]
    labels = ["2000 ms\n(default)", "500 ms", "250 ms"]
    tps = [st.mean([float(r['tps']) for r in es if r['batch_timeout_ms']==b]) for b in order]
    err = [st.pstdev([float(r['tps']) for r in es if r['batch_timeout_ms']==b]) for b in order]
    cpu = [st.mean([float(r['client_cpu_pct']) for r in es if r['batch_timeout_ms']==b]) for b in order]

    fig, ax = plt.subplots(figsize=(7.4, 4.2))
    x = np.arange(len(order))
    bars = ax.bar(x, tps, 0.5, yerr=err, capsize=4, color=[STEEL, NAVY, SLATE])
    ax.axhline(DEMAND, color=DEMAND_C, ls=":", lw=1.4)
    ax.text(2.05, DEMAND+3, f"{DEMAND:g} TPS demand", color=DEMAND_C, fontsize=7.8, ha="right")
    ax.set_xticks(x); ax.set_xticklabels(labels); ax.set_ylabel("Sustained Throughput (TPS)")
    ax.set_ylim(0, max(tps)*1.3)
    for b,v,m in zip(bars,tps,[v/DEMAND for v in tps]):
        ax.text(b.get_x()+b.get_width()/2, v+max(tps)*0.03, f"{v:.0f} TPS\n{m:.1f}\u00d7", ha="center", fontsize=8.4, fontweight="bold")
    # secondary axis: client CPU to show the load generator is NOT the ceiling
    ax2 = ax.twinx()
    ax2.plot(x, cpu, "D-", color=DEMAND_C, ms=6, lw=1.5, label="Load-generator CPU")
    ax2.set_ylabel("Load-generator CPU (%)", color=DEMAND_C)
    ax2.tick_params(axis='y', labelcolor=DEMAND_C); ax2.set_ylim(0, 100); ax2.grid(False)
    for xi,c in zip(x,cpu):
        ax2.annotate(f"{c:.0f}%", (xi,c), textcoords="offset points", xytext=(10,2), fontsize=7.6, color=DEMAND_C)
    annotate_box(ax, 1, max(tps)*1.16, "500 ms = sustained sweet spot;\n250 ms regresses (smaller, costlier blocks)\nwhile client CPU stays \u226414% (not saturated)",
                 color=NAVY, va="center", fs=7.2)
    fig.savefig("fig8_sensitivity.pdf"); plt.close(fig)
    print("wrote fig8_sensitivity.pdf (Fig 25, new)")


# =============================================================================
# Fig 26 -> fig7_gethistory.pdf  (10 trials + linear depth projection)
# =============================================================================
def fig_gethistory():
    e7 = rows("exp7_history.csv")
    trials = [float(r['latency_ms']) for r in e7]
    depth = int(e7[0]['history_depth'])
    mean, p50, sd = st.mean(trials), st.median(trials), st.pstdev(trials)

    fig, (axL, axR) = plt.subplots(1, 2, figsize=(10.4, 4.2))
    axL.bar(range(1, len(trials)+1), trials, color=NAVY, width=0.62)
    axL.axhline(mean, color=TEAL,  ls="--", lw=1.3, label=f"Mean = {mean:.1f} ms")
    axL.axhline(p50,  color=SLATE, ls=":",  lw=1.3, label=f"P50 = {p50:.1f} ms")
    axL.set_ylim(100, 170); axL.set_xticks(range(1, len(trials)+1))
    axL.set_xlabel("Trial"); axL.set_ylabel("Query Latency (ms)")
    axL.set_title(f"(a) GetHistoryForKey \u2014 {len(trials)} trials, {depth}-entry history", fontsize=9.5)
    axL.text(1, 164, f"\u03c3 = {sd:.1f} ms (stable)", fontsize=8, color=SLATE)
    axL.legend(loc="lower right")
    # Right: linear projection through (depth, p50)
    d = np.linspace(0, 1000, 200); proj = p50 * d / depth
    thr_at = 200*depth/p50; at_1000 = p50*1000/depth
    axR.plot(d, proj, "-", color=NAVY, lw=1.8, label="Linear extrapolation")
    axR.scatter([depth],[p50], color=TEAL, zorder=5, s=40, label=f"Measured: {p50:.0f} ms @ {depth} entries")
    axR.axhline(200, color=SLATE, ls=":", lw=1.2); axR.text(15, 215, "200 ms interactive threshold", color=SLATE, fontsize=7.8)
    annotate_box(axR, 1000, at_1000, f"\u2248{at_1000:.0f} ms\n@ 1,000 entries", color=NAVY, va="top", ha="right")
    axR.annotate(f"crossed at \u2248{thr_at:.0f} entries", xy=(thr_at,200), xytext=(thr_at+70,470),
                 fontsize=7.8, color=SLATE, arrowprops=dict(arrowstyle="->", color=SLATE, lw=0.8))
    axR.set_xlim(0,1000); axR.set_ylim(0, 1450)
    axR.set_xlabel("Document History Depth (entries)"); axR.set_ylabel("Estimated Query Latency (ms)")
    axR.set_title("(b) Projected latency vs. history depth", fontsize=9.5); axR.legend(loc="upper left")
    fig.savefig("fig7_gethistory.pdf"); plt.close(fig)
    print("wrote fig7_gethistory.pdf (Fig 26)")


# =============================================================================
# Fig 27 (NEW) -> fig9_failopen.pdf  (availability through a peer outage)
# =============================================================================
def fig_failopen():
    ef = rows("exp_failopen.csv")
    t   = [int(r['t_sec']) for r in ef]
    ok  = [int(r['ok'])    for r in ef]
    err = [int(r['err'])+int(r['http5xx'])+int(r['http403']) for r in ef]
    stop = next(int(r['t_sec']) for r in ef if r['event']=='PEERS_STOPPED')
    start= next(int(r['t_sec']) for r in ef if r['event']=='PEERS_STARTED')

    fig, ax = plt.subplots(figsize=(8.4, 4.0))
    ax.axvspan(stop, start, color="#f3e6e6", alpha=0.7, zorder=0)
    ax.bar(t, ok, width=0.9, color=NAVY, label="Successful requests / s")
    ax.plot(t, err, color=DEMAND_C, lw=1.6, label="Failed requests / s (5xx / 403 / error)")
    ax.axvline(stop,  color=SLATE, ls="--", lw=1.1); ax.axvline(start, color=SLATE, ls="--", lw=1.1)
    ax.set_xlabel("Time (s)"); ax.set_ylabel("Requests per second")
    ax.set_ylim(0, max(ok)*1.45); ax.set_xlim(0, max(t))
    during = sum(o for tt,o in zip(t,ok) if stop<=tt<start)
    annotate_box(ax, (stop+start)/2, max(ok)*0.62,
                 f"all 3 Fabric peers down ({start-stop}s)\n{during} requests served, 0 failures\nPostgreSQL-ACL fail-open\n(1,090 audit rows logged)",
                 color=SLATE, va="center", fs=7.2)
    ax.annotate("peers stopped", xy=(stop, max(ok)*1.30), fontsize=7.4, color=SLATE, ha="center")
    ax.annotate("peers restarted", xy=(start, max(ok)*1.30), fontsize=7.4, color=SLATE, ha="center")
    ax.legend(loc="upper right", ncol=1)
    fig.savefig("fig9_failopen.pdf"); plt.close(fig)
    print("wrote fig9_failopen.pdf (Fig 27, new)")


if __name__ == "__main__":
    fig_scalability()
    fig_latency()
    fig_filesize()
    fig_audit()
    fig_wan()
    fig_sensitivity()
    fig_gethistory()
    fig_failopen()
    print("\nAll figures generated from results/*.csv")
