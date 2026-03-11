const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "User reference is required"],
      index:    true,
    },
    type: {
      type: String,
      enum: [
        "asset_buy",
        "asset_sell",
        "asset_create",
        "asset_value_update",
        "liability_create",
        "liability_payment",
        "liability_balance_update",
      ],
      required: true,
    },
    entity_type: {
      type:     String,
      enum:     ["asset", "liability"],
      required: true,
    },
    entity_id: {
      type:     mongoose.Schema.Types.ObjectId,
      required: true,
      refPath:  "entity_model",
    },
    entity_model: {
      type:     String,
      enum:     ["Asset", "Liability"],
      required: true,
    },
    entity_name:        { type: String, required: true, trim: true },
    amount:             { type: Number, required: true },
    value_after:        { type: Number, default: null },
    realized_gain:      { type: Number, default: null },
    net_worth_snapshot: { type: Number, default: null },
    note:               { type: String, trim: true, default: "" },
    transaction_date:   { type: Date,   default: Date.now },
  },
  { timestamps: true }
);

transactionSchema.index({ user_id: 1, transaction_date: -1 });
transactionSchema.index({ user_id: 1, entity_id: 1, transaction_date: -1 });
transactionSchema.index({ user_id: 1, entity_type: 1, transaction_date: -1 });
transactionSchema.index({ user_id: 1, type: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);