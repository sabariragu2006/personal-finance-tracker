const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Name is required."],
      trim:     true,
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [80, "Name cannot exceed 80 characters."],
    },

    email: {
      type:      String,
      required:  [true, "Email is required."],
      unique:    true,
      lowercase: true,
      trim:      true,
      match: [/\S+@\S+\.\S+/, "Please provide a valid email address."],
    },

    password: {
      type:     String,
      required: [true, "Password is required."],
      minlength: [8, "Password must be at least 8 characters."],
      select:   false, // never returned in queries unless explicitly asked
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ── Index already implied by unique:true on email, but be explicit ──
userSchema.index({ email: 1 });

module.exports = mongoose.model("User", userSchema);