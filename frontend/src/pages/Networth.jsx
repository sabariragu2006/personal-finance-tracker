import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

const BASE = import.meta.env.VITE_API_URL;
const ASSETS_API       = `${BASE}/api/assets`;
const LIABILITIES_API  = `${BASE}/api/liabilities`;
const TRANSACTIONS_API = `${BASE}/api/transactions`;

const fmt = (val) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val || 0);
const fmtFull = (val) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
const fmtDateLong = (d) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const gainColor  = (v) => (v > 0 ? "#2dd4bf" : v < 0 ? "#f87171" : "#64748b");
const gainPrefix = (v) => (v > 0 ? "+" : "");

// ─── Timeline builder ─────────────────────────────────────────────────────────
//
// NET WORTH CHART PHILOSOPHY:
// The line only moves on REAL CASH EVENTS:
//   asset_create  → cost basis appears   (rises)
//   asset_buy     → cost basis increases (rises)
//   asset_sell    → cost basis decreases (drops)
//   asset_value_update → IGNORED — unrealized, no real money moved
//
// This means market value changes never affect the chart.
// Only selling an asset actually reduces net worth here.

function dayBefore(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

// Reconstruct cost basis of one asset at a given date using transactions.
// Returns 0 if the asset had no capital events on or before that date.
function getAssetCostBasisAtDate(assetId, transactions, date) {
  const relevant = transactions
    .filter((t) => {
      if (String(t.entity_id) !== String(assetId)) return false;
      if (!["asset_create", "asset_buy", "asset_sell"].includes(t.type)) return false;
      return new Date(t.transaction_date).toISOString().split("T")[0] <= date;
    })
    .sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

  if (relevant.length === 0) return 0;

  let basis = 0;
  for (const t of relevant) {
    if (t.type === "asset_create") {
      basis = t.amount; // initial invested_value
    } else if (t.type === "asset_buy") {
      basis += t.amount;
    } else if (t.type === "asset_sell") {
      // Backend stores value_after = new invested_value after proportional reduction
      if (t.value_after !== null && t.value_after !== undefined) {
        basis = t.value_after;
      } else {
        basis = Math.max(0, basis - t.amount); // fallback
      }
    }
  }
  return Math.max(0, basis);
}

function buildTimeline(assets, liabilities, transactions) {
  const dateSet = new Set();

  // Capital-movement dates drive the timeline
  transactions.forEach((t) => {
    if (!["asset_create", "asset_buy", "asset_sell"].includes(t.type)) return;
    const d = new Date(t.transaction_date).toISOString().split("T")[0];
    dateSet.add(d);
    // Zero-anchor the day before creation so the chart rises from $0
    if (t.type === "asset_create") dateSet.add(dayBefore(d));
  });

  liabilities.forEach((l) => {
    if (l.createdAt) dateSet.add(new Date(l.createdAt).toISOString().split("T")[0]);
    (l.payment_history || []).forEach((s) =>
      dateSet.add(new Date(s.recorded_at).toISOString().split("T")[0])
    );
  });

  dateSet.add(new Date().toISOString().split("T")[0]);

  return Array.from(dateSet).sort().map((date) => {
    const totalAssets = assets.reduce(
      (sum, a) => sum + getAssetCostBasisAtDate(a._id, transactions, date),
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
      label: fmtDate(date),
      totalAssets: Math.round(totalAssets),
      totalLiabilities: Math.round(totalLiabilities),
      netWorth: Math.round(totalAssets - totalLiabilities),
    };
  });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  const nw = data.netWorth;
  return (
    <div style={ttS.wrap}>
      <div style={ttS.date}>{fmtDateLong(data.date)}</div>
      <div style={ttS.row}><span style={{ ...ttS.dot, background: "#6366f1" }} /><span style={ttS.label}>Assets</span><span style={ttS.value}>{fmtFull(data.totalAssets)}</span></div>
      <div style={ttS.row}><span style={{ ...ttS.dot, background: "#f87171" }} /><span style={ttS.label}>Liabilities</span><span style={ttS.value}>{fmtFull(data.totalLiabilities)}</span></div>
      <div style={ttS.divider} />
      <div style={ttS.row}><span style={{ ...ttS.dot, background: gainColor(nw) }} /><span style={{ ...ttS.label, color: "#e2e8f0" }}>Net Worth</span><span style={{ ...ttS.value, color: gainColor(nw), fontWeight: 600 }}>{gainPrefix(nw)}{fmtFull(nw)}</span></div>
    </div>
  );
}
const ttS = {
  wrap:    { background: "rgba(10,15,30,0.97)", border: "1px solid #1e293b", borderRadius: 12, padding: "14px 18px", fontFamily: "'DM Mono',monospace", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", minWidth: 220 },
  date:    { fontSize: 11, letterSpacing: "0.1em", color: "#475569", marginBottom: 10 },
  row:     { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  dot:     { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  label:   { fontSize: 12, color: "#64748b", flex: 1 },
  value:   { fontSize: 13, color: "#cbd5e1" },
  divider: { height: 1, background: "#1e293b", margin: "8px 0" },
};

// ─── Range filter ─────────────────────────────────────────────────────────────
const RANGES = ["1M", "3M", "6M", "1Y", "ALL"];
function filterByRange(data, range) {
  if (range === "ALL" || !data.length) return data;
  const now = new Date();
  const months = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 }[range];
  const cutoff = new Date(now.setMonth(now.getMonth() - months)).toISOString().split("T")[0];
  const filtered = data.filter((d) => d.date >= cutoff);
  return filtered.length > 0 ? filtered : data;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, dimColor }) {
  return (
    <div style={{ ...cS.card, borderColor: `${color}22` }}>
      <div style={{ ...cS.dot, background: color }} />
      <span style={{ ...cS.label, color: dimColor }}>{label}</span>
      <span style={{ ...cS.value, color }}>{value}</span>
      {sub && <span style={cS.sub}>{sub}</span>}
    </div>
  );
}
const cS = {
  card:  { display: "flex", flexDirection: "column", gap: 4, padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid", borderRadius: 14, position: "relative", flex: 1, minWidth: 140 },
  dot:   { position: "absolute", top: 16, right: 16, width: 6, height: 6, borderRadius: "50%" },
  label: { fontSize: 10, letterSpacing: "0.18em" },
  value: { fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px", fontFamily: "'DM Serif Display',serif" },
  sub:   { fontSize: 11, color: "#475569", marginTop: 2 },
};

// ─── Breakdown Bar ────────────────────────────────────────────────────────────
function BreakdownBar({ assets, liabilities }) {
  const ta = assets.reduce((s, a) => s + (a.current_value || a.invested_value || 0), 0);
  const tl = liabilities.reduce((s, l) => s + (l.current_balance || 0), 0);
  const total = ta + tl;
  if (!total) return null;
  return (
    <div style={bbS.wrap}>
      <div style={bbS.header}><span style={bbS.title}>Portfolio Composition</span></div>
      <div style={bbS.bar}>
        <div style={{ ...bbS.seg, width: `${(ta/total)*100}%`, background: "linear-gradient(90deg,#4338ca,#6366f1)" }} />
        <div style={{ ...bbS.seg, width: `${(tl/total)*100}%`, background: "linear-gradient(90deg,#dc2626,#f87171)" }} />
      </div>
      <div style={bbS.legend}>
        <div style={bbS.li}><span style={{ ...bbS.ld, background: "#6366f1" }} /><span style={bbS.ll}>Assets</span><span style={bbS.lv}>{fmt(ta)}</span><span style={bbS.lp}>{((ta/total)*100).toFixed(1)}%</span></div>
        <div style={bbS.li}><span style={{ ...bbS.ld, background: "#f87171" }} /><span style={bbS.ll}>Liabilities</span><span style={bbS.lv}>{fmt(tl)}</span><span style={bbS.lp}>{((tl/total)*100).toFixed(1)}%</span></div>
      </div>
    </div>
  );
}
const bbS = {
  wrap:   { padding: "20px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: 16, marginBottom: 20 },
  header: { marginBottom: 14 },
  title:  { fontSize: 11, letterSpacing: "0.18em", color: "#475569" },
  bar:    { display: "flex", height: 8, borderRadius: 99, overflow: "hidden", background: "#0f172a", marginBottom: 14, gap: 2 },
  seg:    { height: "100%", borderRadius: 99, transition: "width 0.6s ease" },
  legend: { display: "flex", gap: 32 },
  li:     { display: "flex", alignItems: "center", gap: 8 },
  ld:     { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  ll:     { fontSize: 12, color: "#64748b" },
  lv:     { fontSize: 13, color: "#cbd5e1", fontWeight: 500, fontFamily: "'DM Mono',monospace" },
  lp:     { fontSize: 11, color: "#475569" },
};

// ─── Summary List ─────────────────────────────────────────────────────────────
function SummaryList({ items, type }) {
  const isA = type === "asset";
  const sorted = [...items]
    .sort((a, b) => isA ? (b.current_value||b.invested_value)-(a.current_value||a.invested_value) : b.current_balance-a.current_balance)
    .slice(0, 5);
  const total = items.reduce((s, i) => s + (isA ? (i.current_value||i.invested_value||0) : (i.current_balance||0)), 0);
  return (
    <div style={slS.wrap}>
      <div style={slS.header}>
        <span style={{ ...slS.title, color: isA ? "#818cf8" : "#f87171" }}>{isA ? "▲ TOP ASSETS" : "▼ TOP LIABILITIES"}</span>
        <span style={slS.total}>{fmt(total)}</span>
      </div>
      {sorted.map((item, i) => {
        const val = isA ? (item.current_value||item.invested_value||0) : (item.current_balance||0);
        const pct = total ? (val/total)*100 : 0;
        const col = isA ? "#6366f1" : "#ef4444";
        return (
          <div key={item._id||i} style={slS.row}>
            <div style={slS.rowL}>
              <div style={{ ...slS.av, background: `${col}22`, color: col, border: `1px solid ${col}33` }}>
                {(isA ? item.asset_name : item.liability_name)?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={slS.name}>{isA ? item.asset_name : item.liability_name}</div>
                <div style={slS.sub}>{isA ? item.institution : item.lender}</div>
              </div>
            </div>
            <div style={slS.rowR}>
              <span style={{ ...slS.val, color: isA ? "#a5b4fc" : "#fca5a5" }}>{fmt(val)}</span>
              <div style={slS.mb}><div style={{ ...slS.mf, width: `${pct}%`, background: col }} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
const slS = {
  wrap:  { padding: "20px 22px", background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: 16, flex: 1 },
  header:{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 10, letterSpacing: "0.18em" },
  total: { fontSize: 13, color: "#475569", fontFamily: "'DM Mono',monospace" },
  row:   { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #0f172a" },
  rowL:  { display: "flex", alignItems: "center", gap: 10 },
  av:    { width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: "'DM Serif Display',serif" },
  name:  { fontSize: 13, color: "#cbd5e1", fontWeight: 500 },
  sub:   { fontSize: 11, color: "#475569" },
  rowR:  { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  val:   { fontSize: 13, fontWeight: 500, fontFamily: "'DM Mono',monospace" },
  mb:    { width: 60, height: 3, background: "#1e293b", borderRadius: 99, overflow: "hidden" },
  mf:    { height: "100%", borderRadius: 99, transition: "width 0.5s ease" },
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NetWorth({ token }) {
  const [assets,       setAssets]       = useState([]);
  const [liabilities,  setLiabilities]  = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [range,        setRange]        = useState("ALL");

  useEffect(() => {
    (async () => {
      try {
        const h = { Authorization: `Bearer ${token}` };
        const [aRes, lRes, tRes] = await Promise.all([
          fetch(ASSETS_API,       { headers: h }),
          fetch(LIABILITIES_API,  { headers: h }),
          fetch(TRANSACTIONS_API, { headers: h }),
        ]);
        if (!aRes.ok || !lRes.ok || !tRes.ok) throw new Error("Failed to load data.");
        const [aData, lData, tData] = await Promise.all([aRes.json(), lRes.json(), tRes.json()]);
        setAssets(aData);
        setLiabilities(lData);
        // Support both { transactions: [...] } and bare array responses
        setTransactions(Array.isArray(tData) ? tData : (tData.transactions || []));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const timeline  = useMemo(() => buildTimeline(assets, liabilities, transactions), [assets, liabilities, transactions]);
  const chartData = useMemo(() => filterByRange(timeline, range), [timeline, range]);

  const latest      = chartData[chartData.length - 1] || {};
  const earliest    = chartData[0] || {};
  const netWorth    = latest.netWorth         || 0;
  const totalAssets = latest.totalAssets      || 0;
  const totalLiab   = latest.totalLiabilities || 0;
  const change      = netWorth - (earliest.netWorth || 0);
  const changePct   = earliest.netWorth ? (change / Math.abs(earliest.netWorth)) * 100 : 0;
  const minVal      = Math.min(...chartData.map((d) => Math.min(d.totalAssets, d.totalLiabilities, d.netWorth)), 0);
  const maxVal      = Math.max(...chartData.map((d) => Math.max(d.totalAssets, d.totalLiabilities, d.netWorth)), 0);
  const yPad        = (maxVal - minVal) * 0.12;

  if (loading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={S.grain} />
      <p style={{ fontFamily: "'DM Mono',monospace", color: "#334155", fontSize: 13, zIndex: 1 }}>Computing net worth…</p>
    </div>
  );

  if (error) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={S.grain} />
      <p style={{ fontFamily: "'DM Mono',monospace", color: "#f87171", fontSize: 13, zIndex: 1 }}>{error}</p>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.grain} />
      <div style={S.container}>

        <div style={S.pageHeader}>
          <div>
            <p style={S.eyebrow}>FINANCIAL OVERVIEW</p>
            <h1 style={S.title}>Net Worth</h1>
          </div>
          <div style={S.nwBox}>
            <span style={S.nwLabel}>CURRENT NET WORTH</span>
            <span style={{ ...S.nwValue, color: gainColor(netWorth) }}>{fmtFull(netWorth)}</span>
            {change !== 0 && (
              <span style={{ ...S.nwChange, color: gainColor(change) }}>
                {gainPrefix(change)}{fmtFull(change)} ({gainPrefix(changePct)}{changePct.toFixed(1)}%) in period
              </span>
            )}
          </div>
        </div>

        <div style={S.statsGrid}>
          <StatCard label="TOTAL ASSETS"      value={fmt(totalAssets)} sub={`${assets.length} position${assets.length!==1?"s":""}`}              color="#818cf8" dimColor="#4338ca" />
          <StatCard label="TOTAL LIABILITIES" value={fmt(totalLiab)}   sub={`${liabilities.length} liabilit${liabilities.length!==1?"ies":"y"}`} color="#f87171" dimColor="#dc2626" />
          <StatCard label="NET WORTH"          value={fmt(netWorth)}    sub={netWorth>=0?"Positive position":"Net negative"}                       color={gainColor(netWorth)} dimColor={gainColor(netWorth)} />
          <StatCard label="DEBT RATIO"         value={totalAssets?`${((totalLiab/totalAssets)*100).toFixed(1)}%`:"—"} sub="Liabilities / Assets"  color="#fb923c" dimColor="#c2410c" />
        </div>

        <div style={S.chartCard}>
          <div style={S.chartHeader}>
            <div>
              <span style={S.chartTitle}>Net Worth Over Time</span>
              <span style={S.chartSub}>
                {chartData.length > 1
                  ? `${fmtDateLong(chartData[0].date)} — ${fmtDateLong(chartData[chartData.length-1].date)}`
                  : "Tracking begins when you add history"}
              </span>
            </div>
            <div style={S.rangeRow}>
              {RANGES.map((r) => (
                <button key={r} style={{ ...S.rangeBtn, ...(range===r ? S.rangeBtnA : {}) }} onClick={() => setRange(r)}>{r}</button>
              ))}
            </div>
          </div>

          {chartData.length < 2 ? (
            <div style={S.empty}>
              <span style={S.emptyIcon}>◈</span>
              <p style={S.emptyText}>Not enough history yet. Add assets or record transactions to build your timeline.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/></linearGradient>
                  <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#f87171" stopOpacity={0.2} /><stop offset="95%" stopColor="#f87171" stopOpacity={0.02}/></linearGradient>
                  <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#2dd4bf" stopOpacity={0.3} /><stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.02}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill:"#334155", fontSize:11, fontFamily:"'DM Mono',monospace" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v)=>fmt(v)} tick={{ fill:"#334155", fontSize:10, fontFamily:"'DM Mono',monospace" }} axisLine={false} tickLine={false} domain={[minVal-yPad, maxVal+yPad]} width={90} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke:"#1e293b", strokeWidth:1 }} />
                <ReferenceLine y={0} stroke="#1e293b" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="totalAssets"      name="Assets"      stroke="#6366f1" strokeWidth={1.5} fill="url(#gA)" dot={false} activeDot={{ r:4, fill:"#6366f1", stroke:"#0f172a", strokeWidth:2 }} />
                <Area type="monotone" dataKey="totalLiabilities" name="Liabilities" stroke="#f87171" strokeWidth={1.5} fill="url(#gL)" dot={false} activeDot={{ r:4, fill:"#f87171", stroke:"#0f172a", strokeWidth:2 }} />
                <Area type="monotone" dataKey="netWorth"         name="Net Worth"   stroke="#2dd4bf" strokeWidth={2.5} fill="url(#gN)" dot={false} activeDot={{ r:5, fill:"#2dd4bf", stroke:"#0f172a", strokeWidth:2 }} />
                <Legend wrapperStyle={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#475569", paddingTop:16, letterSpacing:"0.06em" }} iconType="circle" iconSize={7} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <BreakdownBar assets={assets} liabilities={liabilities} />

        {(assets.length > 0 || liabilities.length > 0) && (
          <div style={S.listsRow}>
            {assets.length      > 0 && <SummaryList items={assets}      type="asset" />}
            {liabilities.length > 0 && <SummaryList items={liabilities} type="liability" />}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

const S = {
  page:       { minHeight:"100vh", background:"linear-gradient(135deg,#060912 0%,#090f1f 50%,#060b18 100%)", fontFamily:"'DM Mono',monospace", color:"#e2e8f0", position:"relative" },
  grain:      { position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")` },
  container:  { position:"relative", zIndex:1, maxWidth:1060, margin:"0 auto", padding:"56px 24px 80px", animation:"fadeUp 0.5s ease both" },
  pageHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:24, marginBottom:32 },
  eyebrow:    { fontSize:11, letterSpacing:"0.2em", color:"#1e3a5f", marginBottom:6 },
  title:      { fontFamily:"'DM Serif Display',serif", fontSize:52, fontWeight:400, color:"#f0f9ff", lineHeight:1, letterSpacing:"-1px" },
  nwBox:      { display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, padding:"16px 22px", background:"rgba(45,212,191,0.04)", border:"1px solid rgba(45,212,191,0.12)", borderRadius:14 },
  nwLabel:    { fontSize:10, letterSpacing:"0.2em", color:"#0d9488" },
  nwValue:    { fontFamily:"'DM Serif Display',serif", fontSize:36, fontWeight:400, letterSpacing:"-1px", lineHeight:1 },
  nwChange:   { fontSize:12, letterSpacing:"0.02em" },
  statsGrid:  { display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 },
  chartCard:  { padding:"24px", background:"rgba(255,255,255,0.02)", border:"1px solid #0f1e35", borderRadius:18, marginBottom:20, minWidth:0, width:"100%" },
  chartHeader:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14, marginBottom:24 },
  chartTitle: { display:"block", fontSize:14, fontWeight:500, color:"#94a3b8", letterSpacing:"0.02em", marginBottom:4 },
  chartSub:   { display:"block", fontSize:11, color:"#1e3a5f" },
  rangeRow:   { display:"flex", gap:4 },
  rangeBtn:   { padding:"5px 12px", background:"transparent", border:"1px solid #1e293b", borderRadius:7, color:"#334155", fontSize:11, fontFamily:"'DM Mono',monospace", cursor:"pointer", letterSpacing:"0.06em", transition:"all 0.15s" },
  rangeBtnA:  { background:"rgba(45,212,191,0.1)", borderColor:"rgba(45,212,191,0.3)", color:"#2dd4bf" },
  empty:      { height:240, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 },
  emptyIcon:  { fontSize:36, color:"#0f172a" },
  emptyText:  { fontSize:13, color:"#1e293b", maxWidth:320, textAlign:"center", lineHeight:1.6 },
  listsRow:   { display:"flex", gap:16, flexWrap:"wrap" },
};