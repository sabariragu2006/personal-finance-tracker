const mongoose = require("mongoose");

const paymentSnapshotSchema = new mongoose.Schema(
  {
    amount_paid:   { type: Number, required: true },
    balance_after: { type: Number, required: true },
    recorded_at:   { type: Date,   default: Date.now },
    note:          { type: String, default: "" },
  },
  { _id: false }
);

const liabilitySchema = new mongoose.Schema(
  {
    user_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "User reference is required"],
      index:    true,
    },
    liability_name: {
      type:     String,
      required: [true, "Liability name is required"],
      trim:     true,
    },
    lender: {
      type:     String,
      required: [true, "Lender / institution is required"],
      trim:     true,
    },
    liability_type: {
      type:    String,
      enum:    ["loan", "mortgage", "credit_card", "student_loan", "auto_loan", "other"],
      default: "loan",
    },
    original_amount: {
      type:     Number,
      required: [true, "Original amount is required"],
      min:      [0, "Original amount must be positive"],
    },
    current_balance: {
      type:     Number,
      required: [true, "Current balance is required"],
      min:      [0, "Current balance must be positive"],
    },
    interest_rate:   { type: Number, default: 0, min: [0, "Interest rate cannot be negative"] },
    monthly_payment: { type: Number, default: 0, min: [0, "Monthly payment cannot be negative"] },
    due_date:        { type: Date,   default: null },
    start_date:      { type: Date,   default: null },
    notes:           { type: String, trim: true, default: "" },
    payment_history: { type: [paymentSnapshotSchema], default: [] },
  },
  { timestamps: true }
);

liabilitySchema.virtual("amount_paid_off").get(function () {
  return this.original_amount - this.current_balance;
});
liabilitySchema.virtual("payoff_pct").get(function () {
  if (!this.original_amount) return 0;
  return ((this.original_amount - this.current_balance) / this.original_amount) * 100;
});
liabilitySchema.virtual("months_remaining").get(function () {
  if (!this.monthly_payment || this.monthly_payment <= 0) return null;
  return Math.ceil(this.current_balance / this.monthly_payment);
});

liabilitySchema.set("toJSON",   { virtuals: true });
liabilitySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Liability", liabilitySchema);