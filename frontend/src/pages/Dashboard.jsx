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
const fmt = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v || 0);

const fmtFull = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v || 0);

const fmtPct = (v) =>
  `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;

const gainColor = (v) => (v > 0 ? "#4ade80" : v < 0 ? "#f87171" : "#475569");

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const TYPE_META = {
  asset_create:             { label: "Asset Added",     color: "#818cf8", icon: "✦" },
  asset_buy:                { label: "Buy",             color: "#4ade80", icon: "↑" },
  asset_sell:               { label: "Sell",            color: "#f87171", icon: "↓" },
  asset_value_update:       { label: "Value Update",    color: "#fb923c", icon: "✎" },
  liability_create:         { label: "Debt Added",      color: "#f87171", icon: "⊕" },
  liability_payment:        { label: "Payment",         color: "#2dd4bf", icon: "↓" },
  liability_balance_update: { label: "Balance Updated", color: "#fb923c", icon: "✎" },
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        border: "2px solid #0f172a",
        borderTopColor: "#e2b55a",
        animation: "spin 0.7s linear infinite",
      }} />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, accent, icon, delay = 0 }) {
  return (
    <div style={{
      ...card,
      borderColor: `${accent}20`,
      animation: `fadeUp 0.55s ease both ${delay}ms`,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${accent}12`, color: accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
        }}>{icon}</div>
        <div style={{
          fontSize: 9, letterSpacing: "0.18em",
          color: `${accent}70`,
          fontFamily: "'DM Mono', monospace",
        }}>{label}</div>
      </div>
      <div>
        <div style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 28, color: accent,
          letterSpacing: "-1px", lineHeight: 1,
          marginBottom: 5,
        }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "#334155" }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#3d2e05", marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>
          {eyebrow}
        </div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#fef3c7", letterSpacing: "-0.3px" }}>
          {title}
        </div>
      </div>
      {right}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => (
  <div style={{
    height: 1,
    background: "linear-gradient(90deg, transparent, #1a1500 30%, #1a1500 70%, transparent)",
    margin: "28px 0",
  }} />
);

// ─── Timeline builder ─────────────────────────────────────────────────────────
// The backend (buyAsset) pushes every buy as a new value_history entry
// with the buy date and cumulative current_value. So value_history is the
// single source of truth for all asset value changes over time.
//
// Fallback rule (no snapshot before this date yet):
//   Use the FIRST value_history entry's value (= initial invested_value seeded
//   at createAsset). This avoids inflating early dates with future-buy amounts,
//   which happened when we fell back to asset.invested_value (which grows with
//   every buy).

function getAssetValueAtDate(asset, date) {
  const sorted = [...(asset.value_history || [])].sort(
    (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
  );

  // The first value_history entry is the true financial start date of the asset.
  // createAsset seeds it with invested_date (can be years in the past), so this
  // is far more accurate than asset.createdAt (MongoDB insertion = today).
  const effectiveStart = sorted.length > 0
    ? new Date(sorted[0].recorded_at).toISOString().split("T")[0]
    : (asset.createdAt ? new Date(asset.createdAt).toISOString().split("T")[0] : null);

  if (!effectiveStart || effectiveStart > date) return 0;

  // Most recent snapshot on or before this date
  const past = sorted.filter(
    (s) => new Date(s.recorded_at).toISOString().split("T")[0] <= date
  );
  return past.length > 0 ? past[past.length - 1].value : sorted[0].value;
}
function buildTimeline(assets, liabilities) {
  const dateSet = new Set();

  // Use value_history dates as timeline points — these reflect invested_date
  // (set at createAsset) and every subsequent buy/sell/update event date.
  // Intentionally skip createdAt: it's MongoDB insertion time (today), not the
  // financial start date, which is already captured in value_history[0].
  assets.forEach((a) => {
    (a.value_history || []).forEach((s) =>
      dateSet.add(new Date(s.recorded_at).toISOString().split("T")[0])
    );
  });

  liabilities.forEach((l) => {
    if (l.createdAt) dateSet.add(new Date(l.createdAt).toISOString().split("T")[0]);
    (l.payment_history || []).forEach((s) =>
      dateSet.add(new Date(s.recorded_at).toISOString().split("T")[0])
    );
  });

  dateSet.add(new Date().toISOString().split("T")[0]);

  return Array.from(dateSet)
    .sort()
    .map((date) => {
      const totalAssets = assets.reduce(
        (sum, a) => sum + getAssetValueAtDate(a, date),
        0
      );

      const totalLiabilities = liabilities.reduce((sum, l) => {
        const createdDate = l.createdAt
          ? new Date(l.createdAt).toISOString().split("T")[0]
          : null;
        if (!createdDate || createdDate > date) return sum;

        const sortedPH = [...(l.payment_history || [])].sort(
          (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
        );
        const past = sortedPH.filter(
          (s) => new Date(s.recorded_at).toISOString().split("T")[0] <= date
        );
        return sum + (past.length > 0
          ? past[past.length - 1].balance_after
          : (l.original_amount || 0));
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

// ─── Net Worth Chart (proper timeline) ───────────────────────────────────────
function NetWorthChart({ assets, liabilities }) {
  const chartData = useMemo(
    () => buildTimeline(assets, liabilities),
    [assets, liabilities]
  );

  if (chartData.length < 2) {
    return (
      <div style={{ height: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ fontSize: 28, color: "#1a1500" }}>◈</span>
        <p style={{ fontSize: 12, color: "#1a1500", fontFamily: "'DM Mono', monospace", textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
          Not enough history yet. Add assets or make payments to build your timeline.
        </p>
      </div>
    );
  }

  const minVal = Math.min(...chartData.map((d) => Math.min(d.totalAssets, d.totalLiabilities, d.netWorth)), 0);
  const maxVal = Math.max(...chartData.map((d) => Math.max(d.totalAssets, d.totalLiabilities, d.netWorth)), 0);
  const yPad   = (maxVal - minVal) * 0.12;

  return (
    <ResponsiveContainer width="100%" height={160}>
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
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "#334155", fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          hide={false}
          tickFormatter={(v) => fmt(v)}
          tick={{ fontSize: 8, fill: "#334155", fontFamily: "'DM Mono', monospace" }}
          axisLine={false} tickLine={false}
          width={70}
          domain={[minVal - yPad, maxVal + yPad]}
        />
        <Tooltip
          contentStyle={{
            background: "#070508", border: "1px solid #1a1500",
            borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11,
          }}
          labelStyle={{ color: "#7c5c0a", marginBottom: 6 }}
          formatter={(v, name) => [
            fmt(v),
            name === "netWorth" ? "Net Worth" : name === "totalAssets" ? "Assets" : "Liabilities",
          ]}
        />
        <ReferenceLine y={0} stroke="#1e293b" strokeDasharray="4 4" />
        <Area type="monotone" dataKey="totalLiabilities" stroke="#f87171" strokeWidth={1.5} fill="url(#dashLGrad)" dot={false} />
        <Area type="monotone" dataKey="totalAssets"      stroke="#c084fc" strokeWidth={1.5} fill="url(#dashAGrad)" dot={false} />
        <Area type="monotone" dataKey="netWorth"         stroke="#e2b55a" strokeWidth={2}   fill="url(#dashNwGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Asset Allocation Donut ───────────────────────────────────────────────────
function AllocationDonut({ assets }) {
  const [active, setActive] = useState(null);
  const total = assets.reduce((s, a) => s + (a.current_value || 0), 0);

  const data = assets.map((a, i) => ({
    name:  a.asset_name,
    value: a.current_value || 0,
    color: PALETTE[i % PALETTE.length],
  }));

  if (data.length === 0) {
    return (
      <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 12, color: "#1a1500", fontFamily: "'DM Mono', monospace" }}>No assets yet</p>
      </div>
    );
  }

  const hovered = active !== null ? data[active] : null;

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <PieChart width={130} height={130}>
          <Pie
            data={data} cx="50%" cy="50%"
            innerRadius={42} outerRadius={58}
            dataKey="value" paddingAngle={2}
            onMouseEnter={(_, i) => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            {data.map((entry, i) => (
              <Cell
                key={i} fill={entry.color}
                opacity={active === null || active === i ? 1 : 0.3}
                style={{ cursor: "pointer", outline: "none" }}
              />
            ))}
          </Pie>
        </PieChart>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center", pointerEvents: "none",
        }}>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#475569" }}>
            {hovered ? hovered.name.slice(0, 8) : "TOTAL"}
          </div>
          <div style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 12, color: hovered ? hovered.color : "#e2b55a",
          }}>
            {fmt(hovered ? hovered.value : total)}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
        {data.slice(0, 5).map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.name}
            </div>
            <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono', monospace" }}>
              {total ? ((item.value / total) * 100).toFixed(1) : 0}%
            </div>
          </div>
        ))}
        {data.length > 5 && (
          <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono', monospace" }}>
            +{data.length - 5} more
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Asset Row ────────────────────────────────────────────────────────────────
function AssetRow({ asset, index }) {
  const gain    = (asset.current_value || asset.invested_value) - asset.invested_value;
  const gainPct = asset.invested_value ? (gain / asset.invested_value) * 100 : 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 16px",
      borderBottom: "1px solid #0a0f1a",
      transition: "background 0.12s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: PALETTE[index % PALETTE.length], flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {asset.asset_name}
        </div>
        <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono', monospace" }}>
          {asset.institution}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
          {fmt(asset.current_value || asset.invested_value)}
        </div>
        <div style={{ fontSize: 10, color: gainColor(gain), fontFamily: "'DM Mono', monospace" }}>
          {fmtPct(gainPct)}
        </div>
      </div>
    </div>
  );
}

// ─── Liability Row ────────────────────────────────────────────────────────────
function LiabilityRow({ liability }) {
  const pct = liability.original_amount
    ? ((liability.original_amount - liability.current_balance) / liability.original_amount) * 100
    : 0;

  return (
    <div style={{
      padding: "12px 16px",
      borderBottom: "1px solid #0a0f1a",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500 }}>{liability.liability_name}</div>
          <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono', monospace" }}>{liability.lender}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#f87171", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
            {fmt(liability.current_balance)}
          </div>
          {liability.interest_rate > 0 && (
            <div style={{ fontSize: 10, color: "#fb923c", fontFamily: "'DM Mono', monospace" }}>
              {liability.interest_rate}% p.a.
            </div>
          )}
        </div>
      </div>
      <div style={{ height: 2, background: "#0f172a", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${Math.min(pct, 100)}%`,
          background: "linear-gradient(90deg, #16a34a, #4ade80)",
          borderRadius: 99, transition: "width 0.6s ease",
        }} />
      </div>
      <div style={{ fontSize: 9, color: "#4ade80", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
        {pct.toFixed(1)}% paid off
      </div>
    </div>
  );
}

// ─── Recent Transaction Row ───────────────────────────────────────────────────
function TxRow({ tx }) {
  const meta = TYPE_META[tx.type] || { label: tx.type, color: "#64748b", icon: "·" };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 16px",
      borderBottom: "1px solid #0a0f1a",
      transition: "background 0.12s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: `${meta.color}15`, color: meta.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12,
      }}>{meta.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tx.entity_name}
        </div>
        <div style={{ fontSize: 10, color: meta.color, fontFamily: "'DM Mono', monospace" }}>
          {meta.label}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
          {fmtFull(tx.amount)}
        </div>
        <div style={{ fontSize: 9, color: "#334155", fontFamily: "'DM Mono', monospace" }}>
          {fmtDate(tx.transaction_date)}
        </div>
      </div>
    </div>
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────
const card = {
  padding: "20px",
  background: "rgba(255,255,255,0.02)",
  border: "1px solid #1a1500",
  borderRadius: 16,
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ token }) {
  const [assets,      setAssets]      = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [txSummary,   setTxSummary]   = useState(null);
  const [recentTx,    setRecentTx]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [aRes, lRes, txRes] = await Promise.all([
        fetch(`${BASE}/api/assets`,                    { headers: h }),
        fetch(`${BASE}/api/liabilities`,               { headers: h }),
        fetch(`${BASE}/api/transactions/summary`,      { headers: h }),
      ]);

      if (!aRes.ok) throw new Error("Failed to load assets");

      const [aData, lData, txData] = await Promise.all([
        aRes.json(),
        lRes.ok ? lRes.json() : [],
        txRes.ok ? txRes.json() : null,
      ]);

      setAssets(aData);
      setLiabilities(lData);
      setTxSummary(txData);
      setRecentTx(txData?.recentActivity || []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // ── Derived values ──
  const totalInvested = assets.reduce((s, a) => s + (a.invested_value || 0), 0);
  const totalCurrent  = assets.reduce((s, a) => s + (a.current_value  || a.invested_value || 0), 0);
  const totalLiab     = liabilities.reduce((s, l) => s + (l.current_balance || 0), 0);
  const netWorth      = totalCurrent - totalLiab;
  const totalGain     = totalCurrent - totalInvested;
  const totalGainPct  = totalInvested ? (totalGain / totalInvested) * 100 : 0;

  const txBreakdown = txSummary?.typeBreakdown || [];
  const totalBuys   = txBreakdown.find((t) => t._id === "asset_buy")?.total_amount  || 0;
  const totalSells  = txBreakdown.find((t) => t._id === "asset_sell")?.total_amount || 0;
  const totalPays   = txBreakdown.find((t) => t._id === "liability_payment")?.total_amount || 0;

  const sortedAssets = [...assets].sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
  const winner = [...assets].sort((a, b) => {
    const ga = (a.current_value - a.invested_value) / (a.invested_value || 1);
    const gb = (b.current_value - b.invested_value) / (b.invested_value || 1);
    return gb - ga;
  })[0];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(150deg, #070508 0%, #0c0a02 40%, #080709 100%)",
      fontFamily: "'DM Mono', monospace",
      color: "#e2e8f0",
      position: "relative",
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1160, margin: "0 auto", padding: "52px 24px 100px" }}>

        {/* ── Page Header ── */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 32,
          animation: "fadeUp 0.5s ease both",
        }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.2em", color: "#3d2e05", marginBottom: 6 }}>OVERVIEW</p>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 48, fontWeight: 400, color: "#fef3c7",
              lineHeight: 1, letterSpacing: "-1px",
            }}>Dashboard</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {lastRefresh && (
              <span style={{ fontSize: 10, color: "#1a1500", letterSpacing: "0.1em" }}>
                Updated {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              style={{
                padding: "7px 16px",
                background: "rgba(226,181,90,0.06)",
                border: "1px solid rgba(226,181,90,0.18)",
                borderRadius: 8, color: "#e2b55a",
                fontSize: 11, fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.08em", cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "rgba(226,181,90,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(226,181,90,0.06)"; }}
            >{loading ? "Refreshing…" : "↻ Refresh"}</button>
          </div>
        </div>

        {/* ── Error State ── */}
        {error && (
          <div style={{
            padding: "12px 18px", marginBottom: 24,
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 10, fontSize: 12, color: "#f87171",
          }}>{error}</div>
        )}

        {/* ── KPI Row ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12, marginBottom: 24,
        }}>
          <KPICard
            label="NET WORTH"   value={loading ? "—" : fmt(netWorth)}
            sub={`${assets.length} assets · ${liabilities.length} liabilities`}
            accent="#e2b55a" icon="⬡" delay={0}
          />
          <KPICard
            label="TOTAL INVESTED" value={loading ? "—" : fmt(totalInvested)}
            sub={`Across ${assets.length} positions`}
            accent="#c084fc" icon="◈" delay={60}
          />
          <KPICard
            label="ALL-TIME RETURN" value={loading ? "—" : fmtPct(totalGainPct)}
            sub={`${totalGain >= 0 ? "+" : ""}${fmt(totalGain)} total gain`}
            accent={gainColor(totalGain)} icon={totalGain >= 0 ? "↑" : "↓"} delay={120}
          />
          <KPICard
            label="TOTAL DEBT" value={loading ? "—" : fmt(totalLiab)}
            sub={`${liabilities.length} active liabilities`}
            accent="#f87171" icon="⊘" delay={180}
          />
        </div>

        {/* ── Activity Summary Strip ── */}
        {txSummary && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0, marginBottom: 24,
            background: "rgba(255,255,255,0.015)",
            border: "1px solid #1a1500",
            borderRadius: 12, overflow: "hidden",
            animation: "fadeUp 0.55s ease both 200ms",
          }}>
            {[
              { label: "TRANSACTIONS", val: txSummary.totalCount, color: "#e2b55a" },
              { label: "TOTAL BOUGHT", val: fmt(totalBuys),  color: "#4ade80" },
              { label: "TOTAL SOLD",   val: fmt(totalSells), color: "#f87171" },
              { label: "DEBT PAID",    val: fmt(totalPays),  color: "#2dd4bf" },
            ].map((item, i) => (
              <div key={i} style={{
                padding: "14px 20px",
                borderRight: i < 3 ? "1px solid #1a1500" : "none",
              }}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#3d2e05", marginBottom: 6 }}>
                  {item.label}
                </div>
                <div style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 20, color: item.color, letterSpacing: "-0.5px",
                }}>{item.val}</div>
              </div>
            ))}
          </div>
        )}

        <Divider />

        {/* ── Main Content Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Net Worth Chart */}
          <div style={{ ...card, animation: "fadeUp 0.55s ease both 250ms" }}>
            <SectionHeader eyebrow="HISTORY" title="Net Worth Trend" />
            {loading ? <Spinner /> : <NetWorthChart assets={assets} liabilities={liabilities} />}
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 2, background: "#e2b55a", borderRadius: 99 }} />
                <span style={{ fontSize: 10, color: "#475569" }}>Net Worth</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 2, background: "#c084fc", borderRadius: 99 }} />
                <span style={{ fontSize: 10, color: "#475569" }}>Assets</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 2, background: "#f87171", borderRadius: 99 }} />
                <span style={{ fontSize: 10, color: "#475569" }}>Liabilities</span>
              </div>
            </div>
          </div>

          {/* Allocation Donut */}
          <div style={{ ...card, animation: "fadeUp 0.55s ease both 300ms" }}>
            <SectionHeader eyebrow="ALLOCATION" title="Asset Breakdown" />
            {loading ? <Spinner /> : <AllocationDonut assets={assets} />}

            {!loading && winner && (
              <div style={{
                marginTop: 16, padding: "12px 14px",
                background: "rgba(74,222,128,0.04)",
                border: "1px solid rgba(74,222,128,0.1)",
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#334155", marginBottom: 4 }}>
                  BEST PERFORMER
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#cbd5e1" }}>{winner.asset_name}</span>
                  <span style={{ fontSize: 13, color: "#4ade80", fontFamily: "'DM Mono', monospace" }}>
                    {fmtPct(winner.invested_value
                      ? ((winner.current_value - winner.invested_value) / winner.invested_value) * 100
                      : 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Assets + Liabilities + Transactions ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

          {/* Top Assets */}
          <div style={{ ...card, padding: 0, overflow: "hidden", animation: "fadeUp 0.55s ease both 350ms" }}>
            <div style={{ padding: "18px 16px 10px" }}>
              <SectionHeader
                eyebrow="PORTFOLIO"
                title="Assets"
                right={
                  <span style={{ fontSize: 10, color: "#3d2e05" }}>
                    {assets.length} total
                  </span>
                }
              />
            </div>
            {loading ? (
              <Spinner />
            ) : assets.length === 0 ? (
              <div style={{ padding: "20px 16px", fontSize: 12, color: "#1a1500", textAlign: "center" }}>
                No assets yet
              </div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {sortedAssets.map((a, i) => <AssetRow key={a._id} asset={a} index={i} />)}
              </div>
            )}
            {!loading && assets.length > 0 && (
              <div style={{
                padding: "10px 16px",
                borderTop: "1px solid #0a0f1a",
                display: "flex", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 10, color: "#334155" }}>CURRENT VALUE</span>
                <span style={{ fontSize: 12, color: "#e2b55a", fontFamily: "'DM Mono', monospace" }}>
                  {fmt(totalCurrent)}
                </span>
              </div>
            )}
          </div>

          {/* Liabilities */}
          <div style={{ ...card, padding: 0, overflow: "hidden", animation: "fadeUp 0.55s ease both 400ms" }}>
            <div style={{ padding: "18px 16px 10px" }}>
              <SectionHeader
                eyebrow="DEBT"
                title="Liabilities"
                right={
                  <span style={{ fontSize: 10, color: "#3d2e05" }}>
                    {liabilities.length} total
                  </span>
                }
              />
            </div>
            {loading ? (
              <Spinner />
            ) : liabilities.length === 0 ? (
              <div style={{ padding: "20px 16px", fontSize: 12, color: "#1a1500", textAlign: "center" }}>
                No liabilities
              </div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {liabilities.map((l) => <LiabilityRow key={l._id} liability={l} />)}
              </div>
            )}
            {!loading && liabilities.length > 0 && (
              <div style={{
                padding: "10px 16px",
                borderTop: "1px solid #0a0f1a",
                display: "flex", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 10, color: "#334155" }}>OUTSTANDING</span>
                <span style={{ fontSize: 12, color: "#f87171", fontFamily: "'DM Mono', monospace" }}>
                  {fmt(totalLiab)}
                </span>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div style={{ ...card, padding: 0, overflow: "hidden", animation: "fadeUp 0.55s ease both 450ms" }}>
            <div style={{ padding: "18px 16px 10px" }}>
              <SectionHeader
                eyebrow="ACTIVITY"
                title="Recent"
                right={
                  <span style={{ fontSize: 10, color: "#3d2e05" }}>
                    {txSummary?.totalCount || 0} total
                  </span>
                }
              />
            </div>
            {loading ? (
              <Spinner />
            ) : recentTx.length === 0 ? (
              <div style={{ padding: "20px 16px", fontSize: 12, color: "#1a1500", textAlign: "center" }}>
                No transactions yet
              </div>
            ) : (
              <div>
                {recentTx.map((tx) => <TxRow key={tx._id} tx={tx} />)}
              </div>
            )}
            {!loading && recentTx.length > 0 && (
              <div style={{
                padding: "10px 16px",
                borderTop: "1px solid #0a0f1a",
                fontSize: 10, color: "#334155", textAlign: "center",
              }}>
                Showing last {recentTx.length} transactions
              </div>
            )}
          </div>

        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a1500; border-radius: 99px; }
        button:disabled { opacity: 0.4; cursor: not-allowed !important; }
      `}</style>
    </div>
  );
}