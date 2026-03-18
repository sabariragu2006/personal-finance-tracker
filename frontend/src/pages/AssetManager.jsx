import { useState, useEffect, useRef } from "react";

const BASE     = import.meta.env.VITE_API_URL;
const API_BASE = `${BASE}/api/assets`;

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
const gainColor  = (gain) => (gain > 0 ? "#4ade80" : gain < 0 ? "#f87171" : "#64748b");
const gainPrefix = (gain) => (gain > 0 ? "+" : "");

const EMPTY_FORM = { asset_name: "", institution: "", invested_value: "", invested_date: "", notes: "" };

function useIsMobile(bp = 640) {
  const [is, setIs] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const h = () => setIs(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return is;
}

// ─── Inline Current Value Editor ─────────────────────────────────────────────
function CurrentValueCell({ asset, token, onUpdated }) {
  const [editing,  setEditing]  = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [saving,   setSaving]   = useState(false);
  const inputRef = useRef(null);

  const startEdit = () => {
    setInputVal(asset.current_value ?? asset.invested_value);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  };
  const cancel = () => setEditing(false);

  const save = async () => {
    const parsed = parseFloat(inputVal);
    if (isNaN(parsed) || parsed < 0) return cancel();
    if (parsed === asset.current_value) return cancel();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/${asset._id}/current-value`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_value: parsed }),
      });
      if (!res.ok) throw new Error();
      onUpdated(await res.json());
    } catch { /* silently revert */ }
    finally { setSaving(false); setEditing(false); }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); };

  const currentVal = asset.current_value ?? asset.invested_value;
  const gain       = currentVal - asset.invested_value;
  const gainPct    = asset.invested_value ? (gain / asset.invested_value) * 100 : 0;

  return (
    <div className="am-meta-item">
      <span className="am-meta-label">CURRENT VALUE</span>
      {editing ? (
        <div className="am-inline-edit-row">
          <span className="am-currency-prefix">$</span>
          <input ref={inputRef} className="am-inline-input" type="number" min="0" step="0.01"
            value={inputVal} onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown} onBlur={save} disabled={saving} />
        </div>
      ) : (
        <div className="am-current-value-row">
          <span className="am-meta-value am-clickable" onClick={startEdit} title="Tap to update">
            {formatCurrency(currentVal)}
          </span>
          <button className="am-edit-value-btn" onClick={startEdit} title="Edit current value">✎</button>
        </div>
      )}
      <span className="am-gain-badge" style={{ color: gainColor(gain) }}>
        {gainPrefix(gain)}{formatCurrency(gain)} ({gainPrefix(gainPct)}{gainPct.toFixed(1)}%)
      </span>
    </div>
  );
}

// ─── Buy Modal ────────────────────────────────────────────────────────────────
function BuyModal({ asset, token, onClose, onUpdated }) {
  const [amount,  setAmount]  = useState("");
  const [date,    setDate]    = useState(today());
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const newInvested = parseFloat(amount) > 0 ? asset.invested_value + parseFloat(amount) : null;
  const newCurrent  = parseFloat(amount) > 0 ? (asset.current_value || asset.invested_value) + parseFloat(amount) : null;

  const handleBuy = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { setError("Enter a valid buy amount."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/${asset._id}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parsed, date }),
      });
      if (!res.ok) throw new Error("Buy failed.");
      onUpdated(await res.json());
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="am-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="am-modal">
        <div className="am-modal-header">
          <div>
            <div className="am-modal-tag" style={{ color: "#4ade80" }}>BUY MORE</div>
            <h2 className="am-modal-title">{asset.asset_name}</h2>
          </div>
          <button className="am-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="am-modal-body">
          {error && <div className="am-error-banner">{error}</div>}
          <div className="am-snapshot-row">
            <div className="am-snapshot-item">
              <span className="am-snapshot-label">CURRENT INVESTED</span>
              <span className="am-snapshot-value">{formatCurrency(asset.invested_value)}</span>
            </div>
            <div className="am-snapshot-arrow">→</div>
            <div className="am-snapshot-item" style={{ opacity: newInvested ? 1 : 0.3 }}>
              <span className="am-snapshot-label" style={{ color: "#4ade80" }}>AFTER BUY</span>
              <span className="am-snapshot-value" style={{ color: "#4ade80" }}>{newInvested ? formatCurrency(newInvested) : "—"}</span>
            </div>
          </div>
          <div className="am-field-grid">
            <div className="am-field-full">
              <label className="am-label">Buy Amount ($) <span className="am-req">*</span></label>
              <input className="am-input" type="number" min="0.01" step="0.01" placeholder="0.00"
                value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            </div>
            <div className="am-field-full">
              <label className="am-label">Transaction Date</label>
              <input className="am-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          {newCurrent && (
            <div className="am-preview-note">
              New current value will be <strong style={{ color: "#4ade80" }}>{formatCurrency(newCurrent)}</strong>
            </div>
          )}
        </div>
        <div className="am-modal-footer">
          <button className="am-cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="am-buy-confirm-btn" onClick={handleBuy} disabled={loading}>
            {loading ? "Processing…" : "↑ Confirm Buy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sell Modal ───────────────────────────────────────────────────────────────
function SellModal({ asset, token, onClose, onUpdated }) {
  const [proceeds, setProceeds] = useState("");
  const [date,     setDate]     = useState(today());
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const parsedProceeds     = parseFloat(proceeds);
  const cv                 = asset.current_value || asset.invested_value;
  const isValid            = parsedProceeds > 0 && parsedProceeds <= cv;
  const sellRatio          = isValid ? parsedProceeds / cv : 0;
  const costBasisReduction = isValid ? asset.invested_value * sellRatio : 0;
  const newCurrent         = isValid ? cv - parsedProceeds : null;
  const newInvested        = isValid ? asset.invested_value - costBasisReduction : null;
  const realizedGain       = isValid ? parsedProceeds - costBasisReduction : null;
  const isFullSell         = parsedProceeds === cv;

  const handleSell = async () => {
    if (!isValid) {
      setError(parsedProceeds > cv ? `Proceeds exceed current value of ${formatCurrency(cv)}.` : "Enter a valid proceeds amount.");
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/${asset._id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ proceeds: parsedProceeds, date }),
      });
      if (!res.ok) { const body = await res.json(); throw new Error(body.message || "Sell failed."); }
      onUpdated(await res.json());
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="am-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="am-modal">
        <div className="am-modal-header">
          <div>
            <div className="am-modal-tag" style={{ color: "#f87171" }}>SELL / EXIT</div>
            <h2 className="am-modal-title">{asset.asset_name}</h2>
          </div>
          <button className="am-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="am-modal-body">
          {error && <div className="am-error-banner">{error}</div>}
          <div className="am-snapshot-row">
            <div className="am-snapshot-item">
              <span className="am-snapshot-label">CURRENT VALUE</span>
              <span className="am-snapshot-value">{formatCurrency(cv)}</span>
            </div>
            <div className="am-snapshot-arrow">→</div>
            <div className="am-snapshot-item" style={{ opacity: newCurrent !== null ? 1 : 0.3 }}>
              <span className="am-snapshot-label" style={{ color: "#f87171" }}>AFTER SELL</span>
              <span className="am-snapshot-value" style={{ color: "#f87171" }}>{newCurrent !== null ? formatCurrency(newCurrent) : "—"}</span>
            </div>
          </div>
          <div className="am-field-grid">
            <div className="am-field-full">
              <label className="am-label">Proceeds / Sale Amount ($) <span className="am-req">*</span></label>
              <div style={{ position: "relative" }}>
                <input className="am-input" type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={proceeds} onChange={(e) => setProceeds(e.target.value)} autoFocus />
                <button className="am-max-btn" onClick={() => setProceeds(cv.toString())}>MAX</button>
              </div>
            </div>
            <div className="am-field-full">
              <label className="am-label">Transaction Date</label>
              <input className="am-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          {isValid && (
            <div className="am-sell-breakdown">
              <div className="am-breakdown-row">
                <span className="am-breakdown-label">Cost basis removed</span>
                <span className="am-breakdown-value">−{formatCurrency(costBasisReduction)}</span>
              </div>
              <div className="am-breakdown-row">
                <span className="am-breakdown-label">Realized gain / loss</span>
                <span className="am-breakdown-value" style={{ color: gainColor(realizedGain) }}>
                  {gainPrefix(realizedGain)}{formatCurrency(realizedGain)}
                </span>
              </div>
              <div className="am-breakdown-row">
                <span className="am-breakdown-label">Remaining invested</span>
                <span className="am-breakdown-value">{formatCurrency(newInvested)}</span>
              </div>
              {isFullSell && (
                <div className="am-full-sell-note">⚠ Full exit — asset will remain for historical records.</div>
              )}
            </div>
          )}
        </div>
        <div className="am-modal-footer">
          <button className="am-cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="am-sell-confirm-btn" onClick={handleSell} disabled={loading || !isValid}>
            {loading ? "Processing…" : isFullSell ? "↓ Confirm Full Exit" : "↓ Confirm Sell"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Modal (Add + Edit) ─────────────────────────────────────────────────
function AssetModal({ token, onClose, onSaved, editAsset = null }) {
  const isEdit = !!editAsset;
  const [form, setForm] = useState(
    isEdit
      ? { asset_name: editAsset.asset_name || "", institution: editAsset.institution || "", invested_value: editAsset.invested_value ?? "", invested_date: toInputDate(editAsset.invested_date), notes: editAsset.notes || "" }
      : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.asset_name.trim() || !form.institution.trim() || !form.invested_value) {
      setError("Asset name, institution, and invested value are required."); return;
    }
    setLoading(true); setError(null);
    try {
      const url    = isEdit ? `${API_BASE}/${editAsset._id}` : API_BASE;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, invested_value: parseFloat(form.invested_value) }),
      });
      if (!res.ok) throw new Error(`Failed to ${isEdit ? "update" : "save"} asset.`);
      onSaved(await res.json(), isEdit);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="am-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="am-modal">
        <div className="am-modal-header">
          <div>
            <div className="am-modal-tag">{isEdit ? "EDIT ASSET" : "NEW ASSET"}</div>
            <h2 className="am-modal-title">{isEdit ? "Edit Investment" : "Add Investment"}</h2>
          </div>
          <button className="am-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="am-modal-body">
          {error && <div className="am-error-banner">{error}</div>}
          {isEdit && <div className="am-info-banner">Use Buy / Sell buttons to adjust positions. This modal corrects asset details only.</div>}
          <div className="am-field-grid">
            <div className="am-field-full">
              <label className="am-label">Asset Name <span className="am-req">*</span></label>
              <input className="am-input" name="asset_name" placeholder="e.g. Apple Inc., Bitcoin, S&P 500 ETF" value={form.asset_name} onChange={handleChange} />
            </div>
            <div className="am-field-half">
              <label className="am-label">Institution <span className="am-req">*</span></label>
              <input className="am-input" name="institution" placeholder="e.g. Fidelity, Coinbase" value={form.institution} onChange={handleChange} />
            </div>
            <div className="am-field-half">
              <label className="am-label">Invested Value ($) <span className="am-req">*</span></label>
              <input className="am-input" name="invested_value" type="number" min="0" step="0.01" placeholder="0.00" value={form.invested_value} onChange={handleChange} />
            </div>
            <div className="am-field-half">
              <label className="am-label">Invested Date</label>
              <input className="am-input" name="invested_date" type="date" value={form.invested_date} onChange={handleChange} />
            </div>
            <div className="am-field-full">
              <label className="am-label">Notes</label>
              <textarea className="am-input am-textarea" name="notes" placeholder="Any additional context or strategy notes…" value={form.notes} onChange={handleChange} />
            </div>
          </div>
        </div>
        <div className="am-modal-footer">
          <button className="am-cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="am-save-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : isEdit ? "✓ Update Asset" : "＋ Save Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({ asset, token, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${asset._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete asset.");
      onDeleted(asset._id);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="am-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="am-modal am-modal-sm">
        <div className="am-modal-header">
          <div>
            <div className="am-modal-tag" style={{ color: "#ef4444" }}>CONFIRM DELETE</div>
            <h2 className="am-modal-title">Remove Asset</h2>
          </div>
          <button className="am-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="am-modal-body">
          {error && <div className="am-error-banner">{error}</div>}
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
            Are you sure you want to remove <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{asset.asset_name}</span>? This cannot be undone.
          </p>
        </div>
        <div className="am-modal-footer">
          <button className="am-cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="am-delete-confirm-btn" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Card (mobile) ──────────────────────────────────────────────────────
function AssetCard({ asset, token, onEdit, onDelete, onBuy, onSell, onCurrentValueUpdated }) {
  const currentVal = asset.current_value ?? asset.invested_value;
  const gain       = currentVal - asset.invested_value;
  const gainPct    = asset.invested_value ? (gain / asset.invested_value) * 100 : 0;

  return (
    <div className="am-card">
      <div className="am-card-header">
        <div className="am-card-identity">
          <div className="am-asset-avatar">{asset.asset_name?.[0]?.toUpperCase() ?? "?"}</div>
          <div>
            <div className="am-asset-name">{asset.asset_name}</div>
            <div className="am-asset-inst">{asset.institution}</div>
          </div>
        </div>
        <div className="am-card-gain" style={{ color: gainColor(gain) }}>
          {gainPrefix(gainPct)}{gainPct.toFixed(1)}%
        </div>
      </div>

      <div className="am-card-values">
        <div className="am-card-val-item">
          <span className="am-meta-label">INVESTED</span>
          <span className="am-card-val">{formatCurrency(asset.invested_value)}</span>
          <span className="am-card-date">{formatDate(asset.invested_date)}</span>
        </div>
        <div className="am-card-val-divider" />
        <div className="am-card-val-item">
          <CurrentValueCell asset={asset} token={token} onUpdated={onCurrentValueUpdated} />
        </div>
      </div>

      {/* Action bar — all 4 buttons same height/style */}
      <div className="am-card-actions">
        <button className="am-action-btn am-action-buy"    onClick={() => onBuy(asset)}>↑ Buy</button>
        <button className="am-action-btn am-action-sell"   onClick={() => onSell(asset)}>↓ Sell</button>
        <button className="am-action-btn am-action-edit"   onClick={() => onEdit(asset)}>✎ Edit</button>
        <button className="am-action-btn am-action-delete" onClick={() => onDelete(asset)}>✕</button>
      </div>
    </div>
  );
}

// ─── Asset Row (desktop) ──────────────────────────────────────────────────────
function AssetRow({ asset, token, onEdit, onDelete, onBuy, onSell, onCurrentValueUpdated }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`am-row${hovered ? " am-row-hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="am-row-left">
        <div className="am-asset-avatar">{asset.asset_name?.[0]?.toUpperCase() ?? "?"}</div>
        <div>
          <div className="am-asset-name">{asset.asset_name}</div>
          <div className="am-asset-inst">{asset.institution}</div>
        </div>
      </div>
      <div className="am-row-meta">
        <div className="am-meta-item">
          <span className="am-meta-label">INVESTED</span>
          <span className="am-meta-value">{formatCurrency(asset.invested_value)}</span>
          <span className="am-meta-date">{formatDate(asset.invested_date)}</span>
        </div>
        <div className="am-meta-divider" />
        <CurrentValueCell asset={asset} token={token} onUpdated={onCurrentValueUpdated} />
      </div>

      {/* Row actions — Buy / Sell / Edit all same pill style, Delete is danger pill */}
      <div className={`am-row-actions${hovered ? " am-row-actions-visible" : ""}`}>
        <button className="am-action-btn am-action-buy"    onClick={() => onBuy(asset)}>↑ Buy</button>
        <button className="am-action-btn am-action-sell"   onClick={() => onSell(asset)}>↓ Sell</button>
        <button className="am-action-btn am-action-edit"   onClick={() => onEdit(asset)}>✎ Edit</button>
        <div className="am-action-divider" />
        <button className="am-action-btn am-action-delete" onClick={() => onDelete(asset)}>✕</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AssetManager({ token }) {
  const [assets,       setAssets]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAsset,    setEditAsset]    = useState(null);
  const [deleteAsset,  setDeleteAsset]  = useState(null);
  const [buyAsset,     setBuyAsset]     = useState(null);
  const [sellAsset,    setSellAsset]    = useState(null);

  const isMobile = useIsMobile(700);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_BASE, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Could not load assets.");
        setAssets(await res.json());
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const updateAssetInList = (updated) =>
    setAssets((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
  const handleSaved   = (saved, isEdit) =>
    isEdit ? updateAssetInList(saved) : setAssets((prev) => [saved, ...prev]);
  const handleDeleted = (id) =>
    setAssets((prev) => prev.filter((a) => a._id !== id));

  const totalInvested = assets.reduce((s, a) => s + (parseFloat(a.invested_value) || 0), 0);
  const totalCurrent  = assets.reduce((s, a) => s + (parseFloat(a.current_value ?? a.invested_value) || 0), 0);
  const totalGain     = totalCurrent - totalInvested;

  return (
    <div className="am-page">
      <div className="am-grain" />
      <div className="am-container">

        <div className="am-page-header">
          <div>
            <p className="am-eyebrow">PORTFOLIO</p>
            <h1 className="am-title">Assets</h1>
          </div>
          <div className="am-header-right">
            {assets.length > 0 && (
              <div className="am-stats-row">
                <div className="am-stat-badge">
                  <span className="am-stat-label">INVESTED</span>
                  <span className="am-stat-value">{formatCurrency(totalInvested)}</span>
                </div>
                <div className="am-stat-arrow">→</div>
                <div className="am-stat-badge" style={{
                  borderColor: `${gainColor(totalGain)}40`,
                  background:  `${gainColor(totalGain)}0d`,
                }}>
                  <span className="am-stat-label" style={{ color: gainColor(totalGain) }}>CURRENT</span>
                  <span className="am-stat-value" style={{ color: gainColor(totalGain) }}>{formatCurrency(totalCurrent)}</span>
                  <span className="am-stat-sublabel" style={{ color: gainColor(totalGain) }}>
                    {gainPrefix(totalGain)}{formatCurrency(totalGain)}
                  </span>
                </div>
              </div>
            )}
            <button className="am-add-btn" onClick={() => setShowAddModal(true)}>＋ Add Asset</button>
          </div>
        </div>

        <div className="am-divider" />

        {loading ? (
          <div className="am-center-state"><p className="am-state-text">Loading assets…</p></div>
        ) : fetchError ? (
          <div className="am-center-state"><p style={{ color: "#f87171", fontSize: 14 }}>{fetchError}</p></div>
        ) : assets.length === 0 ? (
          <div className="am-center-state">
            <div className="am-empty-icon">◈</div>
            <p className="am-state-title">No assets yet</p>
            <p className="am-state-text">Track your investments by adding your first asset.</p>
            <button className="am-add-btn" style={{ marginTop: 16 }} onClick={() => setShowAddModal(true)}>＋ Add Your First Asset</button>
          </div>
        ) : (
          <>
            <div className="am-list-meta">
              <span className="am-list-count">{assets.length} asset{assets.length !== 1 ? "s" : ""}</span>
              <span className="am-list-hint">
                {isMobile ? "Tap value to update" : "Hover row for actions · Click value to update"}
              </span>
            </div>

            {!isMobile && (
              <div className="am-list">
                {assets.map((asset, i) => (
                  <AssetRow key={asset._id ?? i} asset={asset} token={token}
                    onEdit={setEditAsset} onDelete={setDeleteAsset}
                    onBuy={setBuyAsset}   onSell={setSellAsset}
                    onCurrentValueUpdated={updateAssetInList} />
                ))}
              </div>
            )}

            {isMobile && (
              <div className="am-card-list">
                {assets.map((asset, i) => (
                  <AssetCard key={asset._id ?? i} asset={asset} token={token}
                    onEdit={setEditAsset} onDelete={setDeleteAsset}
                    onBuy={setBuyAsset}   onSell={setSellAsset}
                    onCurrentValueUpdated={updateAssetInList} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && <AssetModal token={token} onClose={() => setShowAddModal(false)} onSaved={handleSaved} />}
      {editAsset    && <AssetModal token={token} editAsset={editAsset} onClose={() => setEditAsset(null)} onSaved={handleSaved} />}
      {deleteAsset  && <DeleteModal token={token} asset={deleteAsset} onClose={() => setDeleteAsset(null)} onDeleted={handleDeleted} />}
      {buyAsset     && <BuyModal  token={token} asset={buyAsset}  onClose={() => setBuyAsset(null)}  onUpdated={updateAssetInList} />}
      {sellAsset    && <SellModal token={token} asset={sellAsset} onClose={() => setSellAsset(null)} onUpdated={updateAssetInList} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.94) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        input:focus, textarea:focus { border-color: rgba(99,102,241,0.5) !important; background: rgba(99,102,241,0.05) !important; outline: none; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Page ── */
        .am-page      { min-height:100vh; background:linear-gradient(135deg,#080d1a 0%,#0f172a 60%,#0a1020 100%); font-family:'DM Mono',monospace; color:#e2e8f0; position:relative; }
        .am-grain     { position:fixed; inset:0; pointer-events:none; z-index:0; opacity:0.035; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        .am-container { position:relative; z-index:1; max-width:980px; margin:0 auto; padding:48px 20px 80px; animation:fadeUp 0.5s ease both; }

        /* ── Header ── */
        .am-page-header { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px; margin-bottom:24px; }
        .am-eyebrow     { font-size:11px; letter-spacing:0.2em; color:#475569; margin-bottom:6px; }
        .am-title       { font-family:'DM Serif Display',serif; font-size:clamp(36px,8vw,52px); font-weight:400; color:#f1f5f9; line-height:1; letter-spacing:-1px; }
        .am-header-right{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .am-stats-row   { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .am-stat-badge  { display:flex; flex-direction:column; align-items:flex-end; padding:8px 12px; background:rgba(99,102,241,0.07); border:1px solid rgba(99,102,241,0.18); border-radius:10px; min-width:100px; }
        .am-stat-label  { font-size:9px; letter-spacing:0.15em; color:#6366f1; margin-bottom:2px; }
        .am-stat-value  { font-size:clamp(14px,3vw,18px); font-weight:500; color:#a5b4fc; }
        .am-stat-sublabel{ font-size:11px; margin-top:1px; }
        .am-stat-arrow  { font-size:16px; color:#334155; flex-shrink:0; }
        .am-add-btn     { display:inline-flex; align-items:center; gap:6px; padding:11px 18px; background:linear-gradient(135deg,#6366f1,#818cf8); color:#fff; border:none; border-radius:10px; font-size:13px; font-family:'DM Mono',monospace; font-weight:500; cursor:pointer; white-space:nowrap; box-shadow:0 4px 20px rgba(99,102,241,0.3); }
        .am-add-btn:active { transform:scale(0.97); }

        .am-divider    { height:1px; background:linear-gradient(90deg,transparent,#1e293b 30%,#1e293b 70%,transparent); margin-bottom:20px; }
        .am-list-meta  { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:6px; }
        .am-list-count { font-size:11px; letter-spacing:0.1em; color:#475569; }
        .am-list-hint  { font-size:11px; color:#334155; }

        /* ── Desktop row ── */
        .am-list { display:flex; flex-direction:column; gap:10px; }
        .am-row  { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; padding:16px 20px; background:rgba(15,23,42,0.7); border:1px solid #1e293b; border-radius:14px; backdrop-filter:blur(10px); animation:fadeUp 0.4s ease both; transition:border-color 0.2s; }
        .am-row-hovered { border-color:#334155; }
        .am-row-left  { display:flex; align-items:center; gap:12px; min-width:160px; }
        .am-row-meta  { display:flex; flex-wrap:wrap; flex:1; align-items:center; }
        .am-row-actions { display:flex; align-items:center; gap:6px; opacity:0; transition:opacity 0.15s; }
        .am-row-actions-visible { opacity:1; }
        .am-action-divider { width:1px; height:20px; background:#1e293b; margin:0 2px; flex-shrink:0; }
        .am-meta-divider   { width:1px; height:36px; background:#1e293b; margin:0 20px; flex-shrink:0; }
        .am-meta-item  { display:flex; flex-direction:column; gap:2px; min-width:120px; }
        .am-meta-label { font-size:10px; letter-spacing:0.15em; color:#475569; }
        .am-meta-value { font-size:15px; color:#cbd5e1; font-weight:500; }
        .am-meta-date  { font-size:11px; color:#475569; }
        .am-current-value-row { display:flex; align-items:center; gap:6px; }
        .am-clickable  { cursor:pointer; }
        .am-edit-value-btn   { background:none; border:none; color:#475569; font-size:13px; cursor:pointer; padding:0 2px; opacity:0.6; }
        .am-inline-edit-row  { display:flex; align-items:center; gap:4px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.35); border-radius:7px; padding:3px 8px; }
        .am-currency-prefix  { font-size:13px; color:#6366f1; }
        .am-inline-input     { background:none; border:none; outline:none; color:#f1f5f9; font-size:14px; font-family:'DM Mono',monospace; font-weight:500; width:80px; }
        .am-gain-badge       { font-size:11px; font-weight:500; margin-top:1px; }

        /* ── Unified action button (Buy / Sell / Edit / Delete) ────────────── */
        /*
         *  All four share the same base: same padding, same border-radius,
         *  same font size, same font family. Only color/bg differs per variant.
         */
        .am-action-btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 7px 13px;
          border-radius: 8px;
          font-size: 12px;
          font-family: 'DM Mono', monospace;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          line-height: 1;
          transition: opacity 0.15s, transform 0.1s;
        }
        .am-action-btn:active { transform: scale(0.95); }

        .am-action-buy    { background: rgba(74,222,128,0.10); border: 1px solid rgba(74,222,128,0.28); color: #4ade80; }
        .am-action-sell   { background: rgba(248,113,113,0.09); border: 1px solid rgba(248,113,113,0.25); color: #f87171; }
        .am-action-edit   { background: rgba(99,102,241,0.10); border: 1px solid rgba(99,102,241,0.28); color: #818cf8; }
        .am-action-delete { background: rgba(239,68,68,0.08);  border: 1px solid rgba(239,68,68,0.22);  color: #f87171; }

        .am-action-buy:hover    { background: rgba(74,222,128,0.17);  }
        .am-action-sell:hover   { background: rgba(248,113,113,0.16); }
        .am-action-edit:hover   { background: rgba(99,102,241,0.18);  }
        .am-action-delete:hover { background: rgba(239,68,68,0.15);   }

        /* ── Mobile card ── */
        .am-card-list { display:flex; flex-direction:column; gap:12px; }
        .am-card      { background:rgba(15,23,42,0.8); border:1px solid #1e293b; border-radius:16px; overflow:hidden; animation:fadeUp 0.4s ease both; }
        .am-card-header   { display:flex; justify-content:space-between; align-items:center; padding:14px 14px 0; gap:8px; }
        .am-card-identity { display:flex; align-items:center; gap:10px; min-width:0; flex:1; }
        .am-card-gain     { font-size:14px; font-weight:500; font-family:'DM Mono',monospace; flex-shrink:0; }
        .am-card-values   { display:flex; align-items:center; padding:12px 14px; }
        .am-card-val-item { flex:1; display:flex; flex-direction:column; gap:2px; }
        .am-card-val      { font-size:15px; font-weight:500; color:#cbd5e1; }
        .am-card-date     { font-size:10px; color:#475569; margin-top:1px; }
        .am-card-val-divider { width:1px; height:44px; background:#1e293b; margin:0 14px; flex-shrink:0; }

        /* Card action bar — 4 equal-height buttons flush to bottom */
        .am-card-actions { display:flex; border-top:1px solid #1e293b; }
        .am-card-actions .am-action-btn {
          flex: 1;
          border-radius: 0;
          border: none;
          border-right: 1px solid #1e293b;
          padding: 11px 6px;
        }
        .am-card-actions .am-action-btn:last-child { border-right: none; }
        /* restore tinted backgrounds inside card (override transparent border) */
        .am-card-actions .am-action-buy    { background: rgba(74,222,128,0.06);  }
        .am-card-actions .am-action-sell   { background: rgba(248,113,113,0.06); }
        .am-card-actions .am-action-edit   { background: rgba(99,102,241,0.06);  }
        .am-card-actions .am-action-delete { background: rgba(239,68,68,0.06);   }
        .am-card-actions .am-action-btn:active { opacity: 0.7; transform: none; }

        /* Shared asset identity */
        .am-asset-avatar { width:40px; height:40px; border-radius:11px; flex-shrink:0; background:linear-gradient(135deg,#312e81,#4338ca); display:flex; align-items:center; justify-content:center; font-size:17px; font-family:'DM Serif Display',serif; color:#c7d2fe; }
        .am-asset-name   { font-size:14px; font-weight:500; color:#f1f5f9; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; }
        .am-asset-inst   { font-size:11px; color:#64748b; letter-spacing:0.04em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; }

        /* ── States ── */
        .am-center-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding-top:70px; gap:10px; text-align:center; }
        .am-empty-icon   { font-size:44px; color:#1e293b; line-height:1; margin-bottom:8px; }
        .am-state-title  { font-size:20px; font-family:'DM Serif Display',serif; color:#94a3b8; }
        .am-state-text   { font-size:13px; color:#475569; max-width:280px; line-height:1.6; }

        /* ── Modal overlay ── */
        .am-overlay { position:fixed; inset:0; background:rgba(2,6,23,0.88); backdrop-filter:blur(8px); z-index:1000; display:flex; align-items:flex-end; justify-content:center; padding:0; }
        @media (min-width: 560px) { .am-overlay { align-items:center; padding:20px; } }

        /* ── Modal panel ── */
        .am-modal {
          width:100%; max-width:540px;
          background:linear-gradient(145deg,#0f172a,#0c1525);
          border:1px solid #1e293b;
          border-radius:20px 20px 0 0;
          box-shadow:0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08);
          animation:slideUp 0.28s cubic-bezier(0.34,1.1,0.64,1) both;
          overflow:hidden;
          max-height:92dvh;
          display:flex; flex-direction:column;
        }
        @media (min-width: 560px) { .am-modal { border-radius:20px; animation-name:scaleIn; max-height:90vh; } }
        .am-modal-sm { max-width:420px; }

        .am-modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:22px 22px 16px; border-bottom:1px solid #1e293b; flex-shrink:0; }
        .am-modal-tag    { font-size:10px; letter-spacing:0.2em; color:#6366f1; margin-bottom:5px; }
        .am-modal-title  { font-family:'DM Serif Display',serif; font-size:clamp(20px,5vw,26px); font-weight:400; color:#f1f5f9; }
        .am-close-btn    { background:rgba(255,255,255,0.04); border:1px solid #1e293b; border-radius:8px; color:#64748b; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px; flex-shrink:0; }
        .am-modal-body   { padding:18px 22px; overflow-y:auto; flex:1; }
        .am-modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:14px 22px 20px; border-top:1px solid #1e293b; flex-shrink:0; flex-wrap:wrap; }
        @media (max-width: 400px) {
          .am-modal-footer { flex-direction:column-reverse; }
          .am-modal-footer button { width:100%; justify-content:center; }
        }

        .am-error-banner { padding:10px 14px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:8px; color:#fca5a5; font-size:13px; margin-bottom:14px; }
        .am-info-banner  { padding:10px 14px; background:rgba(99,102,241,0.07); border:1px solid rgba(99,102,241,0.2); border-radius:8px; color:#a5b4fc; font-size:12px; margin-bottom:14px; line-height:1.5; }

        /* ── Form ── */
        .am-field-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .am-field-full { grid-column:1 / -1; display:flex; flex-direction:column; gap:5px; }
        .am-field-half { display:flex; flex-direction:column; gap:5px; }
        @media (max-width: 480px) {
          .am-field-grid { grid-template-columns:1fr; }
          .am-field-half { grid-column:1 / -1; }
        }
        .am-label    { font-size:11px; letter-spacing:0.1em; color:#64748b; }
        .am-req      { color:#6366f1; }
        .am-input    { width:100%; padding:10px 12px; background:rgba(255,255,255,0.04); border:1px solid #1e293b; border-radius:10px; color:#e2e8f0; font-size:14px; font-family:'DM Mono',monospace; outline:none; transition:border-color 0.15s,background 0.15s; -webkit-appearance:none; }
        .am-textarea { resize:vertical; min-height:72px; line-height:1.6; }

        /* Modal footer buttons */
        .am-cancel-btn        { padding:10px 16px; background:transparent; border:1px solid #1e293b; border-radius:10px; color:#64748b; font-size:13px; font-family:'DM Mono',monospace; cursor:pointer; }
        .am-save-btn          { padding:10px 20px; background:linear-gradient(135deg,#6366f1,#818cf8); border:none; border-radius:10px; color:#fff; font-size:13px; font-family:'DM Mono',monospace; font-weight:500; cursor:pointer; box-shadow:0 4px 16px rgba(99,102,241,0.3); }
        .am-buy-confirm-btn   { padding:10px 20px; background:linear-gradient(135deg,#16a34a,#4ade80); border:none; border-radius:10px; color:#052e16; font-size:13px; font-family:'DM Mono',monospace; font-weight:500; cursor:pointer; }
        .am-sell-confirm-btn  { padding:10px 20px; background:linear-gradient(135deg,#dc2626,#ef4444); border:none; border-radius:10px; color:#fff; font-size:13px; font-family:'DM Mono',monospace; font-weight:500; cursor:pointer; }
        .am-delete-confirm-btn{ padding:10px 20px; background:linear-gradient(135deg,#7f1d1d,#dc2626); border:none; border-radius:10px; color:#fff; font-size:13px; font-family:'DM Mono',monospace; font-weight:500; cursor:pointer; }

        /* Snapshot / breakdown */
        .am-snapshot-row   { display:flex; align-items:center; gap:8px; padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid #1e293b; border-radius:10px; margin-bottom:16px; flex-wrap:wrap; }
        .am-snapshot-item  { display:flex; flex-direction:column; gap:3px; flex:1; min-width:100px; }
        .am-snapshot-label { font-size:9px; letter-spacing:0.15em; color:#475569; }
        .am-snapshot-value { font-size:clamp(15px,4vw,18px); font-weight:500; color:#cbd5e1; }
        .am-snapshot-arrow { font-size:16px; color:#334155; flex-shrink:0; }
        .am-preview-note   { margin-top:10px; font-size:12px; color:#64748b; line-height:1.5; }
        .am-max-btn        { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.2); border-radius:5px; color:#f87171; font-size:10px; font-family:'DM Mono',monospace; padding:3px 7px; cursor:pointer; }
        .am-sell-breakdown { margin-top:12px; padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid #1e293b; border-radius:10px; display:flex; flex-direction:column; gap:7px; }
        .am-breakdown-row  { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }
        .am-breakdown-label{ font-size:12px; color:#64748b; }
        .am-breakdown-value{ font-size:13px; font-weight:500; color:#cbd5e1; }
        .am-full-sell-note { margin-top:4px; font-size:11px; color:#fbbf24; line-height:1.5; padding:8px 10px; background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.15); border-radius:7px; }
      `}</style>
    </div>
  );
}