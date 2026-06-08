"use strict";

const mongoose = require("mongoose");
const AgentWallet = require("../models/AgentWallet");
const DeliveryTask = require("../models/DeliveryTask");
const DeliveryEarning = require("../models/DeliveryEarning");
const Settlement = require("../models/Settlement");
const Order = require("../models/Order");
const AuditLog = require("../models/AuditLog");
const { notifyPaymentCollected } = require("../utils/notifications");

// ==============================
// GET AGENT WALLET SUMMARY
// GET /api/agent/wallet
// ==============================
const getAgentWalletSummary = async (req, res) => {
  try {
    const agentId = req.user?.id;
    if (!agentId) return res.status(401).json({ message: "Unauthorized" });

    // Create wallet if missing
    let wallet = await AgentWallet.findOne({ agentId });
    if (!wallet) {
      wallet = await AgentWallet.create({ agentId });
    }

    // Sum pending cash submissions (tasks where cash submitted but not verified)
    const pendingTasks = await DeliveryTask.find({
      agentId,
      agentCashSubmitted: true,
      agentCashTotal: { $gt: 0 },
    });
    const pendingSubmissions = pendingTasks.reduce((s, t) => s + (t.agentCashTotal || 0), 0);

    // Sum pending delivery earnings
    const pendingEarnings = await DeliveryEarning.find({
      agentId,
      status: "pending",
    });
    const pendingEarningsTotal = pendingEarnings.reduce((s, e) => s + (e.amount || 0), 0);

    res.json({
      wallet: {
        _id: wallet._id,
        currency: wallet.currency,
        availableBalance: wallet.availableBalance ?? wallet.withdrawableBalance ?? 0,
        pendingBalance: wallet.pendingBalance ?? 0,
        shortBalance: wallet.shortBalance ?? 0,
        totalCollected: wallet.totalCollected ?? 0,
        totalSubmitted: wallet.totalSubmitted ?? 0,
        totalShortage: wallet.totalShortage ?? 0,
        totalIncentives: wallet.totalIncentives ?? 0,
        pointsBalance: wallet.pointsBalance ?? 0,
        lastSubmittedAt: wallet.lastSubmittedAt,
        lastSubmittedAmount: wallet.lastSubmittedAmount,
        lastPayoutAt: wallet.lastPayoutAt,
        lastPayoutAmount: wallet.lastPayoutAmount,
      },
      pendingSubmissions,
      pendingEarningsTotal,
    });
  } catch (err) {
    console.error("Get agent wallet summary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET AGENT WALLET HISTORY
// GET /api/agent/wallet/history
// ==============================
const getAgentWalletHistory = async (req, res) => {
  try {
    const agentId = req.user?.id;
    if (!agentId) return res.status(401).json({ message: "Unauthorized" });

    const {
      type, status, page = "1", limit = "50",
    } = req.query;

    const filter = { agentId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      AgentWallet.AgentWalletTransaction.find(filter)
        .populate("orderId", "orderId grandTotal")
        .populate("taskId", "status taskType")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AgentWallet.AgentWalletTransaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Get agent wallet history error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// SUBMIT COLLECTED CASH TO OFFICE
// POST /api/agent/wallet/cash-submit
// Body: { taskId, submittedAmount, notes, cashDocs[] }
// ==============================
const submitAgentCash = async (req, res) => {
  try {
    const agentId = req.user?.id;
    const { taskId, submittedAmount, notes, cashDocs = [] } = req.body;

    if (!agentId) return res.status(401).json({ message: "Unauthorized" });
    if (!taskId) return res.status(400).json({ message: "Missing taskId" });
    if (submittedAmount === undefined || submittedAmount === null || submittedAmount < 0) {
      return res.status(400).json({ message: "Valid submittedAmount is required" });
    }

    const task = await DeliveryTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (String(task.agentId) !== String(agentId)) {
      return res.status(403).json({ message: "Not your task" });
    }
    if (!task.agentCashTotal || task.agentCashTotal <= 0) {
      return res.status(400).json({ message: "No cash recorded for this task" });
    }
    if (task.agentCashSubmitted) {
      return res.status(400).json({ message: "Cash already submitted for this task" });
    }

    const expected = task.agentCashTotal || 0;
    const submitted = Number(submittedAmount);
    const shortage = Math.max(0, expected - submitted);
    const excess = Math.max(0, submitted - expected);

    // Update task
    task.agentCashSubmitted = true;
    task.agentSubmissionAmount = submitted;
    task.agentCashShortage = shortage;
    task.agentCashDocs = cashDocs;
    task.agentCashSubmittedAt = new Date();
    await task.save();

    // Update order
    await Order.findByIdAndUpdate(task.orderId, {
      agentCashSubmitted: true,
      agentCashSubmittedAt: new Date(),
      agentSubmittedAmount: submitted,
      agentCashShortage: shortage,
    });

    // Get or create wallet
    let wallet = await AgentWallet.findOne({ agentId });
    if (!wallet) wallet = await AgentWallet.create({ agentId });

    // Calculate new balances
    const prevWithdrawable = wallet.withdrawableBalance ?? wallet.availableBalance ?? 0;
    const prevPending = wallet.pendingBalance ?? 0;
    const prevShort = wallet.shortBalance ?? 0;

    // Pending amount (cash collected but not yet submitted) moves to available on submit
    const withdrawablePending = Math.max(0, prevPending - expected);

    const newAvailable = prevWithdrawable + submitted - shortage;
    const newShort = prevShort + shortage;
    const newPending = withdrawablePending;

    wallet.withdrawableBalance = Math.max(0, newAvailable);
    wallet.shortBalance = newShort;
    wallet.pendingBalance = newPending;
    wallet.totalSubmitted = (wallet.totalSubmitted || 0) + submitted;
    if (shortage > 0) wallet.totalShortage = (wallet.totalShortage || 0) + shortage;
    wallet.lastSubmittedAt = new Date();
    wallet.lastSubmittedAmount = submitted;
    await wallet.save();

    // Wallet transaction for cash submission
    const narration = shortage > 0
      ? `Cash submitted — shortage of ₹${shortage.toLocaleString("en-IN")}`
      : excess > 0
        ? `Cash submitted — excess of ₹${excess.toLocaleString("en-IN")} credited`
        : "Cash submitted to office";

    await AgentWallet.AgentWalletTransaction.create({
      agentId,
      orderId: task.orderId,
      taskId: task._id,
      type: "cash_submitted",
      amount: submitted,
      paymentMethod: "cash",
      balanceAfter: wallet.availableBalance,
      status: "credited",
      narration,
    });

    // Settlement record for admin reconciliation
    await Settlement.create({
      entityType: "agent",
      entityId: agentId,
      orderId: task.orderId,
      taskId: task._id,
      type: "cod_submission",
      amount: submitted,
      netAmount: submitted - shortage,
      status: "paid_out",
      paidAt: new Date(),
      paymentMethod: "cash",
      narration: notes || narration,
      notes: shortage > 0 ? `Shortage: ₹${shortage}` : excess > 0 ? `Excess: ₹${excess}` : "",
    });

    // Audit log
    await AuditLog.create({
      actorId: agentId,
      actorRole: "agent",
      category: "agent_cash",
      action: "cash_submitted",
      entityType: "DeliveryTask",
      entityId: task._id,
      changes: { expected, submitted, shortage, excess },
      metadata: { orderId: task.orderId, notes },
    });

    // Notify admin (best-effort)
    try {
      await notifyPaymentCollected(agentId, task.orderId, task._id, submitted);
    } catch {}

    res.json({
      message: shortage > 0
        ? `Cash submitted. Shortage of ₹${shortage.toLocaleString("en-IN")} recorded.`
        : "Cash submitted successfully",
      wallet: {
        withdrawableBalance: wallet.withdrawableBalance,
        availableBalance: wallet.withdrawableBalance,
        pendingBalance: wallet.pendingBalance,
        shortBalance: wallet.shortBalance,
      },
      submittedAmount: submitted,
      expectedAmount: expected,
      shortage,
      excess,
    });
  } catch (err) {
    console.error("Submit agent cash error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET PENDING AGENT CASH SUBMISSIONS (admin)
// GET /api/admin/agent-submissions
// ==============================
const getPendingAgentSubmissions = async (req, res) => {
  try {
    const {
      status = "all", agentId, page = "1", limit = "50",
    } = req.query;

    const pendingTasks = await DeliveryTask.find({
      agentCashSubmitted: true,
    })
      .populate("agentId", "name phone email")
      .populate("orderId", "orderId grandTotal status deliveryDate")
      .populate("productId", "name image")
      .sort({ agentCashSubmittedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await DeliveryTask.countDocuments({
      agentCashSubmitted: true,
    });

    res.json({
      submissions: pendingTasks.map((t) => ({
        _id: t._id,
        taskId: t._id,
        orderId: t.orderId?._id,
        orderIdShort: t.orderId?._id ? String(t.orderId._id).substring(0, 8) : "",
        productName: t.productId?.name || "Unknown",
        agent: t.agentId ? { _id: t.agentId._id, name: t.agentId.name, phone: t.agentId.phone } : null,
        submittedAmount: t.agentSubmissionAmount,
        expectedAmount: t.agentCashTotal,
        shortage: t.agentCashShortage,
        cashDocs: t.agentCashDocs,
        submittedAt: t.agentCashSubmittedAt,
        orderStatus: t.orderId?.status || "N/A",
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Get pending agent submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// VERIFY AGENT CASH SUBMISSION (admin marks verified)
// PUT /api/admin/agent-submissions/:taskId/verify
// ==============================
const verifyAgentCashSubmission = async (req, res) => {
  try {
    const { taskId } = req.params;
    const adminId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid taskId" });
    }

    const task = await DeliveryTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Submission not found" });
    if (!task.agentCashSubmitted) {
      return res.status(400).json({ message: "Cash not yet submitted" });
    }

    // Already handled — just mark as verified
    await task.save();

    // Audit
    await AuditLog.create({
      actorId: adminId,
      actorRole: "admin",
      category: "agent_cash",
      action: "cash_submission_verified",
      entityType: "DeliveryTask",
      entityId: task._id,
      changes: { submittedAmount: task.agentSubmissionAmount, shortage: task.agentCashShortage },
    });

    res.json({ message: "Cash submission verified", taskId });
  } catch (err) {
    console.error("Verify agent cash error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET AGENT DELIVERY EARNINGS SUMMARY
// GET /api/agent/wallet/earnings
// ==============================
const getAgentDeliveryEarnings = async (req, res) => {
  try {
    const agentId = req.user?.id;
    if (!agentId) return res.status(401).json({ message: "Unauthorized" });

    const earnings = await DeliveryEarning.find({ agentId }).sort({ createdAt: -1 });
    const pendingAmount = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + (e.amount || 0), 0);
    const paidAmount = earnings.filter((e) => e.status === "paid").reduce((s, e) => s + (e.amount || 0), 0);

    res.json({
      earnings,
      summary: {
        totalEarnings: pendingAmount + paidAmount,
        pendingAmount,
        paidAmount,
        pendingCount: earnings.filter((e) => e.status === "pending").length,
        paidCount: earnings.filter((e) => e.status === "paid").length,
      },
    });
  } catch (err) {
    console.error("Get agent earnings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAgentWalletSummary,
  getAgentWalletHistory,
  submitAgentCash,
  getPendingAgentSubmissions,
  verifyAgentCashSubmission,
  getAgentDeliveryEarnings,
};
