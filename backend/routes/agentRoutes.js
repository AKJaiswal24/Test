const express = require("express");
const router = express.Router();

const {
  getAgentWalletSummary,
  getAgentWalletHistory,
  submitAgentCash,
  getAgentDeliveryEarnings,
} = require("../controllers/agentWalletController");

const requireAuth = require("../middleware/requireAuth");
const { authorize } = require("../middleware/authorize");

// ─── Agent WALLET ───

// Wallet summary (available + pending + short balance)
router.get("/wallet", requireAuth, authorize("deliveryAgent"), getAgentWalletSummary);

// Wallet transaction history
router.get("/wallet/history", requireAuth, authorize("deliveryAgent"), getAgentWalletHistory);

// Delivery earnings history
router.get("/wallet/earnings", requireAuth, authorize("deliveryAgent"), getAgentDeliveryEarnings);

// Submit collected COD cash to office
router.post("/wallet/cash-submit", requireAuth, authorize("deliveryAgent"), submitAgentCash);

module.exports = router;
