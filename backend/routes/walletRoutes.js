const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const requireAuth = require("../middleware/requireAuth");
const { authorize } = require("../middleware/authorize");

// ==============================
// AGENT WALLET ROUTES
// ==============================

// Get agent wallet (agent only)
router.get("/wallet", requireAuth, authorize("deliveryAgent"), walletController.getAgentWallet);

// Get wallet info with summary (agent only)
router.get("/wallet/info", requireAuth, authorize("deliveryAgent"), walletController.getWalletInfo);

// Get deposit / withdrawal info (agent only)
router.get("/wallet/deposit/methods", requireAuth, authorize("deliveryAgent"), walletController.getWalletMethods);

// Deposit into wallet (agent only)
router.post("/wallet/deposit", requireAuth, authorize("deliveryAgent"), walletController.depositIntoWallet);

// Withdraw from wallet (agent only)
router.post("/wallet/withdraw", requireAuth, authorize("deliveryAgent"), walletController.withdrawFromWallet);

// Complete settlement after verification (admin only)
router.post("/payment/record", requireAuth, authorize("deliveryAgent"), walletController.recordCustomerPayment);

// Submit settlement request (agent only)
router.post("/settlement/submit", requireAuth, authorize("deliveryAgent"), walletController.submitSettlementRequest);

// Get transaction history (agent only)
router.get("/transactions", requireAuth, authorize("deliveryAgent"), walletController.getTransactionHistory);

// Get settlement by ID (agent or admin)
router.get("/settlement/:settlementId", requireAuth, walletController.getSettlementById);

// Request settlement (agent submits to admin)
router.post("/request-settlement", requireAuth, authorize("deliveryAgent"), walletController.requestSettlement);

// Admin accept settlement (mark as Paid)
router.put("/admin/settlement/accept", requireAuth, authorize("admin"), walletController.adminAcceptSettlement);

// ==============================
// ADMIN WALLET ROUTES
// ==============================

// Get all agent wallets (admin only)
router.get("/admin/wallets", requireAuth, authorize("admin"), walletController.adminGetAllWallets);

// Get all settlements (admin only)
router.get("/admin/settlements", requireAuth, authorize("admin"), walletController.adminGetAllSettlements);

// Verify settlement (admin only)
router.put("/admin/settlement/verify", requireAuth, authorize("admin"), walletController.verifySettlement);

// Complete settlement after verification (admin only)
router.post("/admin/settlement/complete", requireAuth, authorize("admin"), walletController.completeSettlement);

// Get financial analytics (admin only)
router.get("/admin/analytics", requireAuth, authorize("admin"), walletController.adminGetFinancialAnalytics);

// Adjust wallet balance (admin only)
router.post("/admin/wallet/adjust", requireAuth, authorize("admin"), walletController.adminAdjustWallet);

module.exports = router;