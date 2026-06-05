"use strict";

const mongoose = require("mongoose");
const DeliveryTask = require("../models/DeliveryTask");
const DeliveryEarning = require("../models/DeliveryEarning");
const DeliveryTrackingLog = require("../models/DeliveryTrackingLog");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Commission = require("../models/Commission");
const {
  notifyDeliveryAssigned,
  notifyDeliveryAccepted,
  notifyRenterDeliveryUpdate,
  notifyLenderDeliveryUpdate,
  notifyPaymentCollected,
  notifyRentalExtended,
  notifyAgentApplication,
} = require("../utils/notifications");

const DELIVERY_FEE = 75;
const PICKUP_FEE = 75;
const COMMISSION_RATE = 10; // 10% platform commission on rentals

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// Helper: Add days to a YYYY-MM-DD date string
const addDaysYmd = (ymd, days) => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(ymd);
  d.setDate(d.getDate() + Number(days || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Helper: Add months to a YYYY-MM-DD date string
const addMonthsYmd = (ymd, months) => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(ymd);
  d.setMonth(d.getMonth() + Number(months || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Helper: Sanitize user object for response
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  vehicle_type: user.vehicle_type || "",
  transport_type: user.transport_type || "",
  isDeliveryAgent: user.isDeliveryAgent === true,
  verification_status: user.verification_status || "pending",
  availability_status: user.availability_status || "unavailable",
  completed_deliveries: user.completed_deliveries || 0,
  earnings_balance: user.earnings_balance || 0,
  appliedAt: user.appliedAt || null,
  approvedAt: user.approvedAt || null,
  rejectedAt: user.rejectedAt || null,
  rejectionReason: user.rejectionReason || null,
});

// Helper: Add a tracking log entry
const addTrackingLog = async (taskId, orderId, status, notes, actorId, actorRole) => {
  try {
    await DeliveryTrackingLog.create({
      taskId,
      orderId,
      status,
      notes,
      actorId,
      actorRole,
    });
  } catch (err) {
    console.error("Tracking log error:", err);
  }
};

// ==============================
// GET USER DELIVERY TASKS
// ==============================
const getUserDeliveryTasks = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tasks = await DeliveryTask.find({ renterId: userId })
      .populate("orderId", "status")
      .populate("productId", "name image")
      .populate("lenderId", "name")
      .populate("agentId", "name")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error("Get user tasks error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET DELIVERY STATUS FOR ORDER
// ==============================
const getDeliveryStatusForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ message: "Missing orderId" });
    }

    const tasks = await DeliveryTask.find({ orderId })
      .populate("productId", "name image")
      .populate("agentId", "name phone vehicle_type transport_type")
      .sort({ createdAt: 1 });

    res.json({ orderId, tasks });
  } catch (err) {
    console.error("Get delivery status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET DELIVERY TASK BY ID
// ==============================
const getDeliveryTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) {
      return res.status(400).json({ message: "Missing taskId" });
    }

    const task = await DeliveryTask.findById(taskId)
      .populate("orderId", "orderId grandTotal items deliveryAddress returnDate status")
      .populate("productId", "name image monthlyRent pricing")
      .populate("lenderId", "name phone")
      .populate("renterId", "name phone")
      .populate("agentId", "name phone vehicle_type transport_type");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ task, trackingLogs: task.trackingLogs || [] });
  } catch (err) {
    console.error("Get task error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET AVAILABLE DELIVERY TASKS
// ==============================
const getAvailableDeliveryTasks = async (req, res) => {
  try {
    const userId = req.user?.id;
    const agent = await User.findById(userId);

    if (!agent || agent.isDeliveryAgent !== true || agent.verification_status !== "approved") {
      return res.status(403).json({ message: "Not an approved delivery agent" });
    }

    const tasks = await DeliveryTask.find({
      status: "Waiting for Agent",
      agentId: null,
    })
      .populate("orderId", "orderId grandTotal items deliveryAddress returnDate")
      .populate("productId", "name image images monthlyRent pricing")
      .populate("lenderId", "name phone")
      .populate("renterId", "name phone")
      .sort({ createdAt: -1 })
      .limit(50);

    // Deduplicate by productId (one task per product)
    const seenProductIds = new Set();
    const uniqueTasks = [];
    for (const task of tasks) {
      if (!seenProductIds.has(String(task.productId))) {
        seenProductIds.add(String(task.productId));
        uniqueTasks.push(task);
      }
    }

    const sanitizedTasks = uniqueTasks.map((task) => {
      const t = task.toObject ? task.toObject() : task;
      return {
        ...t,
        productName: t.productId?.name || t.productName || "Unknown Product",
        lenderName: t.lenderId?.name || t.lenderName || "Unknown",
        renterName: t.renterId?.name || t.renterName || "Unknown",
      };
    });

    res.json({ tasks: sanitizedTasks });
  } catch (err) {
    console.error("Get available tasks error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// APPLY AS DELIVERY AGENT
// ==============================
const applyAsDeliveryAgent = async (req, res) => {
  try {
    const { userId, vehicleType, transportType } = req.body;

    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    if (userId && String(userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isDeliveryAgent === true) {
      if (user.verification_status === "approved") {
        return res.status(400).json({ message: "You are already an approved agent" });
      }
      if (user.verification_status === "pending") {
        return res.status(400).json({ message: "Your application is under review" });
      }
      if (user.verification_status === "rejected") {
        return res.status(400).json({ message: "Your application was previously rejected" });
      }
    }

    user.isDeliveryAgent = true;
    user.vehicle_type = vehicleType || user.vehicle_type;
    user.transport_type = transportType || user.transport_type;
    user.verification_status = "pending";
    user.appliedAt = new Date();
    await user.save();

    await notifyAgentApplication(req.user.id, false, "New agent application submitted");

    res.json({ message: "Application submitted successfully", user });
  } catch (err) {
    console.error("Agent application error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET AGENT PROFILE
// ==============================
const getAgentProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let agentData = {
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      vehicle_type: user.vehicle_type,
      transport_type: user.transport_type,
      verification_status: user.verification_status,
      availability_status: user.availability_status,
      completed_deliveries: user.completed_deliveries,
      earnings_balance: user.earnings_balance,
    };

    if (user.vehicleDocuments) {
      agentData = { ...agentData, vehicleDocuments: user.vehicleDocuments };
    }

    res.json({ profile: agentData, stats: {} });
  } catch (err) {
    console.error("Get agent profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// UPDATE AGENT PROFILE
// ==============================
const updateAgentProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { availability_status, vehicle_type, transport_type } = req.body;

    const updateFields = {};
    if (availability_status) updateFields.availability_status = availability_status;
    if (vehicle_type) updateFields.vehicle_type = vehicle_type;
    if (transport_type) updateFields.transport_type = transport_type;

    const user = await User.findByIdAndUpdate(userId, updateFields, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated successfully", profile: user });
  } catch (err) {
    console.error("Update agent profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET AGENT STATUS
// ==============================
const getAgentStatus = async (req, res) => {
  try {
    let userId = req.params.userId || req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let agentStatus = {
      isAgent: false,
      isApproved: false,
      isRejected: false,
      isPending: false,
    };

    if (user.isDeliveryAgent) {
      agentStatus.isAgent = true;
      agentStatus.isApproved = user.verification_status === "approved";
      agentStatus.isRejected = user.verification_status === "rejected";
      agentStatus.isPending = user.verification_status === "pending";
    }

    res.json(agentStatus);
  } catch (err) {
    console.error("Get agent status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// ACCEPT DELIVERY TASK
// ==============================
const acceptDeliveryTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const agentId = req.user?.id;

    if (!taskId || !agentId) {
      return res.status(400).json({ message: "Missing taskId or agentId" });
    }

    const agent = await User.findById(agentId);
    if (!agent || agent.isDeliveryAgent !== true || agent.verification_status !== "approved") {
      return res.status(403).json({ message: "Not an approved delivery agent" });
    }

    if (agent.availability_status !== "available") {
      return res.status(403).json({ message: "Agent not available" });
    }

    const task = await DeliveryTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "Waiting for Agent") {
      return res.status(400).json({ message: "Task already taken or processed" });
    }

    // Prevent agent from accepting their own order (as lender or renter)
    if (String(task.lenderId) === String(agentId) || String(task.renterId) === String(agentId)) {
      return res.status(400).json({ message: "Cannot accept delivery for your own order" });
    }

    // Atomic: claim the task only if still unclaimed
    const claimedTask = await DeliveryTask.findOneAndUpdate(
      { _id: taskId, status: "Waiting for Agent", agentId: null },
      {
        agentId,
        status: "Accepted",
        assignedAt: new Date(),
        // Keep the OTP that was generated at order creation time.
        // Do NOT regenerate - the OTP belongs to the user (renter).
      },
      { new: true }
    );

    if (!claimedTask) {
      return res.status(400).json({ message: "Task was already claimed by another agent" });
    }

    await addTrackingLog(claimedTask._id, claimedTask.orderId, "Accepted", `Task accepted by agent ${agent.name}`, agentId, "agent");

    // Notify lender
    if (String(claimedTask.lenderId) !== agentId) {
      await notifyDeliveryAccepted(claimedTask.lenderId, claimedTask.orderId, claimedTask._id, agent.name);
    }
    // Notify renter
    if (String(claimedTask.renterId) !== agentId) {
      await notifyRenterDeliveryUpdate(claimedTask.renterId, claimedTask.orderId, claimedTask._id, "Accepted", agent.name);
    }

    // OTP expiry is now handled when the agent goes "In Transit"

    // Populate for response
    await claimedTask.populate("productId", "name image monthlyRent");
    await claimedTask.populate("lenderId", "name phone");
    await claimedTask.populate("renterId", "name phone");

    res.json({
      message: "Task accepted successfully",
      task: claimedTask,
    });
  } catch (err) {
    console.error("Accept task error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// REJECT DELIVERY TASK
// ==============================
const rejectDeliveryTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const agentId = req.user?.id;
    const { reason } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: "Missing taskId" });
    }

    const task = await DeliveryTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "Waiting for Agent") {
      return res.status(400).json({ message: "Task status does not allow rejection" });
    }

    task.rejectedBy = agentId;
    task.rejectionReason = reason || "No reason provided";
    task.status = "Waiting for Agent"; // Status remains, but agent clears
    task.agentId = null;

    await task.save();

    await addTrackingLog(task._id, task.orderId, "Rejected", `Task rejected by agent. Reason: ${reason || "Not specified"}`, agentId, "agent");

    res.json({
      message: "Task rejected successfully",
      taskId,
    });
  } catch (err) {
    console.error("Reject task error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET AGENT DELIVERY TASKS
// ==============================
const getAgentDeliveryTasks = async (req, res) => {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tasks = await DeliveryTask.find({ agentId })
      .populate("orderId", "orderId grandTotal status deliveryDate returnDate")
      .populate("productId", "name image monthlyRent pricing")
      .populate("lenderId", "name phone")
      .populate("renterId", "name phone")
      .sort({ assignedAt: -1 });

    res.json({ tasks });
  } catch (err) {
    console.error("Get agent tasks error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET AGENT EARNINGS
// ==============================
const getAgentEarnings = async (req, res) => {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const earnings = await DeliveryEarning.find({ agentId }).sort({ createdAt: -1 });

    const pendingAmount = earnings.filter((e) => e.status === "pending").reduce((acc, e) => acc + e.amount, 0);
    const paidAmount = earnings.filter((e) => e.status === "paid").reduce((acc, e) => acc + e.amount, 0);

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
    console.error("Get earnings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// MARK CASH COLLECTED
// ==============================
const markCashCollected = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { amount } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: "Missing taskId" });
    }

    const task = await DeliveryTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.cashCollected = true;
    await task.save();

    res.json({ message: "Cash marked as collected", taskId });
  } catch (err) {
    console.error("Mark cash collected error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// UPDATE DELIVERY TASK STATUS
// ==============================
const updateDeliveryTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, notes, location, otp } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: "Missing taskId" });
    }

    const task = await DeliveryTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const validTransitions = {
      "Waiting for Agent": ["Accepted"],
      "Accepted": ["Picking Up Product", "Rejected"],
      "Picking Up Product": ["In Transit"],
      "In Transit": ["Cod Payment Collected", "Delivered", "Return In Transit"],
      "Cod Payment Collected": ["Delivered"],
      "Delivered": ["Pickup Scheduled"],
      "Pickup Scheduled": ["Return In Transit"],
      "Return In Transit": ["Returned to Lender"],
      "Returned to Lender": ["Completed"],
    };

    const currentStatus = task.status;
    const allowedNext = validTransitions[currentStatus] || [];

    // Admin can bypass transitions
    const isAdmin = req.user && req.user.id && (await User.findById(req.user.id))?.isAdmin;
    if (!isAdmin && !allowedNext.includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition from "${currentStatus}" to "${status}". Allowed: ${allowedNext.join(", ")}`,
      });
    }

    // Verify OTP for delivery completion
    if (status === "Delivered" || status === "Returned to Lender") {
      if (otp) {
        if (task.otp !== otp) {
          return res.status(400).json({ message: "Invalid OTP" });
        }
        task.otpVerified = true;
      } else if (!task.otpVerified) {
        // Allow without OTP only for admin or the task's own agent (OTP may have
        // expired during the 30-minute timeout window while the agent was in transit)
        const isTaskOwner = req.user?.id && String(req.user.id) === String(task.agentId);
        if (!isAdmin && !isTaskOwner) {
          return res.status(400).json({ message: "OTP required for this status update" });
        }
      }
    }

    const hasCodEvidence = !!req.body.codVerified;
    if (["Cod Payment Collected", "Delivered"].includes(status) && hasCodEvidence) {
      task.codVerified = true;
      task.codPaymentMethod = req.body.codPaymentMethod || task.codPaymentMethod || "cash";
      task.codPaymentId = req.body.codPaymentId || task.codPaymentId || "";
      task.codPaymentProofDoc = req.body.codPaymentProofDoc || task.codPaymentProofDoc || "";
      task.codAmountReceived = req.body.codAmountReceived !== undefined
        ? Number(req.body.codAmountReceived)
        : Number(task.codAmountReceived || 0);
      task.codCollectedAt = task.codCollectedAt || new Date();
      task.codAgentConfirmation = true;

      await Order.findByIdAndUpdate(task.orderId, {
        codStatus: "verified",
        codAmountCollected: task.codAmountReceived,
        codPaymentMethod: task.codPaymentMethod,
        codPaymentId: task.codPaymentId,
        codCollectedAt: task.codCollectedAt,
        codCollectedByAgent: task.agentId,
        codVerifiedAt: new Date(),
      });
    }

    // ── Mandatory COD gate before Delivered ─────────────────────────────────
    if (status === "Delivered") {
      if (!task.codVerified) {
        return res.status(400).json({
          message: "COD payment collection is mandatory before completing delivery. Record COD evidence first.",
        });
      }
    }

    if (status === "Cod Payment Collected") {
      if (!req.body.codVerified) {
        return res.status(400).json({ message: "COD verification not complete" });
      }
    }

    // Verify condition check for pickup return
    if (status === "Returned to Lender") {
      // Require condition verification from agent
      if (req.body.pickupConditionVerified === undefined || req.body.pickupIsWorking === undefined) {
        return res.status(400).json({ message: "Condition verification required: Is the product working? Any notes?" });
      }
      // Save condition details
      task.pickupConditionVerified = req.body.pickupConditionVerified;
      task.pickupIsWorking = req.body.pickupIsWorking;
      task.pickupConditionNotes = req.body.pickupConditionNotes || "";
    }

    const isAdminOrAgent = isAdmin || req.user?.id === task.agentId?.toString();
    const role = isAdmin ? "admin" : isAdminOrAgent ? "agent" : "system";

    task.status = status;
    if (notes) task.trackingLogs.push({ status, notes, location, actorRole: role, actorId: req.user?.id, timestamp: new Date() });
    if (status === "Completed" || status === "Delivered") {
      task.completedAt = new Date();
    }

    await task.save();

    // Start OTP expiry timer when agent goes "In Transit"
    if (status === "In Transit" || status === "Return In Transit") {
      setTimeout(async () => {
        try {
          const currentTask = await DeliveryTask.findById(task._id);
          if (currentTask && !currentTask.otpVerified) {
            currentTask.otp = "";
            await currentTask.save();
          }
        } catch {}
      }, 30 * 60 * 1000);
    }

    // ===== Handle earnings and order status updates =====

    if (status === "Delivered") {
      // Create delivery earning
      await DeliveryEarning.create({
        agentId: task.agentId,
        taskId: task._id,
        amount: DELIVERY_FEE,
        earningType: "delivery",
        status: "pending",
      });

      // Update agent's completed deliveries and earnings
      await User.findByIdAndUpdate(task.agentId, {
        $inc: { completed_deliveries: 1, earnings_balance: DELIVERY_FEE },
      });

      // Update order status to Delivered
      const order = await Order.findById(task.orderId);
      if (order && order.status !== "Delivered") {
        order.status = "Delivered";
        order.deliveredAt = new Date();
        await order.save();
      }

      // Create commission record for each item in the order
      // Commission is 10% of the order grandTotal split evenly across all items
      try {
        const orderItems = order?.items || [];
        const itemCount = orderItems.length;
        const perItemShare = itemCount > 0
          ? Math.round(Number(order.grandTotal || 0) / itemCount)
          : 0;
        for (const item of orderItems) {
          const commissionAmount = Math.round(perItemShare * COMMISSION_RATE / 100);
          await Commission.create({
            orderId: order._id,
            productId: item.productId,
            lenderId: task.lenderId,
            agentId: task.agentId,
            renterId: task.renterId,
            orderItemId: item._id,
            amount: perItemShare,
            commissionRate: COMMISSION_RATE,
            commissionAmount,
            type: "delivery",
            status: "pending",
          });
        }
      } catch (commErr) {
        console.error("Commission creation error:", commErr);
      }

      // Notify all parties for delivery
      const populatedTask = await DeliveryTask.findById(task._id)
        .populate("agentId", "name")
        .populate("lenderId", "name")
        .populate("renterId", "name");
      if (populatedTask) {
        // Notify lender
        if (String(populatedTask.lenderId?._id) !== populatedTask.agentId?._id?.toString()) {
          await notifyLenderDeliveryUpdate(populatedTask.lenderId, task.orderId, task._id, "Delivered", populatedTask.agentId?.name || "Agent");
        }
        // Notify renter
        if (String(populatedTask.renterId?._id) !== populatedTask.agentId?._id?.toString()) {
          await notifyRenterDeliveryUpdate(populatedTask.renterId, task.orderId, task._id, "Delivered", populatedTask.agentId?.name || "Agent");
        }
        // Notify agent about payment
        await notifyPaymentCollected(populatedTask.agentId, task.orderId, task._id, DELIVERY_FEE);
      }
    }

    if (status === "Returned to Lender") {
      // Create pickup earning
      await DeliveryEarning.create({
        agentId: task.agentId,
        taskId: task._id,
        amount: PICKUP_FEE,
        earningType: "pickup",
        status: "pending",
      });

      // Update agent earnings
      await User.findByIdAndUpdate(task.agentId, {
        $inc: { completed_deliveries: 1, earnings_balance: PICKUP_FEE },
      });

      // Update order status
      const order = await Order.findById(task.orderId);
      if (order) {
        order.status = "Delivered";
        await order.save();
      }

      // Create commission record for pickup return
      // Commission is 10% of the order grandTotal split evenly across all items
      try {
        const orderItems = order?.items || [];
        const itemCount = orderItems.length;
        const perItemShare = itemCount > 0
          ? Math.round(Number(order.grandTotal || 0) / itemCount)
          : 0;
        for (const item of orderItems) {
          const commissionAmount = Math.round(perItemShare * COMMISSION_RATE / 100);
          await Commission.create({
            orderId: order._id,
            productId: item.productId,
            lenderId: task.lenderId,
            agentId: task.agentId,
            renterId: task.renterId,
            orderItemId: item._id,
            amount: perItemShare,
            commissionRate: COMMISSION_RATE,
            commissionAmount,
            type: "pickup",
            status: "pending",
          });
        }
      } catch (commErr) {
        console.error("Commission creation error:", commErr);
      }

      // Notify parties for pickup return
      const populatedTask = await DeliveryTask.findById(task._id)
        .populate("agentId", "name")
        .populate("lenderId", "name")
        .populate("renterId", "name");
      if (populatedTask) {
        if (String(populatedTask.lenderId?._id) !== populatedTask.agentId?._id?.toString()) {
          await notifyLenderDeliveryUpdate(populatedTask.lenderId, task.orderId, task._id, "Returned to Lender", populatedTask.agentId?.name || "Agent");
        }
        if (String(populatedTask.renterId?._id) !== populatedTask.agentId?._id?.toString()) {
          await notifyRenterDeliveryUpdate(populatedTask.renterId, task.orderId, task._id, "Returned to Lender", populatedTask.agentId?.name || "Agent");
        }
        await notifyPaymentCollected(populatedTask.agentId, task.orderId, task._id, PICKUP_FEE);
      }
    }

    // Notify for other status transitions
    if (["Accepted", "Picking Up Product", "In Transit", "Pickup Scheduled", "Return In Transit"].includes(status)) {
      const populatedTask = await DeliveryTask.findById(task._id)
        .populate("agentId", "name")
        .populate("lenderId", "name")
        .populate("renterId", "name");
      if (populatedTask) {
        const agentName = populatedTask.agentId?.name || "Agent";
        // Notify lender
        if (String(populatedTask.lenderId?._id) !== populatedTask.agentId?._id?.toString()) {
          await notifyLenderDeliveryUpdate(populatedTask.lenderId, task.orderId, task._id, status, agentName);
        }
        // Notify renter
        if (String(populatedTask.renterId?._id) !== populatedTask.agentId?._id?.toString()) {
          await notifyRenterDeliveryUpdate(populatedTask.renterId, task.orderId, task._id, status, agentName);
        }
      }
    }

    // Auto-create pickup task when delivery is completed
    if (status === "Delivered") {
      try {
        const pickupTask = await DeliveryTask.findOne({
          orderId: task.orderId,
          taskType: "pickup",
          status: "Pickup Scheduled",
        });
        // Only auto-create if pickup doesn't already exist
        if (!pickupTask) {
          const orderData = await Order.findById(task.orderId);
          if (orderData && orderData.items) {
            for (const item of orderData.items) {
              const newPickup = new DeliveryTask({
                orderId: task.orderId,
                productId: item.productId,
                lenderId: task.lenderId,
                renterId: task.renterId,
                taskType: "pickup",
                status: "Pickup Scheduled",
                paymentAmount: 75,
                pickupAddress: task.dropAddress,
                dropAddress: task.pickupAddress,
                otp: generateOTP(),
                trackingLogs: [
                  { status: "Pickup Scheduled", notes: "Return pickup auto-scheduled after delivery" },
                ],
                assignedAt: null,
              });
              await newPickup.save();
            }
          }
        }
      } catch (autoErr) {
        console.error("Auto-create pickup task error:", autoErr);
      }
    }

    res.json({
      message: `Task status updated to ${status}`,
      task,
    });
  } catch (err) {
    console.error("Update task status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// CALCULATE EXTENSION CHARGES
// ==============================
const calculateExtensionCharges = async (req, res) => {
  try {
    const { orderId, itemId, selectedPlan } = req.body;

    if (!orderId || !itemId || !selectedPlan) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in order" });
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const pricingKey = selectedPlan;
    const price = product.pricing?.[pricingKey];
    if (price === undefined) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    res.json({
      itemId,
      selectedPlan,
      price,
      totalExtensionCost: price * (item.quantity || 1),
      insurance: Math.round(price * (item.quantity || 1) * 0.1),
    });
  } catch (err) {
    console.error("Calculate extension error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// EXECUTE RENTAL EXTENSION
// ==============================
const executeRentalExtension = async (req, res) => {
  try {
    const { orderId, itemId, selectedPlan } = req.body;
    const userId = req.user?.id;

    if (!orderId || !itemId || !selectedPlan) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (String(order.userId) !== String(userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in order" });
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const pricingKey = selectedPlan;
    const matchedPrice = product.pricing?.[pricingKey];
    if (matchedPrice === undefined || Number(matchedPrice) !== Number(selectedPlan.price)) {
      return res.status(400).json({ message: "Plan mismatch for product" });
    }

    const duration = matchedPrice ? 1 : 0;
    const prevReturnDate = item.returnDate;
    const newReturnDate = addDaysYmd(prevReturnDate, matchedPrice);
    if (!newReturnDate) {
      return res.status(400).json({ message: "Unable to compute returnDate" });
    }

    // Check for conflicting bookings during extension period
    const extensionConflict = await Order.findOne({
      _id: { $ne: order._id },
      status: "Ongoing",
      deliveryDate: { $lt: newReturnDate },
      items: {
        $elemMatch: {
          productId: product._id,
          returnDate: { $gt: prevReturnDate },
        },
      },
    }).select("_id deliveryDate returnDate");

    if (extensionConflict) {
      return res.status(409).json({
        message: "Cannot extend: conflicts with another booking for this product.",
        conflict: {
          orderId: extensionConflict._id,
          deliveryDate: extensionConflict.deliveryDate,
          returnDate: extensionConflict.returnDate,
        },
      });
    }

    item.returnDate = newReturnDate;
    item.extensions.push({
      durationLabel: selectedPlan.duration || "custom",
      unitPrice: Number(selectedPlan.price),
      durationUnit: "day",
      durationValue: 1,
      extendedAt: new Date(),
    });

    const prevRentTotal = Number(order.rentTotal || 0);
    const extraRent = Number(selectedPlan.price) * Number(item.quantity || 1);
    const nextRentTotal = prevRentTotal + extraRent;

    const hadInsurance = Number(order.insurance || 0) > 0;
    const nextInsurance = hadInsurance ? Math.round(nextRentTotal * 0.1) : 0;

    order.rentTotal = nextRentTotal;
    order.insurance = nextInsurance;

    const transport = Number(order.transport || 0);
    const platformCharge = Number(order.platformCharge || 0);
    const depositTotal = Number(order.depositTotal || 0);

    order.grandTotal = nextRentTotal + depositTotal + transport + platformCharge + nextInsurance;

    // Update order-level returnDate to max of items
    const maxReturn = (order.items || []).reduce((max, it) => (it.returnDate && it.returnDate > max ? it.returnDate : max), "");
    order.returnDate = maxReturn || order.returnDate;

    await order.save();
    await order.populate("items.productId");

    // Notify lender about extension
    if (order.items && order.items.length > 0) {
      const productIds = [...new Set(order.items.map((i) => i.productId))];
      const products = await Product.find({ _id: { $in: productIds } });
      const lenderIds = products.map((p) => p.userId).filter((id) => String(id) !== String(userId));
      for (const lenderId of lenderIds) {
        await notifyRentalExtended(lenderId, userId, order._id, matchedPrice, Number(selectedPlan.price));
      }
    }

    res.json(order);
  } catch (err) {
    console.error("Extend rental error:", err);
    res.status(500).json({ message: "Extend failed" });
  }
};

// ==============================
// GET ALL DELIVERY AGENT APPLICATIONS (admin only)
// ==============================
const getDeliveryAgentApplications = async (req, res) => {
  try {
    const users = await User.find({ isDeliveryAgent: true });
    res.json(users);
  } catch (err) {
    console.error("Get applications error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// APPROVE DELIVERY AGENT (admin only)
// ==============================
const approveDeliveryAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    if (!agentId) {
      return res.status(400).json({ message: "Missing agentId" });
    }

    const user = await User.findById(agentId);
    if (!user || !user.isDeliveryAgent) {
      return res.status(404).json({ message: "Agent application not found" });
    }

    user.verification_status = "approved";
    user.approvedAt = new Date();
    await user.save();

    await notifyAgentApplication(agentId, true);

    res.json({ message: "Agent approved successfully", user });
  } catch (err) {
    console.error("Approve agent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// REJECT DELIVERY AGENT (admin only)
// ==============================
const rejectDeliveryAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { reason } = req.body;

    if (!agentId) {
      return res.status(400).json({ message: "Missing agentId" });
    }

    const user = await User.findById(agentId);
    if (!user || !user.isDeliveryAgent) {
      return res.status(404).json({ message: "Agent application not found" });
    }

    user.verification_status = "rejected";
    user.rejectedAt = new Date();
    user.rejectionReason = reason || "Not specified";
    await user.save();

    await notifyAgentApplication(agentId, false, reason);

    res.json({ message: "Agent rejected", user });
  } catch (err) {
    console.error("Reject agent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// GET EXTENSION CHARGES
// ==============================
const getExtensionCharges = async (req, res) => {
  try {
    const { orderId, itemId, selectedPlan } = req.body;

    if (!orderId || !itemId || !selectedPlan) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in order" });
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const pricingKey = selectedPlan;
    const price = product.pricing?.[pricingKey];
    if (price === undefined) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    res.json({
      orderId,
      itemId,
      selectedPlan,
      price,
      total: price * (item.quantity || 1),
      insurance: Math.round(price * (item.quantity || 1) * 0.1),
      message: "Extension charges calculated successfully",
    });
  } catch (err) {
    console.error("Get extension charges error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ════════════════════════════════════════════════════════════════
// Daily expiry job: promote pickup tasks whose returnDate has
// been reached (Pickup Scheduled   →   Waiting for Agent)
// ════════════════════════════════════════════════════════════════
const getTodayIstYmd = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset + 330 * 60000).toISOString().slice(0, 10);
};

const copyAddress = (address = {}) => ({
  street: address.street || "",
  city: address.city || "",
  state: address.state || "",
  pincode: address.pincode || "",
  phone: address.phone || "",
});

const notifyReturnPickupReady = async (task, status = "Pickup Scheduled") => {
  const notifications = [
    notifyRenterDeliveryUpdate(task.renterId, task.orderId, task._id, status, "Agent"),
    notifyLenderDeliveryUpdate(task.lenderId, task.orderId, task._id, status, "Agent"),
  ];

  await Promise.all(
    notifications.map((notification) =>
      notification.catch((err) => console.error("Return pickup notification error:", err.message))
    )
  );
};

const generateTasksForExpiredDeliveries = async () => {
  const todayYmd = getTodayIstYmd();
  const result = {
    generated: 0,
    activated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const expiredOrders = await Order.find({
      status: "Delivered",
      returnDate: { $lte: todayYmd },
      items: {
        $elemMatch: {
          returnDate: { $lte: todayYmd },
        },
      },
    }).select("userId returnDate deliveryAddress items");

    for (const order of expiredOrders) {
      for (const item of order.items || []) {
        const itemReturnDate = item.returnDate || order.returnDate;
        if (!item.productId || !itemReturnDate || itemReturnDate > todayYmd) {
          continue;
        }

        try {
          const existingReturnTask = await DeliveryTask.findOne({
            orderId: order._id,
            productId: item.productId,
            taskType: { $in: ["pickup", "return_pickup"] },
          }).sort({ createdAt: -1 });

          if (existingReturnTask) {
            if (existingReturnTask.status === "Pickup Scheduled") {
              existingReturnTask.status = "Waiting for Agent";
              existingReturnTask.agentId = null;
              existingReturnTask.trackingLogs.push({
                status: "Waiting for Agent",
                notes: "Return date expired; pickup opened for agents",
                timestamp: new Date(),
                actorRole: "system",
              });
              await existingReturnTask.save();
              result.activated += 1;
              await notifyReturnPickupReady(existingReturnTask);
            } else {
              result.skipped += 1;
            }
            continue;
          }

          const deliveryTask = await DeliveryTask.findOne({
            orderId: order._id,
            productId: item.productId,
            taskType: "delivery",
          }).sort({ createdAt: -1 });

          if (deliveryTask && !["Delivered", "Completed"].includes(deliveryTask.status)) {
            result.skipped += 1;
            continue;
          }

          const product = await Product.findById(item.productId).select("userId");
          const lenderId = deliveryTask?.lenderId || product?.userId;

          if (!lenderId || !mongoose.Types.ObjectId.isValid(String(lenderId))) {
            result.skipped += 1;
            result.errors.push({
              orderId: String(order._id),
              productId: String(item.productId),
              error: "Missing or invalid lenderId",
            });
            continue;
          }

          if (!mongoose.Types.ObjectId.isValid(String(order.userId))) {
            result.skipped += 1;
            result.errors.push({
              orderId: String(order._id),
              productId: String(item.productId),
              error: "Missing or invalid renterId",
            });
            continue;
          }

          const pickupTask = await DeliveryTask.create({
            orderId: order._id,
            productId: item.productId,
            lenderId,
            renterId: order.userId,
            agentId: null,
            taskType: "pickup",
            status: "Waiting for Agent",
            paymentAmount: PICKUP_FEE,
            pickupAddress: copyAddress(deliveryTask?.dropAddress || order.deliveryAddress),
            dropAddress: copyAddress(deliveryTask?.pickupAddress || order.deliveryAddress),
            otp: "",
            trackingLogs: [
              {
                status: "Waiting for Agent",
                notes: `Return pickup generated after rental expired on ${itemReturnDate}`,
                timestamp: new Date(),
                actorRole: "system",
              },
            ],
          });

          result.generated += 1;
          await notifyReturnPickupReady(pickupTask);
        } catch (err) {
          result.skipped += 1;
          result.errors.push({
            orderId: String(order._id),
            productId: String(item.productId),
            error: err.message,
          });
        }
      }
    }

    return result;
  } catch (err) {
    console.error("generateTasksForExpiredDeliveries error:", err);
    return { ...result, error: err.message };
  }
};

const expirePickupsOnReturnDate = async () => {
  try {
    const todayYmd = getTodayIstYmd();

    // Find every Pickup Scheduled task whose order's returnDate is ≤ today
    const expiredTasks = await DeliveryTask.find({
      status: "Pickup Scheduled",
    })
      .populate("orderId", "returnDate status");

    const toActivate = expiredTasks.filter(
      (t) => t.orderId && t.orderId.returnDate && t.orderId.returnDate <= todayYmd
    );

    if (toActivate.length === 0) return { activated: 0 };

    // Batch update all matching tasks atomically
    const taskIds = toActivate.map((t) => t._id);

    const updateResult = await DeliveryTask.updateMany(
      { _id: { $in: taskIds }, status: "Pickup Scheduled" },
      {
        $set: {
          status: "Waiting for Agent",
        },
        $push: {
          trackingLogs: {
            status: "Waiting for Agent",
            notes: "Return period ended — task opened for agent pickup",
            timestamp: new Date(),
          },
        },
      }
    );

    if (updateResult.modifiedCount === 0) return { activated: 0 };

    // Fire notification for each renter (their product is due for pickup)
    const notifyPromises = toActivate.map((t) =>
      notifyRenterDeliveryUpdate(
        t.renterId,
        t.orderId,
        t._id,
        "Pickup Return Due",
        "Agent"
      ).catch((e) => console.error("Notify renter:", e.message))
    );

    // Fire notification for each lender (their product should be returned)
    const lenderPromises = toActivate.map((t) =>
      notifyLenderDeliveryUpdate(
        t.lenderId,
        t.orderId,
        t._id,
        "Pickup Return Due",
        "Agent"
      ).catch((e) => console.error("Notify lender:", e.message))
    );

    await Promise.all([...notifyPromises, ...lenderPromises]);

    return { activated: updateResult.modifiedCount };
  } catch (err) {
    console.error("expirePickupsOnReturnDate error:", err);
    return { activated: 0, error: err.message };
  }
};

// ════════════════════════════════════════════════════════════════
// Mark a delivery commission as paid (called when lender settles
// their platform commission obligation)
// ════════════════════════════════════════════════════════════════
const markCommissionPaid = async (req, res) => {
  try {
    const commissionId = req.params.id;
    const paymentReference = (req.body.paymentReference || "").trim();

    if (!mongoose.Types.ObjectId.isValid(commissionId)) {
      return res.status(400).json({ message: "Invalid commission ID" });
    }

    const commission = await Commission.findById(commissionId);
    if (!commission) {
      return res.status(404).json({ message: "Commission not found" });
    }

    if (commission.status === "paid") {
      return res.status(400).json({ message: "Commission is already marked as paid" });
    }

    // Only the lender who owes the commission, or an admin, may mark it paid
    const isAdmin = req.user && req.user.id && (await User.findById(req.user.id))?.isAdmin;
    if (!isAdmin && String(req.user?.id) !== String(commission.lenderId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    commission.status = "paid";
    commission.paymentReference = paymentReference;
    commission.paidAt = new Date();
    await commission.save();

    res.json({ message: "Commission marked as paid", commission });
  } catch (err) {
    console.error("Mark commission paid error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ════════════════════════════════════════════════════════════════
// Step 3 — Collect COD: agent confirms payment was received
// Called from the client-side YES/NO modal when status == "In Transit"
// ════════════════════════════════════════════════════════════════
const collectCOD = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { codVerified, codPaymentMethod, codPaymentId, codAmountReceived, codPaymentProofDoc } = req.body;
    const agentId = req.user?.id;

    if (!taskId) return res.status(400).json({ message: "Missing taskId" });
    if (!codVerified) return res.status(400).json({ message: "COD verification flag is required" });

    const task = await DeliveryTask.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (String(task.agentId) !== String(agentId)) {
      return res.status(403).json({ message: "Not your task" });
    }

    // Collect but do NOT yet allow "Delivered" — status stays "In Transit"
    // The agent will next press "Delivered" and now codVerified is true so it passes

    task.codVerified          = true;
    task.codPaymentMethod     = codPaymentMethod || "";
    task.codPaymentId         = codPaymentId || "";
    task.codAmountReceived    = codAmountReceived ? Number(codAmountReceived) : 0;
    task.codPaymentProofDoc   = codPaymentProofDoc || "";
    task.codCollectedAt       = new Date();
    task.codAgentConfirmation = true;
    await task.save();

    // Update the order's COD record
    const order = await Order.findById(task.orderId);
    if (order) {
      order.codStatus             = "verified";
      order.codAmountCollected    = task.codAmountReceived;
      order.codPaymentMethod      = task.codPaymentMethod;
      order.codPaymentId          = task.codPaymentId;
      order.codCollectedAt        = task.codCollectedAt;
      order.codCollectedByAgent   = task.agentId;
      order.codVerifiedAt         = new Date();
      await order.save();
    }

    // Credit agent wallet: add amount as cod_collected (pending until office submission)
    try {
      let wallet = await AgentWallet.findOne({ agentId });
      if (!wallet) wallet = await AgentWallet.create({ agentId });

      const prevPending = wallet.pendingBalance || 0;
      wallet.pendingBalance = prevPending + task.codAmountReceived;
      wallet.totalCollected += task.codAmountReceived;
      // Also record it on the task so submitAgentCash knows expected total
      if (!task.agentCashTotal || task.agentCashTotal === 0) {
        task.agentCashTotal = task.codAmountReceived;
        await task.save();
      }
      await wallet.save();

      await AgentWallet.AgentWalletTransaction.create({
        agentId,
        orderId: task.orderId,
        taskId: task._id,
        type: "cod_collected",
        amount: task.codAmountReceived,
        paymentMethod: codPaymentMethod || "cash",
        paymentRef: codPaymentId || "",
        balanceAfter: wallet.pendingBalance,
        status: "pending",
        narration: `COD collected (${codPaymentMethod || "cash"}, ₹${task.codAmountReceived}) — pending office submission`,
      });
    } catch (walletErr) {
      console.error("Agent wallet credit error (collectCOD):", walletErr);
    }

    // Audit log
    try {
      await AuditLog.create({
        actorId: agentId,
        actorRole: "agent",
        category: "payment",
        action: "cod_collected",
        entityType: "DeliveryTask",
        entityId: task._id,
        changes: { codAmountReceived: task.codAmountReceived, codPaymentMethod: task.codPaymentMethod, codPaymentId: task.codPaymentId },
        metadata: { orderId: task.orderId },
      });
    } catch (e) { /* non-fatal */ }

    // Notify renter payment collected
    try {
      await notifyPaymentCollected(agentId, task.orderId, task._id, task.codAmountReceived);
    } catch (e) {}

    res.json({
      message: "COD payment recorded. You may now complete delivery.",
      task: {
        _id: task._id,
        codVerified: task.codVerified,
        codAmountReceived: task.codAmountReceived,
        codPaymentMethod: task.codPaymentMethod,
      },
    });
  } catch (err) {
    console.error("Collect COD error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getUserDeliveryTasks,
  getDeliveryStatusForOrder,
  getDeliveryTaskById,
  getAvailableDeliveryTasks,
  applyAsDeliveryAgent,
  getAgentProfile,
  updateAgentProfile,
  getAgentStatus,
  acceptDeliveryTask,
  rejectDeliveryTask,
  getAgentDeliveryTasks,
  getAgentEarnings,
  markCashCollected,
  updateDeliveryTaskStatus,
  getDeliveryAgentApplications,
  approveDeliveryAgent,
  rejectDeliveryAgent,
  getTodayIstYmd,
  expirePickupsOnReturnDate,
  generateTasksForExpiredDeliveries,
  markCommissionPaid,
  collectCOD,
};
