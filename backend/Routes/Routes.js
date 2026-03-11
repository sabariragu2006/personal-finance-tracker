const express = require("express");
const router  = express.Router();

const {
  getAllAssets, getAssetById, createAsset, updateAsset,
  deleteAsset, updateCurrentValue, buyAsset, sellAsset,
  getAllLiabilities, getLiabilityById, createLiability, updateLiability,
  updateCurrentBalance, makePayment, deleteLiability,
  getAllTransactions, getTransactionById, getTransactionSummary, deleteTransaction,
  register, login, getMe, updateProfile, changePassword, deleteAccount,
} = require("../Controllers/Controllers");

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post  ("/auth/register",        register);
router.post  ("/auth/login",           login);
router.get   ("/auth/me",              getMe);
router.put   ("/auth/profile",         updateProfile);
router.put   ("/auth/change-password", changePassword);
router.delete("/auth/account",         deleteAccount);

// ─── Assets ───────────────────────────────────────────────────────────────────
router.get   ("/assets",                   getAllAssets);
router.post  ("/assets",                   createAsset);
router.get   ("/assets/:id",               getAssetById);
router.put   ("/assets/:id",               updateAsset);
router.delete("/assets/:id",               deleteAsset);
router.patch ("/assets/:id/current-value", updateCurrentValue);
router.post  ("/assets/:id/buy",           buyAsset);
router.post  ("/assets/:id/sell",          sellAsset);

// ─── Liabilities ──────────────────────────────────────────────────────────────
router.get   ("/liabilities",                     getAllLiabilities);
router.post  ("/liabilities",                     createLiability);
router.get   ("/liabilities/:id",                 getLiabilityById);
router.put   ("/liabilities/:id",                 updateLiability);
router.delete("/liabilities/:id",                 deleteLiability);
router.patch ("/liabilities/:id/current-balance", updateCurrentBalance);
router.post  ("/liabilities/:id/pay",             makePayment);

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get   ("/transactions/summary", getTransactionSummary);
router.get   ("/transactions",         getAllTransactions);
router.get   ("/transactions/:id",     getTransactionById);
router.delete("/transactions/:id",     deleteTransaction);

module.exports = router;