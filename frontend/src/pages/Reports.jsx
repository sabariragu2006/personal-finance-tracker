import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Sector } from "recharts";

const BASE = import.meta.env.VITE_API_URL;
const ASSETS_API       = `${BASE}/api/assets`;
const LIABILITIES_API  = `${BASE}/api/liabilities`;
const TRANSACTIONS_API = `${BASE}/api/transactions/summary`;

const PALETTE = [
  "#c084fc","#60a5fa","#34d399","#fbbf24","#f87171",
  "#38bdf8","#a78bfa","#4ade80","#fb923c","#e879f9",
  "#2dd4bf","#f472b6",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = (v) => new Intl.NumberFormat("en-US",{ style:"currency", currency:"USD", maximumFractionDigits:0 }).format(v||0);
const fmtFull = (v) => new Intl.NumberFormat("en-US",{ style:"currency", currency:"USD" }).format(v||0);
const fmtPct  = (v) => `${v>=0?"+":""}${v.toFixed(2)}%`;
const gainColor = (v) => v>0?"#4ade80":v<0?"#f87171":"#64748b";

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useIsMobile(bp = 700) {
  const [is, setIs] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const h = () => setIs(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return is;
}

// ─── Active Pie Slice ─────────────────────────────────────────────────────────
function ActiveShape({ cx,cy,innerRadius,outerRadius,startAngle,endAngle,fill }) {
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius-2} outerRadius={outerRadius+10} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={1} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius+14} outerRadius={outerRadius+17} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.5} />
    </g>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, label, sublabel }) {
  const isMobile = useIsMobile();
  const [activeIdx, setActiveIdx] = useState(null);
  const size = isMobile ? 220 : 280;
  const inner = isMobile ? 68 : 88;
  const outer = isMobile ? 95 : 118;

  const active = activeIdx !== null ? data[activeIdx] : null;
  const centerLabel = active ? active.name     : label;
  const centerSub   = active ? fmt(active.value) : sublabel;
  const centerColor = active ? active.color    : "#e2e8f0";

  return (
    <div style={{ position:"relative", width:"100%", height:size, display:"flex", justifyContent:"center" }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data} cx="50%" cy="50%"
          innerRadius={inner} outerRadius={outer}
          dataKey="value" paddingAngle={2}
          activeIndex={activeIdx} activeShape={ActiveShape}
          onMouseEnter={(_,i) => setActiveIdx(i)}
          onMouseLeave={() => setActiveIdx(null)}
          animationBegin={0} animationDuration={900}
        >
          {data.map((entry,i) => (
            <Cell key={i} fill={entry.color} opacity={activeIdx===null||activeIdx===i?1:0.35} style={{ cursor:"pointer", outline:"none" }} />
          ))}
        </Pie>
      </PieChart>
      <div style={{
        position:"absolute", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        textAlign:"center", pointerEvents:"none", width:140,
      }}>
        <div style={{ fontSize:active?11:10, letterSpacing:"0.12em", color:active?centerColor:"#475569", marginBottom:4, transition:"color 0.2s", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontFamily:"'DM Mono',monospace" }}>
          {centerLabel.length > 16 ? centerLabel.slice(0,15)+"…" : centerLabel}
        </div>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:active?18:15, color:active?centerColor:"#f1f5f9", letterSpacing:"-0.5px", lineHeight:1, transition:"all 0.2s" }}>
          {centerSub}
        </div>
        {active && (
          <div style={{ fontSize:10, color:"#475569", marginTop:5, fontFamily:"'DM Mono',monospace" }}>
            {(active.pct||0).toFixed(1)}% of total
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend({ items }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"0 4px", maxHeight:200, overflowY:"auto" }}>
      {items.map((item,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:item.color }} />
          <span style={{ flex:1, fontSize:12, color:"#64748b", letterSpacing:"0.02em" }} title={item.name}>
            {item.name.length>18?item.name.slice(0,17)+"…":item.name}
          </span>
          <span style={{ fontSize:11, color:"#475569", fontFamily:"'DM Mono',monospace", minWidth:36, textAlign:"right" }}>
            {(item.pct||0).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, accent, icon }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12,
      padding: isMobile ? "14px 16px" : "16px 20px",
      background:"rgba(255,255,255,0.02)", border:`1px solid ${accent}22`,
      borderRadius:14, flex:1, minWidth: isMobile ? "calc(50% - 6px)" : 150,
    }}>
      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, background:`${accent}14`, color:accent }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize:10, letterSpacing:"0.15em", marginBottom:3, color:`${accent}99` }}>{label}</div>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize: isMobile?18:22, fontWeight:400, letterSpacing:"-0.5px", lineHeight:1, color:accent }}>{value}</div>
        {sub && <div style={{ fontSize:11, color:"#475569", marginTop:3 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Gain/Loss Table ──────────────────────────────────────────────────────────
function GainLossTable({ assets, sortKey, sortDir, onSort }) {
  const isMobile = useIsMobile();
  const sorted = [...assets].sort((a,b) => sortDir==="asc" ? a[sortKey]-b[sortKey] : b[sortKey]-a[sortKey]);

  const SortIcon = ({ col }) => sortKey!==col
    ? <span style={{ color:"#1e293b", fontSize:10 }}>⇅</span>
    : <span style={{ color:"#e2b55a", fontSize:10 }}>{sortDir==="asc"?"↑":"↓"}</span>;

  const Th = ({ col, label, align="right" }) => (
    <th style={{ padding:"10px 12px", fontSize:10, letterSpacing:"0.14em", color:"#334155", background:"rgba(0,0,0,0.25)", borderBottom:"1px solid #0f172a", fontWeight:400, whiteSpace:"nowrap", userSelect:"none", textAlign:align, cursor:"pointer" }} onClick={() => onSort(col)}>
      {label} <SortIcon col={col} />
    </th>
  );

  // Mobile: card list instead of table
  if (isMobile) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {sorted.map((asset,i) => {
          const gain    = asset.gain    || 0;
          const gainPct = asset.gainPct || 0;
          return (
            <div key={asset._id||i} style={{ padding:"14px 16px", background:"rgba(255,255,255,0.015)", border:"1px solid #0f172a", borderRadius:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:PALETTE[i%PALETTE.length], flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:13, color:"#cbd5e1", fontWeight:500 }}>{asset.asset_name}</div>
                    <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{asset.institution}</div>
                  </div>
                </div>
                <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:20, fontSize:11, fontWeight:500, color:gainColor(gainPct), background:`${gainColor(gainPct)}14`, border:`1px solid ${gainColor(gainPct)}33` }}>
                  {fmtPct(gainPct)}
                </span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <div style={{ fontSize:9, letterSpacing:"0.14em", color:"#334155", marginBottom:3 }}>INVESTED</div>
                  <div style={{ fontSize:13, color:"#94a3b8", fontFamily:"'DM Mono',monospace" }}>{fmtFull(asset.invested_value)}</div>
                </div>
                <div>
                  <div style={{ fontSize:9, letterSpacing:"0.14em", color:"#334155", marginBottom:3 }}>CURRENT</div>
                  <div style={{ fontSize:13, color:"#e2e8f0", fontWeight:500, fontFamily:"'DM Mono',monospace" }}>{fmtFull(asset.current_value||asset.invested_value)}</div>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <div style={{ fontSize:9, letterSpacing:"0.14em", color:"#334155", marginBottom:3 }}>GAIN / LOSS</div>
                  <div style={{ fontSize:13, fontWeight:500, color:gainColor(gain), fontFamily:"'DM Mono',monospace" }}>{gain>=0?"+":""}{fmtFull(gain)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ overflowX:"auto", background:"rgba(255,255,255,0.015)", border:"1px solid #0f172a", borderRadius:14 }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'DM Mono',monospace" }}>
        <thead>
          <tr>
            <th style={{ padding:"10px 12px", fontSize:10, letterSpacing:"0.14em", color:"#334155", background:"rgba(0,0,0,0.25)", borderBottom:"1px solid #0f172a", fontWeight:400, whiteSpace:"nowrap", textAlign:"left" }}>ASSET</th>
            <Th col="institution"   label="INSTITUTION"  align="left" />
            <Th col="invested_value" label="INVESTED" />
            <Th col="current_value"  label="CURRENT" />
            <Th col="gain"           label="GAIN / LOSS" />
            <Th col="gainPct"        label="RETURN %" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((asset,i) => {
            const gain    = asset.gain    || 0;
            const gainPct = asset.gainPct || 0;
            return (
              <tr key={asset._id||i} style={{ borderBottom:"1px solid #0a0f1a", transition:"background 0.12s", cursor:"default" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"13px 12px", fontSize:13, textAlign:"left", color:"#64748b", fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:PALETTE[i%PALETTE.length] }} />
                    <div style={{ fontSize:13, color:"#cbd5e1", fontWeight:500 }}>{asset.asset_name}</div>
                  </div>
                </td>
                <td style={{ padding:"13px 12px", fontSize:12, textAlign:"left", color:"#475569", whiteSpace:"nowrap" }}>{asset.institution}</td>
                <td style={{ padding:"13px 12px", fontSize:13, textAlign:"right", color:"#94a3b8", fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>{fmtFull(asset.invested_value)}</td>
                <td style={{ padding:"13px 12px", fontSize:13, textAlign:"right", color:"#e2e8f0", fontWeight:500, fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>{fmtFull(asset.current_value||asset.invested_value)}</td>
                <td style={{ padding:"13px 12px", fontSize:13, textAlign:"right", color:gainColor(gain), fontWeight:500, fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>{gain>=0?"+":""}{fmtFull(gain)}</td>
                <td style={{ padding:"13px 12px", textAlign:"right", whiteSpace:"nowrap" }}>
                  <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:20, fontSize:11, fontWeight:500, color:gainColor(gainPct), background:`${gainColor(gainPct)}14`, border:`1px solid ${gainColor(gainPct)}33` }}>{fmtPct(gainPct)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:10, letterSpacing:"0.2em", color:"#3d2e05", marginBottom:4 }}>{eyebrow}</div>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:"#fef3c7", letterSpacing:"-0.3px" }}>{title}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Reports({ token }) {
  const isMobile = useIsMobile();
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
        const headers = { Authorization:`Bearer ${token}` };
        const [aRes,lRes,tRes] = await Promise.all([
          fetch(ASSETS_API,       { headers }),
          fetch(LIABILITIES_API,  { headers }),
          fetch(TRANSACTIONS_API, { headers }),
        ]);
        if (!aRes.ok) throw new Error("Failed to load assets.");
        const [aData,lData,tData] = await Promise.all([
          aRes.json(),
          lRes.ok ? lRes.json() : [],
          tRes.ok ? tRes.json() : null,
        ]);
        setAssets(aData); setLiabilities(lData); setTxSummary(tData);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const handleSort = useCallback((col) => {
    setSortDir(d => sortKey===col?(d==="desc"?"asc":"desc"):"desc");
    setSortKey(col);
  }, [sortKey]);

  const enriched = assets.map((a,i) => ({
    ...a,
    current_value: a.current_value ?? a.invested_value,
    gain:    (a.current_value ?? a.invested_value) - a.invested_value,
    gainPct: a.invested_value ? (((a.current_value??a.invested_value)-a.invested_value)/a.invested_value)*100 : 0,
    color: PALETTE[i%PALETTE.length],
  }));

  const totalInvested = enriched.reduce((s,a) => s+a.invested_value, 0);
  const totalCurrent  = enriched.reduce((s,a) => s+a.current_value,  0);
  const totalGain     = totalCurrent - totalInvested;
  const totalGainPct  = totalInvested ? (totalGain/totalInvested)*100 : 0;
  const totalLiab     = liabilities.reduce((s,l) => s+(l.current_balance||0), 0);
  const netWorth      = totalCurrent - totalLiab;

  const currentPieData  = enriched.map(a => ({ name:a.asset_name, value:a.current_value,  pct:totalCurrent  ?(a.current_value/totalCurrent)*100:0,  color:a.color }));
  const investedPieData = enriched.map(a => ({ name:a.asset_name, value:a.invested_value, pct:totalInvested?(a.invested_value/totalInvested)*100:0, color:a.color }));

  const winner = [...enriched].sort((a,b)=>b.gainPct-a.gainPct)[0];
  const loser  = [...enriched].sort((a,b)=>a.gainPct-b.gainPct)[0];

  const txBreakdown = txSummary?.typeBreakdown || [];
  const totalBuys  = txBreakdown.find(t=>t._id==="asset_buy")?.total_amount          || 0;
  const totalSells = txBreakdown.find(t=>t._id==="asset_sell")?.total_amount         || 0;
  const totalPays  = txBreakdown.find(t=>t._id==="liability_payment")?.total_amount  || 0;

  if (loading) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={S.grain}/>
      <p style={{ fontFamily:"'DM Mono',monospace", color:"#3d2e05", fontSize:13, zIndex:1 }}>Generating report…</p>
    </div>
  );
  if (error) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={S.grain}/>
      <p style={{ fontFamily:"'DM Mono',monospace", color:"#f87171", fontSize:13, zIndex:1 }}>{error}</p>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.grain}/>
      <div style={{ ...S.container, padding: isMobile ? "32px 16px 80px" : "56px 24px 100px" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems: isMobile?"flex-start":"flex-end", flexWrap:"wrap", gap:16, marginBottom:28 }}>
          <div>
            <p style={{ fontSize:11, letterSpacing:"0.2em", color:"#3d2e05", marginBottom:6 }}>ANALYTICS</p>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize: isMobile?36:52, fontWeight:400, color:"#fef3c7", lineHeight:1, letterSpacing:"-1px" }}>Reports</h1>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems: isMobile?"flex-start":"flex-end", gap:4, padding:"10px 16px", background:"rgba(226,181,90,0.05)", border:"1px solid rgba(226,181,90,0.12)", borderRadius:10 }}>
            <span style={{ fontSize:10, letterSpacing:"0.15em", color:"#7c5c0a" }}>PORTFOLIO OVERVIEW</span>
            <span style={{ fontSize:14, color:"#e2b55a", fontWeight:500 }}>{enriched.length} assets · {liabilities.length} liabilities</span>
          </div>
        </div>

        {/* KPI Row — 2×2 grid on mobile, single row on desktop */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:28 }}>
          <KPICard label="TOTAL INVESTED" value={fmt(totalInvested)} sub={`Across ${enriched.length} positions`} accent="#e2b55a" icon="◈" />
          <KPICard label="CURRENT VALUE"  value={fmt(totalCurrent)}  sub={`${totalGain>=0?"+":""}${fmt(totalGain)} all time`} accent="#c084fc" icon="◉" />
          <KPICard label="TOTAL RETURN"   value={fmtPct(totalGainPct)} sub={totalGain>=0?"Portfolio is up":"Portfolio is down"} accent={gainColor(totalGain)} icon={totalGain>=0?"↑":"↓"} />
          <KPICard label="NET WORTH"      value={fmt(netWorth)} sub={`After ${fmt(totalLiab)} liabilities`} accent="#2dd4bf" icon="⬡" />
        </div>

        <div style={S.divider}/>

        {/* Donut Charts */}
        <SectionHeader eyebrow="ALLOCATION" title="Asset Distribution" />

        {/* On mobile: stack vertically. On desktop: 3-column grid */}
        <div style={{
          display:"grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 300px",
          gap:16, marginBottom:28, alignItems:"start",
        }}>

          {/* Current Value Donut */}
          <div style={S.chartCard}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <div style={S.chartCardTag}>CURRENT VALUE</div>
              <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:"#e2b55a" }}>{fmt(totalCurrent)}</div>
            </div>
            {enriched.length===0 ? <div style={S.emptyChart}>No assets yet</div> : (
              <>
                <DonutChart data={currentPieData}  label="CURRENT VALUE"  sublabel={fmt(totalCurrent)}  />
                <Legend items={currentPieData} />
              </>
            )}
          </div>

          {/* Invested Value Donut */}
          <div style={S.chartCard}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <div style={S.chartCardTag}>INVESTED VALUE</div>
              <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:"#e2b55a" }}>{fmt(totalInvested)}</div>
            </div>
            {enriched.length===0 ? <div style={S.emptyChart}>No assets yet</div> : (
              <>
                <DonutChart data={investedPieData} label="INVESTED VALUE" sublabel={fmt(totalInvested)} />
                <Legend items={investedPieData} />
              </>
            )}
          </div>

          {/* Highlights panel */}
          <div style={{ display:"flex", flexDirection: isMobile?"row":"column", flexWrap: isMobile?"wrap":"nowrap", gap:12, padding:"22px 20px", background:"rgba(255,255,255,0.02)", border:"1px solid #1a1500", borderRadius:16 }}>
            <div style={{ ...S.chartCardTag, width:"100%" }}>HIGHLIGHTS</div>

            {winner && (
              <div style={{ ...S.highlightCard, flex: isMobile?"1 1 calc(50% - 6px)":"none" }}>
                <div style={S.hlLabel}>BEST PERFORMER</div>
                <div style={S.hlName}>{winner.asset_name}</div>
                <div style={{ ...S.hlValue, color:"#4ade80" }}>{fmtPct(winner.gainPct)}</div>
                <div style={S.hlSub}>{winner.institution}</div>
              </div>
            )}

            {loser && loser._id !== winner?._id && (
              <div style={{ ...S.highlightCard, borderColor:"rgba(248,113,113,0.15)", flex: isMobile?"1 1 calc(50% - 6px)":"none" }}>
                <div style={S.hlLabel}>NEEDS ATTENTION</div>
                <div style={S.hlName}>{loser.asset_name}</div>
                <div style={{ ...S.hlValue, color:"#f87171" }}>{fmtPct(loser.gainPct)}</div>
                <div style={S.hlSub}>{loser.institution}</div>
              </div>
            )}

            {txSummary && (
              <div style={{ ...S.txSummaryCard, flex: isMobile?"1 1 100%":"none" }}>
                <div style={S.hlLabel}>ACTIVITY SUMMARY</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><span style={{ fontSize:11, color:"#475569" }}>Total Transactions</span><span style={{ fontSize:12, fontWeight:500, color:"#64748b", fontFamily:"'DM Mono',monospace" }}>{txSummary.totalCount}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><span style={{ fontSize:11, color:"#475569" }}>Total Bought</span><span style={{ fontSize:12, fontWeight:500, color:"#4ade80", fontFamily:"'DM Mono',monospace" }}>{fmt(totalBuys)}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><span style={{ fontSize:11, color:"#475569" }}>Total Sold</span><span style={{ fontSize:12, fontWeight:500, color:"#f87171", fontFamily:"'DM Mono',monospace" }}>{fmt(totalSells)}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><span style={{ fontSize:11, color:"#475569" }}>Debt Payments</span><span style={{ fontSize:12, fontWeight:500, color:"#2dd4bf", fontFamily:"'DM Mono',monospace" }}>{fmt(totalPays)}</span></div>
              </div>
            )}
          </div>
        </div>

        <div style={S.divider}/>

        {/* Gain/Loss Table */}
        <SectionHeader eyebrow="PERFORMANCE" title="Asset Gain / Loss Breakdown" />

        {enriched.length===0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", paddingTop:60, gap:10, textAlign:"center" }}>
            <div style={{ fontSize:44, color:"#1a1500", lineHeight:1, marginBottom:8 }}>◈</div>
            <p style={{ fontSize:18, fontFamily:"'DM Serif Display',serif", color:"#3d2e05" }}>No assets to report</p>
            <p style={{ fontSize:13, color:"#3d2e05", maxWidth:280, lineHeight:1.6 }}>Add assets to see your performance breakdown here.</p>
          </div>
        ) : (
          <GainLossTable assets={enriched} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
        )}

        {/* Liability Summary */}
        {liabilities.length > 0 && (
          <>
            <div style={{ ...S.divider, marginTop:36 }}/>
            <SectionHeader eyebrow="DEBT" title="Liability Summary" />
            <div style={{
              display:"grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px, 1fr))",
              gap:12,
            }}>
              {liabilities.map((l,i) => {
                const paidOff = l.original_amount - l.current_balance;
                const pct     = l.original_amount ? (paidOff/l.original_amount)*100 : 0;
                return (
                  <div key={l._id||i} style={{ padding:"16px 18px", background:"rgba(255,255,255,0.02)", border:"1px solid #1a1500", borderRadius:12, display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontSize:13, color:"#fef3c7", fontWeight:500, marginBottom:2 }}>{l.liability_name}</div>
                        <div style={{ fontSize:11, color:"#3d2e05" }}>{l.lender}</div>
                      </div>
                      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:16, color:"#f87171" }}>{fmt(l.current_balance)}</div>
                    </div>
                    <div style={{ height:3, background:"#1a1500", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#16a34a,#4ade80)", borderRadius:99, transition:"width 0.6s ease" }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, letterSpacing:"0.06em" }}>
                      <span style={{ color:"#4ade80" }}>{pct.toFixed(1)}% paid off</span>
                      {l.interest_rate>0 && <span style={{ color:"#fb923c" }}>{l.interest_rate}% p.a.</span>}
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
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:99px; }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page:    { minHeight:"100vh", background:"linear-gradient(150deg,#070508 0%,#0c0a02 40%,#080709 100%)", fontFamily:"'DM Mono',monospace", color:"#e2e8f0", position:"relative" },
  grain:   { position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")` },
  container: { position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto", animation:"fadeUp 0.5s ease both" },
  divider: { height:1, background:"linear-gradient(90deg,transparent,#1a1500 30%,#1a1500 70%,transparent)", marginBottom:28 },
  chartCard: { padding:"22px 20px", background:"rgba(255,255,255,0.02)", border:"1px solid #1a1500", borderRadius:16, minWidth:0, overflow:"hidden" },
  chartCardTag: { fontSize:10, letterSpacing:"0.18em", color:"#7c5c0a", marginBottom:16 },
  emptyChart: { height:200, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#1a1500" },
  highlightCard: { padding:"14px 16px", background:"rgba(74,222,128,0.04)", border:"1px solid rgba(74,222,128,0.12)", borderRadius:10 },
  hlLabel: { fontSize:9, letterSpacing:"0.18em", color:"#334155", marginBottom:5 },
  hlName:  { fontSize:14, color:"#f1f5f9", fontWeight:500, marginBottom:3 },
  hlValue: { fontFamily:"'DM Serif Display',serif", fontSize:22, letterSpacing:"-0.5px" },
  hlSub:   { fontSize:11, color:"#475569", marginTop:2 },
  txSummaryCard: { padding:"14px 16px", background:"rgba(255,255,255,0.02)", border:"1px solid #1a1500", borderRadius:10, display:"flex", flexDirection:"column", gap:8 },
};