const express  = require("express");
const router   = express.Router();
const protect  = require("../Middleware/Autmiddleware");

const {
  getAllAssets, getAssetById, createAsset, updateAsset,
  deleteAsset, updateCurrentValue, buyAsset, sellAsset,
  getAllLiabilities, getLiabilityById, createLiability, updateLiability,
  updateCurrentBalance, makePayment, deleteLiability,
  getAllTransactions, getTransactionById, getTransactionSummary, deleteTransaction,
  register, login, getMe, updateProfile, changePassword, deleteAccount,
} = require("../Controllers/Controllers");

// ─── Auth (public) ────────────────────────────────────────────────────────────
router.post  ("/auth/register",        register);
router.post  ("/auth/login",           login);
router.get   ("/auth/me",              getMe);
router.put   ("/auth/profile",         protect, updateProfile);
router.put   ("/auth/change-password", protect, changePassword);
router.delete("/auth/account",         protect, deleteAccount);

// ─── Assets (protected) ───────────────────────────────────────────────────────
router.get   ("/assets",                   protect, getAllAssets);
router.post  ("/assets",                   protect, createAsset);
router.get   ("/assets/:id",               protect, getAssetById);
router.put   ("/assets/:id",               protect, updateAsset);
router.delete("/assets/:id",               protect, deleteAsset);
router.patch ("/assets/:id/current-value", protect, updateCurrentValue);
router.post  ("/assets/:id/buy",           protect, buyAsset);
router.post  ("/assets/:id/sell",          protect, sellAsset);

// ─── Liabilities (protected) ──────────────────────────────────────────────────
router.get   ("/liabilities",                     protect, getAllLiabilities);
router.post  ("/liabilities",                     protect, createLiability);
router.get   ("/liabilities/:id",                 protect, getLiabilityById);
router.put   ("/liabilities/:id",                 protect, updateLiability);
router.delete("/liabilities/:id",                 protect, deleteLiability);
router.patch ("/liabilities/:id/current-balance", protect, updateCurrentBalance);
router.post  ("/liabilities/:id/pay",             protect, makePayment);

// ─── Transactions (protected) ─────────────────────────────────────────────────
router.get   ("/transactions/summary", protect, getTransactionSummary);
router.get   ("/transactions",         protect, getAllTransactions);
router.get   ("/transactions/:id",     protect, getTransactionById);
router.delete("/transactions/:id",     protect, deleteTransaction);

module.exports = router;