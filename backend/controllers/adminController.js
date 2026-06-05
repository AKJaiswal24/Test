"use strict";

const mongoose = require("mongoose");
const Order = require("../models/Order");
const DeliveryTask = require("../models/DeliveryTask");
const Commission = require("../models/Commission");
const Settlement = require("../models/Settlement");
const DeliveryEarning = require("../models/DeliveryEarning");
const AgentWallet = require("../models/AgentWallet");
const VendorWallet = require("../models/VendorWallet");
const AuditLog = require("../models/AuditLog");

// ─── Helpers ───
const IST_OFFSET_MS = 330 * 60 * 60 * 1000; // UTC+5:30
const getTodayIstYmd = () => {
  const d = new Date(Date.now() + IST_OFFSET_MS);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const getMonthStartIstYmd = () => {
  const d = new Date(Date.now() + IST_OFFSET_MS);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
};

// ==============================
// ADMIN OVERVIEW DASHBOARD
// GET /api/admin/overview
// ==============================
const getAdminOverview = async (req, res) => {
  try {
    const todayYmd = getTodayIstYmd();
    const monthStartYmd = getMonthStartIstYmd();

    // ── Orders ──
    const todayOrders = await Order.find({ createdAt: { $gte: new Date(monthStartYmd) } });
    const todayDelivered = todayOrders.filter((o) => o.status === "Delivered");

    const totalOrdersDelta = todayOrders.length;
    const deliveredOrdersDelta = todayDelivered.length;

    // ── COD Collection ──
    const codVerifiedOrders = todayDelivered.filter((o) => o.codStatus === "verified");
    const totalCODCollected = codVerifiedOrders.reduce((s, o) => s + (o.codAmountCollected || 0), 0);
    const totalCODCollectedMTD = (await Order.find({
      codStatus: "verified",
      codCollectedAt: { $gte: new Date(monthStartYmd) },
    })).reduce((s, o) => s + (o.codAmountCollected || 0), 0);

    // ── Commissions (Platform Revenue) ──
    const todayCommissions = await Commission.find({
      status: "pending",
      createdAt: { $gte: new Date(monthStartYmd) },
    });
    const todayCommissionsPaid = await Commission.find({
      status: "paid",
      createdAt: { $gte: new Date(monthStartYmd) },
    });

    const platformRevenuePending = todayCommissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const platformRevenueCollected = todayCommissionsPaid.reduce((s, c) => s + (c.commissionAmount || 0), 0);

    // ── Vendor Payouts ──
    const vendorSettlementsPaid = await Settlement.find({
      type: "vendor_payout",
      status: "paid_out",
      paidAt: { $gte: new Date(monthStartYmd) },
    });
    const vendorPayoutTotal = vendorSettlementsPaid.reduce((s, st) => s + (st.netAmount || 0), 0);

    // ── Agent Payouts ──
    const agentSettlementsPaid = await Settlement.find({
      type: "agent_payout",
      status: "paid_out",
      paidAt: { $gte: new Date(monthStartYmd) },
    });
    const agentPayoutTotal = agentSettlementsPaid.reduce((s, st) => s + (st.netAmount || 0), 0);

    // ── Pending Settlements ──
    const pendingVendorSettlements = await Settlement.find({
      entityType: "vendor",
      status: "pending",
    });
    const pendingAgentSettlements = await Settlement.find({
      agentType: "agent",
      status: "pending",
    });

    // ── Agent Cash Discrepancies ──
    const shortageTasks = await DeliveryTask.find({
      agentCashShortage: { $gt: 0 },
    })
      .populate("agentId", "name phone")
      .populate("orderId", "orderId grandTotal")
      .sort({ agentCashSubmittedAt: -1 })
      .limit(20);

    const totalShortage = shortageTasks.reduce((s, t) => s + (t.agentCashShortage || 0), 0);

    // ── Pending Agent Cash Submissions ──
    const pendingCashSubmissions = await DeliveryTask.find({
      agentCashSubmitted: true,
    })
      .populate("agentId", "name phone")
      .populate("orderId", "orderId grandTotal")
      .sort({ agentCashSubmittedAt: -1 })
      .limit(50);

    // ── Commission Summary ──
    const allCommissions = await Commission.find({}).lean();
    const commPaid = allCommissions.filter((c) => c.status === "paid").reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const commPending = allCommissions.filter((c) => c.status === "pending").reduce((s, c) => s + (c.commissionAmount || 0), 0);

    // ── Commission Discrepancies ──
    const commissionDiscrepancies = await Commission.find({
      status: "pending",
    })
      .populate("lenderId", "name email")
      .populate("orderId", "orderId grandTotal")
      .sort({ createdAt: -1 })
      .limit(20);

    // ── Overall Net Profit ──
    const totalPlatformRevenue = platformRevenueCollected + platformRevenuePending;
    const netProfit = totalPlatformRevenue - agentPayoutTotal;

    res.json({
      date: todayYmd,
      monthStart: monthStartYmd,
      summary: {
        totalOrdersDelta,
        deliveredOrdersDelta,
        totalCODCollected,
        totalCODCollectedMTD,
        platformRevenuePending,
        platformRevenueCollected,
        totalPlatformRevenue,
        vendorPayoutTotal,
        agentPayoutTotal,
        netProfit,
        commPaid,
        commPending,
      },
      pendingSettlements: {
        vendors: {
          total: pendingVendorSettlements.length,
          amount: pendingVendorSettlements.reduce((s, st) => s + (st.netAmount || 0), 0),
        },
        agents: {
          total: pendingAgentSettlements.length,
          amount: pendingAgentSettlements.reduce((s, st) => s + (st.netAmount || 0), 0),
        },
      },
      shortageTasks: shortageTasks.map((t) => ({
        _id: t._id,
        orderId: t.orderId?._id,
        orderIdShort: t.orderId?._id ? String(t.orderId._id).substring(0, 8) : "",
        expectedAmount: t.agentCashTotal,
        submittedAmount: t.agentSubmissionAmount,
        shortage: t.agentCashShortage,
        agent: t.agentId ? { _id: t.agentId._id, name: t.agentId.name, phone: t.agentId.phone } : null,
        submittedAt: t.agentCashSubmittedAt,
      })),
      totalShortage,
      pendingCashSubmissions: pendingCashSubmissions.map((t) => ({
        _id: t._id,
        orderId: t.orderId?._id,
        orderIdShort: t.orderId?._id ? String(t.orderId._id).substring(0, 8) : "",
        agent: t.agentId ? { _id: t.agentId._id, name: t.agentId.name, phone: t.agentId.phone } : null,
        submittedAmount: t.agentSubmissionAmount,
        expectedAmount: t.agentCashTotal,
        shortage: t.agentCashShortage,
        submittedAt: t.agentCashSubmittedAt,
      })),
      commissionDiscrepancies: commissionDiscrepancies.map((c) => ({
        _id: c._id,
        lenderId: c.lenderId,
        lenderName: c.lenderId?.name || "N/A",
        orderId: c.orderId?._id,
        orderIdShort: c.orderId?._id ? String(c.orderId._id).substring(0, 8) : "",
        amount: c.amount,
        commissionAmount: c.commissionAmount,
        type: c.type,
        status: c.status,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: DAILY COD REPORT
// GET /api/admin/reports/cod
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
// ==============================
const getCODReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10));
    const toDate = to ? new Date(to) : fromDate;

    const orders = await Order.find({
      codStatus: "verified",
      codCollectedAt: { $gte: fromDate, $lte: new Date(toDate.getTime() + 86400000) },
    })
      .populate("userId", "name email phone")
      .populate("items.productId", "name")
      .sort({ codCollectedAt: -1 });

    const totalCollected = orders.reduce((s, o) => s + (o.codAmountCollected || 0), 0);
    const byMethod = orders.reduce((m, o) => {
      const mth = o.codPaymentMethod || "unknown";
      m[mth] = (m[mth] || 0) + (o.codAmountCollected || 0);
      return m;
    }, {});

    res.json({
      reportType: "COD Collection",
      range: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
      totalOrders: orders.length,
      totalCollected,
      byMethod,
      orders,
    });
  } catch (err) {
    console.error("COD report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: VENDOR PAYOUT REPORT
// GET /api/admin/reports/vendor-payouts
// ==============================
const getVendorPayoutReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10));
    const toDate = to ? new Date(to) : null;

    const filter = {
      type: "vendor_payout",
      status: "paid_out",
      paidAt: { $gte: fromDate },
    };
    if (toDate) filter.paidAt.$lte = new Date(toDate.getTime() + 86400000);

    const settlements = await Settlement.find(filter)
      .populate("entityId", "name email phone")
      .populate("orderId", "orderId grandTotal status")
      .sort({ paidAt: -1 });

    const totalPaid = settlements.reduce((s, st) => s + (st.netAmount || 0), 0);

    res.json({
      reportType: "Vendor Payouts",
      range: { from: fromDate.toISOString().slice(0, 10), to: to ? toDate.toISOString().slice(0, 10) : "present" },
      totalPayouts: settlements.length,
      totalPaid,
      settlements,
    });
  } catch (err) {
    console.error("Vendor payout report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: AGENT PAYOUT REPORT
// GET /api/admin/reports/agent-payouts
// ==============================
const getAgentPayoutReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10));
    const toDate = to ? new Date(to) : null;

    const filter = {
      type: "agent_payout",
      status: "paid_out",
      paidAt: { $gte: fromDate },
    };
    if (toDate) filter.paidAt.$lte = new Date(toDate.getTime() + 86400000);

    const settlements = await Settlement.find(filter)
      .populate("entityId", "name email phone")
      .sort({ paidAt: -1 });

    // Include admin ledger:DeliveryEarning paid/total
    const earnings = await DeliveryEarning.find({ status: "paid" })
      .populate("agentId", "name email phone")
      .sort({ paidAt: -1 });

    const agentEarningsMap = {};
    for (const e of earnings) {
      const aid = String(e.agentId?._id || "");
      if (!agentEarningsMap[aid]) agentEarningsMap[aid] = { paid: 0, agent: e.agentId };
      agentEarningsMap[aid].paid += e.amount || 0;
    }

    const totalPaid = settlements.reduce((s, st) => s + (st.netAmount || 0), 0);

    res.json({
      reportType: "Agent Payouts",
      range: { from: fromDate.toISOString().slice(0, 10), to: to ? toDate.toISOString().slice(0, 10) : "present" },
      totalPayouts: settlements.length,
      totalPaid,
      settlements,
      agentEarningsById: agentEarningsMap,
    });
  } catch (err) {
    console.error("Agent payout report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: CASH FLOW STATEMENT
// GET /api/admin/reports/cash-flow
// ==============================
const getCashFlowReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10));
    const toDate = to ? new Date(to) : fromDate;

    // All settlements in range (as ledger)
    const settlements = await Settlement.find({
      createdAt: { $gte: fromDate, $lte: new Date(toDate.getTime() + 86400000) },
    })
      .populate("entityId", "name email phone")
      .sort({ createdAt: 1 });

    const inflow = settlements
      .filter((s) => s.netAmount > 0)
      .reduce((s, st) => s + st.netAmount, 0);
    const outflow = Math.abs(
      settlements
        .filter((s) => s.netAmount < 0)
        .reduce((s, st) => s + st.netAmount, 0),
    );

    const byType = settlements.reduce((acc, st) => {
      acc[st.type] = (acc[st.type] || 0) + st.netAmount;
      return acc;
    }, {});

    res.json({
      reportType: "Cash Flow",
      range: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
      totalInflow: inflow,
      totalOutflow: outflow,
      netCashFlow: inflow - outflow,
      byType,
      entries: settlements.map((s) => ({
        _id: s._id,
        type: s.type,
        entityType: s.entityType,
        entityName: s.entityId?.name || "—",
        amount: s.amount,
        netAmount: s.netAmount,
        status: s.status,
        paidAt: s.paidAt,
        paymentReference: s.paymentReference,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error("Cash flow report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAdminOverview,
  getCODReport,
  getVendorPayoutReport,
  getAgentPayoutReport,
  getCashFlowReport,
};
