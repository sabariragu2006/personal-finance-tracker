const mongoose = require("mongoose");

// Each time current_value is updated, a snapshot is pushed here.
// This powers future graphs showing asset growth over time.
const valueSnapshotSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true,
    },
    recorded_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    asset_name: {
      type: String,
      required: [true, "Asset name is required"],
      trim: true,
    },
    institution: {
      type: String,
      required: [true, "Institution is required"],
      trim: true,
    },
    invested_value: {
      type: Number,
      required: [true, "Invested value is required"],
      min: [0, "Invested value must be a positive number"],
    },
    current_value: {
      type: Number,
      required: [true, "Current value is required"],
      min: [0, "Current value must be a positive number"],
    },
    invested_date: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    // Full history of current_value updates — used for growth charts
    value_history: {
      type: [valueSnapshotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Virtual: gain/loss amount
assetSchema.virtual("gain_loss").get(function () {
  return this.current_value - this.invested_value;
});

// Virtual: gain/loss percentage
assetSchema.virtual("gain_loss_pct").get(function () {
  if (!this.invested_value) return 0;
  return ((this.current_value - this.invested_value) / this.invested_value) * 100;
});

assetSchema.set("toJSON", { virtuals: true });
assetSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Asset", assetSchema);