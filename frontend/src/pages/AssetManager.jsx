import { useState, useEffect, useRef } from "react";

const API_BASE = "https://maadala.onrender.com/api/assets";
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

const gainColor = (gain) => (gain > 0 ? "#4ade80" : gain < 0 ? "#f87171" : "#64748b");
const gainPrefix = (gain) => (gain > 0 ? "+" : "");

const EMPTY_FORM = {
  asset_name: "",
  institution: "",
  invested_value: "",
  invested_date: "",
  notes: "",
};

// ─── Inline Current Value Editor ─────────────────────────────────────────────

function CurrentValueCell({ asset, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_value: parsed }),
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

  const currentVal = asset.current_value ?? asset.invested_value;
  const gain = currentVal - asset.invested_value;
  const gainPct = asset.invested_value ? (gain / asset.invested_value) * 100 : 0;

  return (
    <div style={styles.metaItem}>
      <span style={styles.metaLabel}>CURRENT VALUE</span>

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
            style={{ ...styles.metaValue, color: "#f1f5f9", cursor: "pointer" }}
            onClick={startEdit}
            title="Click to update current value"
          >
            {formatCurrency(currentVal)}
          </span>
          <button style={styles.editValueBtn} onClick={startEdit} title="Edit current value">✎</button>
        </div>
      )}

      <span style={{ ...styles.gainBadge, color: gainColor(gain) }}>
        {gainPrefix(gain)}{formatCurrency(gain)} ({gainPrefix(gainPct)}{gainPct.toFixed(1)}%)
      </span>
    </div>
  );
}

// ─── Buy Modal ────────────────────────────────────────────────────────────────

function BuyModal({ asset, onClose, onUpdated }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const newInvested = parseFloat(amount) > 0
    ? asset.invested_value + parseFloat(amount)
    : null;
  const newCurrent = parseFloat(amount) > 0
    ? asset.current_value + parseFloat(amount)
    : null;

  const handleBuy = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid buy amount.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/${asset._id}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, date }),
      });
      if (!res.ok) throw new Error("Buy failed.");
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
      <div style={{ ...styles.modal, maxWidth: 460 }}>
        <div style={styles.modalHeader}>
          <div>
            <div style={{ ...styles.modalTag, color: "#4ade80" }}>BUY MORE</div>
            <h2 style={styles.modalTitle}>{asset.asset_name}</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          {/* Current snapshot */}
          <div style={styles.snapshotRow}>
            <div style={styles.snapshotItem}>
              <span style={styles.snapshotLabel}>CURRENT INVESTED</span>
              <span style={styles.snapshotValue}>{formatCurrency(asset.invested_value)}</span>
            </div>
            <div style={styles.snapshotArrow}>→</div>
            <div style={{ ...styles.snapshotItem, opacity: newInvested ? 1 : 0.3 }}>
              <span style={{ ...styles.snapshotLabel, color: "#4ade80" }}>AFTER BUY</span>
              <span style={{ ...styles.snapshotValue, color: "#4ade80" }}>
                {newInvested ? formatCurrency(newInvested) : "—"}
              </span>
            </div>
          </div>

          <div style={styles.fieldGrid}>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Buy Amount ($) <span style={styles.req}>*</span></label>
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
            </div>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Transaction Date</label>
              <input
                style={styles.input}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {newCurrent && (
            <div style={styles.previewNote}>
              New current value will be <strong style={{ color: "#4ade80" }}>{formatCurrency(newCurrent)}</strong>
            </div>
          )}
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={styles.buyConfirmBtn} onClick={handleBuy} disabled={loading}>
            {loading ? "Processing…" : "↑ Confirm Buy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sell Modal ───────────────────────────────────────────────────────────────

function SellModal({ asset, onClose, onUpdated }) {
  const [proceeds, setProceeds] = useState("");
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parsedProceeds = parseFloat(proceeds);
  const isValid = parsedProceeds > 0 && parsedProceeds <= asset.current_value;
  const sellRatio = isValid ? parsedProceeds / asset.current_value : 0;
  const costBasisReduction = isValid ? asset.invested_value * sellRatio : 0;
  const newCurrent = isValid ? asset.current_value - parsedProceeds : null;
  const newInvested = isValid ? asset.invested_value - costBasisReduction : null;
  const realizedGain = isValid ? parsedProceeds - costBasisReduction : null;

  const handleSell = async () => {
    if (!isValid) {
      setError(
        parsedProceeds > asset.current_value
          ? `Proceeds exceed current value of ${formatCurrency(asset.current_value)}.`
          : "Enter a valid proceeds amount."
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/${asset._id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proceeds: parsedProceeds, date }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Sell failed.");
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

  const isFullSell = parsedProceeds === asset.current_value;

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...styles.modal, maxWidth: 480 }}>
        <div style={styles.modalHeader}>
          <div>
            <div style={{ ...styles.modalTag, color: "#f87171" }}>SELL / EXIT</div>
            <h2 style={styles.modalTitle}>{asset.asset_name}</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          {/* Current snapshot */}
          <div style={styles.snapshotRow}>
            <div style={styles.snapshotItem}>
              <span style={styles.snapshotLabel}>CURRENT VALUE</span>
              <span style={styles.snapshotValue}>{formatCurrency(asset.current_value)}</span>
            </div>
            <div style={styles.snapshotArrow}>→</div>
            <div style={{ ...styles.snapshotItem, opacity: newCurrent !== null ? 1 : 0.3 }}>
              <span style={{ ...styles.snapshotLabel, color: "#f87171" }}>AFTER SELL</span>
              <span style={{ ...styles.snapshotValue, color: "#f87171" }}>
                {newCurrent !== null ? formatCurrency(newCurrent) : "—"}
              </span>
            </div>
          </div>

          <div style={styles.fieldGrid}>
            <div style={styles.fieldFull}>
              <label style={styles.label}>
                Proceeds / Sale Amount ($) <span style={styles.req}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  style={styles.input}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={proceeds}
                  onChange={(e) => setProceeds(e.target.value)}
                  autoFocus
                />
                <button
                  style={styles.maxBtn}
                  onClick={() => setProceeds(asset.current_value.toString())}
                  title="Sell all"
                >
                  MAX
                </button>
              </div>
            </div>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Transaction Date</label>
              <input
                style={styles.input}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Sell breakdown */}
          {isValid && (
            <div style={styles.sellBreakdown}>
              <div style={styles.breakdownRow}>
                <span style={styles.breakdownLabel}>Cost basis removed</span>
                <span style={styles.breakdownValue}>−{formatCurrency(costBasisReduction)}</span>
              </div>
              <div style={styles.breakdownRow}>
                <span style={styles.breakdownLabel}>Realized gain / loss</span>
                <span style={{ ...styles.breakdownValue, color: gainColor(realizedGain) }}>
                  {gainPrefix(realizedGain)}{formatCurrency(realizedGain)}
                </span>
              </div>
              <div style={styles.breakdownRow}>
                <span style={styles.breakdownLabel}>Remaining invested</span>
                <span style={styles.breakdownValue}>{formatCurrency(newInvested)}</span>
              </div>
              {isFullSell && (
                <div style={styles.fullSellNote}>
                  ⚠ This is a full exit — asset will remain for historical records.
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={styles.sellConfirmBtn} onClick={handleSell} disabled={loading || !isValid}>
            {loading ? "Processing…" : isFullSell ? "↓ Confirm Full Exit" : "↓ Confirm Sell"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Modal (Add + Edit) ─────────────────────────────────────────────────

function AssetModal({ onClose, onSaved, editAsset = null }) {
  const isEdit = !!editAsset;

  const [form, setForm] = useState(
    isEdit
      ? {
          asset_name: editAsset.asset_name || "",
          institution: editAsset.institution || "",
          invested_value: editAsset.invested_value ?? "",
          invested_date: toInputDate(editAsset.invested_date),
          notes: editAsset.notes || "",
        }
      : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.asset_name.trim() || !form.institution.trim() || !form.invested_value) {
      setError("Asset name, institution, and invested value are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = isEdit ? `${API_BASE}/${editAsset._id}` : API_BASE;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, invested_value: parseFloat(form.invested_value) }),
      });
      if (!res.ok) throw new Error(`Failed to ${isEdit ? "update" : "save"} asset.`);
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
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTag}>{isEdit ? "EDIT ASSET" : "NEW ASSET"}</div>
            <h2 style={styles.modalTitle}>{isEdit ? "Edit Investment" : "Add Investment"}</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {error && <div style={styles.errorBanner}>{error}</div>}
          {isEdit && (
            <div style={styles.infoBanner}>
              Use the Buy / Sell buttons on the row to add or exit positions.
              This modal is for correcting asset details only.
            </div>
          )}

          <div style={styles.fieldGrid}>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Asset Name <span style={styles.req}>*</span></label>
              <input
                style={styles.input}
                name="asset_name"
                placeholder="e.g. Apple Inc., Bitcoin, S&P 500 ETF"
                value={form.asset_name}
                onChange={handleChange}
              />
            </div>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>Institution <span style={styles.req}>*</span></label>
              <input
                style={styles.input}
                name="institution"
                placeholder="e.g. Fidelity, Coinbase"
                value={form.institution}
                onChange={handleChange}
              />
            </div>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>
                Invested Value ($) <span style={styles.req}>*</span>
                <span style={styles.labelHint}> — original amount</span>
              </label>
              <input
                style={styles.input}
                name="invested_value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.invested_value}
                onChange={handleChange}
              />
            </div>
            <div style={styles.fieldHalf}>
              <label style={styles.label}>Invested Date</label>
              <input
                style={styles.input}
                name="invested_date"
                type="date"
                value={form.invested_date}
                onChange={handleChange}
              />
            </div>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Notes</label>
              <textarea
                style={{ ...styles.input, ...styles.textarea }}
                name="notes"
                placeholder="Any additional context or strategy notes..."
                value={form.notes}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={styles.saveBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : isEdit ? "✓ Update Asset" : "＋ Save Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({ asset, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${asset._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete asset.");
      onDeleted(asset._id);
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
            <h2 style={styles.modalTitle}>Remove Asset</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ ...styles.modalBody, paddingBottom: 8 }}>
          {error && <div style={styles.errorBanner}>{error}</div>}
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
            Are you sure you want to remove{" "}
            <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{asset.asset_name}</span>{" "}
            from your portfolio? This action cannot be undone.
          </p>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={styles.deleteConfirmBtn} onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Row ────────────────────────────────────────────────────────────────

function AssetRow({ asset, onEdit, onDelete, onBuy, onSell, onCurrentValueUpdated }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ ...styles.row, borderColor: hovered ? "#334155" : "#1e293b" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left: avatar + name */}
      <div style={styles.rowLeft}>
        <div style={styles.assetAvatar}>
          {asset.asset_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <div style={styles.assetName}>{asset.asset_name}</div>
          <div style={styles.assetInstitution}>{asset.institution}</div>
        </div>
      </div>

      {/* Meta */}
      <div style={styles.rowMeta}>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>INVESTED</span>
          <span style={styles.metaValue}>{formatCurrency(asset.invested_value)}</span>
          <span style={{ fontSize: 11, color: "#475569" }}>{formatDate(asset.invested_date)}</span>
        </div>
        <div style={styles.metaDivider} />
        <CurrentValueCell asset={asset} onUpdated={onCurrentValueUpdated} />
      </div>

      {/* Actions */}
      <div style={{ ...styles.rowActions, opacity: hovered ? 1 : 0 }}>
        <button style={styles.buyBtn} onClick={() => onBuy(asset)} title="Buy more">
          ↑ Buy
        </button>
        <button style={styles.sellBtn} onClick={() => onSell(asset)} title="Sell / exit">
          ↓ Sell
        </button>
        <div style={styles.actionDivider} />
        <button style={styles.editBtn} onClick={() => onEdit(asset)} title="Edit details">✎</button>
        <button style={styles.deleteBtn} onClick={() => onDelete(asset)} title="Delete">✕</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AssetManager() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [deleteAsset, setDeleteAsset] = useState(null);
  const [buyAsset, setBuyAsset] = useState(null);
  const [sellAsset, setSellAsset] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error("Could not load assets.");
        const data = await res.json();
        setAssets(data);
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateAssetInList = (updatedAsset) =>
    setAssets((prev) => prev.map((a) => (a._id === updatedAsset._id ? updatedAsset : a)));

  const handleSaved = (savedAsset, isEdit) => {
    if (isEdit) {
      updateAssetInList(savedAsset);
    } else {
      setAssets((prev) => [savedAsset, ...prev]);
    }
  };

  const handleDeleted = (deletedId) =>
    setAssets((prev) => prev.filter((a) => a._id !== deletedId));

  const totalInvested = assets.reduce((s, a) => s + (parseFloat(a.invested_value) || 0), 0);
  const totalCurrent = assets.reduce((s, a) => s + (parseFloat(a.current_value ?? a.invested_value) || 0), 0);
  const totalGain = totalCurrent - totalInvested;

  return (
    <div style={styles.page}>
      <div style={styles.grain} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.pageHeader}>
          <div>
            <p style={styles.pageEyebrow}>PORTFOLIO</p>
            <h1 style={styles.pageTitle}>Assets</h1>
          </div>
          <div style={styles.headerRight}>
            {assets.length > 0 && (
              <div style={styles.statsRow}>
                <div style={styles.statBadge}>
                  <span style={styles.statLabel}>INVESTED</span>
                  <span style={styles.statValue}>{formatCurrency(totalInvested)}</span>
                </div>
                <div style={styles.statArrow}>→</div>
                <div style={{
                  ...styles.statBadge,
                  borderColor: `${gainColor(totalGain)}40`,
                  background: `${gainColor(totalGain)}0d`,
                }}>
                  <span style={{ ...styles.statLabel, color: gainColor(totalGain) }}>CURRENT</span>
                  <span style={{ ...styles.statValue, color: gainColor(totalGain) }}>
                    {formatCurrency(totalCurrent)}
                  </span>
                  <span style={{ fontSize: 11, color: gainColor(totalGain), marginTop: 1 }}>
                    {gainPrefix(totalGain)}{formatCurrency(totalGain)}
                  </span>
                </div>
              </div>
            )}
            <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
              ＋ Add Asset
            </button>
          </div>
        </div>

        <div style={styles.divider} />

        {loading ? (
          <div style={styles.centerState}>
            <p style={styles.stateText}>Loading assets…</p>
          </div>
        ) : fetchError ? (
          <div style={styles.centerState}>
            <p style={{ color: "#f87171", fontSize: 14 }}>{fetchError}</p>
          </div>
        ) : assets.length === 0 ? (
          <div style={styles.centerState}>
            <div style={styles.emptyIcon}>◈</div>
            <p style={styles.stateTitle}>No assets yet</p>
            <p style={styles.stateText}>Track your investments by adding your first asset.</p>
            <button style={{ ...styles.addBtn, marginTop: 16 }} onClick={() => setShowAddModal(true)}>
              ＋ Add Your First Asset
            </button>
          </div>
        ) : (
          <>
            <div style={styles.listMeta}>
              <span style={styles.listCount}>
                {assets.length} asset{assets.length !== 1 ? "s" : ""}
              </span>
              <span style={styles.listHint}>Hover a row for actions · Click value to update</span>
            </div>
            <div style={styles.list}>
              {assets.map((asset, i) => (
                <AssetRow
                  key={asset._id ?? i}
                  asset={asset}
                  onEdit={setEditAsset}
                  onDelete={setDeleteAsset}
                  onBuy={setBuyAsset}
                  onSell={setSellAsset}
                  onCurrentValueUpdated={updateAssetInList}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <AssetModal onClose={() => setShowAddModal(false)} onSaved={handleSaved} />
      )}
      {editAsset && (
        <AssetModal editAsset={editAsset} onClose={() => setEditAsset(null)} onSaved={handleSaved} />
      )}
      {deleteAsset && (
        <DeleteModal asset={deleteAsset} onClose={() => setDeleteAsset(null)} onDeleted={handleDeleted} />
      )}
      {buyAsset && (
        <BuyModal asset={buyAsset} onClose={() => setBuyAsset(null)} onUpdated={updateAssetInList} />
      )}
      {sellAsset && (
        <SellModal asset={sellAsset} onClose={() => setSellAsset(null)} onUpdated={updateAssetInList} />
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
        input:focus, textarea:focus {
          border-color: rgba(99,102,241,0.5) !important;
          background: rgba(99,102,241,0.05) !important;
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
    background: "linear-gradient(135deg, #080d1a 0%, #0f172a 60%, #0a1020 100%)",
    fontFamily: "'DM Mono', monospace",
    color: "#e2e8f0",
    position: "relative",
  },
  grain: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
  },
  container: {
    position: "relative", zIndex: 1,
    maxWidth: 980, margin: "0 auto",
    padding: "56px 24px 80px",
    animation: "fadeUp 0.5s ease both",
  },
  pageHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 28,
  },
  pageEyebrow: { fontSize: 11, letterSpacing: "0.2em", color: "#475569", marginBottom: 6 },
  pageTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 52, fontWeight: 400, color: "#f1f5f9",
    lineHeight: 1, letterSpacing: "-1px",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
  statsRow: { display: "flex", alignItems: "center", gap: 8 },
  statBadge: {
    display: "flex", flexDirection: "column", alignItems: "flex-end",
    padding: "10px 14px",
    background: "rgba(99,102,241,0.07)",
    border: "1px solid rgba(99,102,241,0.18)",
    borderRadius: 10, minWidth: 120,
  },
  statLabel: { fontSize: 10, letterSpacing: "0.15em", color: "#6366f1", marginBottom: 3 },
  statValue: { fontSize: 18, fontWeight: 500, color: "#a5b4fc", letterSpacing: "-0.5px" },
  statArrow: { fontSize: 16, color: "#334155" },
  addBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 22px",
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
    color: "#fff", border: "none", borderRadius: 10,
    fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 500,
    cursor: "pointer", letterSpacing: "0.03em",
    boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
  },
  divider: {
    height: 1,
    background: "linear-gradient(90deg, transparent, #1e293b 30%, #1e293b 70%, transparent)",
    marginBottom: 24,
  },
  listMeta: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  listCount: { fontSize: 11, letterSpacing: "0.1em", color: "#475569" },
  listHint: { fontSize: 11, color: "#334155" },
  list: { display: "flex", flexDirection: "column", gap: 10 },

  row: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", flexWrap: "wrap", gap: 16,
    padding: "18px 22px",
    background: "rgba(15,23,42,0.7)",
    border: "1px solid #1e293b", borderRadius: 14,
    backdropFilter: "blur(10px)",
    animation: "fadeUp 0.4s ease both",
    transition: "border-color 0.2s",
  },
  rowLeft: { display: "flex", alignItems: "center", gap: 14, minWidth: 180 },
  assetAvatar: {
    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
    background: "linear-gradient(135deg, #312e81, #4338ca)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#c7d2fe",
  },
  assetName: { fontSize: 15, fontWeight: 500, color: "#f1f5f9", marginBottom: 3 },
  assetInstitution: { fontSize: 12, color: "#64748b", letterSpacing: "0.04em" },
  rowMeta: { display: "flex", gap: 0, flexWrap: "wrap", flex: 1, alignItems: "center" },
  metaDivider: {
    width: 1, height: 36, background: "#1e293b", margin: "0 24px", flexShrink: 0,
  },
  metaItem: { display: "flex", flexDirection: "column", gap: 2, minWidth: 130 },
  metaLabel: { fontSize: 10, letterSpacing: "0.15em", color: "#475569" },
  metaValue: { fontSize: 15, color: "#cbd5e1", fontWeight: 500 },
  currentValueRow: { display: "flex", alignItems: "center", gap: 6 },
  editValueBtn: {
    background: "none", border: "none", color: "#475569",
    fontSize: 13, cursor: "pointer", padding: "0 2px", opacity: 0.6,
  },
  inlineEditRow: {
    display: "flex", alignItems: "center", gap: 4,
    background: "rgba(99,102,241,0.08)",
    border: "1px solid rgba(99,102,241,0.35)",
    borderRadius: 7, padding: "3px 8px",
  },
  currencyPrefix: { fontSize: 13, color: "#6366f1" },
  inlineInput: {
    background: "none", border: "none", outline: "none",
    color: "#f1f5f9", fontSize: 14, fontFamily: "'DM Mono', monospace",
    fontWeight: 500, width: 90,
  },
  gainBadge: { fontSize: 11, letterSpacing: "0.03em", fontWeight: 500, marginTop: 1 },

  rowActions: {
    display: "flex", alignItems: "center", gap: 6,
    transition: "opacity 0.15s ease",
  },
  buyBtn: {
    padding: "7px 13px", borderRadius: 8,
    background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)",
    color: "#4ade80", fontSize: 12, fontFamily: "'DM Mono', monospace",
    fontWeight: 500, cursor: "pointer", letterSpacing: "0.03em",
    transition: "background 0.15s",
  },
  sellBtn: {
    padding: "7px 13px", borderRadius: 8,
    background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)",
    color: "#f87171", fontSize: 12, fontFamily: "'DM Mono', monospace",
    fontWeight: 500, cursor: "pointer", letterSpacing: "0.03em",
    transition: "background 0.15s",
  },
  actionDivider: {
    width: 1, height: 20, background: "#1e293b", margin: "0 2px", flexShrink: 0,
  },
  editBtn: {
    width: 30, height: 30, borderRadius: 8,
    background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
    color: "#818cf8", fontSize: 14, cursor: "pointer",
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
  emptyIcon: { fontSize: 48, color: "#1e293b", lineHeight: 1, marginBottom: 8 },
  stateTitle: { fontSize: 20, fontFamily: "'DM Serif Display', serif", color: "#94a3b8" },
  stateText: { fontSize: 13, color: "#475569", maxWidth: 280, lineHeight: 1.6 },

  // ── Shared modal base ──
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(2,6,23,0.88)",
    backdropFilter: "blur(8px)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  },
  modal: {
    width: "100%", maxWidth: 540,
    background: "linear-gradient(145deg, #0f172a, #0c1525)",
    border: "1px solid #1e293b", borderRadius: 20,
    boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)",
    animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "26px 26px 18px", borderBottom: "1px solid #1e293b",
  },
  modalTag: { fontSize: 10, letterSpacing: "0.2em", color: "#6366f1", marginBottom: 5 },
  modalTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 26, fontWeight: 400, color: "#f1f5f9",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b",
    borderRadius: 8, color: "#64748b", width: 30, height: 30,
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
    background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: 8, color: "#a5b4fc", fontSize: 12, marginBottom: 16, lineHeight: 1.5,
  },
  fieldGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  fieldFull: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 },
  fieldHalf: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, letterSpacing: "0.1em", color: "#64748b" },
  labelHint: { fontSize: 10, color: "#334155", letterSpacing: "0" },
  req: { color: "#6366f1" },
  input: {
    width: "100%", padding: "10px 13px",
    background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b",
    borderRadius: 10, color: "#e2e8f0", fontSize: 14,
    fontFamily: "'DM Mono', monospace", outline: "none",
    transition: "border-color 0.15s, background 0.15s",
  },
  textarea: { resize: "vertical", minHeight: 78, lineHeight: 1.6 },
  modalFooter: {
    display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "16px 26px 22px", borderTop: "1px solid #1e293b",
  },
  cancelBtn: {
    padding: "10px 18px", background: "transparent",
    border: "1px solid #1e293b", borderRadius: 10,
    color: "#64748b", fontSize: 13, fontFamily: "'DM Mono', monospace", cursor: "pointer",
  },
  saveBtn: {
    padding: "10px 22px",
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
    border: "none", borderRadius: 10, color: "#fff",
    fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
  },
  buyConfirmBtn: {
    padding: "10px 22px",
    background: "linear-gradient(135deg, #16a34a, #4ade80)",
    border: "none", borderRadius: 10, color: "#052e16",
    fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(74,222,128,0.25)",
  },
  sellConfirmBtn: {
    padding: "10px 22px",
    background: "linear-gradient(135deg, #dc2626, #ef4444)",
    border: "none", borderRadius: 10, color: "#fff",
    fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(239,68,68,0.25)",
  },
  deleteConfirmBtn: {
    padding: "10px 22px",
    background: "linear-gradient(135deg, #7f1d1d, #dc2626)",
    border: "none", borderRadius: 10, color: "#fff",
    fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(220,38,38,0.2)",
  },

  // ── Buy/Sell specific ──
  snapshotRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "14px 16px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1e293b", borderRadius: 10,
    marginBottom: 18,
  },
  snapshotItem: { display: "flex", flexDirection: "column", gap: 3, flex: 1 },
  snapshotLabel: { fontSize: 10, letterSpacing: "0.15em", color: "#475569" },
  snapshotValue: { fontSize: 18, fontWeight: 500, color: "#cbd5e1", letterSpacing: "-0.3px" },
  snapshotArrow: { fontSize: 18, color: "#334155", flexShrink: 0 },
  previewNote: {
    marginTop: 12, fontSize: 12, color: "#64748b", lineHeight: 1.5,
  },
  maxBtn: {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: 5, color: "#f87171", fontSize: 10, fontFamily: "'DM Mono', monospace",
    padding: "3px 7px", cursor: "pointer", letterSpacing: "0.08em",
  },
  sellBreakdown: {
    marginTop: 14,
    padding: "12px 14px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1e293b", borderRadius: 10,
    display: "flex", flexDirection: "column", gap: 8,
  },
  breakdownRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  breakdownLabel: { fontSize: 12, color: "#64748b" },
  breakdownValue: { fontSize: 13, fontWeight: 500, color: "#cbd5e1" },
  fullSellNote: {
    marginTop: 4, fontSize: 11, color: "#fbbf24", lineHeight: 1.5,
    padding: "8px 10px",
    background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)",
    borderRadius: 7,
  },
};