import { useState, useEffect, useRef } from "react";

const API_BASE = "https://maadala.onrender.com/api/liabilities";

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
  loan: "Loan",
  mortgage: "Mortgage",
  credit_card: "Credit Card",
  student_loan: "Student Loan",
  auto_loan: "Auto Loan",
  other: "Other",
};

const TYPE_COLORS = {
  loan: "#fb923c",
  mortgage: "#a78bfa",
  credit_card: "#f87171",
  student_loan: "#60a5fa",
  auto_loan: "#34d399",
  other: "#94a3b8",
};

const EMPTY_FORM = {
  liability_name: "",
  lender: "",
  liability_type: "loan",
  original_amount: "",
  current_balance: "",
  interest_rate: "",
  monthly_payment: "",
  due_date: "",
  start_date: "",
  notes: "",
};

// ─── Inline Balance Cell ──────────────────────────────────────────────────────

function BalanceCell({ liability, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_balance: parsed }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdated(updated);
    } catch {
      // silently revert
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  };

  const paidOff = liability.original_amount - liability.current_balance;
  const pct = liability.original_amount
    ? Math.min(100, (paidOff / liability.original_amount) * 100)
    : 0;

  return (
    <div style={styles.metaItem}>
      <span style={styles.metaLabel}>BALANCE REMAINING</span>

      {editing ? (
        <div style={styles.inlineEditRow}>
          <span style={styles.currencyPrefix}>$</span>
          <input
            ref={inputRef}
            style={styles.inlineInput}
            type="number"
            min="0"
            step="0.01"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={save}
            disabled={saving}
          />
        </div>
      ) : (
        <div style={styles.currentValueRow}>
          <span
            style={{ ...styles.metaValue, color: "#fca5a5", cursor: "pointer" }}
            onClick={startEdit}
            title="Click to update balance"
          >
            {formatCurrency(liability.current_balance)}
          </span>
          <button style={styles.editValueBtn} onClick={startEdit} title="Edit balance">✎</button>
        </div>
      )}

      {/* Payoff progress bar */}
      <div style={styles.progressWrap}>
        <div style={{ ...styles.progressBar, width: `${pct}%` }} />
      </div>
      <span style={styles.progressLabel}>
        {pct.toFixed(1)}% paid · {formatCurrency(paidOff)} cleared
      </span>
    </div>
  );
}

// ─── Make Payment Modal ───────────────────────────────────────────────────────

function PaymentModal({ liability, onClose, onUpdated }) {
  const [amount, setAmount] = useState(
    liability.monthly_payment ? liability.monthly_payment.toString() : ""
  );
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parsed = parseFloat(amount);
  const isValid = parsed > 0 && parsed <= liability.current_balance;
  const newBalance = isValid ? liability.current_balance - parsed : null;
  const newPct = isValid && liability.original_amount
    ? Math.min(100, ((liability.original_amount - newBalance) / liability.original_amount) * 100)
    : null;
  const isFullPayoff = parsed === liability.current_balance;

  const handlePay = async () => {
    if (!isValid) {
      setError(
        parsed > liability.current_balance
          ? `Payment exceeds balance of ${formatCurrency(liability.current_balance)}.`
          : "Enter a valid payment amount."
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/${liability._id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, date, note }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Payment failed.");
      }
      const updated = await res.json();
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...styles.modal, maxWidth: 480 }}>
        <div style={styles.modalHeader}>
          <div>
            <div style={{ ...styles.modalTag, color: "#4ade80" }}>MAKE PAYMENT</div>
            <h2 style={styles.modalTitle}>{liability.liability_name}</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          {/* Balance snapshot */}
          <div style={styles.snapshotRow}>
            <div style={styles.snapshotItem}>
              <span style={styles.snapshotLabel}>CURRENT BALANCE</span>
              <span style={{ ...styles.snapshotValue, color: "#fca5a5" }}>
                {formatCurrency(liability.current_balance)}
              </span>
            </div>
            <div style={styles.snapshotArrow}>→</div>
            <div style={{ ...styles.snapshotItem, opacity: newBalance !== null ? 1 : 0.3 }}>
              <span style={{ ...styles.snapshotLabel, color: "#4ade80" }}>AFTER PAYMENT</span>
              <span style={{ ...styles.snapshotValue, color: "#4ade80" }}>
                {newBalance !== null ? formatCurrency(newBalance) : "—"}
              </span>
            </div>
          </div>

          {/* Progress preview */}
          {newPct !== null && (
            <div style={styles.progressPreview}>
              <div style={{ ...styles.progressBar, width: `${newPct}%`, background: "linear-gradient(90deg,#16a34a,#4ade80)" }} />
              <span style={{ ...styles.progressLabel, color: "#4ade80" }}>
                {newPct.toFixed(1)}% paid off after this payment
              </span>
            </div>
          )}

          <div style={styles.fieldGrid}>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Payment Amount ($) <span style={styles.req}>*</span></label>
              <div style={{ position: "relative" }}>
                <input
                  style={styles.input}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
                <button
                  style={styles.maxBtn}
                  onClick={() => setAmount(liability.current_balance.toString())}
                >
                  PAYOFF
                </button>
              </div>
            </div>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>Payment Date</label>
              <input
                style={styles.input}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>Note (optional)</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. Monthly EMI"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {isFullPayoff && (
            <div style={styles.payoffNote}>
              🎉 This will fully pay off this liability!
            </div>
          )}
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={styles.payConfirmBtn} onClick={handlePay} disabled={loading || !isValid}>
            {loading ? "Processing…" : isFullPayoff ? "✓ Full Payoff" : "✓ Make Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function LiabilityModal({ onClose, onSaved, editLiability = null }) {
  const isEdit = !!editLiability;

  const [form, setForm] = useState(
    isEdit
      ? {
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
        }
      : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.liability_name.trim() || !form.lender.trim() || !form.original_amount) {
      setError("Name, lender, and original amount are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = isEdit ? `${API_BASE}/${editLiability._id}` : API_BASE;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        ...form,
        original_amount: parseFloat(form.original_amount),
        current_balance: form.current_balance ? parseFloat(form.current_balance) : parseFloat(form.original_amount),
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : 0,
        monthly_payment: form.monthly_payment ? parseFloat(form.monthly_payment) : 0,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Failed to ${isEdit ? "update" : "save"} liability.`);
      const saved = await res.json();
      onSaved(saved, isEdit);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...styles.modal, maxWidth: 580 }}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTag}>{isEdit ? "EDIT LIABILITY" : "NEW LIABILITY"}</div>
            <h2 style={styles.modalTitle}>{isEdit ? "Edit Liability" : "Add Liability"}</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {error && <div style={styles.errorBanner}>{error}</div>}
          {isEdit && (
            <div style={styles.infoBanner}>
              Use the Pay button on the row to record payments. This modal corrects details only.
            </div>
          )}

          <div style={styles.fieldGrid}>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Liability Name <span style={styles.req}>*</span></label>
              <input
                style={styles.input}
                name="liability_name"
                placeholder="e.g. Home Loan, Car Loan, Visa Card"
                value={form.liability_name}
                onChange={handleChange}
              />
            </div>

            <div style={styles.fieldHalf}>
              <label style={styles.label}>Lender / Institution <span style={styles.req}>*</span></label>
              <input
                style={styles.input}
                name="lender"
                placeholder="e.g. HDFC Bank, Chase"
                value={form.lender}
                onChange={handleChange}
              />
            </div>

            <div style={styles.fieldHalf}>
              <label style={styles.label}>Type</label>
              <select
                style={{ ...styles.input, cursor: "pointer" }}
                name="liability_type"
                value={form.liability_type}
                onChange={handleChange}
              >
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val} style={{ background: "#0f172a" }}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.fieldHalf}>
              <label style={styles.label}>
                Original Amount ($) <span style={styles.req}>*</span>
              </label>
              <input
                style={styles.input}
                name="original_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.original_amount}
                onChange={handleChange}
              />
            </div>

            <div style={styles.fieldHalf}>
              <label style={styles.label}>
                Current Balance ($)
                <span style={styles.labelHint}> — defaults to original</span>
              </label>
              <input
                style={styles.input}
                name="current_balance"
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave blank to use original amount"
                value={form.current_balance}
                onChange={handleChange}
              />
            </div>

            <div style={styles.fieldHalf}>
              <label style={styles.label}>Interest Rate (%)</label>
              <input
                style={styles.input}
                name="interest_rate"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 8.5"
                value={form.interest_rate}
                onChange={handleChange}
              />
            </div>

            <div style={styles.fieldHalf}>
              <label style={styles.label}>Monthly Payment ($)</label>
              <input
                style={styles.input}
                name="monthly_payment"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.monthly_payment}
                onChange={handleChange}
              />
            </div>

            <div style={styles.fieldHalf}>
              <label style={styles.label}>Start Date</label>
              <input
                style={styles.input}
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={handleChange}
              />
            </div>

            <div style={styles.fieldHalf}>
              <label style={styles.label}>Due / Maturity Date</label>
              <input
                style={styles.input}
                name="due_date"
                type="date"
                value={form.due_date}
                onChange={handleChange}
              />
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.label}>Notes</label>
              <textarea
                style={{ ...styles.input, ...styles.textarea }}
                name="notes"
                placeholder="Any additional context..."
                value={form.notes}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={styles.saveBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : isEdit ? "✓ Update Liability" : "＋ Add Liability"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ liability, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${liability._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete liability.");
      onDeleted(liability._id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...styles.modal, maxWidth: 420 }}>
        <div style={styles.modalHeader}>
          <div>
            <div style={{ ...styles.modalTag, color: "#ef4444" }}>CONFIRM DELETE</div>
            <h2 style={styles.modalTitle}>Remove Liability</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ ...styles.modalBody, paddingBottom: 8 }}>
          {error && <div style={styles.errorBanner}>{error}</div>}
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
            Remove{" "}
            <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{liability.liability_name}</span>{" "}
            from your liabilities? Payment history will be lost permanently.
          </p>
        </div>
        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={styles.deleteConfirmBtn} onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete Liability"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Liability Row ────────────────────────────────────────────────────────────

function LiabilityRow({ liability, onEdit, onDelete, onPay, onBalanceUpdated }) {
  const [hovered, setHovered] = useState(false);

  const typeColor = TYPE_COLORS[liability.liability_type] || "#94a3b8";
  const monthsLeft = liability.monthly_payment > 0
    ? Math.ceil(liability.current_balance / liability.monthly_payment)
    : null;

  return (
    <div
      style={{ ...styles.row, borderColor: hovered ? "#3f2a2a" : "#1e1a1a" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left */}
      <div style={styles.rowLeft}>
        <div style={{ ...styles.assetAvatar, background: `linear-gradient(135deg, ${typeColor}22, ${typeColor}44)`, border: `1px solid ${typeColor}44` }}>
          <span style={{ color: typeColor, fontSize: 16, fontFamily: "'DM Serif Display', serif" }}>
            {liability.liability_name?.[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
        <div>
          <div style={styles.assetName}>{liability.liability_name}</div>
          <div style={styles.rowSubLine}>
            <span style={styles.assetInstitution}>{liability.lender}</span>
            <span style={{ ...styles.typeBadge, borderColor: `${typeColor}44`, color: typeColor }}>
              {TYPE_LABELS[liability.liability_type]}
            </span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={styles.rowMeta}>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>ORIGINAL</span>
          <span style={styles.metaValue}>{formatCurrency(liability.original_amount)}</span>
          {liability.interest_rate > 0 && (
            <span style={{ fontSize: 11, color: "#fb923c" }}>{liability.interest_rate}% p.a.</span>
          )}
        </div>

        <div style={styles.metaDivider} />

        <BalanceCell liability={liability} onUpdated={onBalanceUpdated} />

        <div style={styles.metaDivider} />

        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>MONTHLY EMI</span>
          <span style={styles.metaValue}>
            {liability.monthly_payment > 0 ? formatCurrency(liability.monthly_payment) : "—"}
          </span>
          {monthsLeft !== null && (
            <span style={{ fontSize: 11, color: "#64748b" }}>~{monthsLeft} mo left</span>
          )}
        </div>

        {liability.due_date && (
          <>
            <div style={styles.metaDivider} />
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>DUE DATE</span>
              <span style={{ ...styles.metaValue, fontSize: 13 }}>{formatDate(liability.due_date)}</span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ ...styles.rowActions, opacity: hovered ? 1 : 0 }}>
        <button style={styles.payBtn} onClick={() => onPay(liability)} title="Make payment">
          ↓ Pay
        </button>
        <div style={styles.actionDivider} />
        <button style={styles.editBtn} onClick={() => onEdit(liability)} title="Edit details">✎</button>
        <button style={styles.deleteBtn} onClick={() => onDelete(liability)} title="Delete">✕</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LiabilityManager() {
  const [liabilities, setLiabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editLiability, setEditLiability] = useState(null);
  const [deleteLiability, setDeleteLiability] = useState(null);
  const [payLiability, setPayLiability] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error("Could not load liabilities.");
        const data = await res.json();
        setLiabilities(data);
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateInList = (updated) =>
    setLiabilities((prev) => prev.map((l) => (l._id === updated._id ? updated : l)));

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      updateInList(saved);
    } else {
      setLiabilities((prev) => [saved, ...prev]);
    }
  };

  const handleDeleted = (id) =>
    setLiabilities((prev) => prev.filter((l) => l._id !== id));

  const totalOriginal = liabilities.reduce((s, l) => s + (l.original_amount || 0), 0);
  const totalBalance = liabilities.reduce((s, l) => s + (l.current_balance || 0), 0);
  const totalPaidOff = totalOriginal - totalBalance;
  const overallPct = totalOriginal ? (totalPaidOff / totalOriginal) * 100 : 0;

  return (
    <div style={styles.page}>
      <div style={styles.grain} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.pageHeader}>
          <div>
            <p style={styles.pageEyebrow}>DEBT TRACKER</p>
            <h1 style={styles.pageTitle}>Liabilities</h1>
          </div>
          <div style={styles.headerRight}>
            {liabilities.length > 0 && (
              <div style={styles.statsRow}>
                <div style={styles.statBadge}>
                  <span style={styles.statLabel}>TOTAL DEBT</span>
                  <span style={{ ...styles.statValue, color: "#fca5a5" }}>
                    {formatCurrency(totalBalance)}
                  </span>
                </div>
                <div style={styles.statArrow}>→</div>
                <div style={{ ...styles.statBadge, borderColor: "rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.05)" }}>
                  <span style={{ ...styles.statLabel, color: "#4ade80" }}>PAID OFF</span>
                  <span style={{ ...styles.statValue, color: "#4ade80" }}>
                    {formatCurrency(totalPaidOff)}
                  </span>
                  <span style={{ fontSize: 11, color: "#4ade80", marginTop: 1 }}>
                    {overallPct.toFixed(1)}% cleared
                  </span>
                </div>
              </div>
            )}
            <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
              ＋ Add Liability
            </button>
          </div>
        </div>

        {/* Overall progress bar */}
        {liabilities.length > 0 && (
          <div style={styles.overallProgress}>
            <div style={{ ...styles.progressBar, width: `${overallPct}%`, height: 4 }} />
          </div>
        )}

        <div style={styles.divider} />

        {/* Content */}
        {loading ? (
          <div style={styles.centerState}>
            <p style={styles.stateText}>Loading liabilities…</p>
          </div>
        ) : fetchError ? (
          <div style={styles.centerState}>
            <p style={{ color: "#f87171", fontSize: 14 }}>{fetchError}</p>
          </div>
        ) : liabilities.length === 0 ? (
          <div style={styles.centerState}>
            <div style={styles.emptyIcon}>◇</div>
            <p style={styles.stateTitle}>No liabilities tracked</p>
            <p style={styles.stateText}>Add your loans, mortgages, and credit cards to track payoff progress.</p>
            <button style={{ ...styles.addBtn, marginTop: 16 }} onClick={() => setShowAddModal(true)}>
              ＋ Add Your First Liability
            </button>
          </div>
        ) : (
          <>
            <div style={styles.listMeta}>
              <span style={styles.listCount}>
                {liabilities.length} liabilit{liabilities.length !== 1 ? "ies" : "y"}
              </span>
              <span style={styles.listHint}>Hover a row · Click balance to update</span>
            </div>
            <div style={styles.list}>
              {liabilities.map((l, i) => (
                <LiabilityRow
                  key={l._id ?? i}
                  liability={l}
                  onEdit={setEditLiability}
                  onDelete={setDeleteLiability}
                  onPay={setPayLiability}
                  onBalanceUpdated={updateInList}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <LiabilityModal onClose={() => setShowAddModal(false)} onSaved={handleSaved} />
      )}
      {editLiability && (
        <LiabilityModal
          editLiability={editLiability}
          onClose={() => setEditLiability(null)}
          onSaved={handleSaved}
        />
      )}
      {deleteLiability && (
        <DeleteModal
          liability={deleteLiability}
          onClose={() => setDeleteLiability(null)}
          onDeleted={handleDeleted}
        />
      )}
      {payLiability && (
        <PaymentModal
          liability={payLiability}
          onClose={() => setPayLiability(null)}
          onUpdated={updateInList}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        input:focus, textarea:focus, select:focus {
          border-color: rgba(251,146,60,0.5) !important;
          background: rgba(251,146,60,0.04) !important;
          outline: none;
        }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #130a0a 0%, #1a0f0f 50%, #110909 100%)",
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
    maxWidth: 1040, margin: "0 auto",
    padding: "56px 24px 80px",
    animation: "fadeUp 0.5s ease both",
  },
  pageHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 20,
  },
  pageEyebrow: { fontSize: 11, letterSpacing: "0.2em", color: "#57291a", marginBottom: 6 },
  pageTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 52, fontWeight: 400, color: "#fef2f2",
    lineHeight: 1, letterSpacing: "-1px",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
  statsRow: { display: "flex", alignItems: "center", gap: 8 },
  statBadge: {
    display: "flex", flexDirection: "column", alignItems: "flex-end",
    padding: "10px 14px",
    background: "rgba(248,113,113,0.06)",
    border: "1px solid rgba(248,113,113,0.18)",
    borderRadius: 10, minWidth: 120,
  },
  statLabel: { fontSize: 10, letterSpacing: "0.15em", color: "#f87171", marginBottom: 3 },
  statValue: { fontSize: 18, fontWeight: 500, color: "#fca5a5", letterSpacing: "-0.5px" },
  statArrow: { fontSize: 16, color: "#3f1a1a" },
  addBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 22px",
    background: "linear-gradient(135deg, #c2410c, #ea580c)",
    color: "#fff", border: "none", borderRadius: 10,
    fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 500,
    cursor: "pointer", letterSpacing: "0.03em",
    boxShadow: "0 4px 20px rgba(234,88,12,0.3)",
  },
  overallProgress: {
    height: 4, background: "#1e1212", borderRadius: 99, marginBottom: 20, overflow: "hidden",
  },
  divider: {
    height: 1,
    background: "linear-gradient(90deg, transparent, #2a1414 30%, #2a1414 70%, transparent)",
    marginBottom: 24,
  },
  listMeta: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  listCount: { fontSize: 11, letterSpacing: "0.1em", color: "#57291a" },
  listHint: { fontSize: 11, color: "#3f1a1a" },
  list: { display: "flex", flexDirection: "column", gap: 10 },

  row: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", flexWrap: "wrap", gap: 16,
    padding: "18px 22px",
    background: "rgba(30,10,10,0.8)",
    border: "1px solid #1e1a1a", borderRadius: 14,
    backdropFilter: "blur(10px)",
    animation: "fadeUp 0.4s ease both",
    transition: "border-color 0.2s",
  },
  rowLeft: { display: "flex", alignItems: "center", gap: 14, minWidth: 200 },
  assetAvatar: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  assetName: { fontSize: 15, fontWeight: 500, color: "#fef2f2", marginBottom: 4 },
  rowSubLine: { display: "flex", alignItems: "center", gap: 8 },
  assetInstitution: { fontSize: 12, color: "#57291a", letterSpacing: "0.04em" },
  typeBadge: {
    fontSize: 10, letterSpacing: "0.1em", padding: "2px 7px",
    border: "1px solid", borderRadius: 5,
  },
  rowMeta: { display: "flex", gap: 0, flexWrap: "wrap", flex: 1, alignItems: "center" },
  metaDivider: {
    width: 1, height: 36, background: "#2a1414", margin: "0 20px", flexShrink: 0,
  },
  metaItem: { display: "flex", flexDirection: "column", gap: 2, minWidth: 110 },
  metaLabel: { fontSize: 10, letterSpacing: "0.15em", color: "#57291a" },
  metaValue: { fontSize: 15, color: "#e2c5c5", fontWeight: 500 },

  currentValueRow: { display: "flex", alignItems: "center", gap: 6 },
  editValueBtn: {
    background: "none", border: "none", color: "#57291a",
    fontSize: 13, cursor: "pointer", padding: "0 2px", opacity: 0.7,
  },
  inlineEditRow: {
    display: "flex", alignItems: "center", gap: 4,
    background: "rgba(251,146,60,0.08)",
    border: "1px solid rgba(251,146,60,0.35)",
    borderRadius: 7, padding: "3px 8px",
  },
  currencyPrefix: { fontSize: 13, color: "#fb923c" },
  inlineInput: {
    background: "none", border: "none", outline: "none",
    color: "#fef2f2", fontSize: 14, fontFamily: "'DM Mono', monospace",
    fontWeight: 500, width: 90,
  },

  progressWrap: {
    height: 3, background: "#2a1414", borderRadius: 99,
    overflow: "hidden", marginTop: 4,
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, #c2410c, #fb923c)",
    borderRadius: 99,
    transition: "width 0.4s ease",
  },
  progressLabel: { fontSize: 10, color: "#57291a", marginTop: 2, letterSpacing: "0.03em" },

  rowActions: {
    display: "flex", alignItems: "center", gap: 6,
    transition: "opacity 0.15s ease",
  },
  payBtn: {
    padding: "7px 14px", borderRadius: 8,
    background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)",
    color: "#4ade80", fontSize: 12, fontFamily: "'DM Mono', monospace",
    fontWeight: 500, cursor: "pointer", letterSpacing: "0.03em",
  },
  actionDivider: {
    width: 1, height: 20, background: "#2a1414", margin: "0 2px", flexShrink: 0,
  },
  editBtn: {
    width: 30, height: 30, borderRadius: 8,
    background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)",
    color: "#fb923c", fontSize: 14, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  deleteBtn: {
    width: 30, height: 30, borderRadius: 8,
    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
    color: "#f87171", fontSize: 12, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  centerState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", paddingTop: 80, gap: 10, textAlign: "center",
  },
  emptyIcon: { fontSize: 48, color: "#2a1414", lineHeight: 1, marginBottom: 8 },
  stateTitle: { fontSize: 20, fontFamily: "'DM Serif Display', serif", color: "#7f4040" },
  stateText: { fontSize: 13, color: "#57291a", maxWidth: 300, lineHeight: 1.6 },

  // ── Shared modal styles ──
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(8,2,2,0.92)",
    backdropFilter: "blur(8px)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  },
  modal: {
    width: "100%", maxWidth: 540,
    background: "linear-gradient(145deg, #1a0a0a, #150808)",
    border: "1px solid #2a1414", borderRadius: 20,
    boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,146,60,0.06)",
    animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "26px 26px 18px", borderBottom: "1px solid #2a1414",
  },
  modalTag: { fontSize: 10, letterSpacing: "0.2em", color: "#fb923c", marginBottom: 5 },
  modalTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 26, fontWeight: 400, color: "#fef2f2",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.03)", border: "1px solid #2a1414",
    borderRadius: 8, color: "#57291a", width: 30, height: 30,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontSize: 12,
  },
  modalBody: { padding: "22px 26px" },
  errorBanner: {
    padding: "10px 14px",
    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 8, color: "#fca5a5", fontSize: 13, marginBottom: 16,
  },
  infoBanner: {
    padding: "10px 14px",
    background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.18)",
    borderRadius: 8, color: "#fb923c", fontSize: 12, marginBottom: 16, lineHeight: 1.5,
  },
  fieldGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  fieldFull: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 },
  fieldHalf: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, letterSpacing: "0.1em", color: "#7f4040" },
  labelHint: { fontSize: 10, color: "#3f1a1a", letterSpacing: "0" },
  req: { color: "#fb923c" },
  input: {
    width: "100%", padding: "10px 13px",
    background: "rgba(255,255,255,0.03)", border: "1px solid #2a1414",
    borderRadius: 10, color: "#fef2f2", fontSize: 14,
    fontFamily: "'DM Mono', monospace", outline: "none",
    transition: "border-color 0.15s, background 0.15s",
  },
  textarea: { resize: "vertical", minHeight: 70, lineHeight: 1.6 },
  modalFooter: {
    display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "16px 26px 22px", borderTop: "1px solid #2a1414",
  },
  cancelBtn: {
    padding: "10px 18px", background: "transparent",
    border: "1px solid #2a1414", borderRadius: 10,
    color: "#57291a", fontSize: 13, fontFamily: "'DM Mono', monospace", cursor: "pointer",
  },
  saveBtn: {
    padding: "10px 22px",
    background: "linear-gradient(135deg, #c2410c, #ea580c)",
    border: "none", borderRadius: 10, color: "#fff",
    fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(234,88,12,0.3)",
  },
  payConfirmBtn: {
    padding: "10px 22px",
    background: "linear-gradient(135deg, #16a34a, #4ade80)",
    border: "none", borderRadius: 10, color: "#052e16",
    fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(74,222,128,0.25)",
  },
  deleteConfirmBtn: {
    padding: "10px 22px",
    background: "linear-gradient(135deg, #7f1d1d, #dc2626)",
    border: "none", borderRadius: 10, color: "#fff",
    fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(220,38,38,0.2)",
  },

  // ── Payment modal specific ──
  snapshotRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "14px 16px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #2a1414", borderRadius: 10,
    marginBottom: 16,
  },
  snapshotItem: { display: "flex", flexDirection: "column", gap: 3, flex: 1 },
  snapshotLabel: { fontSize: 10, letterSpacing: "0.15em", color: "#57291a" },
  snapshotValue: { fontSize: 18, fontWeight: 500, color: "#e2c5c5", letterSpacing: "-0.3px" },
  snapshotArrow: { fontSize: 18, color: "#3f1a1a", flexShrink: 0 },
  progressPreview: {
    height: 4, background: "#1e1212", borderRadius: 99, overflow: "hidden", marginBottom: 14,
  },
  maxBtn: {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
    borderRadius: 5, color: "#4ade80", fontSize: 10, fontFamily: "'DM Mono', monospace",
    padding: "3px 7px", cursor: "pointer", letterSpacing: "0.08em",
  },
  payoffNote: {
    marginTop: 12, fontSize: 12, color: "#4ade80",
    padding: "10px 14px",
    background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)",
    borderRadius: 8, lineHeight: 1.5,
  },
};