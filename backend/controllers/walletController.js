"use strict";

const mongoose = require("mongoose");
const AgentWallet = require("../models/AgentWallet");
const Settlement = require("../models/Settlement");
const Transaction = require("../models/Transaction");
const DeliveryTask = require("../models/DeliveryTask");
const Order = require("../models/Order");
const User = require("../models/User");
const DeliveryEarning = require("../models/DeliveryEarning");
const { notifySettlementSubmitted } = require("../utils/notifications");

// Constants for commission calculation
const AGENT_FIXED_COMMISSION = 75; // ₹75 flat per task (was 15 % of payment)

// Helper: Get or create agent wallet
const getOrCreateWallet = async (agentId) => {
  let wallet = await AgentWallet.findOne({ agentId });
  if (!wallet) {
    wallet = await AgentWallet.create({ agentId });
  }
  return wallet;
};

// ==============================
// GET AGENT WALLET (Enhanced)
// ==============================
const getAgentWallet = async (req, res) => {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [wallet, transactions, pendingSettlements, completedSettlements] = await Promise.all([
      getOrCreateWallet(agentId),
      Transaction.find({ agentId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("orderId", "orderId")
        .populate("taskId", "taskType status"),
      Settlement.find({ agentId, status: { $in: ["pending", "submitted"] } })
        .populate("orderId", "orderId grandTotal")
        .populate("taskId", "taskType status"),
      Settlement.find({ agentId, status: "completed" })
        .sort({ verifiedAt: -1 })
        .limit(10)
        .populate("orderId", "orderId grandTotal")
        .populate("taskId", "taskType status"),
    ]);

    // Calculate totals for dashboard
    const totalCollected = wallet.totalCollected || 0;
    const totalCommission = wallet.totalCommission || 0;
    const pendingSettlement = wallet.pendingSettlement || 0;
    const settledAmount = wallet.settledAmount || 0;
    const withdrawableBalance = wallet.withdrawableBalance || 0;

    const summary = {
      totalDeposits: totalCollected,
      totalDeposited: totalCollected,
      totalSettled: settledAmount,
      totalWithdrawals: wallet.totalWithdrawn || 0,
      totalWithdrawn: wallet.totalWithdrawn || 0,
      totalCommissions: totalCommission,
      availableBalance: withdrawableBalance,
      balance: withdrawableBalance,
      pendingSettlements: pendingSettlement,
      pendingBalance: wallet.pendingSettlement || 0,
      pendingDeposit: wallet.pendingDeposit || 0,
      minWithdrawal: wallet.minWithdrawalAmt || 100,
    };

    res.json({
      wallet: {
        ...wallet.toObject(),
        totalCollected,
        totalCommission,
        pendingSettlement,
        settledAmount,
        withdrawableBalance,
      },
      summary,
      transactions,
      pendingSettlements,
      completedSettlements,
    });
  } catch (err) {
    console.error("Get agent wallet error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// RECORD CUSTOMER PAYMENT (on delivery completion)
// ==============================
const recordCustomerPayment = async (req, res) => {
  try {
    const { taskId, customerPayment } = req.body;
    const agentId = req.user?.id;

    if (!taskId || customerPayment === undefined || customerPayment <= 0) {
      return res.status(400).json({ message: "Missing or invalid taskId or customerPayment" });
    }

    const task = await DeliveryTask.findById(taskId).populate("orderId");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (String(task.agentId) !== String(agentId)) {
      return res.status(403).json({ message: "Not authorized for this task" });
    }

    // Calculate fixed agent commission (₹75 flat per task) + admin share
    const agentCommission = AGENT_FIXED_COMMISSION;
    const adminShare = Math.max(0, customerPayment - AGENT_FIXED_COMMISSION);

    // Update task payment tracking
    task.customerPaymentAmount = customerPayment;
    task.agentCommissionAmount = agentCommission;
    task.adminShareAmount = adminShare;
    task.paymentCollected = true;
    task.paymentCollectedAt = new Date();
    task.settlementStatus = "pending";
    await task.save();

    // Update wallet atomically
    const wallet = await getOrCreateWallet(agentId);
    wallet.totalCollected += customerPayment;
    wallet.totalCommission += agentCommission;
    wallet.pendingSettlement += adminShare;
    wallet.withdrawableBalance += agentCommission;
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Create settlement record
    const settlement = await Settlement.create({
      agentId,
      orderId: task.orderId,
      taskId: task._id,
      customerPayment,
      agentCommission,
      adminShare,
      status: "pending",
      paymentMethod: "cash",
    });

    // Create transaction records
    await Promise.all([
      Transaction.create({
        agentId,
        orderId: task.orderId,
        taskId: task._id,
        settlementId: settlement._id,
        amount: customerPayment,
        type: "collection",
        direction: "credit",
        method: "cash",
        description: `Customer payment collected for order #${task.orderId?.orderId || task.orderId}`,
      }),
      Transaction.create({
        agentId,
        orderId: task.orderId,
        taskId: task._id,
        settlementId: settlement._id,
        amount: agentCommission,
        type: "commission",
        direction: "credit",
        method: "cash",
        description: `Agent delivery fee (₹75)`,
      }),
    ]);

    res.json({
      message: "Payment recorded successfully",
      wallet,
      settlement,
    });
  } catch (err) {
    console.error("Record customer payment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// SUBMIT SETTLEMENT REQUEST
// ==============================
const submitSettlementRequest = async (req, res) => {
  try {
    const { settlementId, notes, paymentMethod, referenceNumber } = req.body;
    const agentId = req.user?.id;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    if (String(settlement.agentId) !== String(agentId)) {
      return res.status(403).json({ message: "Not authorized for this settlement" });
    }

    if (settlement.status !== "pending") {
      return res.status(400).json({ message: "Settlement cannot be submitted" });
    }

    settlement.status = "submitted";
    settlement.submittedAt = new Date();
    settlement.notes = notes || "";
    if (paymentMethod) settlement.paymentMethod = paymentMethod;
    if (referenceNumber) settlement.referenceNumber = referenceNumber;
    await settlement.save();

    // Update task settlement status
    await DeliveryTask.findByIdAndUpdate(settlement.taskId, {
      settlementStatus: "submitted",
    });

    res.json({ message: "Settlement submitted successfully", settlement });
  } catch (err) {
    console.error("Submit settlement error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: VERIFY SETTLEMENT
// ==============================
const verifySettlement = async (req, res) => {
  try {
    const { settlementId, status, rejectionReason, adminNotes } = req.body;
    const adminId = req.user?.id;

    const isAdmin = await User.findById(adminId).then(u => u?.isAdmin);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    settlement.status = status;
    settlement.verifiedAt = new Date();
    settlement.verifiedBy = adminId;
    if (rejectionReason) settlement.rejectionReason = rejectionReason;
    if (adminNotes) settlement.adminNotes = adminNotes;
    await settlement.save();

    // Update task settlement status to reflect admin outcome
    await DeliveryTask.findByIdAndUpdate(settlement.taskId, {
      settlementStatus: status,  // "verified" or "rejected"
    });

    // Update agent wallet on successful verification
    const wallet = await getOrCreateWallet(settlement.agentId);
    if (status === "verified") {
      wallet.pendingSettlement = Math.max(0, wallet.pendingSettlement - settlement.adminShare);
      wallet.settledAmount += settlement.adminShare;
      wallet.lastUpdated = new Date();
      await wallet.save();

      // Mark the related delivery task as Completed when settlement is verified
      await DeliveryTask.findByIdAndUpdate(settlement.taskId, {
        status: "Completed",
        completedAt: new Date(),
      });

      // Create settlement transaction (debit — money goes to admin)
      await Transaction.create({
        agentId: settlement.agentId,
        orderId: settlement.orderId,
        taskId: settlement.taskId,
        settlementId: settlement._id,
        amount: settlement.adminShare,
        type: "settlement",
        direction: "debit",
        method: settlement.paymentMethod || "cash",
        description: `Settlement verified — ₹${settlement.adminShare} owed to admin`,
      });

      // Create admin-receipt transaction (credit — admin side tracked)
      await Transaction.create({
        agentId: settlement.agentId,
        orderId: settlement.orderId,
        taskId: settlement.taskId,
        settlementId: settlement._id,
        amount: settlement.adminShare,
        type: "payment",
        direction: "credit",
        method: settlement.paymentMethod || "cash",
        description: `Admin received ₹${settlement.adminShare} (settlement verified)`,
      });
    }

    res.json({ message: `Settlement ${status}`, settlement });
  } catch (err) {
    console.error("Verify settlement error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: COMPLETE SETTLEMENT
// Called after verification, when the full cycle is closed
// ==============================
const completeSettlement = async (req, res) => {
  try {
    const { settlementId } = req.body;
    const adminId = req.user?.id;

    const isAdmin = await User.findById(adminId).then(u => u?.isAdmin);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    if (settlement.status === "completed") {
      return res.status(400).json({ message: "Settlement is already completed" });
    }

    if (settlement.status !== "verified") {
      return res.status(400).json({
        message: "Settlement must be verified before it can be completed",
      });
    }

    settlement.status = "completed";
    settlement.completedAt = new Date();
    settlement.completedBy = adminId;
    await settlement.save();

    // Update task settlement status to "completed"
    await DeliveryTask.findByIdAndUpdate(settlement.taskId, {
      settlementStatus: "completed",
    });

    res.json({ message: "Settlement completed successfully", settlement });
  } catch (err) {
    console.error("Complete settlement error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: GET ALL AGENT WALLETS
// ==============================
const adminGetAllWallets = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const isAdmin = await User.findById(adminId).then(u => u?.isAdmin);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const wallets = await AgentWallet.find()
      .populate("agentId", "name email phone earnings_balance isDeliveryAgent verification_status")
      .sort({ lastUpdated: -1 });

    // Add task counts to each wallet
    const walletsWithTasks = await Promise.all(
      wallets.map(async (w) => {
        const [totalTasks, completedTasks] = await Promise.all([
          DeliveryTask.countDocuments({ agentId: w.agentId }),
          DeliveryTask.countDocuments({ agentId: w.agentId, status: "Completed" }),
        ]);
        return {
          ...w.toObject(),
          agentId: {
            ...w.agentId,
            totalTasks,
            completedTasks,
          },
        };
      })
    );

    res.json({ wallets: walletsWithTasks });
  } catch (err) {
    console.error("Get all wallets error:", err);
    res.status(500).json({ message: "Server error" });
  }
  };

// ==============================
// DEPOSIT INTO WALLET
// Agent can deposit into their own wallet only — IDOR-secured
// ==============================
const depositIntoWallet = async (req, res) => {
  try {
    // agentId is ALWAYS derived from the authenticated token — no trust in request body
    const agentId = req.user?.id;
    const { amount } = req.body;

    if (!agentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (amount === undefined || amount <= 0) {
      return res.status(400).json({ message: "Invalid deposit amount" });
    }
    if (req.body.agentId && req.body.agentId !== agentId) {
      return res.status(403).json({ message: "Cannot deposit into another agent's wallet" });
    }

    const wallet = await getOrCreateWallet(agentId);
    wallet.withdrawableBalance += amount;
    wallet.lastUpdated = new Date();
    await wallet.save();

    await Transaction.create({
      agentId,
      amount,
      type: "payment",
      direction: "credit",
      method: "platform",
      status: "completed",
      description: `Wallet deposit of ₹${amount}`,
      reference: `DEP-${Date.now()}`,
    });

    res.json({ message: "Deposit successful", wallet });
  } catch (err) {
    console.error("Deposit error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// WITHDRAW FROM WALLET
// Agent can request withdrawal of their withdrawable balance
// ==============================
const withdrawFromWallet = async (req, res) => {
  try {
    const { amount, method } = req.body;
    const agentId = req.user?.id;

    if (!agentId) return res.status(401).json({ message: "Unauthorized" });
    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid withdrawal amount" });
    if (!method) return res.status(400).json({ message: "Withdrawal method is required" });

    const wallet = await getOrCreateWallet(agentId);
    if (wallet.withdrawableBalance < amount) {
      return res.status(400).json({
        message: `Insufficient balance. Available: ₹${(wallet.withdrawableBalance ?? 0).toLocaleString("en-IN")}`,
      });
    }

    wallet.withdrawableBalance = Math.max(0, wallet.withdrawableBalance - amount);
    wallet.lastUpdated = new Date();
    await wallet.save();

    await Transaction.create({
      agentId,
      amount,
      type: "adjustment",
      direction: "debit",
      method: method.toLowerCase().replace(/\s/g, "_"),
      status: "completed",
      description: `Wallet withdrawal via ${method}`,
      reference: `WIT-${Date.now()}`,
    });

    res.json({ message: "Withdrawal successful", wallet, amount, method });
  } catch (err) {
    console.error("Withdrawal error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET DEPOSIT / WITHDRAWAL INFO & METHODS
// ==============================
const getWalletInfo = async (req, res) => {
  try {
    const agentId = req.user?.id;
    const wallet = await getOrCreateWallet(agentId);
    const summary = {
      totalDeposits: wallet.totalCollected || 0,
      totalDeposited: wallet.totalCollected || 0,
      totalSettled: wallet.settledAmount || 0,
      totalWithdrawals: wallet.totalWithdrawn || 0,
      totalWithdrawn: wallet.totalWithdrawn || 0,
      totalCommissions: wallet.totalCommission || 0,
      availableBalance: wallet.withdrawableBalance || 0,
      balance: wallet.withdrawableBalance || 0,
      pendingSettlements: wallet.pendingSettlement || 0,
      minWithdrawal: wallet.minWithdrawalAmt || 100,
    };
    res.json({ wallet: { ...wallet.toObject(), summary }, summary });
  } catch (err) {
    console.error("Wallet info error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET SUPPORTED WALLET METHODS
// ==============================
const getWalletMethods = async (req, res) => {
  try {
    res.json({
      methods: ["UPI", "Bank Transfer"],
      minDeposit: 1,
      minWithdrawal: 100,
      depositGuide: "Deposits are credited instantly to your withdrawable balance.",
      withdrawalGuide: "Withdrawals are processed within 1–3 business days.",
    });
  } catch (err) {
    console.error("Get methods error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: GET ALL SETTLEMENTS
// ==============================
const adminGetAllSettlements = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const isAdmin = await User.findById(adminId).then(u => u?.isAdmin);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { status, agentId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (agentId) filter.agentId = agentId;

    const settlements = await Settlement.find(filter)
      .populate("agentId", "name email phone")
      .populate("orderId", "orderId grandTotal status")
      .populate("taskId", "taskType status")
      .populate("verifiedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ settlements });
  } catch (err) {
    console.error("Get all settlements error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: FINANCIAL ANALYTICS
// ==============================
const adminGetFinancialAnalytics = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const isAdmin = await User.findById(adminId).then(u => u?.isAdmin);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const [
      totalPlatformRevenue,
      totalCommissionsAgg,
      pendingSettlementsData,
      completedSettlements,
      totalAgents,
      sevenDaysAgo,
    ] = await Promise.all([
      Settlement.aggregate([{ $group: { _id: null, total: { $sum: "$adminShare" } } }]),
      Settlement.aggregate([{ $group: { _id: null, total: { $sum: "$agentCommission" } } }]),
      Settlement.aggregate([
        { $match: { status: { $in: ["pending", "submitted"] } } },
        { $group: { _id: null, total: { $sum: "$adminShare" } } },
      ]),
      Settlement.countDocuments({ status: "completed" }),
      User.countDocuments({ isDeliveryAgent: true, verification_status: "approved" }),
      (d => new Date(d.setDate(new Date().getDate() - 7)))(new Date()),
    ]);

    const [recentCollections, recentCommissions, recentSettlements, totalCollectedAgg] = await Promise.all([
      Transaction.countDocuments({ type: "collection", createdAt: { $gte: sevenDaysAgo } }),
      Transaction.countDocuments({ type: "commission", createdAt: { $gte: sevenDaysAgo } }),
      Settlement.countDocuments({ status: "completed", verifiedAt: { $gte: sevenDaysAgo } }),
      Settlement.aggregate([{ $group: { _id: null, total: { $sum: "$customerPayment" } } }]),
    ]);
    const totalCollectedVal = totalCollectedAgg[0]?.total || 0;

    res.json({
      analytics: {
        totalPlatformRevenue: totalPlatformRevenue[0]?.total || 0,
        totalCommissions: totalCommissionsAgg[0]?.total || 0,
        pendingSettlements: pendingSettlementsData[0]?.total || 0,
        pendingSettlementsCount: await Settlement.countDocuments({ status: { $in: ["pending", "submitted"] } }),
        completedSettlements,
        totalAgents,
        recentCollections,
        recentCommissions,
        recentSettlements,
        totalCollected: totalCollectedVal,
      },
    });
  } catch (err) {
    console.error("Get financial analytics error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: ADJUST WALLET BALANCE
// ==============================
const adminAdjustWallet = async (req, res) => {
  try {
    const { agentId, amount, type, reason, relatedSettlement } = req.body;
    const adminId = req.user?.id;

    const isAdmin = await User.findById(adminId).then(u => u?.isAdmin);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!agentId || amount === undefined || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const wallet = await getOrCreateWallet(agentId);

    if (type === "credit") {
      wallet.withdrawableBalance = Math.max(0, wallet.withdrawableBalance + amount);
    } else if (type === "debit") {
      wallet.withdrawableBalance = Math.max(0, wallet.withdrawableBalance - amount);
    } else if (type === "pending") {
      wallet.pendingSettlement = Math.max(0, wallet.pendingSettlement + amount);
    }

    wallet.lastUpdated = new Date();
    await wallet.save();

    await Transaction.create({
      agentId,
      amount: Math.abs(amount),
      type: "adjustment",
      direction: type === "debit" ? "debit" : "credit",
      method: "adjustment",
      description: `Admin adjustment: ${reason || "No reason"}`,
      reference: relatedSettlement || "",
    });

    res.json({ message: "Wallet adjusted successfully", wallet });
  } catch (err) {
    console.error("Adjust wallet error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET TRANSACTION HISTORY
// ==============================
const getTransactionHistory = async (req, res) => {
  try {
    const agentId = req.user?.id;
    const { page = 1, limit = 20, type } = req.query;

    const filter = { agentId };
    if (type) filter.type = type;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("orderId", "orderId grandTotal")
        .populate("taskId", "taskType status")
        .populate("settlementId", "status"),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get transaction history error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET SETTLEMENT BY ID
// ==============================
const getSettlementById = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const agentId = req.user?.id;

    const settlement = await Settlement.findById(settlementId)
      .populate("agentId", "name email phone")
      .populate("orderId", "orderId grandTotal status")
      .populate("taskId", "taskType status")
      .populate("verifiedBy", "name email");

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    // Check authorization - only agent or admin can view
    const user = await User.findById(agentId);
    if (!user?.isAdmin && String(settlement.agentId) !== String(agentId)) {
      return res.status(403).json({ message: "Not authorized to view this settlement" });
    }

    res.json({ settlement });
  } catch (err) {
    console.error("Get settlement error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// REQUEST SETTLEMENT (Agent submits pending amount to admin)
// ==============================
const requestSettlement = async (req, res) => {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const wallet = await getOrCreateWallet(agentId);
    const pendingAmount = (wallet.totalCollected || 0) - (wallet.settledAmount || 0);

    if (pendingAmount <= 0) {
      return res.status(400).json({ message: "No pending amount to submit" });
    }

    const existingPending = await Settlement.findOne({
      agentId,
      status: { $in: ["pending", "submitted"] },
    });

    if (existingPending) {
      existingPending.status = "submitted";
      existingPending.submittedAt = new Date();
      existingPending.notes = "Cash submitted to admin";
      await existingPending.save();

      await notifySettlementSubmitted(existingPending._id, agentId, existingPending.adminShare, existingPending.orderId);

      return res.json({
        message: "Settlement request submitted successfully",
        settlement: existingPending,
      });
    }

    const settlements = await Settlement.find({ agentId, status: "pending" });
    if (settlements.length === 0) {
      return res.status(400).json({ message: "No pending settlements found" });
    }

    const newSettlement = await Settlement.create({
      agentId,
      orderId: settlements[0].orderId,
      taskId: settlements[0].taskId,
      customerPayment: pendingAmount,
      agentCommission: 0,
      adminShare: pendingAmount,
      status: "submitted",
      submittedAt: new Date(),
      notes: "Cash submitted to admin",
    });

    wallet.settledAmount += pendingAmount;
    wallet.pendingSettlement = Math.max(0, wallet.pendingSettlement - pendingAmount);
    await wallet.save();

    await notifySettlementSubmitted(newSettlement._id, agentId, pendingAmount, newSettlement.orderId);

    res.json({
      message: "Settlement request submitted successfully",
      settlement: newSettlement,
    });
  } catch (err) {
    console.error("Request settlement error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ADMIN: ACCEPT SETTLEMENT (Mark as Paid)
// ==============================
const adminAcceptSettlement = async (req, res) => {
  try {
    const { settlementId } = req.body;
    const adminId = req.user?.id;

    const isAdmin = await User.findById(adminId).then((u) => u?.isAdmin);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const settlement = await Settlement.findById(settlementId)
      .populate("agentId", "name email phone")
      .populate("orderId", "orderId grandTotal");
    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    if (settlement.status !== "submitted") {
      return res.status(400).json({ message: "Settlement must be in submitted status" });
    }

    settlement.status = "completed";
    settlement.verifiedAt = new Date();
    settlement.verifiedBy = adminId;
    settlement.completedAt = new Date();
    settlement.completedBy = adminId;
    await settlement.save();

    // Mark the related delivery task as completed
    await DeliveryTask.findByIdAndUpdate(settlement.taskId, {
      status: "Completed",
      settlementStatus: "completed",
    });

    // ------------------------------------------------------------------
    // CRITICAL: Reset the agent's wallet balance to zero now that the
    // admin has physically collected the cash.
    // ------------------------------------------------------------------
    const wallet = await getOrCreateWallet(settlement.agentId);
    wallet.totalCollected = 0;
    wallet.pendingSettlement = 0;
    wallet.settledAmount = 0;
    wallet.withdrawableBalance = 0;
    wallet.lastUpdated = new Date();
    await wallet.save();

    // Tag the collection / commission transactions as paid
    const collectionTx = await Transaction.findOne({
      agentId: settlement.agentId,
      orderId: settlement.orderId,
      type: "collection",
    });
    if (collectionTx) {
      collectionTx.status = "paid";
      await collectionTx.save();
    }

    const commissionTx = await Transaction.findOne({
      agentId: settlement.agentId,
      orderId: settlement.orderId,
      type: "commission",
    });
    if (commissionTx) {
      commissionTx.status = "paid";
      await commissionTx.save();
    }

    res.json({
      message: "Settlement accepted - marked as Paid. Agent wallet has been reset.",
      settlement,
    });
  } catch (err) {
    console.error("Accept settlement error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAgentWallet,
  recordCustomerPayment,
  submitSettlementRequest,
  verifySettlement,
  completeSettlement,
  adminGetAllWallets,
  adminGetAllSettlements,
  adminGetFinancialAnalytics,
  adminAdjustWallet,
  getTransactionHistory,
  getSettlementById,
  requestSettlement,
  adminAcceptSettlement,
  depositIntoWallet,
  withdrawFromWallet,
  getWalletInfo,
  getWalletMethods,
};