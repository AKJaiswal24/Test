const express = require("express");
const router = express.Router();
const {
  applyAsDeliveryAgent,
  getAgentProfile,
  updateAgentProfile,
  getAgentStatus,
  getAvailableDeliveryTasks,
  acceptDeliveryTask,
  rejectDeliveryTask,
  getAgentDeliveryTasks,
  getAgentEarnings,
  getDeliveryTaskById,
  updateDeliveryTaskStatus,
  markCashCollected,
  getUserDeliveryTasks,
  approveDeliveryAgent,
  rejectDeliveryAgent,
  getDeliveryAgentApplications,
  getDeliveryStatusForOrder,
  collectCOD,
} = require("../controllers/deliveryController");
const requireAuth = require("../middleware/requireAuth");
const { authorize } = require("../middleware/authorize");

// ==============================
// AGENT ROUTES (delivery agents)
// ==============================

// Apply to become a delivery agent
router.post("/apply", requireAuth, authorize("user"), applyAsDeliveryAgent);

// Get current user's agent status (for polling)
router.get("/my-status", requireAuth, getAgentStatus);

// Get own agent profile
router.get("/profile", requireAuth, authorize("deliveryAgent"), getAgentProfile);

// Update agent profile (vehicle, availability, etc.)
router.put("/profile", requireAuth, authorize("deliveryAgent"), updateAgentProfile);

// View available delivery tasks (only approved agents)
router.get("/available-tasks", requireAuth, authorize("deliveryAgent"), getAvailableDeliveryTasks);

// Accept a delivery task
router.post("/accept-task/:taskId", requireAuth, authorize("deliveryAgent"), acceptDeliveryTask);

// Reject a delivery task
router.post("/reject-task/:taskId", requireAuth, authorize("deliveryAgent"), rejectDeliveryTask);

// View my assigned delivery tasks
router.get("/my-tasks", requireAuth, authorize("deliveryAgent"), getAgentDeliveryTasks);

// View my earnings
router.get("/earnings", requireAuth, authorize("deliveryAgent"), getAgentEarnings);

// ==============================
// ADMIN ROUTES (agent management)
// ==============================

// Get all agent applications
router.get("/applications", requireAuth, authorize("admin"), getDeliveryAgentApplications);

// Get agent status by user ID (for user polling)
router.get("/status/:userId", requireAuth, getAgentStatus);

// Approve a delivery agent
router.put("/approve/:agentId", requireAuth, authorize("admin"), approveDeliveryAgent);

// Reject a delivery agent
router.put("/reject/:agentId", requireAuth, authorize("admin"), rejectDeliveryAgent);

// ==============================
// GENERAL ROUTES (tracking, status)
// ==============================

// Get delivery task details by ID (any authenticated user)
router.get("/task/:taskId", requireAuth, getDeliveryTaskById);

// Update delivery task status (agent or admin)
router.put("/task/:taskId/status", requireAuth, updateDeliveryTaskStatus);

// Mark cash as collected on delivery
router.post("/task/:taskId/cash-collected", requireAuth, markCashCollected);

// Collect COD (cash on delivery) for delivery tasks
router.post("/task/:taskId/collect-cod", requireAuth, collectCOD);

// Get delivery status for a specific order (renters/lenders)
router.get("/order/:orderId", requireAuth, getDeliveryStatusForOrder);

module.exports = router;