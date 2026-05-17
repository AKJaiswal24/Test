const Notification = require("../models/Notification");

/**
 * Create one or more notifications
 * @param {Array|Object} notifications - single notification object or array
 */
const createNotification = async (notifications) => {
  const items = Array.isArray(notifications) ? notifications : [notifications];
  try {
    if (items.length === 1) {
      return await Notification.create(items[0]);
    }
    return await Notification.insertMany(items);
  } catch (err) {
    console.error("Notification creation error:", err);
    return null;
  }
};

/**
 * Create a delivery assigned notification
 */
const notifyDeliveryAssigned = async (agentId, orderId, taskId) => {
  return createNotification({
    userId: agentId,
    title: "📦 New Delivery Task Assigned",
    message: `A new delivery task has been assigned to you. Check the task details in your dashboard.`,
    type: "delivery_assigned",
    relatedOrderId: orderId,
    relatedTaskId: taskId,
  });
};

/**
 * Create a delivery accepted notification (for lender)
 */
const notifyDeliveryAccepted = async (lenderId, orderId, taskId, agentName) => {
  return createNotification({
    userId: lenderId,
    title: "✅ Delivery Accepted",
    message: `${agentName} has accepted your delivery task. Your product will be picked up shortly.`,
    type: "delivery_accepted",
    relatedOrderId: orderId,
    relatedTaskId: taskId,
  });
};

/**
 * Create a delivery status update notification (for renter)
 */
const notifyRenterDeliveryUpdate = async (renterId, orderId, taskId, status, agentName) => {
  const statusMessages = {
    "Picking Up Product": `${agentName} is picking up your product.`,
    "In Transit": `${agentName} is delivering your product.`,
    "Delivered": `${agentName} has delivered your product.`,
    "Pickup Scheduled": "Return pickup has been scheduled.",
    "Return In Transit": `${agentName} is returning your product to the lender.`,
    "Returned to Lender": "Your product has been returned to the lender.",
    "Completed": "The delivery task has been completed.",
  };

  return createNotification({
    userId: renterId,
    title: `📦 Delivery Update: ${status}`,
    message: statusMessages[status] || `Your delivery status has been updated to: ${status}`,
    type: `delivery_${status.toLowerCase().replace(/\s+/g, "_")}`,
    relatedOrderId: orderId,
    relatedTaskId: taskId,
  });
};

/**
 * Create a delivery status update notification (for lender)
 */
const notifyLenderDeliveryUpdate = async (lenderId, orderId, taskId, status, agentName) => {
  const statusMessages = {
    "Accepted": `${agentName} has accepted the delivery task.`,
    "Picking Up Product": `${agentName} is picking up the product from you.`,
    "In Transit": `${agentName} is delivering the product to the renter.`,
    "Delivered": `${agentName} has delivered the product. Payment will be processed.`,
    "Return In Transit": `${agentName} is returning the product to you.`,
    "Returned to Lender": "The product has been returned to you.",
    "Completed": "The delivery task is complete.",
  };

  return createNotification({
    userId: lenderId,
    title: `📦 Delivery Update: ${status}`,
    message: statusMessages[status] || `Delivery status updated: ${status}`,
    type: `delivery_${status.toLowerCase().replace(/\s+/g, "_")}`,
    relatedOrderId: orderId,
    relatedTaskId: taskId,
  });
};

/**
 * Create payment collected notification
 */
const notifyPaymentCollected = async (lenderId, orderId, taskId, amount) => {
  return createNotification({
    userId: lenderId,
    title: "💰 Payment Collected",
    message: `Rental payment of ₹${amount} has been collected for order #${String(orderId).substring(0, 8)}.`,
    type: "payment_collected",
    relatedOrderId: orderId,
    relatedTaskId: taskId,
  });
};

/**
 * Create rental extended notification
 */
const notifyRentalExtended = async (lenderId, renterId, orderId, additionalDays, additionalCharge) => {
  const notifications = [
    {
      userId: renterId,
      title: "⏰ Rental Extended",
      message: `Your rental has been extended by ${additionalDays} days. Additional charge: ₹${additionalCharge}.`,
      type: "rental_extended",
      relatedOrderId: orderId,
    },
    {
      userId: lenderId,
      title: "📈 Rental Extended",
      message: `A renter has extended their rental by ${additionalDays} days. Additional earnings: ₹${additionalCharge}.`,
      type: "rental_extended",
      relatedOrderId: orderId,
    },
  ];
  return createNotification(notifications);
};

/**
 * Create agent approved/rejected notification
 */
const notifyAgentApplication = async (userId, approved, reason) => {
  return createNotification({
    userId,
    title: approved ? "✅ Application Approved" : "❌ Application Rejected",
    message: approved
      ? "Congratulations! Your delivery agent application has been approved."
      : `Your delivery agent application has been rejected. Reason: ${reason || "Not specified"}`,
    type: approved ? "agent_approved" : "agent_rejected",
  });
};

/**
 * Get notifications for a user
 */
const getUserNotifications = async (userId, limit = 50) => {
  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Mark notifications as read
 */
const markNotificationsRead = async (userId, notificationIds) => {
  if (notificationIds && notificationIds.length > 0) {
    return Notification.updateMany(
      { _id: { $in: notificationIds }, userId },
      { $set: { read: true } }
    );
  }
  return Notification.updateMany(
    { userId, read: false },
    { $set: { read: true } }
  );
};

module.exports = {
  createNotification,
  notifyDeliveryAssigned,
  notifyDeliveryAccepted,
  notifyRenterDeliveryUpdate,
  notifyLenderDeliveryUpdate,
  notifyPaymentCollected,
  notifyRentalExtended,
  notifyAgentApplication,
  getUserNotifications,
  markNotificationsRead,
};