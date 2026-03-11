const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // ── What kind of event is this ──────────────────────────────────────────
    type: {
      type: String,
      enum: [
        "asset_buy",        // added more to an asset
        "asset_sell",       // sold / exited an asset position
        "asset_create",     // new asset added to portfolio
        "asset_value_update", // manual current-value correction
        "liability_create", // new liability added
        "liability_payment",// payment made on a liability
        "liability_balance_update", // manual balance correction
      ],
      required: true,
    },

    // ── Which entity does this belong to ───────────────────────────────────
    entity_type: {
      type: String,
      enum: ["asset", "liability"],
      required: true,
    },
    entity_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "entity_model",
    },
    entity_model: {
      type: String,
      enum: ["Asset", "Liability"],
      required: true,
    },
    entity_name: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Financial amounts ──────────────────────────────────────────────────
    amount: {
      type: Number,
      required: true,
      // For buy/create → positive;  sell → negative;  payment → positive (reduction)
    },

    // Value of the entity right after this transaction
    value_after: {
      type: Number,
      default: null,
    },

    // Realized gain/loss (for sell transactions)
    realized_gain: {
      type: Number,
      default: null,
    },

    // ── Net worth snapshot at moment of transaction ────────────────────────
    // Stored so we can plot net-worth without recomputing history every time
    net_worth_snapshot: {
      type: Number,
      default: null,
    },

    // ── Metadata ───────────────────────────────────────────────────────────
    note: {
      type: String,
      trim: true,
      default: "",
    },
    transaction_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common query patterns
transactionSchema.index({ transaction_date: -1 });
transactionSchema.index({ entity_id: 1, transaction_date: -1 });
transactionSchema.index({ entity_type: 1, transaction_date: -1 });
transactionSchema.index({ type: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);