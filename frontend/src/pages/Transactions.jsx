import { useState, useEffect, useCallback } from "react";

const API_BASE = "https://maadala.onrender.com/api/transactions";

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_META = {
  asset_create:            { label: "Asset Added",        color: "#818cf8", bg: "rgba(129,140,248,0.1)",  icon: "✦", sign: "+" },
  asset_buy:               { label: "Buy",                color: "#4ade80", bg: "rgba(74,222,128,0.1)",   icon: "↑", sign: "+" },
  asset_sell:              { label: "Sell",               color: "#f87171", bg: "rgba(248,113,113,0.1)",  icon: "↓", sign: "−" },
  asset_value_update:      { label: "Value Updated",      color: "#fb923c", bg: "rgba(251,146,60,0.1)",   icon: "✎", sign: "~" },
  liability_create:        { label: "Debt Added",         color: "#f87171", bg: "rgba(248,113,113,0.1)",  icon: "⊕", sign: "−" },
  liability_payment:       { label: "Payment",            color: "#2dd4bf", bg: "rgba(45,212,191,0.1)",   icon: "↓", sign: "−" },
  liability_balance_update:{ label: "Balance Updated",    color: "#fb923c", bg: "rgba(251,146,60,0.1)",   icon: "✎", sign: "~" },
};

const ENTITY_FILTERS = ["all", "asset", "liability"];
const TYPE_FILTERS   = ["all", ...Object.keys(TYPE_META)];

const fmt = (val) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(val) || 0);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const gainColor = (v) => (v > 0 ? "#4ade80" : v < 0 ? "#f87171" : "#64748b");

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange }) {
  return (
    <div style={fbStyles.wrap}>
      {/* Entity filter */}
      <div style={fbStyles.group}>
        <span style={fbStyles.groupLabel}>TYPE</span>
        <div style={fbStyles.pills}>
          {ENTITY_FILTERS.map((f) => (
            <button
              key={f}
              style={{ ...fbStyles.pill, ...(filters.entity_type === f ? fbStyles.pillActive : {}) }}
              onClick={() => onChange({ ...filters, entity_type: f, page: 1 })}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div style={fbStyles.group}>
        <span style={fbStyles.groupLabel}>FROM</span>
        <input
          style={fbStyles.dateInput}
          type="date"
          value={filters.from}
          onChange={(e) => onChange({ ...filters, from: e.target.value, page: 1 })}
        />
        <span style={fbStyles.groupLabel}>TO</span>
        <input
          style={fbStyles.dateInput}
          type="date"
          value={filters.to}
          onChange={(e) => onChange({ ...filters, to: e.target.value, page: 1 })}
        />
      </div>

      {/* Clear */}
      {(filters.entity_type !== "all" || filters.from || filters.to) && (
        <button
          style={fbStyles.clearBtn}
          onClick={() => onChange({ entity_type: "all", from: "", to: "", page: 1 })}
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}

const fbStyles = {
  wrap: {
    display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16,
    padding: "14px 18px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1e293b",
    borderRadius: 12, marginBottom: 16,
  },
  group: { display: "flex", alignItems: "center", gap: 8 },
  groupLabel: { fontSize: 10, letterSpacing: "0.15em", color: "#334155" },
  pills: { display: "flex", gap: 4 },
  pill: {
    padding: "5px 12px", borderRadius: 20,
    background: "transparent", border: "1px solid #1e293b",
    color: "#475569", fontSize: 11, fontFamily: "'DM Mono', monospace",
    cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.15s",
  },
  pillActive: {
    background: "rgba(99,102,241,0.12)",
    borderColor: "rgba(99,102,241,0.35)",
    color: "#818cf8",
  },
  dateInput: {
    padding: "5px 10px",
    background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b",
    borderRadius: 8, color: "#94a3b8", fontSize: 11,
    fontFamily: "'DM Mono', monospace", outline: "none",
  },
  clearBtn: {
    padding: "5px 12px", borderRadius: 8,
    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
    color: "#f87171", fontSize: 11, fontFamily: "'DM Mono', monospace",
    cursor: "pointer", marginLeft: "auto",
  },
};

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TxRow({ tx, onDelete }) {
  const [hovered, setHovered]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[tx.type] || { label: tx.type, color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "·", sign: "" };

  const isGain    = ["asset_buy", "asset_create"].includes(tx.type) ||
                    (tx.type === "asset_value_update" && tx.amount > 0);
  const isReduction = ["asset_sell","liability_payment","liability_balance_update"].includes(tx.type) ||
                      (tx.type === "asset_value_update" && tx.amount < 0);

  return (
    <>
      <div
        style={{
          ...txStyles.row,
          background: hovered ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)",
          borderColor: expanded ? "#1e293b" : "transparent",
          borderBottomColor: "#0f172a",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Icon */}
        <div style={{ ...txStyles.iconCell, background: meta.bg, color: meta.color }}>
          {meta.icon}
        </div>

        {/* Name + entity */}
        <div style={txStyles.nameCell}>
          <div style={txStyles.entityName}>{tx.entity_name}</div>
          <div style={txStyles.typePill}>
            <span style={{ ...txStyles.typeDot, background: meta.color }} />
            <span style={{ color: meta.color }}>{meta.label}</span>
          </div>
        </div>

        {/* Amount */}
        <div style={txStyles.amountCell}>
          <span style={{
            ...txStyles.amount,
            color: tx.type === "asset_sell" ? "#f87171"
                 : tx.type === "liability_payment" ? "#2dd4bf"
                 : tx.type === "asset_buy" || tx.type === "asset_create" ? "#4ade80"
                 : "#94a3b8",
          }}>
            {meta.sign} {fmt(tx.amount)}
          </span>
          {tx.value_after !== null && (
            <span style={txStyles.valueAfter}>→ {fmt(tx.value_after)}</span>
          )}
        </div>

        {/* Realized gain (sell only) */}
        {tx.realized_gain !== null && tx.realized_gain !== undefined && (
          <div style={txStyles.gainCell}>
            <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.1em" }}>GAIN</span>
            <span style={{ fontSize: 13, color: gainColor(tx.realized_gain), fontWeight: 500 }}>
              {tx.realized_gain >= 0 ? "+" : ""}{fmt(tx.realized_gain)}
            </span>
          </div>
        )}

        {/* Date */}
        <div style={txStyles.dateCell}>
          <span style={txStyles.dateMain}>{fmtDate(tx.transaction_date)}</span>
          <span style={txStyles.dateTime}>{fmtTime(tx.transaction_date)}</span>
        </div>

        {/* Expand chevron */}
        <div style={{ ...txStyles.chevron, opacity: hovered ? 1 : 0.2, transform: expanded ? "rotate(180deg)" : "none" }}>
          ⌄
        </div>
      </div>

      {/* Expanded detail row */}
      {expanded && (
        <div style={txStyles.expandedRow}>
          <div style={txStyles.expandGrid}>
            <div style={txStyles.expandItem}>
              <span style={txStyles.expandLabel}>ENTITY TYPE</span>
              <span style={txStyles.expandValue}>{tx.entity_type}</span>
            </div>
            <div style={txStyles.expandItem}>
              <span style={txStyles.expandLabel}>TRANSACTION TYPE</span>
              <span style={{ ...txStyles.expandValue, color: meta.color }}>{meta.label}</span>
            </div>
            <div style={txStyles.expandItem}>
              <span style={txStyles.expandLabel}>AMOUNT</span>
              <span style={txStyles.expandValue}>{fmt(tx.amount)}</span>
            </div>
            {tx.value_after !== null && (
              <div style={txStyles.expandItem}>
                <span style={txStyles.expandLabel}>VALUE AFTER</span>
                <span style={txStyles.expandValue}>{fmt(tx.value_after)}</span>
              </div>
            )}
            {tx.realized_gain !== null && tx.realized_gain !== undefined && (
              <div style={txStyles.expandItem}>
                <span style={txStyles.expandLabel}>REALIZED GAIN/LOSS</span>
                <span style={{ ...txStyles.expandValue, color: gainColor(tx.realized_gain) }}>
                  {tx.realized_gain >= 0 ? "+" : ""}{fmt(tx.realized_gain)}
                </span>
              </div>
            )}
            {tx.note && (
              <div style={{ ...txStyles.expandItem, gridColumn: "1 / -1" }}>
                <span style={txStyles.expandLabel}>NOTE</span>
                <span style={txStyles.expandValue}>{tx.note}</span>
              </div>
            )}
            <div style={txStyles.expandItem}>
              <span style={txStyles.expandLabel}>RECORDED</span>
              <span style={txStyles.expandValue}>{fmtDate(tx.createdAt)} {fmtTime(tx.createdAt)}</span>
            </div>
          </div>
          <button
            style={txStyles.deleteBtn}
            onClick={(e) => { e.stopPropagation(); onDelete(tx); }}
            title="Delete transaction"
          >
            ✕ Delete record
          </button>
        </div>
      )}
    </>
  );
}

const txStyles = {
  row: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "14px 18px",
    border: "1px solid transparent",
    borderBottom: "1px solid #0f172a",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  iconCell: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 600,
  },
  nameCell: { flex: 1, minWidth: 140 },
  entityName: { fontSize: 14, color: "#cbd5e1", fontWeight: 500, marginBottom: 3 },
  typePill: { display: "flex", alignItems: "center", gap: 5, fontSize: 11 },
  typeDot: { width: 5, height: 5, borderRadius: "50%", flexShrink: 0 },
  amountCell: { display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 110 },
  amount: { fontSize: 15, fontWeight: 500, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.3px" },
  valueAfter: { fontSize: 11, color: "#334155", marginTop: 2 },
  gainCell: { display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 90 },
  dateCell: { display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 100 },
  dateMain: { fontSize: 12, color: "#475569" },
  dateTime: { fontSize: 10, color: "#334155", marginTop: 2 },
  chevron: { fontSize: 18, color: "#334155", transition: "transform 0.2s, opacity 0.15s", lineHeight: 1 },
  expandedRow: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "14px 18px 18px 70px",
    background: "rgba(0,0,0,0.2)",
    borderBottom: "1px solid #0f172a",
  },
  expandGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 32px", flex: 1 },
  expandItem: { display: "flex", flexDirection: "column", gap: 3 },
  expandLabel: { fontSize: 10, letterSpacing: "0.15em", color: "#334155" },
  expandValue: { fontSize: 13, color: "#94a3b8", fontFamily: "'DM Mono', monospace" },
  deleteBtn: {
    padding: "6px 12px", borderRadius: 7, flexShrink: 0,
    background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
    color: "#f87171", fontSize: 11, fontFamily: "'DM Mono', monospace",
    cursor: "pointer", alignSelf: "flex-end", marginLeft: 24,
  },
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ tx, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const meta = TYPE_META[tx.type] || {};

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${tx._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted(tx._id);
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div style={modalStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyles.box}>
        <div style={modalStyles.header}>
          <div style={{ ...modalStyles.tag, color: "#ef4444" }}>DELETE RECORD</div>
          <h2 style={modalStyles.title}>Remove Transaction</h2>
        </div>
        <div style={modalStyles.body}>
          <p style={modalStyles.text}>
            This will permanently remove the{" "}
            <span style={{ color: meta.color }}>{meta.label}</span> transaction for{" "}
            <span style={{ color: "#f1f5f9" }}>{tx.entity_name}</span> ({fmt(tx.amount)}).
            The underlying asset/liability record is not affected.
          </p>
        </div>
        <div style={modalStyles.footer}>
          <button style={modalStyles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={modalStyles.deleteBtn} onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(2,6,23,0.9)",
    backdropFilter: "blur(8px)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  },
  box: {
    width: "100%", maxWidth: 440,
    background: "linear-gradient(145deg,#0d1424,#0a1020)",
    border: "1px solid #1e293b", borderRadius: 18,
    boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
    overflow: "hidden",
    fontFamily: "'DM Mono', monospace",
  },
  header: { padding: "22px 24px 16px", borderBottom: "1px solid #1e293b" },
  tag: { fontSize: 10, letterSpacing: "0.2em", marginBottom: 5 },
  title: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 22, fontWeight: 400, color: "#f1f5f9",
  },
  body: { padding: "18px 24px" },
  text: { fontSize: 13, color: "#64748b", lineHeight: 1.7 },
  footer: {
    display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "14px 24px 20px", borderTop: "1px solid #1e293b",
  },
  cancelBtn: {
    padding: "9px 16px", background: "transparent",
    border: "1px solid #1e293b", borderRadius: 9,
    color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace", cursor: "pointer",
  },
  deleteBtn: {
    padding: "9px 18px",
    background: "linear-gradient(135deg,#7f1d1d,#dc2626)",
    border: "none", borderRadius: 9, color: "#fff",
    fontSize: 12, fontFamily: "'DM Mono', monospace",
    cursor: "pointer", boxShadow: "0 4px 14px rgba(220,38,38,0.2)",
  },
};

// ─── Summary Strip ────────────────────────────────────────────────────────────

function SummaryStrip({ summary }) {
  if (!summary) return null;
  const { typeBreakdown = [], totalCount = 0 } = summary;

  const buys  = typeBreakdown.find((t) => t._id === "asset_buy")?.total_amount || 0;
  const sells = typeBreakdown.find((t) => t._id === "asset_sell")?.total_amount || 0;
  const pays  = typeBreakdown.find((t) => t._id === "liability_payment")?.total_amount || 0;

  return (
    <div style={ssStyles.wrap}>
      <div style={ssStyles.item}>
        <span style={ssStyles.label}>TOTAL TRANSACTIONS</span>
        <span style={ssStyles.val}>{totalCount}</span>
      </div>
      <div style={ssStyles.sep} />
      <div style={ssStyles.item}>
        <span style={ssStyles.label}>TOTAL BOUGHT</span>
        <span style={{ ...ssStyles.val, color: "#4ade80" }}>{fmt(buys)}</span>
      </div>
      <div style={ssStyles.sep} />
      <div style={ssStyles.item}>
        <span style={ssStyles.label}>TOTAL SOLD</span>
        <span style={{ ...ssStyles.val, color: "#f87171" }}>{fmt(sells)}</span>
      </div>
      <div style={ssStyles.sep} />
      <div style={ssStyles.item}>
        <span style={ssStyles.label}>DEBT PAYMENTS</span>
        <span style={{ ...ssStyles.val, color: "#2dd4bf" }}>{fmt(pays)}</span>
      </div>
    </div>
  );
}

const ssStyles = {
  wrap: {
    display: "flex", flexWrap: "wrap", gap: 0,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1e293b", borderRadius: 12,
    marginBottom: 16, overflow: "hidden",
  },
  item: {
    display: "flex", flexDirection: "column", gap: 4,
    padding: "14px 22px", flex: 1, minWidth: 130,
  },
  sep: { width: 1, background: "#0f172a", alignSelf: "stretch" },
  label: { fontSize: 10, letterSpacing: "0.15em", color: "#334155" },
  val: { fontSize: 18, fontWeight: 500, fontFamily: "'DM Mono', monospace", color: "#94a3b8", letterSpacing: "-0.3px" },
};

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages } = pagination;

  return (
    <div style={pgStyles.wrap}>
      <button
        style={pgStyles.btn}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >← Prev</button>
      <span style={pgStyles.info}>
        Page {page} of {pages} · {pagination.total} records
      </span>
      <button
        style={pgStyles.btn}
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >Next →</button>
    </div>
  );
}

const pgStyles = {
  wrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 20 },
  btn: {
    padding: "8px 16px", borderRadius: 8,
    background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b",
    color: "#475569", fontSize: 12, fontFamily: "'DM Mono', monospace",
    cursor: "pointer",
  },
  info: { fontSize: 12, color: "#334155", fontFamily: "'DM Mono', monospace" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [pagination,   setPagination]   = useState(null);
  const [summary,      setSummary]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [deleteTx,     setDeleteTx]     = useState(null);
  const [filters, setFilters] = useState({
    entity_type: "all",
    from: "",
    to: "",
    page: 1,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.entity_type !== "all") params.set("entity_type", filters.entity_type);
      if (filters.from) params.set("from", filters.from);
      if (filters.to)   params.set("to",   filters.to);
      params.set("page",  filters.page);
      params.set("limit", 20);

      const [txRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}?${params}`),
        fetch(`${API_BASE}/summary`),
      ]);

      if (!txRes.ok) throw new Error("Could not load transactions.");
      const txData  = await txRes.json();
      const sumData = sumRes.ok ? await sumRes.json() : null;

      setTransactions(txData.transactions || []);
      setPagination(txData.pagination || null);
      setSummary(sumData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleted = (id) => {
    setTransactions((prev) => prev.filter((t) => t._id !== id));
    if (summary) setSummary((s) => ({ ...s, totalCount: s.totalCount - 1 }));
  };

  const handlePageChange = (newPage) =>
    setFilters((f) => ({ ...f, page: newPage }));

  // Group transactions by date
  const grouped = transactions.reduce((acc, tx) => {
    const key = fmtDate(tx.transaction_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  return (
    <div style={styles.page}>
      <div style={styles.grain} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.pageHeader}>
          <div>
            <p style={styles.pageEyebrow}>HISTORY</p>
            <h1 style={styles.pageTitle}>Transactions</h1>
          </div>
          {summary && (
            <div style={styles.totalBadge}>
              <span style={styles.totalLabel}>ALL TIME</span>
              <span style={styles.totalValue}>{summary.totalCount} records</span>
            </div>
          )}
        </div>

        {/* Summary strip */}
        <SummaryStrip summary={summary} />

        {/* Filters */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Divider */}
        <div style={styles.divider} />

        {/* Transaction list */}
        {loading ? (
          <div style={styles.centerState}>
            <p style={styles.stateText}>Loading transactions…</p>
          </div>
        ) : error ? (
          <div style={styles.centerState}>
            <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={styles.centerState}>
            <div style={styles.emptyIcon}>◈</div>
            <p style={styles.stateTitle}>No transactions found</p>
            <p style={styles.stateText}>
              Transactions are logged automatically when you buy, sell, or make payments.
            </p>
          </div>
        ) : (
          <>
            <div style={styles.tableWrap}>
              {/* Table header */}
              <div style={styles.tableHead}>
                <span style={{ width: 36 }} />
                <span style={{ flex: 1 }}>ENTITY</span>
                <span style={{ minWidth: 110, textAlign: "right" }}>AMOUNT</span>
                <span style={{ minWidth: 90, textAlign: "right" }}>GAIN/LOSS</span>
                <span style={{ minWidth: 100, textAlign: "right" }}>DATE</span>
                <span style={{ width: 24 }} />
              </div>

              {/* Grouped rows */}
              {Object.entries(grouped).map(([date, txs]) => (
                <div key={date}>
                  <div style={styles.dateGroup}>{date}</div>
                  {txs.map((tx) => (
                    <TxRow
                      key={tx._id}
                      tx={tx}
                      onDelete={setDeleteTx}
                    />
                  ))}
                </div>
              ))}
            </div>

            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </>
        )}
      </div>

      {deleteTx && (
        <DeleteModal
          tx={deleteTx}
          onClose={() => setDeleteTx(null)}
          onDeleted={handleDeleted}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.3); }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #070b14 0%, #0a0f1e 60%, #060912 100%)",
    fontFamily: "'DM Mono', monospace",
    color: "#e2e8f0",
    position: "relative",
  },
  grain: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
  },
  container: {
    position: "relative", zIndex: 1,
    maxWidth: 960, margin: "0 auto",
    padding: "56px 24px 80px",
    animation: "fadeUp 0.5s ease both",
  },
  pageHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 24,
  },
  pageEyebrow: { fontSize: 11, letterSpacing: "0.2em", color: "#1e3a5f", marginBottom: 6 },
  pageTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 52, fontWeight: 400, color: "#f0f9ff",
    lineHeight: 1, letterSpacing: "-1px",
  },
  totalBadge: {
    display: "flex", flexDirection: "column", alignItems: "flex-end",
    padding: "10px 16px",
    background: "rgba(99,102,241,0.06)",
    border: "1px solid rgba(99,102,241,0.15)",
    borderRadius: 10,
  },
  totalLabel: { fontSize: 10, letterSpacing: "0.15em", color: "#4338ca", marginBottom: 3 },
  totalValue: { fontSize: 18, fontWeight: 500, color: "#818cf8", letterSpacing: "-0.3px" },
  divider: {
    height: 1,
    background: "linear-gradient(90deg, transparent, #0f172a 30%, #0f172a 70%, transparent)",
    marginBottom: 0,
  },
  tableWrap: {
    background: "rgba(255,255,255,0.015)",
    border: "1px solid #0f172a",
    borderRadius: 14, overflow: "hidden",
  },
  tableHead: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "10px 18px",
    background: "rgba(0,0,0,0.3)",
    borderBottom: "1px solid #0f172a",
    fontSize: 10, letterSpacing: "0.15em", color: "#1e293b",
  },
  dateGroup: {
    padding: "10px 18px 6px",
    fontSize: 10, letterSpacing: "0.15em", color: "#1e3a5f",
    background: "rgba(0,0,0,0.15)",
    borderBottom: "1px solid #0a0f1a",
  },
  centerState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", paddingTop: 80, gap: 10, textAlign: "center",
  },
  emptyIcon: { fontSize: 44, color: "#0f172a", lineHeight: 1, marginBottom: 8 },
  stateTitle: { fontSize: 20, fontFamily: "'DM Serif Display', serif", color: "#1e3a5f" },
  stateText: { fontSize: 13, color: "#1e293b", maxWidth: 300, lineHeight: 1.6 },
};