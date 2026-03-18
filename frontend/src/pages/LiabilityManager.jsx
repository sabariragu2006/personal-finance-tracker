import { useState, useEffect, useRef } from "react";

const BASE     = import.meta.env.VITE_API_URL;
const API_BASE = `${BASE}/api/liabilities`;

const formatCurrency = (val) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0);

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const toInputDate = (d) => {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
};

const today = () => new Date().toISOString().split("T")[0];

const TYPE_LABELS = {
  loan: "Loan", mortgage: "Mortgage", credit_card: "Credit Card",
  student_loan: "Student Loan", auto_loan: "Auto Loan", other: "Other",
};

const TYPE_COLORS = {
  loan: "#fb923c", mortgage: "#a78bfa", credit_card: "#f87171",
  student_loan: "#60a5fa", auto_loan: "#34d399", other: "#94a3b8",
};

const EMPTY_FORM = {
  liability_name: "", lender: "", liability_type: "loan",
  original_amount: "", current_balance: "", interest_rate: "",
  monthly_payment: "", due_date: "", start_date: "", notes: "",
};

// ─── useIsMobile ──────────────────────────────────────────────────────────────
function useIsMobile(bp = 700) {
  const [is, setIs] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const h = () => setIs(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return is;
}

// ─── Inline Balance Cell ──────────────────────────────────────────────────────
function BalanceCell({ liability, token, onUpdated }) {
  const [editing,  setEditing]  = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [saving,   setSaving]   = useState(false);
  const inputRef = useRef(null);

  const startEdit = () => {
    setInputVal(liability.current_balance);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  };
  const cancel = () => setEditing(false);

  const save = async () => {
    const parsed = parseFloat(inputVal);
    if (isNaN(parsed) || parsed < 0) return cancel();
    if (parsed === liability.current_balance) return cancel();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/${liability._id}/current-balance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_balance: parsed }),
      });
      if (!res.ok) throw new Error();
      onUpdated(await res.json());
    } catch { /* silently revert */ }
    finally { setSaving(false); setEditing(false); }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); };

  const paidOff = liability.original_amount - liability.current_balance;
  const pct     = liability.original_amount ? Math.min(100, (paidOff / liability.original_amount) * 100) : 0;

  return (
    <div className="lm-meta-item">
      <span className="lm-meta-label">BALANCE</span>
      {editing ? (
        <div className="lm-inline-edit-row">
          <span className="lm-currency-prefix">$</span>
          <input ref={inputRef} className="lm-inline-input" type="number" min="0" step="0.01"
            value={inputVal} onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown} onBlur={save} disabled={saving} />
        </div>
      ) : (
        <div className="lm-current-val-row">
          <span className="lm-meta-value lm-clickable" onClick={startEdit} title="Tap to update">
            {formatCurrency(liability.current_balance)}
          </span>
          <button className="lm-edit-val-btn" onClick={startEdit}>✎</button>
        </div>
      )}
      <div className="lm-progress-wrap"><div className="lm-progress-bar" style={{ width: `${pct}%` }} /></div>
      <span className="lm-progress-label">{pct.toFixed(1)}% paid</span>
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({ liability, token, onClose, onUpdated }) {
  const [amount,  setAmount]  = useState(liability.monthly_payment ? liability.monthly_payment.toString() : "");
  const [date,    setDate]    = useState(today());
  const [note,    setNote]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const parsed     = parseFloat(amount);
  const isValid    = parsed > 0 && parsed <= liability.current_balance;
  const newBalance = isValid ? liability.current_balance - parsed : null;
  const newPct     = isValid && liability.original_amount
    ? Math.min(100, ((liability.original_amount - newBalance) / liability.original_amount) * 100) : null;
  const isFullPayoff = parsed === liability.current_balance;

  const handlePay = async () => {
    if (!isValid) {
      setError(parsed > liability.current_balance
        ? `Payment exceeds balance of ${formatCurrency(liability.current_balance)}.`
        : "Enter a valid payment amount.");
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/${liability._id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parsed, date, note }),
      });
      if (!res.ok) { const body = await res.json(); throw new Error(body.message || "Payment failed."); }
      onUpdated(await res.json());
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="lm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lm-modal">
        <div className="lm-modal-header">
          <div>
            <div className="lm-modal-tag" style={{ color: "#4ade80" }}>MAKE PAYMENT</div>
            <h2 className="lm-modal-title">{liability.liability_name}</h2>
          </div>
          <button className="lm-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="lm-modal-body">
          {error && <div className="lm-error-banner">{error}</div>}
          <div className="lm-snapshot-row">
            <div className="lm-snapshot-item">
              <span className="lm-snapshot-label">CURRENT BALANCE</span>
              <span className="lm-snapshot-value" style={{ color: "#fca5a5" }}>{formatCurrency(liability.current_balance)}</span>
            </div>
            <div className="lm-snapshot-arrow">→</div>
            <div className="lm-snapshot-item" style={{ opacity: newBalance !== null ? 1 : 0.3 }}>
              <span className="lm-snapshot-label" style={{ color: "#4ade80" }}>AFTER PAYMENT</span>
              <span className="lm-snapshot-value" style={{ color: "#4ade80" }}>
                {newBalance !== null ? formatCurrency(newBalance) : "—"}
              </span>
            </div>
          </div>
          {newPct !== null && (
            <div className="lm-progress-preview">
              <div className="lm-progress-bar lm-progress-green" style={{ width: `${newPct}%` }} />
            </div>
          )}
          <div className="lm-field-grid">
            <div className="lm-field-full">
              <label className="lm-label">Payment Amount ($) <span className="lm-req">*</span></label>
              <div style={{ position: "relative" }}>
                <input className="lm-input" type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
                <button className="lm-max-btn" onClick={() => setAmount(liability.current_balance.toString())}>PAYOFF</button>
              </div>
            </div>
            <div className="lm-field-half">
              <label className="lm-label">Payment Date</label>
              <input className="lm-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="lm-field-half">
              <label className="lm-label">Note (optional)</label>
              <input className="lm-input" type="text" placeholder="e.g. Monthly EMI" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          {isFullPayoff && <div className="lm-payoff-note">🎉 This will fully pay off this liability!</div>}
        </div>
        <div className="lm-modal-footer">
          <button className="lm-cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="lm-pay-confirm-btn" onClick={handlePay} disabled={loading || !isValid}>
            {loading ? "Processing…" : isFullPayoff ? "✓ Full Payoff" : "✓ Make Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function LiabilityModal({ token, onClose, onSaved, editLiability = null }) {
  const isEdit = !!editLiability;
  const [form, setForm] = useState(
    isEdit ? {
      liability_name: editLiability.liability_name || "",
      lender: editLiability.lender || "",
      liability_type: editLiability.liability_type || "loan",
      original_amount: editLiability.original_amount ?? "",
      current_balance: editLiability.current_balance ?? "",
      interest_rate: editLiability.interest_rate ?? "",
      monthly_payment: editLiability.monthly_payment ?? "",
      due_date: toInputDate(editLiability.due_date),
      start_date: toInputDate(editLiability.start_date),
      notes: editLiability.notes || "",
    } : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.liability_name.trim() || !form.lender.trim() || !form.original_amount) {
      setError("Name, lender, and original amount are required."); return;
    }
    setLoading(true); setError(null);
    try {
      const url    = isEdit ? `${API_BASE}/${editLiability._id}` : API_BASE;
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        ...form,
        original_amount:  parseFloat(form.original_amount),
        current_balance:  form.current_balance ? parseFloat(form.current_balance) : parseFloat(form.original_amount),
        interest_rate:    form.interest_rate    ? parseFloat(form.interest_rate)   : 0,
        monthly_payment:  form.monthly_payment  ? parseFloat(form.monthly_payment) : 0,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to ${isEdit ? "update" : "save"} liability.`);
      onSaved(await res.json(), isEdit);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="lm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lm-modal lm-modal-wide">
        <div className="lm-modal-header">
          <div>
            <div className="lm-modal-tag">{isEdit ? "EDIT LIABILITY" : "NEW LIABILITY"}</div>
            <h2 className="lm-modal-title">{isEdit ? "Edit Liability" : "Add Liability"}</h2>
          </div>
          <button className="lm-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="lm-modal-body">
          {error   && <div className="lm-error-banner">{error}</div>}
          {isEdit  && <div className="lm-info-banner">Use the Pay button to record payments. This modal corrects details only.</div>}
          <div className="lm-field-grid">
            <div className="lm-field-full">
              <label className="lm-label">Liability Name <span className="lm-req">*</span></label>
              <input className="lm-input" name="liability_name" placeholder="e.g. Home Loan, Car Loan, Visa Card" value={form.liability_name} onChange={handleChange} />
            </div>
            <div className="lm-field-half">
              <label className="lm-label">Lender / Institution <span className="lm-req">*</span></label>
              <input className="lm-input" name="lender" placeholder="e.g. HDFC Bank, Chase" value={form.lender} onChange={handleChange} />
            </div>
            <div className="lm-field-half">
              <label className="lm-label">Type</label>
              <select className="lm-input lm-select" name="liability_type" value={form.liability_type} onChange={handleChange}>
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val} style={{ background: "#0f172a" }}>{label}</option>
                ))}
              </select>
            </div>
            <div className="lm-field-half">
              <label className="lm-label">Original Amount ($) <span className="lm-req">*</span></label>
              <input className="lm-input" name="original_amount" type="number" min="0" step="0.01" placeholder="0.00" value={form.original_amount} onChange={handleChange} />
            </div>
            <div className="lm-field-half">
              <label className="lm-label">Current Balance ($)</label>
              <input className="lm-input" name="current_balance" type="number" min="0" step="0.01" placeholder="Defaults to original" value={form.current_balance} onChange={handleChange} />
            </div>
            <div className="lm-field-half">
              <label className="lm-label">Interest Rate (%)</label>
              <input className="lm-input" name="interest_rate" type="number" min="0" step="0.01" placeholder="e.g. 8.5" value={form.interest_rate} onChange={handleChange} />
            </div>
            <div className="lm-field-half">
              <label className="lm-label">Monthly Payment ($)</label>
              <input className="lm-input" name="monthly_payment" type="number" min="0" step="0.01" placeholder="0.00" value={form.monthly_payment} onChange={handleChange} />
            </div>
            <div className="lm-field-half">
              <label className="lm-label">Start Date</label>
              <input className="lm-input" name="start_date" type="date" value={form.start_date} onChange={handleChange} />
            </div>
            <div className="lm-field-half">
              <label className="lm-label">Due / Maturity Date</label>
              <input className="lm-input" name="due_date" type="date" value={form.due_date} onChange={handleChange} />
            </div>
            <div className="lm-field-full">
              <label className="lm-label">Notes</label>
              <textarea className="lm-input lm-textarea" name="notes" placeholder="Any additional context..." value={form.notes} onChange={handleChange} />
            </div>
          </div>
        </div>
        <div className="lm-modal-footer">
          <button className="lm-cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="lm-save-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : isEdit ? "✓ Update" : "＋ Add Liability"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ liability, token, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${liability._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete liability.");
      onDeleted(liability._id);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="lm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lm-modal lm-modal-sm">
        <div className="lm-modal-header">
          <div>
            <div className="lm-modal-tag" style={{ color: "#ef4444" }}>CONFIRM DELETE</div>
            <h2 className="lm-modal-title">Remove Liability</h2>
          </div>
          <button className="lm-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="lm-modal-body">
          {error && <div className="lm-error-banner">{error}</div>}
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
            Remove <span style={{ color: "#fef2f2", fontWeight: 500 }}>{liability.liability_name}</span>? Payment history will be permanently lost.
          </p>
        </div>
        <div className="lm-modal-footer">
          <button className="lm-cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="lm-delete-confirm-btn" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete Liability"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Liability Card (mobile) ──────────────────────────────────────────────────
function LiabilityCard({ liability, token, onEdit, onDelete, onPay, onBalanceUpdated }) {
  const typeColor  = TYPE_COLORS[liability.liability_type] || "#94a3b8";
  const paidOff    = liability.original_amount - liability.current_balance;
  const pct        = liability.original_amount ? Math.min(100, (paidOff / liability.original_amount) * 100) : 0;
  const monthsLeft = liability.monthly_payment > 0 ? Math.ceil(liability.current_balance / liability.monthly_payment) : null;

  return (
    <div className="lm-card">
      {/* Header */}
      <div className="lm-card-header">
        <div className="lm-card-identity">
          <div className="lm-avatar" style={{ background: `linear-gradient(135deg,${typeColor}22,${typeColor}44)`, border: `1px solid ${typeColor}44` }}>
            <span style={{ color: typeColor, fontSize: 15, fontFamily: "'DM Serif Display',serif" }}>
              {liability.liability_name?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="lm-name">{liability.liability_name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span className="lm-inst">{liability.lender}</span>
              <span className="lm-type-badge" style={{ borderColor: `${typeColor}44`, color: typeColor }}>
                {TYPE_LABELS[liability.liability_type]}
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 13, color: "#fca5a5", fontFamily: "'DM Mono',monospace", fontWeight: 500 }}>
            {formatCurrency(liability.current_balance)}
          </div>
          <div style={{ fontSize: 10, color: "#4ade80", fontFamily: "'DM Mono',monospace" }}>
            {pct.toFixed(1)}% paid
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "0 14px 2px" }}>
        <div className="lm-progress-wrap" style={{ height: 3 }}>
          <div className="lm-progress-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Values row */}
      <div className="lm-card-values">
        <div className="lm-card-val-item">
          <span className="lm-meta-label">ORIGINAL</span>
          <span className="lm-card-val">{formatCurrency(liability.original_amount)}</span>
          {liability.interest_rate > 0 && (
            <span style={{ fontSize: 10, color: "#fb923c" }}>{liability.interest_rate}% p.a.</span>
          )}
        </div>
        <div className="lm-card-val-divider" />
        <div className="lm-card-val-item">
          <BalanceCell liability={liability} token={token} onUpdated={onBalanceUpdated} />
        </div>
        {liability.monthly_payment > 0 && (
          <>
            <div className="lm-card-val-divider" />
            <div className="lm-card-val-item">
              <span className="lm-meta-label">EMI</span>
              <span className="lm-card-val">{formatCurrency(liability.monthly_payment)}</span>
              {monthsLeft !== null && <span style={{ fontSize: 10, color: "#64748b" }}>~{monthsLeft}mo</span>}
            </div>
          </>
        )}
      </div>

      {/* Action bar */}
      <div className="lm-card-actions">
        <button className="lm-action-btn lm-action-pay"    onClick={() => onPay(liability)}>↓ Pay</button>
        <button className="lm-action-btn lm-action-edit"   onClick={() => onEdit(liability)}>✎ Edit</button>
        <button className="lm-action-btn lm-action-delete" onClick={() => onDelete(liability)}>✕</button>
      </div>
    </div>
  );
}

// ─── Liability Row (desktop) ──────────────────────────────────────────────────
function LiabilityRow({ liability, token, onEdit, onDelete, onPay, onBalanceUpdated }) {
  const [hovered, setHovered] = useState(false);
  const typeColor  = TYPE_COLORS[liability.liability_type] || "#94a3b8";
  const monthsLeft = liability.monthly_payment > 0 ? Math.ceil(liability.current_balance / liability.monthly_payment) : null;

  return (
    <div
      className={`lm-row${hovered ? " lm-row-hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="lm-row-left">
        <div className="lm-avatar" style={{ background: `linear-gradient(135deg,${typeColor}22,${typeColor}44)`, border: `1px solid ${typeColor}44` }}>
          <span style={{ color: typeColor, fontSize: 15, fontFamily: "'DM Serif Display',serif" }}>
            {liability.liability_name?.[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
        <div>
          <div className="lm-name">{liability.liability_name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span className="lm-inst">{liability.lender}</span>
            <span className="lm-type-badge" style={{ borderColor: `${typeColor}44`, color: typeColor }}>
              {TYPE_LABELS[liability.liability_type]}
            </span>
          </div>
        </div>
      </div>

      <div className="lm-row-meta">
        <div className="lm-meta-item">
          <span className="lm-meta-label">ORIGINAL</span>
          <span className="lm-meta-value">{formatCurrency(liability.original_amount)}</span>
          {liability.interest_rate > 0 && (
            <span style={{ fontSize: 10, color: "#fb923c" }}>{liability.interest_rate}% p.a.</span>
          )}
        </div>
        <div className="lm-meta-divider" />
        <BalanceCell liability={liability} token={token} onUpdated={onBalanceUpdated} />
        <div className="lm-meta-divider" />
        <div className="lm-meta-item">
          <span className="lm-meta-label">EMI</span>
          <span className="lm-meta-value">{liability.monthly_payment > 0 ? formatCurrency(liability.monthly_payment) : "—"}</span>
          {monthsLeft !== null && <span style={{ fontSize: 10, color: "#64748b" }}>~{monthsLeft}mo left</span>}
        </div>
        {liability.due_date && (
          <>
            <div className="lm-meta-divider" />
            <div className="lm-meta-item">
              <span className="lm-meta-label">DUE DATE</span>
              <span className="lm-meta-value" style={{ fontSize: 12 }}>{formatDate(liability.due_date)}</span>
            </div>
          </>
        )}
      </div>

      <div className={`lm-row-actions${hovered ? " lm-row-actions-visible" : ""}`}>
        <button className="lm-action-btn lm-action-pay"    onClick={() => onPay(liability)}>↓ Pay</button>
        <button className="lm-action-btn lm-action-edit"   onClick={() => onEdit(liability)}>✎ Edit</button>
        <div className="lm-action-divider" />
        <button className="lm-action-btn lm-action-delete" onClick={() => onDelete(liability)}>✕</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LiabilityManager({ token }) {
  const [liabilities,     setLiabilities]     = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [fetchError,      setFetchError]      = useState(null);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [editLiability,   setEditLiability]   = useState(null);
  const [deleteLiability, setDeleteLiability] = useState(null);
  const [payLiability,    setPayLiability]    = useState(null);

  const isMobile = useIsMobile(700);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_BASE, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Could not load liabilities.");
        setLiabilities(await res.json());
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const updateInList  = (updated) => setLiabilities((prev) => prev.map((l) => l._id === updated._id ? updated : l));
  const handleSaved   = (saved, isEdit) => isEdit ? updateInList(saved) : setLiabilities((prev) => [saved, ...prev]);
  const handleDeleted = (id) => setLiabilities((prev) => prev.filter((l) => l._id !== id));

  const totalOriginal = liabilities.reduce((s, l) => s + (l.original_amount  || 0), 0);
  const totalBalance  = liabilities.reduce((s, l) => s + (l.current_balance  || 0), 0);
  const totalPaidOff  = totalOriginal - totalBalance;
  const overallPct    = totalOriginal ? (totalPaidOff / totalOriginal) * 100 : 0;

  return (
    <div className="lm-page">
      <div className="lm-grain" />
      <div className="lm-container">

        {/* Header */}
        <div className="lm-page-header">
          <div>
            <p className="lm-eyebrow">DEBT TRACKER</p>
            <h1 className="lm-title">Liabilities</h1>
          </div>
          <div className="lm-header-right">
            {liabilities.length > 0 && (
              <div className="lm-stats-row">
                <div className="lm-stat-badge">
                  <span className="lm-stat-label">TOTAL DEBT</span>
                  <span className="lm-stat-value" style={{ color: "#fca5a5" }}>{formatCurrency(totalBalance)}</span>
                </div>
                <div className="lm-stat-arrow">→</div>
                <div className="lm-stat-badge" style={{ borderColor: "rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.05)" }}>
                  <span className="lm-stat-label" style={{ color: "#4ade80" }}>PAID OFF</span>
                  <span className="lm-stat-value" style={{ color: "#4ade80" }}>{formatCurrency(totalPaidOff)}</span>
                  <span className="lm-stat-sub" style={{ color: "#4ade80" }}>{overallPct.toFixed(1)}% cleared</span>
                </div>
              </div>
            )}
            <button className="lm-add-btn" onClick={() => setShowAddModal(true)}>＋ Add Liability</button>
          </div>
        </div>

        {liabilities.length > 0 && (
          <div className="lm-overall-progress">
            <div className="lm-progress-bar" style={{ width: `${overallPct}%`, height: "100%" }} />
          </div>
        )}
        <div className="lm-divider" />

        {loading ? (
          <div className="lm-center-state"><p className="lm-state-text">Loading liabilities…</p></div>
        ) : fetchError ? (
          <div className="lm-center-state"><p style={{ color: "#f87171", fontSize: 13 }}>{fetchError}</p></div>
        ) : liabilities.length === 0 ? (
          <div className="lm-center-state">
            <div className="lm-empty-icon">◇</div>
            <p className="lm-state-title">No liabilities tracked</p>
            <p className="lm-state-text">Add your loans, mortgages, and credit cards to track payoff progress.</p>
            <button className="lm-add-btn" style={{ marginTop: 16 }} onClick={() => setShowAddModal(true)}>
              ＋ Add Your First Liability
            </button>
          </div>
        ) : (
          <>
            <div className="lm-list-meta">
              <span className="lm-list-count">
                {liabilities.length} liabilit{liabilities.length !== 1 ? "ies" : "y"}
              </span>
              <span className="lm-list-hint">
                {isMobile ? "Tap balance to update" : "Hover row · Click balance to update"}
              </span>
            </div>

            {/* Desktop rows */}
            {!isMobile && (
              <div className="lm-list">
                {liabilities.map((l, i) => (
                  <LiabilityRow key={l._id ?? i} liability={l} token={token}
                    onEdit={setEditLiability} onDelete={setDeleteLiability}
                    onPay={setPayLiability} onBalanceUpdated={updateInList} />
                ))}
              </div>
            )}

            {/* Mobile cards */}
            {isMobile && (
              <div className="lm-card-list">
                {liabilities.map((l, i) => (
                  <LiabilityCard key={l._id ?? i} liability={l} token={token}
                    onEdit={setEditLiability} onDelete={setDeleteLiability}
                    onPay={setPayLiability} onBalanceUpdated={updateInList} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal    && <LiabilityModal token={token} onClose={() => setShowAddModal(false)} onSaved={handleSaved} />}
      {editLiability   && <LiabilityModal token={token} editLiability={editLiability} onClose={() => setEditLiability(null)} onSaved={handleSaved} />}
      {deleteLiability && <DeleteModal    token={token} liability={deleteLiability}   onClose={() => setDeleteLiability(null)} onDeleted={handleDeleted} />}
      {payLiability    && <PaymentModal   token={token} liability={payLiability}       onClose={() => setPayLiability(null)}   onUpdated={updateInList} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes lm-fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lm-scaleIn { from { opacity:0; transform:scale(0.94) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes lm-slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        input:focus, textarea:focus, select:focus { border-color: rgba(251,146,60,0.5) !important; background: rgba(251,146,60,0.04) !important; outline: none; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Page ── */
        .lm-page      { min-height:100vh; background:linear-gradient(135deg,#130a0a 0%,#1a0f0f 50%,#110909 100%); font-family:'DM Mono',monospace; color:#e2e8f0; position:relative; }
        .lm-grain     { position:fixed; inset:0; pointer-events:none; z-index:0; opacity:0.04; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        .lm-container { position:relative; z-index:1; max-width:1040px; margin:0 auto; padding:44px 16px 80px; animation:lm-fadeUp 0.5s ease both; }

        /* ── Header ── */
        .lm-page-header { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:14px; margin-bottom:16px; }
        .lm-eyebrow     { font-size:10px; letter-spacing:0.2em; color:#57291a; margin-bottom:5px; }
        .lm-title       { font-family:'DM Serif Display',serif; font-size:clamp(32px,7vw,48px); font-weight:400; color:#fef2f2; line-height:1; letter-spacing:-1px; }
        .lm-header-right{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .lm-stats-row   { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .lm-stat-badge  { display:flex; flex-direction:column; align-items:flex-end; padding:7px 11px; background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.18); border-radius:10px; min-width:94px; }
        .lm-stat-label  { font-size:9px; letter-spacing:0.15em; color:#f87171; margin-bottom:2px; }
        .lm-stat-value  { font-size:clamp(13px,3vw,17px); font-weight:500; color:#fca5a5; }
        .lm-stat-sub    { font-size:10px; margin-top:1px; }
        .lm-stat-arrow  { font-size:14px; color:#3f1a1a; flex-shrink:0; }
        .lm-add-btn     { display:inline-flex; align-items:center; gap:6px; padding:10px 16px; background:linear-gradient(135deg,#c2410c,#ea580c); color:#fff; border:none; border-radius:10px; font-size:12px; font-family:'DM Mono',monospace; font-weight:500; cursor:pointer; white-space:nowrap; box-shadow:0 4px 18px rgba(234,88,12,0.3); }
        .lm-add-btn:active { transform:scale(0.97); }

        .lm-overall-progress { height:4px; background:#1e1212; border-radius:99px; margin-bottom:16px; overflow:hidden; }
        .lm-divider          { height:1px; background:linear-gradient(90deg,transparent,#2a1414 30%,#2a1414 70%,transparent); margin-bottom:20px; }
        .lm-list-meta  { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px; }
        .lm-list-count { font-size:10px; letter-spacing:0.1em; color:#57291a; }
        .lm-list-hint  { font-size:10px; color:#3f1a1a; }

        /* ── Desktop row ── */
        .lm-list { display:flex; flex-direction:column; gap:9px; }
        .lm-row  { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:14px 18px; background:rgba(30,10,10,0.8); border:1px solid #1e1a1a; border-radius:14px; backdrop-filter:blur(10px); animation:lm-fadeUp 0.4s ease both; transition:border-color 0.2s; }
        .lm-row-hovered { border-color:#3f2a2a; }
        .lm-row-left  { display:flex; align-items:center; gap:12px; min-width:180px; }
        .lm-row-meta  { display:flex; flex-wrap:wrap; flex:1; align-items:center; }
        .lm-row-actions { display:flex; align-items:center; gap:6px; opacity:0; transition:opacity 0.15s; }
        .lm-row-actions-visible { opacity:1; }
        .lm-action-divider { width:1px; height:18px; background:#2a1414; margin:0 2px; flex-shrink:0; }
        .lm-meta-divider   { width:1px; height:32px; background:#2a1414; margin:0 16px; flex-shrink:0; }
        .lm-meta-item  { display:flex; flex-direction:column; gap:2px; min-width:100px; }
        .lm-meta-label { font-size:9px; letter-spacing:0.15em; color:#57291a; }
        .lm-meta-value { font-size:13px; color:#e2c5c5; font-weight:500; }

        /* shared identity */
        .lm-avatar    { width:40px; height:40px; border-radius:11px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .lm-name      { font-size:13px; font-weight:500; color:#fef2f2; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; }
        .lm-inst      { font-size:11px; color:#57291a; letter-spacing:0.04em; }
        .lm-type-badge{ font-size:9px; letter-spacing:0.1em; padding:2px 6px; border:1px solid; border-radius:5px; }

        /* inline balance edit */
        .lm-current-val-row  { display:flex; align-items:center; gap:5px; }
        .lm-clickable        { cursor:pointer; }
        .lm-edit-val-btn     { background:none; border:none; color:#57291a; font-size:12px; cursor:pointer; padding:0 2px; opacity:0.7; }
        .lm-inline-edit-row  { display:flex; align-items:center; gap:4px; background:rgba(251,146,60,0.08); border:1px solid rgba(251,146,60,0.35); border-radius:6px; padding:3px 7px; }
        .lm-currency-prefix  { font-size:12px; color:#fb923c; }
        .lm-inline-input     { background:none; border:none; outline:none; color:#fef2f2; font-size:13px; font-family:'DM Mono',monospace; font-weight:500; width:80px; }

        /* progress */
        .lm-progress-wrap  { height:3px; background:#2a1414; border-radius:99px; overflow:hidden; margin-top:3px; }
        .lm-progress-bar   { height:100%; background:linear-gradient(90deg,#c2410c,#fb923c); border-radius:99px; transition:width 0.4s ease; }
        .lm-progress-green { background:linear-gradient(90deg,#16a34a,#4ade80) !important; }
        .lm-progress-label { font-size:9px; color:#57291a; margin-top:2px; }

        /* ── Unified action buttons ── */
        .lm-action-btn {
          display:inline-flex; align-items:center; justify-content:center;
          padding:6px 12px; border-radius:8px;
          font-size:11px; font-family:'DM Mono',monospace; font-weight:500;
          cursor:pointer; white-space:nowrap; line-height:1;
          transition:opacity 0.15s, transform 0.1s;
        }
        .lm-action-btn:active { transform:scale(0.95); }
        .lm-action-pay    { background:rgba(74,222,128,0.10);  border:1px solid rgba(74,222,128,0.28);  color:#4ade80; }
        .lm-action-edit   { background:rgba(251,146,60,0.08);  border:1px solid rgba(251,146,60,0.25);  color:#fb923c; }
        .lm-action-delete { background:rgba(239,68,68,0.08);   border:1px solid rgba(239,68,68,0.22);   color:#f87171; }
        .lm-action-pay:hover    { background:rgba(74,222,128,0.17); }
        .lm-action-edit:hover   { background:rgba(251,146,60,0.16); }
        .lm-action-delete:hover { background:rgba(239,68,68,0.15);  }

        /* ── Mobile card ── */
        .lm-card-list { display:flex; flex-direction:column; gap:12px; }
        .lm-card      { background:rgba(30,10,10,0.85); border:1px solid #1e1a1a; border-radius:16px; overflow:hidden; animation:lm-fadeUp 0.4s ease both; }
        .lm-card-header   { display:flex; justify-content:space-between; align-items:flex-start; padding:14px 14px 8px; gap:8px; }
        .lm-card-identity { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
        .lm-card-values   { display:flex; align-items:center; padding:8px 14px 10px; }
        .lm-card-val-item { flex:1; display:flex; flex-direction:column; gap:2px; min-width:0; }
        .lm-card-val      { font-size:13px; font-weight:500; color:#e2c5c5; }
        .lm-card-val-divider { width:1px; height:40px; background:#2a1414; margin:0 12px; flex-shrink:0; }

        /* Card action bar */
        .lm-card-actions { display:flex; border-top:1px solid #2a1414; }
        .lm-card-actions .lm-action-btn {
          flex:1; border-radius:0; border:none;
          border-right:1px solid #2a1414; padding:11px 6px;
        }
        .lm-card-actions .lm-action-btn:last-child { border-right:none; }
        .lm-card-actions .lm-action-pay    { background:rgba(74,222,128,0.06);  }
        .lm-card-actions .lm-action-edit   { background:rgba(251,146,60,0.06);  }
        .lm-card-actions .lm-action-delete { background:rgba(239,68,68,0.06);   }
        .lm-card-actions .lm-action-btn:active { opacity:0.7; transform:none; }

        /* ── States ── */
        .lm-center-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding-top:70px; gap:10px; text-align:center; }
        .lm-empty-icon   { font-size:42px; color:#2a1414; line-height:1; margin-bottom:8px; }
        .lm-state-title  { font-size:18px; font-family:'DM Serif Display',serif; color:#7f4040; }
        .lm-state-text   { font-size:12px; color:#57291a; max-width:280px; line-height:1.6; }

        /* ── Modal overlay — bottom sheet on mobile ── */
        .lm-overlay { position:fixed; inset:0; background:rgba(8,2,2,0.92); backdrop-filter:blur(8px); z-index:1000; display:flex; align-items:flex-end; justify-content:center; padding:0; }
        @media (min-width:560px) { .lm-overlay { align-items:center; padding:20px; } }

        /* ── Modal panel ── */
        .lm-modal {
          width:100%; max-width:540px;
          background:linear-gradient(145deg,#1a0a0a,#150808);
          border:1px solid #2a1414;
          border-radius:20px 20px 0 0;
          box-shadow:0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,146,60,0.06);
          animation:lm-slideUp 0.28s cubic-bezier(0.34,1.1,0.64,1) both;
          overflow:hidden;
          max-height:92dvh;
          display:flex; flex-direction:column;
        }
        @media (min-width:560px) { .lm-modal { border-radius:20px; animation-name:lm-scaleIn; max-height:90vh; } }
        .lm-modal-wide { max-width:580px; }
        .lm-modal-sm   { max-width:420px; }

        .lm-modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:20px 22px 14px; border-bottom:1px solid #2a1414; flex-shrink:0; }
        .lm-modal-tag    { font-size:9px; letter-spacing:0.2em; color:#fb923c; margin-bottom:4px; }
        .lm-modal-title  { font-family:'DM Serif Display',serif; font-size:clamp(18px,5vw,24px); font-weight:400; color:#fef2f2; }
        .lm-close-btn    { background:rgba(255,255,255,0.03); border:1px solid #2a1414; border-radius:8px; color:#57291a; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px; flex-shrink:0; }
        .lm-modal-body   { padding:16px 22px; overflow-y:auto; flex:1; }
        .lm-modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:12px 22px 18px; border-top:1px solid #2a1414; flex-shrink:0; flex-wrap:wrap; }
        @media (max-width:400px) {
          .lm-modal-footer { flex-direction:column-reverse; }
          .lm-modal-footer button { width:100%; justify-content:center; }
        }

        .lm-error-banner { padding:9px 13px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:8px; color:#fca5a5; font-size:12px; margin-bottom:14px; }
        .lm-info-banner  { padding:9px 13px; background:rgba(251,146,60,0.06); border:1px solid rgba(251,146,60,0.18); border-radius:8px; color:#fb923c; font-size:11px; margin-bottom:14px; line-height:1.5; }

        /* ── Form grid ── */
        .lm-field-grid { display:grid; grid-template-columns:1fr 1fr; gap:11px; }
        .lm-field-full { grid-column:1 / -1; display:flex; flex-direction:column; gap:5px; }
        .lm-field-half { display:flex; flex-direction:column; gap:5px; }
        @media (max-width:480px) {
          .lm-field-grid { grid-template-columns:1fr; }
          .lm-field-half { grid-column:1 / -1; }
        }
        .lm-label   { font-size:10px; letter-spacing:0.1em; color:#7f4040; }
        .lm-req     { color:#fb923c; }
        .lm-input   { width:100%; padding:9px 11px; background:rgba(255,255,255,0.03); border:1px solid #2a1414; border-radius:9px; color:#fef2f2; font-size:13px; font-family:'DM Mono',monospace; outline:none; transition:border-color 0.15s,background 0.15s; -webkit-appearance:none; }
        .lm-select  { cursor:pointer; }
        .lm-textarea{ resize:vertical; min-height:66px; line-height:1.6; }

        /* Modal footer buttons */
        .lm-cancel-btn        { padding:9px 15px; background:transparent; border:1px solid #2a1414; border-radius:9px; color:#57291a; font-size:12px; font-family:'DM Mono',monospace; cursor:pointer; }
        .lm-save-btn          { padding:9px 18px; background:linear-gradient(135deg,#c2410c,#ea580c); border:none; border-radius:9px; color:#fff; font-size:12px; font-family:'DM Mono',monospace; font-weight:500; cursor:pointer; box-shadow:0 4px 14px rgba(234,88,12,0.3); }
        .lm-pay-confirm-btn   { padding:9px 18px; background:linear-gradient(135deg,#16a34a,#4ade80); border:none; border-radius:9px; color:#052e16; font-size:12px; font-family:'DM Mono',monospace; font-weight:500; cursor:pointer; }
        .lm-delete-confirm-btn{ padding:9px 18px; background:linear-gradient(135deg,#7f1d1d,#dc2626); border:none; border-radius:9px; color:#fff; font-size:12px; font-family:'DM Mono',monospace; font-weight:500; cursor:pointer; }

        /* Snapshot */
        .lm-snapshot-row   { display:flex; align-items:center; gap:8px; padding:11px 13px; background:rgba(255,255,255,0.02); border:1px solid #2a1414; border-radius:10px; margin-bottom:14px; flex-wrap:wrap; }
        .lm-snapshot-item  { display:flex; flex-direction:column; gap:3px; flex:1; min-width:90px; }
        .lm-snapshot-label { font-size:9px; letter-spacing:0.15em; color:#57291a; }
        .lm-snapshot-value { font-size:clamp(14px,4vw,17px); font-weight:500; color:#e2c5c5; }
        .lm-snapshot-arrow { font-size:15px; color:#3f1a1a; flex-shrink:0; }
        .lm-progress-preview{ height:4px; background:#1e1212; border-radius:99px; overflow:hidden; margin-bottom:12px; }
        .lm-max-btn        { position:absolute; right:9px; top:50%; transform:translateY(-50%); background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.2); border-radius:5px; color:#4ade80; font-size:9px; font-family:'DM Mono',monospace; padding:3px 6px; cursor:pointer; }
        .lm-payoff-note    { margin-top:10px; font-size:11px; color:#4ade80; padding:9px 12px; background:rgba(74,222,128,0.06); border:1px solid rgba(74,222,128,0.15); border-radius:8px; line-height:1.5; }

        /* ── Responsive container padding ── */
        @media (max-width:639px) {
          .lm-container { padding-top:20px; padding-left:12px; padding-right:12px; }
        }
      `}</style>
    </div>
  );
}