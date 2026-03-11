const mongoose = require("mongoose");

// Each payment or balance update gets recorded here — powers future payoff charts
const paymentSnapshotSchema = new mongoose.Schema(
  {
    amount_paid: {
      type: Number,
      required: true,
    },
    balance_after: {
      type: Number,
      required: true,
    },
    recorded_at: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const liabilitySchema = new mongoose.Schema(
  {
    liability_name: {
      type: String,
      required: [true, "Liability name is required"],
      trim: true,
    },
    lender: {
      type: String,
      required: [true, "Lender / institution is required"],
      trim: true,
    },
    liability_type: {
      type: String,
      enum: ["loan", "mortgage", "credit_card", "student_loan", "auto_loan", "other"],
      default: "loan",
    },
    // Original borrowed / charged amount — never changes after creation
    original_amount: {
      type: Number,
      required: [true, "Original amount is required"],
      min: [0, "Original amount must be positive"],
    },
    // Remaining balance — updated with each payment
    current_balance: {
      type: Number,
      required: [true, "Current balance is required"],
      min: [0, "Current balance must be positive"],
    },
    interest_rate: {
      type: Number,
      default: 0,
      min: [0, "Interest rate cannot be negative"],
    },
    monthly_payment: {
      type: Number,
      default: 0,
      min: [0, "Monthly payment cannot be negative"],
    },
    due_date: {
      type: Date,
      default: null,
    },
    // Date the liability was taken on
    start_date: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    // Full history of payments — used for payoff progress charts
    payment_history: {
      type: [paymentSnapshotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Virtual: how much has been paid off
liabilitySchema.virtual("amount_paid_off").get(function () {
  return this.original_amount - this.current_balance;
});

// Virtual: payoff percentage
liabilitySchema.virtual("payoff_pct").get(function () {
  if (!this.original_amount) return 0;
  return ((this.original_amount - this.current_balance) / this.original_amount) * 100;
});

// Virtual: months remaining (rough estimate)
liabilitySchema.virtual("months_remaining").get(function () {
  if (!this.monthly_payment || this.monthly_payment <= 0) return null;
  return Math.ceil(this.current_balance / this.monthly_payment);
});

liabilitySchema.set("toJSON", { virtuals: true });
liabilitySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Liability", liabilitySchema);