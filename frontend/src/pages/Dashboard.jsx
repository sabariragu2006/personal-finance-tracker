import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const BASE = import.meta.env.VITE_API_URL;

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = [
  "#c084fc", "#60a5fa", "#34d399", "#fbbf24", "#f87171",
  "#38bdf8", "#a78bfa", "#4ade80", "#fb923c", "#2dd4bf",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v || 0);
const fmtFull = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v || 0);
const fmtPct  = (v) => `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
const gainColor = (v) => (v > 0 ? "#4ade80" : v < 0 ? "#f87171" : "#475569");
const fmtDate   = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const TYPE_META = {
  asset_create:             { label: "Asset Added",     color: "#818cf8", icon: "✦" },
  asset_buy:                { label: "Buy",             color: "#4ade80", icon: "↑" },
  asset_sell:               { label: "Sell",            color: "#f87171", icon: "↓" },
  asset_value_update:       { label: "Value Update",    color: "#fb923c", icon: "✎" },
  liability_create:         { label: "Debt Added",      color: "#f87171", icon: "⊕" },
  liability_payment:        { label: "Payment",         color: "#2dd4bf", icon: "↓" },
  liability_balance_update: { label: "Balance Updated", color: "#fb923c", icon: "✎" },
};

// ─── Breakpoint hook ──────────────────────────────────────────────────────────
function useBreakpoint() {
  const get = () => {
    if (typeof window === "undefined") return "desktop";
    if (window.innerWidth < 640)  return "mobile";
    if (window.innerWidth < 1024) return "tablet";
    return "desktop";
  };
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const h = () => setBp(get());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="db-spinner-wrap">
      <div className="db-spinner" />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, accent, icon, delay = 0 }) {
  return (
    <div className="db-card db-kpi-card" style={{ borderColor: `${accent}20`, animationDelay: `${delay}ms` }}>
      <div className="db-kpi-top">
        <div className="db-kpi-icon" style={{ background: `${accent}12`, color: accent }}>{icon}</div>
        <div className="db-kpi-label" style={{ color: `${accent}80` }}>{label}</div>
      </div>
      <div className="db-kpi-bottom">
        <div className="db-kpi-value" style={{ color: accent }}>{value}</div>
        {sub && <div className="db-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, right }) {
  return (
    <div className="db-section-header">
      <div>
        <div className="db-section-eyebrow">{eyebrow}</div>
        <div className="db-section-title">{title}</div>
      </div>
      {right}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => <div className="db-divider" />;

// ─── Timeline helpers ─────────────────────────────────────────────────────────
function getAssetValueAtDate(asset, date) {
  const sorted = [...(asset.value_history || [])].sort(
    (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
  );
  const effectiveStart = sorted.length > 0
    ? new Date(sorted[0].recorded_at).toISOString().split("T")[0]
    : (asset.createdAt ? new Date(asset.createdAt).toISOString().split("T")[0] : null);
  if (!effectiveStart || effectiveStart > date) return 0;
  const past = sorted.filter((s) => new Date(s.recorded_at).toISOString().split("T")[0] <= date);
  return past.length > 0 ? past[past.length - 1].value : sorted[0].value;
}

function buildTimeline(assets, liabilities) {
  const dateSet = new Set();
  assets.forEach((a) => {
    (a.value_history || []).forEach((s) => dateSet.add(new Date(s.recorded_at).toISOString().split("T")[0]));
  });
  liabilities.forEach((l) => {
    if (l.createdAt) dateSet.add(new Date(l.createdAt).toISOString().split("T")[0]);
    (l.payment_history || []).forEach((s) => dateSet.add(new Date(s.recorded_at).toISOString().split("T")[0]));
  });
  dateSet.add(new Date().toISOString().split("T")[0]);

  return Array.from(dateSet).sort().map((date) => {
    const totalAssets = assets.reduce((sum, a) => sum + getAssetValueAtDate(a, date), 0);
    const totalLiabilities = liabilities.reduce((sum, l) => {
      const createdDate = l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : null;
      if (!createdDate || createdDate > date) return sum;
      const sortedPH = [...(l.payment_history || [])].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
      const past = sortedPH.filter((s) => new Date(s.recorded_at).toISOString().split("T")[0] <= date);
      return sum + (past.length > 0 ? past[past.length - 1].balance_after : (l.original_amount || 0));
    }, 0);
    return {
      date,
      label: new Date(date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      totalAssets:      Math.round(totalAssets),
      totalLiabilities: Math.round(totalLiabilities),
      netWorth:         Math.round(totalAssets - totalLiabilities),
    };
  });
}

// ─── Net Worth Chart ──────────────────────────────────────────────────────────
function NetWorthChart({ assets, liabilities, height = 160 }) {
  const chartData = useMemo(() => buildTimeline(assets, liabilities), [assets, liabilities]);

  if (chartData.length < 2) {
    return (
      <div style={{ height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ fontSize: 26, color: "#1a1500" }}>◈</span>
        <p style={{ fontSize: 12, color: "#1a1500", fontFamily: "'DM Mono',monospace", textAlign: "center", maxWidth: 240, lineHeight: 1.6 }}>
          Not enough history yet. Add assets or make payments to build your timeline.
        </p>
      </div>
    );
  }

  const minVal = Math.min(...chartData.map((d) => Math.min(d.totalAssets, d.totalLiabilities, d.netWorth)), 0);
  const maxVal = Math.max(...chartData.map((d) => Math.max(d.totalAssets, d.totalLiabilities, d.netWorth)), 0);
  const yPad   = (maxVal - minVal) * 0.12;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="dashNwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#e2b55a" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#e2b55a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="dashAGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#c084fc" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="dashLGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f87171" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#334155", fontFamily: "'DM Mono',monospace" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 8, fill: "#334155", fontFamily: "'DM Mono',monospace" }} axisLine={false} tickLine={false} width={66} domain={[minVal - yPad, maxVal + yPad]} />
        <Tooltip
          contentStyle={{ background: "#070508", border: "1px solid #1a1500", borderRadius: 8, fontFamily: "'DM Mono',monospace", fontSize: 11 }}
          labelStyle={{ color: "#7c5c0a", marginBottom: 6 }}
          formatter={(v, name) => [fmt(v), name === "netWorth" ? "Net Worth" : name === "totalAssets" ? "Assets" : "Liabilities"]}
        />
        <ReferenceLine y={0} stroke="#1e293b" strokeDasharray="4 4" />
        <Area type="monotone" dataKey="totalLiabilities" stroke="#f87171" strokeWidth={1.5} fill="url(#dashLGrad)" dot={false} />
        <Area type="monotone" dataKey="totalAssets"      stroke="#c084fc" strokeWidth={1.5} fill="url(#dashAGrad)" dot={false} />
        <Area type="monotone" dataKey="netWorth"         stroke="#e2b55a" strokeWidth={2}   fill="url(#dashNwGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Allocation Donut ─────────────────────────────────────────────────────────
function AllocationDonut({ assets }) {
  const [active, setActive] = useState(null);
  const total = assets.reduce((s, a) => s + (a.current_value || 0), 0);
  const data  = assets.map((a, i) => ({ name: a.asset_name, value: a.current_value || 0, color: PALETTE[i % PALETTE.length] }));

  if (data.length === 0) {
    return (
      <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 12, color: "#1a1500", fontFamily: "'DM Mono',monospace" }}>No assets yet</p>
      </div>
    );
  }

  const hovered = active !== null ? data[active] : null;
  return (
    <div className="db-donut-wrap">
      <div style={{ position: "relative", flexShrink: 0 }}>
        <PieChart width={120} height={120}>
          <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={54} dataKey="value" paddingAngle={2}
            onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} opacity={active === null || active === i ? 1 : 0.3} style={{ cursor: "pointer", outline: "none" }} />
            ))}
          </Pie>
        </PieChart>
        <div className="db-donut-center">
          <div className="db-donut-label">{hovered ? hovered.name.slice(0, 7) : "TOTAL"}</div>
          <div className="db-donut-value" style={{ color: hovered ? hovered.color : "#e2b55a" }}>
            {fmt(hovered ? hovered.value : total)}
          </div>
        </div>
      </div>
      <div className="db-donut-legend">
        {data.slice(0, 5).map((item, i) => (
          <div key={i} className="db-legend-row">
            <div className="db-legend-dot" style={{ background: item.color }} />
            <div className="db-legend-name">{item.name}</div>
            <div className="db-legend-pct">{total ? ((item.value / total) * 100).toFixed(1) : 0}%</div>
          </div>
        ))}
        {data.length > 5 && <div className="db-legend-more">+{data.length - 5} more</div>}
      </div>
    </div>
  );
}

// ─── Panel: Asset Row ─────────────────────────────────────────────────────────
function AssetRow({ asset, index }) {
  const gain    = (asset.current_value || asset.invested_value) - asset.invested_value;
  const gainPct = asset.invested_value ? (gain / asset.invested_value) * 100 : 0;
  return (
    <div className="db-list-row">
      <div className="db-list-dot" style={{ background: PALETTE[index % PALETTE.length] }} />
      <div className="db-list-info">
        <div className="db-list-name">{asset.asset_name}</div>
        <div className="db-list-sub">{asset.institution}</div>
      </div>
      <div className="db-list-right">
        <div className="db-list-val">{fmt(asset.current_value || asset.invested_value)}</div>
        <div className="db-list-gain" style={{ color: gainColor(gain) }}>{fmtPct(gainPct)}</div>
      </div>
    </div>
  );
}

// ─── Panel: Liability Row ─────────────────────────────────────────────────────
function LiabilityRow({ liability }) {
  const pct = liability.original_amount
    ? ((liability.original_amount - liability.current_balance) / liability.original_amount) * 100 : 0;
  return (
    <div className="db-liab-row">
      <div className="db-liab-top">
        <div className="db-liab-info">
          <div className="db-list-name">{liability.liability_name}</div>
          <div className="db-list-sub">{liability.lender}</div>
        </div>
        <div className="db-liab-right">
          <div className="db-liab-balance">{fmt(liability.current_balance)}</div>
          {liability.interest_rate > 0 && (
            <div className="db-liab-rate">{liability.interest_rate}% p.a.</div>
          )}
        </div>
      </div>
      <div className="db-progress-track">
        <div className="db-progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="db-progress-label">{pct.toFixed(1)}% paid off</div>
    </div>
  );
}

// ─── Panel: Tx Row ────────────────────────────────────────────────────────────
function TxRow({ tx }) {
  const meta = TYPE_META[tx.type] || { label: tx.type, color: "#64748b", icon: "·" };
  return (
    <div className="db-list-row">
      <div className="db-tx-icon" style={{ background: `${meta.color}15`, color: meta.color }}>{meta.icon}</div>
      <div className="db-list-info">
        <div className="db-list-name">{tx.entity_name}</div>
        <div className="db-list-sub" style={{ color: meta.color }}>{meta.label}</div>
      </div>
      <div className="db-list-right">
        <div className="db-list-val" style={{ color: "#94a3b8" }}>{fmtFull(tx.amount)}</div>
        <div className="db-list-gain">{fmtDate(tx.transaction_date)}</div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ token }) {
  const [assets,      setAssets]      = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [txSummary,   setTxSummary]   = useState(null);
  const [recentTx,    setRecentTx]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const bp       = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [aRes, lRes, txRes] = await Promise.all([
        fetch(`${BASE}/api/assets`,               { headers: h }),
        fetch(`${BASE}/api/liabilities`,          { headers: h }),
        fetch(`${BASE}/api/transactions/summary`, { headers: h }),
      ]);
      if (!aRes.ok) throw new Error("Failed to load assets");
      const [aData, lData, txData] = await Promise.all([
        aRes.json(), lRes.ok ? lRes.json() : [], txRes.ok ? txRes.json() : null,
      ]);
      setAssets(aData); setLiabilities(lData); setTxSummary(txData);
      setRecentTx(txData?.recentActivity || []); setLastRefresh(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // Derived
  const totalInvested = assets.reduce((s, a) => s + (a.invested_value || 0), 0);
  const totalCurrent  = assets.reduce((s, a) => s + (a.current_value  || a.invested_value || 0), 0);
  const totalLiab     = liabilities.reduce((s, l) => s + (l.current_balance || 0), 0);
  const netWorth      = totalCurrent - totalLiab;
  const totalGain     = totalCurrent - totalInvested;
  const totalGainPct  = totalInvested ? (totalGain / totalInvested) * 100 : 0;
  const txBreakdown   = txSummary?.typeBreakdown || [];
  const totalBuys     = txBreakdown.find((t) => t._id === "asset_buy")?.total_amount  || 0;
  const totalSells    = txBreakdown.find((t) => t._id === "asset_sell")?.total_amount || 0;
  const totalPays     = txBreakdown.find((t) => t._id === "liability_payment")?.total_amount || 0;
  const sortedAssets  = [...assets].sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
  const winner        = [...assets].sort((a, b) => {
    const ga = (a.current_value - a.invested_value) / (a.invested_value || 1);
    const gb = (b.current_value - b.invested_value) / (b.invested_value || 1);
    return gb - ga;
  })[0];

  // Responsive column values passed as CSS variables via inline style on container
  const chartH = isMobile ? 180 : 160;

  return (
    <div className="db-page">
      <div className="db-grain" />

      <div className="db-container">

        {/* ── Header ── */}
        <div className="db-header">
          <div>
            <p className="db-eyebrow">OVERVIEW</p>
            <h1 className="db-title">Dashboard</h1>
          </div>
          <div className="db-header-right">
            {lastRefresh && !isMobile && (
              <span className="db-updated">
                Updated {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button className="db-refresh-btn" onClick={load} disabled={loading}>
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>
        </div>

        {error && <div className="db-error-banner">{error}</div>}

        {/* ── KPI Grid — 2×2 on mobile/tablet, 4-col on desktop ── */}
        <div className="db-kpi-grid">
          <KPICard label="NET WORTH"       value={loading ? "—" : fmt(netWorth)}
            sub={`${assets.length} assets · ${liabilities.length} liabs`}
            accent="#e2b55a" icon="⬡" delay={0} />
          <KPICard label="TOTAL INVESTED"  value={loading ? "—" : fmt(totalInvested)}
            sub={`${assets.length} positions`}
            accent="#c084fc" icon="◈" delay={60} />
          <KPICard label="ALL-TIME RETURN" value={loading ? "—" : fmtPct(totalGainPct)}
            sub={`${totalGain >= 0 ? "+" : ""}${fmt(totalGain)}`}
            accent={gainColor(totalGain)} icon={totalGain >= 0 ? "↑" : "↓"} delay={120} />
          <KPICard label="TOTAL DEBT"      value={loading ? "—" : fmt(totalLiab)}
            sub={`${liabilities.length} liabilities`}
            accent="#f87171" icon="⊘" delay={180} />
        </div>

        {/* ── Activity strip — 4-col → 2×2 on mobile ── */}
        {txSummary && (
          <div className="db-activity-strip">
            {[
              { label: "TRANSACTIONS", val: txSummary.totalCount, color: "#e2b55a" },
              { label: "TOTAL BOUGHT", val: fmt(totalBuys),        color: "#4ade80" },
              { label: "TOTAL SOLD",   val: fmt(totalSells),       color: "#f87171" },
              { label: "DEBT PAID",    val: fmt(totalPays),        color: "#2dd4bf" },
            ].map((item, i) => (
              <div key={i} className="db-activity-cell">
                <div className="db-activity-label">{item.label}</div>
                <div className="db-activity-val" style={{ color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>
        )}

        <Divider />

        {/* ── Charts — side-by-side → stacked on mobile ── */}
        <div className="db-chart-grid">
          <div className="db-card" style={{ animationDelay: "250ms" }}>
            <SectionHeader eyebrow="HISTORY" title="Net Worth Trend" />
            {loading ? <Spinner /> : <NetWorthChart assets={assets} liabilities={liabilities} height={chartH} />}
            <div className="db-chart-legend">
              {[["#e2b55a", "Net Worth"], ["#c084fc", "Assets"], ["#f87171", "Liabilities"]].map(([c, l]) => (
                <div key={l} className="db-legend-item">
                  <div className="db-legend-line" style={{ background: c }} />
                  <span className="db-legend-text">{l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="db-card" style={{ animationDelay: "300ms" }}>
            <SectionHeader eyebrow="ALLOCATION" title="Asset Breakdown" />
            {loading ? <Spinner /> : <AllocationDonut assets={assets} />}
            {!loading && winner && (
              <div className="db-best-performer">
                <div className="db-bp-label">BEST PERFORMER</div>
                <div className="db-bp-row">
                  <span className="db-bp-name">{winner.asset_name}</span>
                  <span className="db-bp-pct">
                    {fmtPct(winner.invested_value ? ((winner.current_value - winner.invested_value) / winner.invested_value) * 100 : 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Panels — 3-col → 2-col tablet → 1-col mobile ── */}
        <div className="db-panel-grid">

          {/* Assets */}
          <div className="db-panel" style={{ animationDelay: "350ms" }}>
            <div className="db-panel-head">
              <SectionHeader eyebrow="PORTFOLIO" title="Assets"
                right={<span className="db-panel-count">{assets.length} total</span>} />
            </div>
            {loading ? <Spinner /> : assets.length === 0 ? (
              <div className="db-panel-empty">No assets yet</div>
            ) : (
              <div className="db-panel-scroll">
                {sortedAssets.map((a, i) => <AssetRow key={a._id} asset={a} index={i} />)}
              </div>
            )}
            {!loading && assets.length > 0 && (
              <div className="db-panel-foot">
                <span className="db-foot-label">CURRENT VALUE</span>
                <span className="db-foot-val" style={{ color: "#e2b55a" }}>{fmt(totalCurrent)}</span>
              </div>
            )}
          </div>

          {/* Liabilities */}
          <div className="db-panel" style={{ animationDelay: "400ms" }}>
            <div className="db-panel-head">
              <SectionHeader eyebrow="DEBT" title="Liabilities"
                right={<span className="db-panel-count">{liabilities.length} total</span>} />
            </div>
            {loading ? <Spinner /> : liabilities.length === 0 ? (
              <div className="db-panel-empty">No liabilities</div>
            ) : (
              <div className="db-panel-scroll">
                {liabilities.map((l) => <LiabilityRow key={l._id} liability={l} />)}
              </div>
            )}
            {!loading && liabilities.length > 0 && (
              <div className="db-panel-foot">
                <span className="db-foot-label">OUTSTANDING</span>
                <span className="db-foot-val" style={{ color: "#f87171" }}>{fmt(totalLiab)}</span>
              </div>
            )}
          </div>

          {/* Transactions — spans full width on tablet */}
          <div className="db-panel db-panel-tx" style={{ animationDelay: "450ms", gridColumn: isTablet ? "1 / -1" : "auto" }}>
            <div className="db-panel-head">
              <SectionHeader eyebrow="ACTIVITY" title="Recent"
                right={<span className="db-panel-count">{txSummary?.totalCount || 0} total</span>} />
            </div>
            {loading ? <Spinner /> : recentTx.length === 0 ? (
              <div className="db-panel-empty">No transactions yet</div>
            ) : (
              <div className={isTablet ? "db-tx-2col" : ""}>
                {recentTx.map((tx) => <TxRow key={tx._id} tx={tx} />)}
              </div>
            )}
            {!loading && recentTx.length > 0 && (
              <div className="db-panel-foot" style={{ justifyContent: "center" }}>
                <span className="db-foot-label">Showing last {recentTx.length} transactions</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── All styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes db-fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes db-spin   { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1a1500; border-radius:99px; }
        button:disabled { opacity:0.4; cursor:not-allowed !important; }

        /* ── Page shell ── */
        .db-page      { min-height:100vh; background:linear-gradient(150deg,#070508 0%,#0c0a02 40%,#080709 100%); font-family:'DM Mono',monospace; color:#e2e8f0; position:relative; }
        .db-grain     { position:fixed; inset:0; pointer-events:none; z-index:0; opacity:0.04;
                        background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        .db-container { position:relative; z-index:1; max-width:1160px; margin:0 auto; padding:44px 20px 100px; }

        /* ── Header ── */
        .db-header       { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:14px; margin-bottom:28px; animation:db-fadeUp 0.5s ease both; }
        .db-eyebrow      { font-size:10px; letter-spacing:0.2em; color:#3d2e05; margin-bottom:5px; }
        .db-title        { font-family:'DM Serif Display',serif; font-size:clamp(30px,7vw,48px); font-weight:400; color:#fef3c7; line-height:1; letter-spacing:-1px; }
        .db-header-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .db-updated      { font-size:10px; color:#1a1500; letter-spacing:0.1em; }
        .db-refresh-btn  { padding:7px 14px; background:rgba(226,181,90,0.06); border:1px solid rgba(226,181,90,0.18); border-radius:8px; color:#e2b55a; font-size:11px; font-family:'DM Mono',monospace; letter-spacing:0.08em; cursor:pointer; transition:background 0.15s; white-space:nowrap; }
        .db-refresh-btn:hover:not(:disabled) { background:rgba(226,181,90,0.12); }
        .db-error-banner { padding:10px 16px; margin-bottom:20px; background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.2); border-radius:10px; font-size:12px; color:#f87171; }

        /* ── Spinner ── */
        .db-spinner-wrap { display:flex; align-items:center; justify-content:center; height:100px; }
        .db-spinner      { width:24px; height:24px; border-radius:50%; border:2px solid #0f172a; border-top-color:#e2b55a; animation:db-spin 0.7s linear infinite; }

        /* ── Generic card ── */
        .db-card { padding:18px; background:rgba(255,255,255,0.02); border:1px solid #1a1500; border-radius:16px; animation:db-fadeUp 0.55s ease both; }

        /* ── KPI Grid: 4-col desktop, 2-col mobile/tablet ── */
        .db-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:12px; }
        @media (max-width:1023px) { .db-kpi-grid { grid-template-columns:1fr 1fr; } }

        /* ── KPI card internals ── */
        .db-kpi-card  { display:flex; flex-direction:column; gap:12px; animation:db-fadeUp 0.55s ease both; }
        .db-kpi-top   { display:flex; justify-content:space-between; align-items:flex-start; }
        .db-kpi-icon  { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
        .db-kpi-label { font-size:9px; letter-spacing:0.18em; font-family:'DM Mono',monospace; text-align:right; }
        .db-kpi-bottom{ }
        .db-kpi-value { font-family:'DM Serif Display',serif; font-size:clamp(18px,4vw,28px); letter-spacing:-1px; line-height:1; margin-bottom:4px; }
        .db-kpi-sub   { font-size:11px; color:#334155; }

        /* ── Activity strip: 4-col → 2×2 on mobile ── */
        .db-activity-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin-bottom:20px; background:rgba(255,255,255,0.015); border:1px solid #1a1500; border-radius:12px; overflow:hidden; animation:db-fadeUp 0.55s ease both 200ms; }
        @media (min-width:640px) {
          .db-activity-cell { border-right:1px solid #1a1500; }
          .db-activity-cell:last-child { border-right:none; }
        }
        @media (max-width:639px) {
          .db-activity-strip { grid-template-columns:1fr 1fr; }
          .db-activity-cell:nth-child(1),
          .db-activity-cell:nth-child(2) { border-bottom:1px solid #1a1500; }
          .db-activity-cell:nth-child(odd)  { border-right:1px solid #1a1500; }
          .db-activity-cell:nth-child(even) { border-right:none !important; }
        }
        .db-activity-cell  { padding:12px 16px; }
        .db-activity-label { font-size:9px; letter-spacing:0.18em; color:#3d2e05; margin-bottom:5px; font-family:'DM Mono',monospace; }
        .db-activity-val   { font-family:'DM Serif Display',serif; font-size:clamp(15px,3vw,20px); letter-spacing:-0.5px; }

        /* ── Divider ── */
        .db-divider { height:1px; background:linear-gradient(90deg,transparent,#1a1500 30%,#1a1500 70%,transparent); margin:24px 0; }

        /* ── Chart grid: 2-col → 1-col on mobile ── */
        .db-chart-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
        @media (max-width:639px) { .db-chart-grid { grid-template-columns:1fr; } }

        /* ── Chart legend ── */
        .db-chart-legend { display:flex; gap:14px; margin-top:10px; flex-wrap:wrap; }
        .db-legend-item  { display:flex; align-items:center; gap:5px; }
        .db-legend-line  { width:18px; height:2px; border-radius:99px; flex-shrink:0; }
        .db-legend-text  { font-size:10px; color:#475569; }

        /* ── Donut ── */
        .db-donut-wrap   { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
        .db-donut-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; width:64px; }
        .db-donut-label  { font-size:9px; font-family:'DM Mono',monospace; color:#475569; margin-bottom:2px; }
        .db-donut-value  { font-family:'DM Serif Display',serif; font-size:11px; }
        .db-donut-legend { display:flex; flex-direction:column; gap:5px; flex:1; min-width:100px; }
        .db-legend-row   { display:flex; align-items:center; gap:6px; }
        .db-legend-dot   { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .db-legend-name  { font-size:11px; color:#475569; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .db-legend-pct   { font-size:10px; color:#334155; font-family:'DM Mono',monospace; }
        .db-legend-more  { font-size:10px; color:#334155; font-family:'DM Mono',monospace; }

        /* ── Best performer ── */
        .db-best-performer { margin-top:14px; padding:10px 12px; background:rgba(74,222,128,0.04); border:1px solid rgba(74,222,128,0.1); border-radius:10px; }
        .db-bp-label       { font-size:9px; letter-spacing:0.15em; color:#334155; margin-bottom:4px; }
        .db-bp-row         { display:flex; justify-content:space-between; align-items:center; gap:8px; }
        .db-bp-name        { font-size:13px; color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .db-bp-pct         { font-size:13px; color:#4ade80; font-family:'DM Mono',monospace; flex-shrink:0; }

        /* ── Section header ── */
        .db-section-header  { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px; flex-wrap:wrap; gap:6px; }
        .db-section-eyebrow { font-size:9px; letter-spacing:0.2em; color:#3d2e05; margin-bottom:3px; font-family:'DM Mono',monospace; }
        .db-section-title   { font-family:'DM Serif Display',serif; font-size:17px; color:#fef3c7; letter-spacing:-0.3px; }

        /* ── Panel grid: 3-col → 2-col tablet → 1-col mobile ── */
        .db-panel-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
        @media (min-width:640px) and (max-width:1023px) { .db-panel-grid { grid-template-columns:1fr 1fr; } }
        @media (max-width:639px) { .db-panel-grid { grid-template-columns:1fr; } }

        /* ── Panel ── */
        .db-panel        { background:rgba(255,255,255,0.02); border:1px solid #1a1500; border-radius:16px; overflow:hidden; animation:db-fadeUp 0.55s ease both; display:flex; flex-direction:column; }
        .db-panel-head   { padding:16px 16px 8px; flex-shrink:0; }
        .db-panel-scroll { flex:1; overflow-y:auto; max-height:300px; }
        .db-panel-foot   { padding:10px 16px; border-top:1px solid #0a0f1a; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
        .db-panel-empty  { padding:20px 16px; font-size:12px; color:#1a1500; text-align:center; }
        .db-panel-count  { font-size:10px; color:#3d2e05; }
        .db-foot-label   { font-size:10px; color:#334155; }
        .db-foot-val     { font-size:12px; font-family:'DM Mono',monospace; }

        /* Transactions panel — 2-col inner grid on tablet */
        .db-tx-2col { display:grid; grid-template-columns:1fr 1fr; }

        /* ── Shared list row ── */
        .db-list-row { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid #0a0f1a; transition:background 0.12s; }
        .db-list-row:hover { background:rgba(255,255,255,0.02); }
        .db-list-row:last-child { border-bottom:none; }
        .db-list-dot  { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .db-tx-icon   { width:28px; height:28px; border-radius:7px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:11px; }
        .db-list-info { flex:1; min-width:0; }
        .db-list-name { font-size:13px; color:#cbd5e1; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .db-list-sub  { font-size:10px; color:#334155; font-family:'DM Mono',monospace; }
        .db-list-right{ text-align:right; flex-shrink:0; }
        .db-list-val  { font-size:13px; color:#e2e8f0; font-family:'DM Mono',monospace; font-weight:500; }
        .db-list-gain { font-size:10px; color:#334155; font-family:'DM Mono',monospace; }

        /* ── Liability row ── */
        .db-liab-row   { padding:12px 16px; border-bottom:1px solid #0a0f1a; }
        .db-liab-row:last-child { border-bottom:none; }
        .db-liab-top   { display:flex; justify-content:space-between; margin-bottom:8px; gap:8px; }
        .db-liab-info  { min-width:0; }
        .db-liab-right { text-align:right; flex-shrink:0; }
        .db-liab-balance { font-size:13px; color:#f87171; font-family:'DM Mono',monospace; font-weight:500; }
        .db-liab-rate    { font-size:10px; color:#fb923c; font-family:'DM Mono',monospace; }
        .db-progress-track { height:2px; background:#0f172a; border-radius:99px; overflow:hidden; }
        .db-progress-fill  { height:100%; background:linear-gradient(90deg,#16a34a,#4ade80); border-radius:99px; transition:width 0.6s ease; }
        .db-progress-label { font-size:9px; color:#4ade80; font-family:'DM Mono',monospace; margin-top:4px; }

        /* ── Mobile container padding ── */
        @media (max-width:639px) { .db-container { padding-top:20px; padding-left:12px; padding-right:12px; } }
      `}</style>
    </div>
  );
}