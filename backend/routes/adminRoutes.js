const express = require("express");
const router = express.Router();

const {
  getAdminOverview,
  getCODReport,
  getVendorPayoutReport,
  getAgentPayoutReport,
  getCashFlowReport,
} = require("../controllers/adminController");

const requireAuth = require("../middleware/requireAuth");
const { authorize } = require("../middleware/authorize");

// All routes require admin
router.use((req, res, next) => {
  // requireAuth already checks token; authorize("admin") below ensures admin role on every route
  next();
});

// ─── ADMIN OVERVIEW ───
router.get("/overview", requireAuth, authorize("admin"), getAdminOverview);

// ─── REPORTS ───
router.get("/reports/cod", requireAuth, authorize("admin"), getCODReport);
router.get("/reports/vendor-payouts", requireAuth, authorize("admin"), getVendorPayoutReport);
router.get("/reports/agent-payouts", requireAuth, authorize("admin"), getAgentPayoutReport);
router.get("/reports/cash-flow", requireAuth, authorize("admin"), getCashFlowReport);

module.exports = router;
