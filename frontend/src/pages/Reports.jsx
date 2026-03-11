import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Sector,
} from "recharts";

const ASSETS_API      = "https://maadala.onrender.com/api/assets";
const LIABILITIES_API = "https://maadala.onrender.com/api/liabilities";
const TRANSACTIONS_API = "https://maadala.onrender.com/api/transactions/summary";

// ─── Palette — 12 distinct slices, rich but not garish ───────────────────────
const PALETTE = [
  "#c084fc", "#60a5fa", "#34d399", "#fbbf24", "#f87171",
  "#38bdf8", "#a78bfa", "#4ade80", "#fb923c", "#e879f9",
  "#2dd4bf", "#f472b6",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v || 0);

const fmtFull = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v || 0);

const fmtPct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

const gainColor = (v) => (v > 0 ? "#4ade80" : v < 0 ? "#f87171" : "#64748b");

// ─── Custom Active Shape (inflates hovered slice) ─────────────────────────────
function ActiveShape(props) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent,
  } = props;

  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
      />
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 14}
        outerRadius={outerRadius + 17}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.5}
      />
    </g>
  );
}

// ─── Donut chart with SVG center label ───────────────────────────────────────
function DonutChart({ data, label, sublabel, colorKey = "color" }) {
  const [activeIdx, setActiveIdx] = useState(null);

  const active = activeIdx !== null ? data[activeIdx] : null;
  const centerLabel  = active ? active.name       : label;
  const centerSub    = active ? fmt(active.value)  : sublabel;
  const centerColor  = active ? active[colorKey]   : "#e2e8f0";

  return (
    <div style={{ position: "relative", width: "100%", height: 280, minWidth: 0, display: "flex", justifyContent: "center" }}>
      <PieChart width={280} height={280}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={88}
            outerRadius={118}
            dataKey="value"
            paddingAngle={2}
            activeIndex={activeIdx}
            activeShape={ActiveShape}
            onMouseEnter={(_, idx) => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
            animationBegin={0}
            animationDuration={900}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry[colorKey]}
                opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
                style={{ cursor: "pointer", outline: "none" }}
              />
            ))}
          </Pie>
        </PieChart>

      {/* Center label — absolutely positioned over the hole */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        pointerEvents: "none",
        width: 160,
      }}>
        <div style={{
          fontSize: active ? 11 : 10,
          letterSpacing: "0.12em",
          color: active ? centerColor : "#475569",
          marginBottom: 4,
          transition: "color 0.2s",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontFamily: "'DM Mono', monospace",
        }}>
          {centerLabel.length > 16 ? centerLabel.slice(0, 15) + "…" : centerLabel}
        </div>
        <div style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: active ? 20 : 17,
          color: active ? centerColor : "#f1f5f9",
          letterSpacing: "-0.5px",
          lineHeight: 1,
          transition: "all 0.2s",
        }}>
          {centerSub}
        </div>
        {active && (
          <div style={{
            fontSize: 10,
            color: "#475569",
            marginTop: 5,
            fontFamily: "'DM Mono', monospace",
          }}>
            {(active.pct || 0).toFixed(1)}% of total
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared legend strip ──────────────────────────────────────────────────────
function Legend({ items }) {
  return (
    <div style={lgStyles.wrap}>
      {items.map((item, i) => (
        <div key={i} style={lgStyles.row}>
          <span style={{ ...lgStyles.dot, background: item.color }} />
          <span style={lgStyles.name} title={item.name}>
            {item.name.length > 18 ? item.name.slice(0, 17) + "…" : item.name}
          </span>
          <span style={lgStyles.pct}>{(item.pct || 0).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

const lgStyles = {
  wrap: {
    display: "flex", flexDirection: "column", gap: 6,
    padding: "0 4px", maxHeight: 240, overflowY: "auto",
  },
  row: { display: "flex", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  name: { flex: 1, fontSize: 12, color: "#64748b", letterSpacing: "0.02em" },
  pct: { fontSize: 11, color: "#475569", fontFamily: "'DM Mono', monospace", minWidth: 36, textAlign: "right" },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, accent, icon }) {
  return (
    <div style={{ ...kpiStyles.card, borderColor: `${accent}22` }}>
      <div style={{ ...kpiStyles.iconWrap, background: `${accent}14`, color: accent }}>
        {icon}
      </div>
      <div>
        <div style={{ ...kpiStyles.label, color: `${accent}99` }}>{label}</div>
        <div style={{ ...kpiStyles.value, color: accent }}>{value}</div>
        {sub && <div style={kpiStyles.sub}>{sub}</div>}
      </div>
    </div>
  );
}

const kpiStyles = {
  card: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "16px 20px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid",
    borderRadius: 14, flex: 1, minWidth: 150,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18,
  },
  label: { fontSize: 10, letterSpacing: "0.15em", marginBottom: 3 },
  value: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 22, fontWeight: 400, letterSpacing: "-0.5px", lineHeight: 1,
  },
  sub: { fontSize: 11, color: "#475569", marginTop: 3 },
};

// ─── Gain / Loss table ────────────────────────────────────────────────────────
function GainLossTable({ assets, sortKey, sortDir, onSort }) {
  const sorted = [...assets].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={{ color: "#1e293b", fontSize: 10 }}>⇅</span>;
    return <span style={{ color: "#e2b55a", fontSize: 10 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const Th = ({ col, label, align = "right" }) => (
    <th
      style={{ ...tblStyles.th, textAlign: align, cursor: "pointer" }}
      onClick={() => onSort(col)}
    >
      {label} <SortIcon col={col} />
    </th>
  );

  return (
    <div style={tblStyles.wrap}>
      <table style={tblStyles.table}>
        <thead>
          <tr>
            <th style={{ ...tblStyles.th, textAlign: "left" }}>ASSET</th>
            <Th col="institution" label="INSTITUTION" align="left" />
            <Th col="invested_value" label="INVESTED" />
            <Th col="current_value"  label="CURRENT" />
            <Th col="gain"           label="GAIN / LOSS" />
            <Th col="gainPct"        label="RETURN %" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((asset, i) => {
            const gain    = asset.gain    || 0;
            const gainPct = asset.gainPct || 0;
            return (
              <tr
                key={asset._id || i}
                style={tblStyles.row}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ ...tblStyles.td, textAlign: "left" }}>
                  <div style={tblStyles.assetCell}>
                    <div
                      style={{
                        ...tblStyles.dot,
                        background: PALETTE[i % PALETTE.length],
                      }}
                    />
                    <div>
                      <div style={tblStyles.assetName}>{asset.asset_name}</div>
                    </div>
                  </div>
                </td>
                <td style={{ ...tblStyles.td, textAlign: "left", color: "#475569", fontSize: 12 }}>
                  {asset.institution}
                </td>
                <td style={{ ...tblStyles.td, color: "#94a3b8" }}>
                  {fmtFull(asset.invested_value)}
                </td>
                <td style={{ ...tblStyles.td, color: "#e2e8f0", fontWeight: 500 }}>
                  {fmtFull(asset.current_value || asset.invested_value)}
                </td>
                <td style={{ ...tblStyles.td, color: gainColor(gain), fontWeight: 500 }}>
                  {gain >= 0 ? "+" : ""}{fmtFull(gain)}
                </td>
                <td style={tblStyles.td}>
                  <span style={{
                    ...tblStyles.pctBadge,
                    color: gainColor(gainPct),
                    background: `${gainColor(gainPct)}14`,
                    border: `1px solid ${gainColor(gainPct)}33`,
                  }}>
                    {fmtPct(gainPct)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const tblStyles = {
  wrap: {
    overflowX: "auto",
    background: "rgba(255,255,255,0.015)",
    border: "1px solid #0f172a",
    borderRadius: 14,
  },
  table: {
    width: "100%", borderCollapse: "collapse",
    fontFamily: "'DM Mono', monospace",
  },
  th: {
    padding: "10px 16px",
    fontSize: 10, letterSpacing: "0.14em", color: "#334155",
    background: "rgba(0,0,0,0.25)",
    borderBottom: "1px solid #0f172a",
    fontWeight: 400, whiteSpace: "nowrap",
    userSelect: "none",
  },
  row: {
    borderBottom: "1px solid #0a0f1a",
    transition: "background 0.12s",
    cursor: "default",
  },
  td: {
    padding: "13px 16px",
    fontSize: 13, textAlign: "right",
    color: "#64748b",
    fontFamily: "'DM Mono', monospace",
    whiteSpace: "nowrap",
  },
  assetCell: { display: "flex", alignItems: "center", gap: 10 },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  assetName: { fontSize: 13, color: "#cbd5e1", fontWeight: 500 },
  pctBadge: {
    display: "inline-block",
    padding: "3px 8px", borderRadius: 20,
    fontSize: 11, fontWeight: 500,
  },
};

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#3d2e05", marginBottom: 4 }}>
        {eyebrow}
      </div>
      <div style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 20, color: "#fef3c7", letterSpacing: "-0.3px",
      }}>
        {title}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [assets,      setAssets]      = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [txSummary,   setTxSummary]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [sortKey,     setSortKey]     = useState("gainPct");
  const [sortDir,     setSortDir]     = useState("desc");

  useEffect(() => {
    (async () => {
      try {
        const [aRes, lRes, tRes] = await Promise.all([
          fetch(ASSETS_API),
          fetch(LIABILITIES_API),
          fetch(TRANSACTIONS_API),
        ]);
        if (!aRes.ok) throw new Error("Failed to load assets.");
        const [aData, lData, tData] = await Promise.all([
          aRes.json(),
          lRes.ok ? lRes.json() : [],
          tRes.ok ? tRes.json() : null,
        ]);
        setAssets(aData);
        setLiabilities(lData);
        setTxSummary(tData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSort = useCallback((col) => {
    setSortDir((d) => (sortKey === col ? (d === "desc" ? "asc" : "desc") : "desc"));
    setSortKey(col);
  }, [sortKey]);

  // ── Enrich assets with computed fields ──
  const enriched = assets.map((a, i) => ({
    ...a,
    current_value: a.current_value ?? a.invested_value,
    gain:    (a.current_value ?? a.invested_value) - a.invested_value,
    gainPct: a.invested_value
      ? (((a.current_value ?? a.invested_value) - a.invested_value) / a.invested_value) * 100
      : 0,
    color: PALETTE[i % PALETTE.length],
  }));

  // ── Totals ──
  const totalInvested = enriched.reduce((s, a) => s + a.invested_value, 0);
  const totalCurrent  = enriched.reduce((s, a) => s + a.current_value,  0);
  const totalGain     = totalCurrent - totalInvested;
  const totalGainPct  = totalInvested ? (totalGain / totalInvested) * 100 : 0;
  const totalLiab     = liabilities.reduce((s, l) => s + (l.current_balance || 0), 0);
  const netWorth      = totalCurrent - totalLiab;

  // ── Donut data ──
  const currentPieData = enriched.map((a) => ({
    name:  a.asset_name,
    value: a.current_value,
    pct:   totalCurrent ? (a.current_value / totalCurrent) * 100 : 0,
    color: a.color,
  }));

  const investedPieData = enriched.map((a) => ({
    name:  a.asset_name,
    value: a.invested_value,
    pct:   totalInvested ? (a.invested_value / totalInvested) * 100 : 0,
    color: a.color,
  }));

  // ── Top winner / loser ──
  const winner = [...enriched].sort((a, b) => b.gainPct - a.gainPct)[0];
  const loser  = [...enriched].sort((a, b) => a.gainPct - b.gainPct)[0];

  // ── Tx summary stats ──
  const txBreakdown = txSummary?.typeBreakdown || [];
  const totalBuys   = txBreakdown.find((t) => t._id === "asset_buy")?.total_amount   || 0;
  const totalSells  = txBreakdown.find((t) => t._id === "asset_sell")?.total_amount  || 0;
  const totalPays   = txBreakdown.find((t) => t._id === "liability_payment")?.total_amount || 0;

  if (loading) return (
    <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={styles.grain} />
      <p style={{ fontFamily: "'DM Mono', monospace", color: "#3d2e05", fontSize: 13, zIndex: 1 }}>
        Generating report…
      </p>
    </div>
  );

  if (error) return (
    <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={styles.grain} />
      <p style={{ fontFamily: "'DM Mono', monospace", color: "#f87171", fontSize: 13, zIndex: 1 }}>{error}</p>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.grain} />
      <div style={styles.container}>

        {/* ── Page Header ── */}
        <div style={styles.pageHeader}>
          <div>
            <p style={styles.pageEyebrow}>ANALYTICS</p>
            <h1 style={styles.pageTitle}>Reports</h1>
          </div>
          <div style={styles.headerMeta}>
            <span style={styles.headerMetaLabel}>PORTFOLIO OVERVIEW</span>
            <span style={styles.headerMetaValue}>{enriched.length} assets · {liabilities.length} liabilities</span>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div style={styles.kpiRow}>
          <KPICard
            label="TOTAL INVESTED"
            value={fmt(totalInvested)}
            sub={`Across ${enriched.length} positions`}
            accent="#e2b55a"
            icon="◈"
          />
          <KPICard
            label="CURRENT VALUE"
            value={fmt(totalCurrent)}
            sub={`${totalGain >= 0 ? "+" : ""}${fmt(totalGain)} all time`}
            accent="#c084fc"
            icon="◉"
          />
          <KPICard
            label="TOTAL RETURN"
            value={fmtPct(totalGainPct)}
            sub={totalGain >= 0 ? "Portfolio is up" : "Portfolio is down"}
            accent={gainColor(totalGain)}
            icon={totalGain >= 0 ? "↑" : "↓"}
          />
          <KPICard
            label="NET WORTH"
            value={fmt(netWorth)}
            sub={`After ${fmt(totalLiab)} liabilities`}
            accent="#2dd4bf"
            icon="⬡"
          />
        </div>

        <div style={styles.divider} />

        {/* ── Donut Charts ── */}
        <SectionHeader eyebrow="ALLOCATION" title="Asset Distribution" />

        <div style={styles.chartsRow}>
          {/* Current Value Donut */}
          <div style={styles.chartCard}>
            <div style={styles.chartCardHeader}>
              <div style={styles.chartCardTag}>CURRENT VALUE</div>
              <div style={styles.chartCardTotal}>{fmt(totalCurrent)}</div>
            </div>
            {enriched.length === 0 ? (
              <div style={styles.emptyChart}>No assets yet</div>
            ) : (
              <>
                <DonutChart
                  data={currentPieData}
                  label="CURRENT VALUE"
                  sublabel={fmt(totalCurrent)}
                />
                <Legend items={currentPieData} />
              </>
            )}
          </div>

          {/* Invested Value Donut */}
          <div style={styles.chartCard}>
            <div style={styles.chartCardHeader}>
              <div style={styles.chartCardTag}>INVESTED VALUE</div>
              <div style={styles.chartCardTotal}>{fmt(totalInvested)}</div>
            </div>
            {enriched.length === 0 ? (
              <div style={styles.emptyChart}>No assets yet</div>
            ) : (
              <>
                <DonutChart
                  data={investedPieData}
                  label="INVESTED VALUE"
                  sublabel={fmt(totalInvested)}
                />
                <Legend items={investedPieData} />
              </>
            )}
          </div>

          {/* Highlights panel */}
          <div style={styles.highlightsPanel}>
            <div style={styles.chartCardTag} >HIGHLIGHTS</div>

            {winner && (
              <div style={styles.highlightCard}>
                <div style={styles.hlLabel}>BEST PERFORMER</div>
                <div style={styles.hlName}>{winner.asset_name}</div>
                <div style={{ ...styles.hlValue, color: "#4ade80" }}>
                  {fmtPct(winner.gainPct)}
                </div>
                <div style={styles.hlSub}>{winner.institution}</div>
              </div>
            )}

            {loser && loser._id !== winner?._id && (
              <div style={{ ...styles.highlightCard, borderColor: "rgba(248,113,113,0.15)" }}>
                <div style={styles.hlLabel}>NEEDS ATTENTION</div>
                <div style={styles.hlName}>{loser.asset_name}</div>
                <div style={{ ...styles.hlValue, color: "#f87171" }}>
                  {fmtPct(loser.gainPct)}
                </div>
                <div style={styles.hlSub}>{loser.institution}</div>
              </div>
            )}

            {txSummary && (
              <div style={styles.txSummaryCard}>
                <div style={styles.hlLabel}>ACTIVITY SUMMARY</div>
                <div style={styles.txRow}>
                  <span style={styles.txLabel}>Total Transactions</span>
                  <span style={styles.txVal}>{txSummary.totalCount}</span>
                </div>
                <div style={styles.txRow}>
                  <span style={styles.txLabel}>Total Bought</span>
                  <span style={{ ...styles.txVal, color: "#4ade80" }}>{fmt(totalBuys)}</span>
                </div>
                <div style={styles.txRow}>
                  <span style={styles.txLabel}>Total Sold</span>
                  <span style={{ ...styles.txVal, color: "#f87171" }}>{fmt(totalSells)}</span>
                </div>
                <div style={styles.txRow}>
                  <span style={styles.txLabel}>Debt Payments</span>
                  <span style={{ ...styles.txVal, color: "#2dd4bf" }}>{fmt(totalPays)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.divider} />

        {/* ── Gain/Loss Table ── */}
        <SectionHeader eyebrow="PERFORMANCE" title="Asset Gain / Loss Breakdown" />

        {enriched.length === 0 ? (
          <div style={styles.centerState}>
            <div style={styles.emptyIcon}>◈</div>
            <p style={styles.stateTitle}>No assets to report</p>
            <p style={styles.stateText}>Add assets to see your performance breakdown here.</p>
          </div>
        ) : (
          <GainLossTable
            assets={enriched}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )}

        {/* ── Liability Summary ── */}
        {liabilities.length > 0 && (
          <>
            <div style={{ ...styles.divider, marginTop: 36 }} />
            <SectionHeader eyebrow="DEBT" title="Liability Summary" />
            <div style={styles.liabGrid}>
              {liabilities.map((l, i) => {
                const paidOff = l.original_amount - l.current_balance;
                const pct     = l.original_amount ? (paidOff / l.original_amount) * 100 : 0;
                return (
                  <div key={l._id || i} style={styles.liabCard}>
                    <div style={styles.liabTop}>
                      <div>
                        <div style={styles.liabName}>{l.liability_name}</div>
                        <div style={styles.liabSub}>{l.lender}</div>
                      </div>
                      <div style={styles.liabBal}>{fmt(l.current_balance)}</div>
                    </div>
                    <div style={styles.liabBarWrap}>
                      <div style={{ ...styles.liabBarFill, width: `${pct}%` }} />
                    </div>
                    <div style={styles.liabMeta}>
                      <span style={{ color: "#4ade80" }}>{pct.toFixed(1)}% paid off</span>
                      {l.interest_rate > 0 && (
                        <span style={{ color: "#fb923c" }}>{l.interest_rate}% p.a.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 99px; }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(150deg, #070508 0%, #0c0a02 40%, #080709 100%)",
    fontFamily: "'DM Mono', monospace",
    color: "#e2e8f0",
    position: "relative",
  },
  grain: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")`,
  },
  container: {
    position: "relative", zIndex: 1,
    maxWidth: 1100, margin: "0 auto",
    padding: "56px 24px 100px",
    animation: "fadeUp 0.5s ease both",
  },

  pageHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 32,
  },
  pageEyebrow: { fontSize: 11, letterSpacing: "0.2em", color: "#3d2e05", marginBottom: 6 },
  pageTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 52, fontWeight: 400, color: "#fef3c7",
    lineHeight: 1, letterSpacing: "-1px",
  },
  headerMeta: {
    display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4,
    padding: "10px 16px",
    background: "rgba(226,181,90,0.05)",
    border: "1px solid rgba(226,181,90,0.12)",
    borderRadius: 10,
  },
  headerMetaLabel: { fontSize: 10, letterSpacing: "0.15em", color: "#7c5c0a" },
  headerMetaValue: { fontSize: 14, color: "#e2b55a", fontWeight: 500 },

  kpiRow: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 },

  divider: {
    height: 1,
    background: "linear-gradient(90deg, transparent, #1a1500 30%, #1a1500 70%, transparent)",
    marginBottom: 28,
  },

  chartsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 300px",
    gap: 16, marginBottom: 28,
    alignItems: "start",
    minWidth: 0,
  },

  chartCard: {
    padding: "22px 20px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1a1500",
    borderRadius: 16,
    minWidth: 0,
    overflow: "hidden",
  },
  chartCardHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 4,
  },
  chartCardTag: {
    fontSize: 10, letterSpacing: "0.18em", color: "#7c5c0a", marginBottom: 16,
  },
  chartCardTotal: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 18, color: "#e2b55a",
  },
  emptyChart: {
    height: 200, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, color: "#1a1500",
  },

  highlightsPanel: {
    display: "flex", flexDirection: "column", gap: 12,
    padding: "22px 20px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1a1500",
    borderRadius: 16,
  },
  highlightCard: {
    padding: "14px 16px",
    background: "rgba(74,222,128,0.04)",
    border: "1px solid rgba(74,222,128,0.12)",
    borderRadius: 10,
  },
  hlLabel: { fontSize: 9, letterSpacing: "0.18em", color: "#334155", marginBottom: 5 },
  hlName: { fontSize: 14, color: "#f1f5f9", fontWeight: 500, marginBottom: 3 },
  hlValue: { fontFamily: "'DM Serif Display', serif", fontSize: 22, letterSpacing: "-0.5px" },
  hlSub: { fontSize: 11, color: "#475569", marginTop: 2 },
  txSummaryCard: {
    padding: "14px 16px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1a1500",
    borderRadius: 10,
    display: "flex", flexDirection: "column", gap: 8,
  },
  txRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  txLabel: { fontSize: 11, color: "#475569" },
  txVal: { fontSize: 12, fontWeight: 500, color: "#64748b", fontFamily: "'DM Mono', monospace" },

  centerState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", paddingTop: 60, gap: 10, textAlign: "center",
  },
  emptyIcon: { fontSize: 44, color: "#1a1500", lineHeight: 1, marginBottom: 8 },
  stateTitle: { fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#3d2e05" },
  stateText: { fontSize: 13, color: "#3d2e05", maxWidth: 280, lineHeight: 1.6 },

  liabGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12,
  },
  liabCard: {
    padding: "16px 18px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1a1500",
    borderRadius: 12,
    display: "flex", flexDirection: "column", gap: 10,
  },
  liabTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  liabName: { fontSize: 13, color: "#fef3c7", fontWeight: 500, marginBottom: 2 },
  liabSub: { fontSize: 11, color: "#3d2e05" },
  liabBal: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 16, color: "#f87171",
  },
  liabBarWrap: { height: 3, background: "#1a1500", borderRadius: 99, overflow: "hidden" },
  liabBarFill: {
    height: "100%",
    background: "linear-gradient(90deg, #16a34a, #4ade80)",
    borderRadius: 99,
    transition: "width 0.6s ease",
  },
  liabMeta: {
    display: "flex", justifyContent: "space-between",
    fontSize: 10, letterSpacing: "0.06em",
  },
};