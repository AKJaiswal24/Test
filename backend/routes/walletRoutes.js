const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const requireAuth = require("../middleware/requireAuth");
const { authorize } = require("../middleware/authorize");
const pay = require("../pay");

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

// ──────────────────────────────────────────────────────────────────────────────
// POINTS SYSTEM (pay.js)
// ──────────────────────────────────────────────────────────────────────────────

// Agent: view current points balance
router.get("/wallet/points/balance", requireAuth, authorize("deliveryAgent"), async (req, res) => {
  try {
    const balance = await pay.getAgentPointsBalance(req.user?.id);
    res.json({ pointsBalance: balance });
  } catch (err) {
    console.error("Get points balance error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Agent: submit a claim for a specific point amount
router.post("/wallet/points/claim", requireAuth, authorize("deliveryAgent"), async (req, res) => {
  try {
    const { requestedPoints, note } = req.body;
    if (!requestedPoints || requestedPoints <= 0) {
      return res.status(400).json({ message: "requestedPoints must be a positive number" });
    }
    const claim = await pay.submitClaim(req.user?.id, Number(requestedPoints), note || "");
    res.json({ message: "Claim submitted. Please confirm to send to admin.", claim });
  } catch (err) {
    console.error("Submit claim error:", err);
    res.status(400).json({ message: err.message || "Failed to submit claim" });
  }
});

// Agent: confirm claim (second factor — agent approval)
router.post("/wallet/points/confirm", requireAuth, authorize("deliveryAgent"), async (req, res) => {
  try {
    const { claimId } = req.body;
    if (!claimId) return res.status(400).json({ message: "claimId is required" });
    const claim = await pay.confirmClaimByAgent(req.user?.id, claimId);
    res.json({ message: "Claim confirmed and sent to admin for approval", claim });
  } catch (err) {
    console.error("Confirm claim error:", err);
    res.status(400).json({ message: err.message || "Failed to confirm claim" });
  }
});

// Agent: view my claims history
router.get("/wallet/points/claims", requireAuth, authorize("deliveryAgent"), async (req, res) => {
  try {
    const claims = await pay.getAgentClaims(req.user?.id);
    res.json({ claims });
  } catch (err) {
    console.error("Get claims error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: view all claims across all agents
router.get("/admin/wallet/points/claims", requireAuth, authorize("admin"), async (req, res) => {
  try {
    const claims = await pay.getAllClaims();
    res.json({ claims });
  } catch (err) {
    console.error("Get all claims error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: approve and pay a claim (deducts points, marks resolved)
router.put("/admin/wallet/points/approve/:claimId", requireAuth, authorize("admin"), async (req, res) => {
  try {
    const { claimId } = req.params;
    const claim = await pay.approveClaimByAdmin(req.user?.id, claimId);
    res.json({ message: "Claim approved and points deducted", claim });
  } catch (err) {
    console.error("Approve claim error:", err);
    res.status(400).json({ message: err.message || "Failed to approve claim" });
  }
});

module.exports = router;