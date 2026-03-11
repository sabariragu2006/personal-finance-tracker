const Asset       = require("../Models/AssetModel");
const Liability   = require("../Models/LiabilityModel");
const Transaction = require("../Models/TransactionModel");
const User        = require("../Models/Usermodel");
const bcrypt      = require("bcryptjs");
const jwt         = require("jsonwebtoken");

const JWT_SECRET  = process.env.JWT_SECRET  || "vaultfolio_secret_change_in_prod";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

// ─────────────────────────────────────────────────────────────────────────────
//  INTERNAL HELPER — log a transaction record (now scoped to user)
// ─────────────────────────────────────────────────────────────────────────────

const _log = async ({
  user_id,
  type,
  entity_type,
  entity_id,
  entity_model,
  entity_name,
  amount,
  value_after        = null,
  realized_gain      = null,
  net_worth_snapshot = null,
  note               = "",
  transaction_date   = new Date(),
}) => {
  try {
    await new Transaction({
      user_id,
      type,
      entity_type,
      entity_id,
      entity_model,
      entity_name,
      amount,
      value_after,
      realized_gain,
      net_worth_snapshot,
      note,
      transaction_date,
    }).save();
  } catch (err) {
    console.error("[Transaction Log Error]", err.message);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  ASSET CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

const getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ user_id: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch assets", error: error.message });
  }
};

const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.id, user_id: req.userId });
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.status(200).json(asset);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch asset", error: error.message });
  }
};

const createAsset = async (req, res) => {
  try {
    const { asset_name, institution, invested_value, invested_date, notes } = req.body;

    const asset = new Asset({
      user_id: req.userId,
      asset_name,
      institution,
      invested_value,
      current_value: invested_value,
      invested_date: invested_date || null,
      notes: notes || "",
      value_history: [
        { value: invested_value, recorded_at: invested_date || Date.now() },
      ],
    });

    const saved = await asset.save();

    await _log({
      user_id:          req.userId,
      type:             "asset_create",
      entity_type:      "asset",
      entity_id:        saved._id,
      entity_model:     "Asset",
      entity_name:      saved.asset_name,
      amount:           saved.invested_value,
      value_after:      saved.current_value,
      note:             notes || "",
      transaction_date: invested_date ? new Date(invested_date) : new Date(),
    });

    res.status(201).json(saved);
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: "Validation failed", errors: messages });
    }
    res.status(500).json({ message: "Failed to create asset", error: error.message });
  }
};

const updateAsset = async (req, res) => {
  try {
    const { asset_name, institution, invested_value, current_value, invested_date, notes } = req.body;

    const existing = await Asset.findOne({ _id: req.params.id, user_id: req.userId });
    if (!existing) return res.status(404).json({ message: "Asset not found" });

    const previousValue     = existing.current_value;
    existing.asset_name     = asset_name;
    existing.institution    = institution;
    existing.invested_value = invested_value;
    existing.invested_date  = invested_date || null;
    existing.notes          = notes || "";

    if (current_value !== undefined && current_value !== existing.current_value) {
      existing.current_value = current_value;
      existing.value_history.push({ value: current_value, recorded_at: new Date() });

      await _log({
        user_id:      req.userId,
        type:         "asset_value_update",
        entity_type:  "asset",
        entity_id:    existing._id,
        entity_model: "Asset",
        entity_name:  existing.asset_name,
        amount:       current_value - (previousValue || 0),
        value_after:  current_value,
        note:         "Value updated via edit",
      });
    }

    const saved = await existing.save();
    res.status(200).json(saved);
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: "Validation failed", errors: messages });
    }
    res.status(500).json({ message: "Failed to update asset", error: error.message });
  }
};

const updateCurrentValue = async (req, res) => {
  try {
    const { current_value } = req.body;

    if (current_value === undefined || current_value < 0)
      return res.status(400).json({ message: "A valid current_value is required." });

    const asset = await Asset.findOne({ _id: req.params.id, user_id: req.userId });
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    const previousValue  = asset.current_value;
    asset.current_value  = current_value;
    asset.value_history.push({ value: current_value, recorded_at: new Date() });

    const saved = await asset.save();

    await _log({
      user_id:      req.userId,
      type:         "asset_value_update",
      entity_type:  "asset",
      entity_id:    saved._id,
      entity_model: "Asset",
      entity_name:  saved.asset_name,
      amount:       current_value - previousValue,
      value_after:  current_value,
      note:         "Inline value update",
    });

    res.status(200).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Failed to update current value", error: error.message });
  }
};

const buyAsset = async (req, res) => {
  try {
    const { amount, date } = req.body;
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0)
      return res.status(400).json({ message: "A positive buy amount is required." });

    const asset = await Asset.findOne({ _id: req.params.id, user_id: req.userId });
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    if (asset.current_value == null) asset.current_value = asset.invested_value;

    asset.invested_value += parsedAmount;
    asset.current_value  += parsedAmount;
    asset.value_history.push({
      value:       asset.current_value,
      recorded_at: date ? new Date(date) : new Date(),
    });

    const saved = await asset.save();

    await _log({
      user_id:          req.userId,
      type:             "asset_buy",
      entity_type:      "asset",
      entity_id:        saved._id,
      entity_model:     "Asset",
      entity_name:      saved.asset_name,
      amount:           parsedAmount,
      value_after:      saved.current_value,
      note:             `Bought additional $${parsedAmount.toFixed(2)}`,
      transaction_date: date ? new Date(date) : new Date(),
    });

    res.status(200).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Failed to process buy", error: error.message });
  }
};

const sellAsset = async (req, res) => {
  try {
    const { proceeds, date } = req.body;

    if (!proceeds || proceeds <= 0)
      return res.status(400).json({ message: "A positive sell proceeds amount is required." });

    const asset = await Asset.findOne({ _id: req.params.id, user_id: req.userId });
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    if (proceeds > asset.current_value)
      return res.status(400).json({
        message: `Sell proceeds ($${proceeds}) exceed current value ($${asset.current_value}).`,
      });

    const sellRatio          = proceeds / asset.current_value;
    const costBasisReduction = asset.invested_value * sellRatio;
    const realizedGain       = proceeds - costBasisReduction;

    asset.invested_value = Math.max(0, asset.invested_value - costBasisReduction);
    asset.current_value  = Math.max(0, asset.current_value  - proceeds);
    asset.value_history.push({
      value:       asset.current_value,
      recorded_at: date ? new Date(date) : new Date(),
    });

    const saved = await asset.save();

    await _log({
      user_id:          req.userId,
      type:             "asset_sell",
      entity_type:      "asset",
      entity_id:        saved._id,
      entity_model:     "Asset",
      entity_name:      saved.asset_name,
      amount:           proceeds,
      value_after:      saved.current_value,
      realized_gain:    realizedGain,
      note:             `Sold for $${Number(proceeds).toFixed(2)}`,
      transaction_date: date ? new Date(date) : new Date(),
    });

    res.status(200).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Failed to process sell", error: error.message });
  }
};

const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.status(200).json({ message: "Asset deleted successfully", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete asset", error: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  LIABILITY CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

const getAllLiabilities = async (req, res) => {
  try {
    const liabilities = await Liability.find({ user_id: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(liabilities);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch liabilities", error: error.message });
  }
};

const getLiabilityById = async (req, res) => {
  try {
    const liability = await Liability.findOne({ _id: req.params.id, user_id: req.userId });
    if (!liability) return res.status(404).json({ message: "Liability not found" });
    res.status(200).json(liability);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch liability", error: error.message });
  }
};

const createLiability = async (req, res) => {
  try {
    const {
      liability_name, lender, liability_type, original_amount,
      current_balance, interest_rate, monthly_payment,
      due_date, start_date, notes,
    } = req.body;

    const initialBalance = current_balance ?? original_amount;

    const liability = new Liability({
      user_id: req.userId,
      liability_name,
      lender,
      liability_type:  liability_type  || "loan",
      original_amount,
      current_balance: initialBalance,
      interest_rate:   interest_rate   || 0,
      monthly_payment: monthly_payment || 0,
      due_date:        due_date        || null,
      start_date:      start_date      || null,
      notes:           notes           || "",
      payment_history: [{
        amount_paid:   0,
        balance_after: initialBalance,
        recorded_at:   start_date || Date.now(),
        note:          "Initial balance",
      }],
    });

    const saved = await liability.save();

    await _log({
      user_id:          req.userId,
      type:             "liability_create",
      entity_type:      "liability",
      entity_id:        saved._id,
      entity_model:     "Liability",
      entity_name:      saved.liability_name,
      amount:           initialBalance,
      value_after:      initialBalance,
      note:             notes || "New liability added",
      transaction_date: start_date ? new Date(start_date) : new Date(),
    });

    res.status(201).json(saved);
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: "Validation failed", errors: messages });
    }
    res.status(500).json({ message: "Failed to create liability", error: error.message });
  }
};

const updateLiability = async (req, res) => {
  try {
    const {
      liability_name, lender, liability_type, original_amount,
      interest_rate, monthly_payment, due_date, start_date, notes,
    } = req.body;

    const existing = await Liability.findOne({ _id: req.params.id, user_id: req.userId });
    if (!existing) return res.status(404).json({ message: "Liability not found" });

    existing.liability_name  = liability_name;
    existing.lender          = lender;
    existing.liability_type  = liability_type  || existing.liability_type;
    existing.original_amount = original_amount;
    existing.interest_rate   = interest_rate   ?? existing.interest_rate;
    existing.monthly_payment = monthly_payment ?? existing.monthly_payment;
    existing.due_date        = due_date        || null;
    existing.start_date      = start_date      || null;
    existing.notes           = notes           || "";

    const saved = await existing.save();
    res.status(200).json(saved);
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: "Validation failed", errors: messages });
    }
    res.status(500).json({ message: "Failed to update liability", error: error.message });
  }
};

const updateCurrentBalance = async (req, res) => {
  try {
    const { current_balance } = req.body;

    if (current_balance === undefined || current_balance < 0)
      return res.status(400).json({ message: "A valid current_balance is required." });

    const liability = await Liability.findOne({ _id: req.params.id, user_id: req.userId });
    if (!liability) return res.status(404).json({ message: "Liability not found" });

    const previousBalance     = liability.current_balance;
    liability.current_balance = current_balance;
    liability.payment_history.push({
      amount_paid:   Math.max(0, previousBalance - current_balance),
      balance_after: current_balance,
      recorded_at:   new Date(),
      note:          "Manual balance update",
    });

    const saved = await liability.save();

    await _log({
      user_id:      req.userId,
      type:         "liability_balance_update",
      entity_type:  "liability",
      entity_id:    saved._id,
      entity_model: "Liability",
      entity_name:  saved.liability_name,
      amount:       Math.max(0, previousBalance - current_balance),
      value_after:  current_balance,
      note:         "Manual balance correction",
    });

    res.status(200).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Failed to update balance", error: error.message });
  }
};

const makePayment = async (req, res) => {
  try {
    const { amount, date, note } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ message: "A positive payment amount is required." });

    const liability = await Liability.findOne({ _id: req.params.id, user_id: req.userId });
    if (!liability) return res.status(404).json({ message: "Liability not found" });

    if (amount > liability.current_balance)
      return res.status(400).json({
        message: `Payment ($${amount}) exceeds current balance ($${liability.current_balance}).`,
      });

    liability.current_balance = Math.max(0, liability.current_balance - amount);
    liability.payment_history.push({
      amount_paid:   amount,
      balance_after: liability.current_balance,
      recorded_at:   date ? new Date(date) : new Date(),
      note:          note || "",
    });

    const saved = await liability.save();

    await _log({
      user_id:          req.userId,
      type:             "liability_payment",
      entity_type:      "liability",
      entity_id:        saved._id,
      entity_model:     "Liability",
      entity_name:      saved.liability_name,
      amount:           amount,
      value_after:      saved.current_balance,
      note:             note || "Payment made",
      transaction_date: date ? new Date(date) : new Date(),
    });

    res.status(200).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Failed to process payment", error: error.message });
  }
};

const deleteLiability = async (req, res) => {
  try {
    const liability = await Liability.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
    if (!liability) return res.status(404).json({ message: "Liability not found" });
    res.status(200).json({ message: "Liability deleted successfully", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete liability", error: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  TRANSACTION CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

const getTransactionSummary = async (req, res) => {
  try {
    const [typeBreakdown, recentActivity, totalCount] = await Promise.all([
      Transaction.aggregate([
        { $match: { user_id: req.userId } },
        {
          $group: {
            _id:          "$type",
            count:        { $sum: 1 },
            total_amount: { $sum: "$amount" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Transaction.find({ user_id: req.userId }).sort({ transaction_date: -1 }).limit(5),
      Transaction.countDocuments({ user_id: req.userId }),
    ]);

    res.status(200).json({ typeBreakdown, recentActivity, totalCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch summary", error: error.message });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const {
      entity_type, type, entity_id, from, to,
      limit = 20, page = 1,
    } = req.query;

    const filter = { user_id: req.userId };
    if (entity_type) filter.entity_type = entity_type;
    if (entity_id)   filter.entity_id   = entity_id;
    if (type)        filter.type        = { $in: type.split(",") };

    if (from || to) {
      filter.transaction_date = {};
      if (from) filter.transaction_date.$gte = new Date(from);
      if (to)   filter.transaction_date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Transaction.countDocuments(filter);

    const transactions = await Transaction.find(filter)
      .sort({ transaction_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      transactions,
      pagination: {
        total,
        page:  parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transactions", error: error.message });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, user_id: req.userId });
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    res.status(200).json(tx);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transaction", error: error.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    res.status(200).json({ message: "Transaction deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete transaction", error: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  AUTH CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

const signToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email, and password are required." });
    if (!/\S+@\S+\.\S+/.test(email))
      return res.status(400).json({ message: "Please provide a valid email address." });
    if (password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(409).json({ message: "An account with this email already exists." });

    const hashed = await bcrypt.hash(password, 12);
    const user   = await new User({
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password: hashed,
    }).save();

    const token = signToken(user._id);
    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ message: "An account with this email already exists." });
    res.status(500).json({ message: "Registration failed.", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user)
      return res.status(401).json({ message: "Invalid email or password." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ message: "Invalid email or password." });

    const token = signToken(user._id);
    res.status(200).json({
      message: "Logged in successfully.",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed.", error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "Not authorised. No token provided." });

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch {
    res.status(401).json({ message: "Not authorised. Token is invalid or expired." });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email)
      return res.status(400).json({ message: "Name and email are required." });
    if (!/\S+@\S+\.\S+/.test(email))
      return res.status(400).json({ message: "Please provide a valid email address." });

    const conflict = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.userId } });
    if (conflict)
      return res.status(409).json({ message: "That email is already in use." });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name: name.trim(), email: email.toLowerCase().trim() },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json({ message: "Profile updated.", user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile.", error: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both current and new passwords are required." });
    if (newPassword.length < 8)
      return res.status(400).json({ message: "New password must be at least 8 characters." });

    const user = await User.findById(req.userId).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid)
      return res.status(401).json({ message: "Current password is incorrect." });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to change password.", error: err.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json({ message: "Account deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete account.", error: err.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════
module.exports = {
  getAllAssets, getAssetById, createAsset, updateAsset,
  updateCurrentValue, buyAsset, sellAsset, deleteAsset,
  getAllLiabilities, getLiabilityById, createLiability, updateLiability,
  updateCurrentBalance, makePayment, deleteLiability,
  getAllTransactions, getTransactionById, getTransactionSummary, deleteTransaction,
  register, login, getMe,
  updateProfile, changePassword, deleteAccount,
};