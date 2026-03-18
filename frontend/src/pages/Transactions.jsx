import { useState, useEffect, useCallback } from "react";

const BASE = import.meta.env.VITE_API_URL;
const API_BASE = `${BASE}/api/transactions`;

const TYPE_META = {
  asset_create:             { label: "Asset Added",     color: "#818cf8", bg: "rgba(129,140,248,0.1)",  icon: "✦", sign: "+" },
  asset_buy:                { label: "Buy",             color: "#4ade80", bg: "rgba(74,222,128,0.1)",   icon: "↑", sign: "+" },
  asset_sell:               { label: "Sell",            color: "#f87171", bg: "rgba(248,113,113,0.1)",  icon: "↓", sign: "−" },
  asset_value_update:       { label: "Value Updated",   color: "#fb923c", bg: "rgba(251,146,60,0.1)",   icon: "✎", sign: "~" },
  liability_create:         { label: "Debt Added",      color: "#f87171", bg: "rgba(248,113,113,0.1)",  icon: "⊕", sign: "−" },
  liability_payment:        { label: "Payment",         color: "#2dd4bf", bg: "rgba(45,212,191,0.1)",   icon: "↓", sign: "−" },
  liability_balance_update: { label: "Balance Updated", color: "#fb923c", bg: "rgba(251,146,60,0.1)",   icon: "✎", sign: "~" },
};

const ENTITY_FILTERS = ["all", "asset", "liability"];

const fmt = (val) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(val) || 0);
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const gainColor = (v) => (v > 0 ? "#4ade80" : v < 0 ? "#f87171" : "#64748b");

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useIsMobile(bp = 640) {
  const [is, setIs] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const h = () => setIs(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return is;
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar({ filters, onChange }) {
  const isMobile = useIsMobile();
  const isDirty = filters.entity_type !== "all" || filters.from || filters.to;

  return (
    <div style={{
      display: "flex", flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "stretch" : "center",
      flexWrap: "wrap", gap: isMobile ? 10 : 16,
      padding: "14px 16px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid #1e293b",
      borderRadius: 12, marginBottom: 16,
    }}>
      {/* Entity type pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "#334155", flexShrink: 0 }}>TYPE</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ENTITY_FILTERS.map((f) => (
            <button
              key={f}
              style={{
                padding: "5px 12px", borderRadius: 20,
                background: filters.entity_type === f ? "rgba(99,102,241,0.12)" : "transparent",
                border: `1px solid ${filters.entity_type === f ? "rgba(99,102,241,0.35)" : "#1e293b"}`,
                color: filters.entity_type === f ? "#818cf8" : "#475569",
                fontSize: 11, fontFamily: "'DM Mono', monospace",
                cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.15s",
              }}
              onClick={() => onChange({ ...filters, entity_type: f, page: 1 })}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "#334155", flexShrink: 0 }}>FROM</span>
        <input
          style={{ padding: "5px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", borderRadius: 8, color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono', monospace", outline: "none", flex: isMobile ? 1 : "none" }}
          type="date" value={filters.from}
          onChange={(e) => onChange({ ...filters, from: e.target.value, page: 1 })}
        />
        <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "#334155", flexShrink: 0 }}>TO</span>
        <input
          style={{ padding: "5px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", borderRadius: 8, color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono', monospace", outline: "none", flex: isMobile ? 1 : "none" }}
          type="date" value={filters.to}
          onChange={(e) => onChange({ ...filters, to: e.target.value, page: 1 })}
        />
      </div>

      {isDirty && (
        <button
          style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 11, fontFamily: "'DM Mono', monospace", cursor: "pointer", alignSelf: isMobile ? "flex-start" : "auto" }}
          onClick={() => onChange({ entity_type: "all", from: "", to: "", page: 1 })}
        >✕ Clear</button>
      )}
    </div>
  );
}

// ─── Transaction Row (desktop) ────────────────────────────────────────────────
function TxRow({ tx, onDelete }) {
  const [hovered,  setHovered]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[tx.type] || { label: tx.type, color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "·", sign: "" };

  const amtColor = tx.type === "asset_sell" ? "#f87171"
    : tx.type === "liability_payment" ? "#2dd4bf"
    : tx.type === "asset_buy" || tx.type === "asset_create" ? "#4ade80"
    : "#94a3b8";

  return (
    <>
      <div
        style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", border: "1px solid transparent", borderBottom: "1px solid #0f172a", cursor: "pointer", transition: "background 0.15s", background: hovered ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, background: meta.bg, color: meta.color }}>{meta.icon}</div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 14, color: "#cbd5e1", fontWeight: 500, marginBottom: 3 }}>{tx.entity_name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: meta.color, display: "inline-block" }} />
            <span style={{ color: meta.color }}>{meta.label}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 110 }}>
          <span style={{ fontSize: 15, fontWeight: 500, fontFamily: "'DM Mono',monospace", letterSpacing: "-0.3px", color: amtColor }}>{meta.sign} {fmt(tx.amount)}</span>
          {tx.value_after !== null && <span style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>→ {fmt(tx.value_after)}</span>}
        </div>
        {tx.realized_gain !== null && tx.realized_gain !== undefined && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 90 }}>
            <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.1em" }}>GAIN</span>
            <span style={{ fontSize: 13, color: gainColor(tx.realized_gain), fontWeight: 500 }}>{tx.realized_gain >= 0 ? "+" : ""}{fmt(tx.realized_gain)}</span>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 100 }}>
          <span style={{ fontSize: 12, color: "#475569" }}>{fmtDate(tx.transaction_date)}</span>
          <span style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{fmtTime(tx.transaction_date)}</span>
        </div>
        <div style={{ fontSize: 18, color: "#334155", transition: "transform 0.2s, opacity 0.15s", lineHeight: 1, opacity: hovered ? 1 : 0.2, transform: expanded ? "rotate(180deg)" : "none" }}>⌄</div>
      </div>

      {expanded && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "14px 18px 18px 70px", background: "rgba(0,0,0,0.2)", borderBottom: "1px solid #0f172a" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px 32px", flex: 1 }}>
            <ExpandItem label="ENTITY TYPE"    value={tx.entity_type} />
            <ExpandItem label="TX TYPE"        value={meta.label} color={meta.color} />
            <ExpandItem label="AMOUNT"         value={fmt(tx.amount)} />
            {tx.value_after !== null && <ExpandItem label="VALUE AFTER" value={fmt(tx.value_after)} />}
            {tx.realized_gain !== null && tx.realized_gain !== undefined && (
              <ExpandItem label="REALIZED GAIN" value={`${tx.realized_gain >= 0 ? "+" : ""}${fmt(tx.realized_gain)}`} color={gainColor(tx.realized_gain)} />
            )}
            {tx.note && <ExpandItem label="NOTE" value={tx.note} span />}
            <ExpandItem label="RECORDED" value={`${fmtDate(tx.createdAt)} ${fmtTime(tx.createdAt)}`} />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(tx); }} style={{ padding: "6px 12px", borderRadius: 7, flexShrink: 0, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", alignSelf: "flex-end", marginLeft: 24 }}>
            ✕ Delete record
          </button>
        </div>
      )}
    </>
  );
}

function ExpandItem({ label, value, color, span }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: span ? "1/-1" : "auto" }}>
      <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "#334155" }}>{label}</span>
      <span style={{ fontSize: 13, color: color || "#94a3b8", fontFamily: "'DM Mono',monospace" }}>{value}</span>
    </div>
  );
}

// ─── Transaction Card (mobile) ────────────────────────────────────────────────
function TxCard({ tx, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[tx.type] || { label: tx.type, color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "·", sign: "" };
  const amtColor = tx.type === "asset_sell" ? "#f87171"
    : tx.type === "liability_payment" ? "#2dd4bf"
    : tx.type === "asset_buy" || tx.type === "asset_create" ? "#4ade80"
    : "#94a3b8";

  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid #0f172a", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer" }} onClick={() => setExpanded(v => !v)}>
        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, background: meta.bg, color: meta.color }}>{meta.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.entity_name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, marginTop: 2 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: meta.color, display: "inline-block" }} />
            <span style={{ color: meta.color }}>{meta.label}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500, fontFamily: "'DM Mono',monospace", color: amtColor }}>{meta.sign} {fmt(tx.amount)}</span>
          <span style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{fmtDate(tx.transaction_date)}</span>
        </div>
        <div style={{ fontSize: 14, color: "#334155", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none", flexShrink: 0 }}>⌄</div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "10px 14px 14px", background: "rgba(0,0,0,0.2)", borderTop: "1px solid #0f172a" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginBottom: 12 }}>
            <ExpandItem label="ENTITY TYPE" value={tx.entity_type} />
            <ExpandItem label="TIME"        value={fmtTime(tx.transaction_date)} />
            {tx.value_after !== null && <ExpandItem label="VALUE AFTER" value={fmt(tx.value_after)} />}
            {tx.realized_gain !== null && tx.realized_gain !== undefined && (
              <ExpandItem label="REALIZED GAIN" value={`${tx.realized_gain >= 0 ? "+" : ""}${fmt(tx.realized_gain)}`} color={gainColor(tx.realized_gain)} />
            )}
            {tx.note && <ExpandItem label="NOTE" value={tx.note} span />}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(tx); }} style={{ padding: "7px 14px", borderRadius: 7, width: "100%", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
            ✕ Delete record
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Summary Strip ────────────────────────────────────────────────────────────
function SummaryStrip({ summary }) {
  const isMobile = useIsMobile();
  if (!summary) return null;
  const { typeBreakdown = [], totalCount = 0 } = summary;
  const buys  = typeBreakdown.find(t => t._id === "asset_buy")?.total_amount          || 0;
  const sells = typeBreakdown.find(t => t._id === "asset_sell")?.total_amount         || 0;
  const pays  = typeBreakdown.find(t => t._id === "liability_payment")?.total_amount  || 0;

  const items = [
    { label: "TOTAL TRANSACTIONS", val: totalCount, color: "#94a3b8" },
    { label: "TOTAL BOUGHT",       val: fmt(buys),  color: "#4ade80" },
    { label: "TOTAL SOLD",         val: fmt(sells), color: "#f87171" },
    { label: "DEBT PAYMENTS",      val: fmt(pays),  color: "#2dd4bf" },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid #1e293b", borderRadius: 12,
      marginBottom: 16, overflow: "hidden",
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: "flex", flexDirection: "column", gap: 4,
          padding: isMobile ? "12px 14px" : "14px 22px",
          borderRight: i < items.length - 1 ? "1px solid #0f172a" : "none",
          // On 2-col mobile, add bottom border for top row
          borderBottom: isMobile && i < 2 ? "1px solid #0f172a" : "none",
        }}>
          <span style={{ fontSize: 9, letterSpacing: "0.15em", color: "#334155" }}>{item.label}</span>
          <span style={{ fontSize: isMobile ? 15 : 18, fontWeight: 500, fontFamily: "'DM Mono',monospace", color: item.color, letterSpacing: "-0.3px" }}>{item.val}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ tx, token, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const meta = TYPE_META[tx.type] || {};

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${tx._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      onDeleted(tx._id); onClose();
    } catch { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.9)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 440, background: "linear-gradient(145deg,#0d1424,#0a1020)", border: "1px solid #1e293b", borderRadius: 18, boxShadow: "0 40px 80px rgba(0,0,0,0.6)", overflow: "hidden", fontFamily: "'DM Mono',monospace" }}>
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#ef4444", marginBottom: 5 }}>DELETE RECORD</div>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, fontWeight: 400, color: "#f1f5f9" }}>Remove Transaction</h2>
        </div>
        <div style={{ padding: "18px 24px" }}>
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
            This will permanently remove the <span style={{ color: meta.color }}>{meta.label}</span> transaction for <span style={{ color: "#f1f5f9" }}>{tx.entity_name}</span> ({fmt(tx.amount)}). The underlying asset/liability record is not affected.
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px 20px", borderTop: "1px solid #1e293b" }}>
          <button style={{ padding: "9px 16px", background: "transparent", border: "1px solid #1e293b", borderRadius: 9, color: "#475569", fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer" }} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={{ padding: "9px 18px", background: "linear-gradient(135deg,#7f1d1d,#dc2626)", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer" }} onClick={handleDelete} disabled={loading}>{loading ? "Deleting…" : "Delete Record"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ pagination, onPageChange }) {
  const isMobile = useIsMobile();
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages } = pagination;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 10 : 16, paddingTop: 20, flexWrap: "wrap" }}>
      <button style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", color: "#475569", fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer" }} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Prev</button>
      <span style={{ fontSize: 12, color: "#334155", fontFamily: "'DM Mono',monospace", textAlign: "center" }}>Page {page} of {pages} · {pagination.total} records</span>
      <button style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", color: "#475569", fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer" }} disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next →</button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Transactions({ token }) {
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState([]);
  const [pagination,   setPagination]   = useState(null);
  const [summary,      setSummary]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [deleteTx,     setDeleteTx]     = useState(null);
  const [filters, setFilters] = useState({ entity_type: "all", from: "", to: "", page: 1 });

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.entity_type !== "all") params.set("entity_type", filters.entity_type);
      if (filters.from) params.set("from", filters.from);
      if (filters.to)   params.set("to",   filters.to);
      params.set("page", filters.page);
      params.set("limit", 20);
      const headers = { Authorization: `Bearer ${token}` };
      const [txRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}?${params}`, { headers }),
        fetch(`${API_BASE}/summary`,   { headers }),
      ]);
      if (!txRes.ok) throw new Error("Could not load transactions.");
      const txData  = await txRes.json();
      const sumData = sumRes.ok ? await sumRes.json() : null;
      setTransactions(txData.transactions || []);
      setPagination(txData.pagination || null);
      setSummary(sumData);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [filters, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleted = (id) => {
    setTransactions(prev => prev.filter(t => t._id !== id));
    if (summary) setSummary(s => ({ ...s, totalCount: s.totalCount - 1 }));
  };

  const grouped = transactions.reduce((acc, tx) => {
    const key = fmtDate(tx.transaction_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#070b14 0%,#0a0f1e 60%,#060912 100%)", fontFamily: "'DM Mono',monospace", color: "#e2e8f0", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")` }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto", padding: isMobile ? "28px 16px 80px" : "56px 24px 80px", animation: "fadeUp 0.5s ease both" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "#1e3a5f", marginBottom: 6 }}>HISTORY</p>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: isMobile ? 36 : 52, fontWeight: 400, color: "#f0f9ff", lineHeight: 1, letterSpacing: "-1px" }}>Transactions</h1>
          </div>
          {summary && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", padding: "10px 16px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "#4338ca", marginBottom: 3 }}>ALL TIME</span>
              <span style={{ fontSize: 18, fontWeight: 500, color: "#818cf8", letterSpacing: "-0.3px" }}>{summary.totalCount} records</span>
            </div>
          )}
        </div>

        <SummaryStrip summary={summary} />
        <FilterBar filters={filters} onChange={setFilters} />

        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,#0f172a 30%,#0f172a 70%,transparent)", marginBottom: 16 }} />

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 }}>
            <p style={{ fontSize: 13, color: "#1e293b" }}>Loading transactions…</p>
          </div>
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
            <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10, textAlign: "center" }}>
            <div style={{ fontSize: 44, color: "#0f172a", lineHeight: 1, marginBottom: 8 }}>◈</div>
            <p style={{ fontSize: 20, fontFamily: "'DM Serif Display',serif", color: "#1e3a5f" }}>No transactions found</p>
            <p style={{ fontSize: 13, color: "#1e293b", maxWidth: 300, lineHeight: 1.6 }}>Transactions are logged automatically when you buy, sell, or make payments.</p>
          </div>
        ) : (
          <>
            {isMobile ? (
              /* ── Mobile: card list ── */
              <div>
                {Object.entries(grouped).map(([date, txs]) => (
                  <div key={date}>
                    <div style={{ padding: "8px 4px 6px", fontSize: 10, letterSpacing: "0.15em", color: "#1e3a5f", marginBottom: 4 }}>{date}</div>
                    {txs.map(tx => <TxCard key={tx._id} tx={tx} onDelete={setDeleteTx} />)}
                  </div>
                ))}
              </div>
            ) : (
              /* ── Desktop: table ── */
              <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid #0f172a", borderRadius: 14, overflow: "hidden" }}>
                {/* Table header */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 18px", background: "rgba(0,0,0,0.3)", borderBottom: "1px solid #0f172a", fontSize: 10, letterSpacing: "0.15em", color: "#1e293b" }}>
                  <span style={{ width: 36 }} />
                  <span style={{ flex: 1 }}>ENTITY</span>
                  <span style={{ minWidth: 110, textAlign: "right" }}>AMOUNT</span>
                  <span style={{ minWidth: 90, textAlign: "right" }}>GAIN/LOSS</span>
                  <span style={{ minWidth: 100, textAlign: "right" }}>DATE</span>
                  <span style={{ width: 24 }} />
                </div>
                {Object.entries(grouped).map(([date, txs]) => (
                  <div key={date}>
                    <div style={{ padding: "10px 18px 6px", fontSize: 10, letterSpacing: "0.15em", color: "#1e3a5f", background: "rgba(0,0,0,0.15)", borderBottom: "1px solid #0a0f1a" }}>{date}</div>
                    {txs.map(tx => <TxRow key={tx._id} tx={tx} onDelete={setDeleteTx} />)}
                  </div>
                ))}
              </div>
            )}

            <Pagination pagination={pagination} onPageChange={p => setFilters(f => ({ ...f, page: p }))} />
          </>
        )}
      </div>

      {deleteTx && <DeleteModal tx={deleteTx} token={token} onClose={() => setDeleteTx(null)} onDeleted={handleDeleted} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.3); }
        button:disabled { opacity:0.4; cursor:not-allowed; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:99px; }
      `}</style>
    </div>
  );
}