"use strict";

/**
 * pay.js — Payment and Points system for delivery agents.
 *
 * Points model:
 *   - Each completed delivery awards the agent 75 points.
 *   - Points are stored on the AgentWallet document as `pointsBalance`.
 *   - Agents may claim ANY amount up to their current `pointsBalance`.
 *   - A claim requires two-party approval:
 *       1. Agent submits the claim (status -> "awaiting_agent_confirm").
 *       2. Agent confirms their intent (status -> "pending_admin").
 *       3. Admin approves and marks paid (status -> "resolved").
 *   - On resolution, points are deducted from the agent's balance and an
 *     AdminWallet / AgentWallet transaction record is created.
 *
 * This module is designed to be imported by wallet routes / controllers.
 * It expects:
 *   - mongoose models: AgentWallet, DeliveryTask, Settlement, Transaction,
 *                      AgentWallet.AgentWalletTransaction (same doc as in walletController)
 *   - The delivery controller to call `addPointsForDelivery(taskId)` when a
 *     delivery is marked complete.
 *
 * Usage (inside an async route handler or service):
 *   const {
 *     addPointsForDelivery,
 *     getAgentPointsBalance,
 *     submitClaim,
 *     confirmClaimByAgent,
 *     approveClaimByAdmin,
 *     getAgentClaims,
 *   } = require("./pay");
 */

const mongoose = require("mongoose");
const AgentWallet = require("./models/AgentWallet");

// ---------------------------------------------------------------------------
// Helpers (reuse existing wallet helpers if available, else inline)
// ---------------------------------------------------------------------------

const getOrCreateWallet = async (agentId) => {
  const AgentWallet = require("./models/AgentWallet");
  let wallet = await AgentWallet.findOne({ agentId });
  if (!wallet) {
    wallet = await AgentWallet.create({ agentId });
  }
  return wallet;
};

// ---------------------------------------------------------------------------
// 1. Point Accumulation
// ---------------------------------------------------------------------------

/**
 * Awards 75 points to the agent who completed the given delivery task.
 * Idempotent: checks `pointsAwarded` flag on the task to avoid double awards.
 *
 * @param {String|ObjectId} taskId
 * @returns {Object} { pointsAwarded, newBalance }
 */
async function addPointsForDelivery(taskId) {
  const DeliveryTask = require("./models/DeliveryTask");
  const task = await DeliveryTask.findById(taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  // Prevent double-awarding on the same task
  if (task.pointsAwarded === true) {
    return { pointsAwarded: 0, newBalance: null };
  }

  const POINTS_PER_DELIVERY = 75;
  const agentId = task.agentId;
  if (!agentId) {
    throw new Error("Task has no assigned agent");
  }

  const wallet = await getOrCreateWallet(agentId);

  wallet.pointsBalance = (wallet.pointsBalance || 0) + POINTS_PER_DELIVERY;
  wallet.totalPointsEarned = (wallet.totalPointsEarned || 0) + POINTS_PER_DELIVERY;
  wallet.lastUpdated = new Date();
  await wallet.save();

  // Mark the task so we never award again
  task.pointsAwarded = true;
  task.pointsAwardedAt = new Date();
  await task.save();

  return {
    pointsAwarded: POINTS_PER_DELIVERY,
    newBalance: wallet.pointsBalance,
  };
}

/**
 * Returns the current points balance for an agent.
 * @param {String|ObjectId} agentId
 * @returns {Number}
 */
async function getAgentPointsBalance(agentId) {
  const wallet = await getOrCreateWallet(agentId);
  return wallet.pointsBalance || 0;
}

// ---------------------------------------------------------------------------
// 2. Claim Process (agent initiates)
// ---------------------------------------------------------------------------

/**
 * Agent submits a claim for a specific point amount.
 *
 * Flow:
 *   submitClaim -> status: "awaiting_agent_confirm"
 *   confirmClaimByAgent -> status: "pending_admin"
 *   approveClaimByAdmin -> status: "resolved"
 *
 * @param {String|ObjectId} agentId
 * @param {Number} requestedPoints  — must be >0 and <= current balance
 * @param {String} [note]
 * @returns {Object} claim document
 */
async function submitClaim(agentId, requestedPoints, note = "") {
  const wallet = await getOrCreateWallet(agentId);

  const balance = wallet.pointsBalance || 0;
  if (requestedPoints <= 0) {
    throw new Error("Requested points must be greater than zero");
  }
  if (requestedPoints > balance) {
    throw new Error(`Insufficient points. Available: ${balance}, requested: ${requestedPoints}`);
  }

  // Reserves the points so the agent cannot double-claim them
  wallet.pointsReserved = (wallet.pointsReserved || 0) + requestedPoints;
  wallet.pointsBalance = balance - requestedPoints;
  wallet.lastUpdated = new Date();
  await wallet.save();

  // Use raw collection to avoid needing a separate model file; we store claims
  // as a sub-document array on AgentWallet in this simple implementation.
  // If a dedicated model is preferred, replace with Claim.create(...).
  const claim = {
    agentId: wallet.agentId,
    requestedPoints,
    status: "awaiting_agent_confirm",
    note,
    submittedAt: new Date(),
    agentConfirmedAt: null,
    adminConfirmedAt: null,
    resolvedAt: null,
  };

  await AgentWallet.findByIdAndUpdate(wallet._id, {
    $push: { pointsClaims: claim },
  });

  // Return the freshly-saved claim
  const updated = await AgentWallet.findById(wallet._id);
  const claimDoc = updated.pointsClaims[updated.pointsClaims.length - 1];
  return claimDoc;
}

/**
 * Agent confirms the claim after submission.
 * Moves status: "awaiting_agent_confirm" -> "pending_admin".
 */
async function confirmClaimByAgent(agentId, claimId) {
  const AgentWallet = require("./models/AgentWallet");

  // 1) Try the new schema query first (claims have proper _id)
  let wallet = await AgentWallet.findOne({ agentId, "pointsClaims._id": claimId });
  let claim = wallet?.pointsClaims?.id(claimId);

  // 2) Fallback: match by agent + status + loose id comparison
  if (!claim) {
    const rawWallet = await AgentWallet.findOne({ agentId });
    const claims = (rawWallet?.pointsClaims || []).slice().sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    claim = claims.find(
      (c) =>
        c.status === "awaiting_agent_confirm" &&
        String(c._id || "").trim() !== ""
        ? String(c._id) === String(claimId)
        : true
    );
    if (claim) {
      wallet = rawWallet;
    }
  }

  // 3) Final fallback: if still not found, grab the latest awaiting_agent_confirm
  //    claim for this agent (only one should exist at a time).
  if (!claim) {
    const rawWallet = await AgentWallet.findOne({ agentId });
    const claims = (rawWallet?.pointsClaims || []).slice().sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    claim = claims.find((c) => c.status === "awaiting_agent_confirm");
    if (claim) {
      wallet = rawWallet;
    }
  }

  if (!claim) {
    throw new Error("Claim not found for this agent");
  }
  if (claim.status !== "awaiting_agent_confirm") {
    throw new Error(`Claim is in status "${claim.status}" and cannot be confirmed now`);
  }

  claim.status = "pending_admin";
  claim.agentConfirmedAt = new Date();
  await wallet.save();

  return claim;
}

/**
 * Admin approves and pays out a claim.
 * Deducts the reserved points and marks the claim resolved.
 */
async function approveClaimByAdmin(adminId, claimId) {
  const AgentWallet = require("./models/AgentWallet");
  const User = require("./models/User");

  // Ensure caller is admin
  const admin = await User.findById(adminId);
  if (!admin?.isAdmin) {
    throw new Error("Only admins can approve claims");
  }

  // 1) New schema: look up by _id across any agent wallet
  let wallet = await AgentWallet.findOne({ "pointsClaims._id": claimId });
  let claim = wallet?.pointsClaims?.id(claimId);

  // 2) Fallback: match by status + loose id comparison (handles legacy claims)
  if (!claim) {
    const allWallets = await AgentWallet.find({ "pointsClaims.status": "pending_admin" });
    for (const w of allWallets) {
      const c = (w.pointsClaims || []).find(
        (x) =>
          x.status === "pending_admin" &&
          String(x._id || "").trim() !== ""
          ? String(x._id) === String(claimId)
          : true
      );
      if (c) {
        wallet = w;
        claim = c;
        break;
      }
    }
  }

  // 3) Final fallback: latest pending_admin claim across all agents
  if (!claim) {
    const allWallets = await AgentWallet.find({ "pointsClaims.status": "pending_admin" });
    for (const w of allWallets) {
      const pending = (w.pointsClaims || [])
        .filter((x) => x.status === "pending_admin")
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      if (pending.length) {
        wallet = w;
        claim = pending[0];
        break;
      }
    }
  }

  if (!wallet || !claim) {
    throw new Error("Claim not found");
  }
  if (claim.status !== "pending_admin") {
    throw new Error(`Claim must be in "pending_admin" to approve. Current: "${claim.status}"`);
  }

  // Finalize
  claim.status = "resolved";
  claim.adminConfirmedAt = new Date();
  claim.resolvedAt = new Date();
  claim.approvedBy = adminId;

  // Deduct reserved points permanently
  wallet.pointsReserved = Math.max(0, (wallet.pointsReserved || 0) - claim.requestedPoints);
  wallet.totalPointsPaidOut = (wallet.totalPointsPaidOut || 0) + claim.requestedPoints;
  wallet.lastPayoutAt = new Date();
  wallet.lastPayoutAmount = claim.requestedPoints;
  wallet.lastUpdated = new Date();
  await wallet.save();

  // Record a transaction for audit
  await AgentWallet.AgentWalletTransaction.create({
    agentId: wallet.agentId,
    type: "payout",
    amount: claim.requestedPoints,
    paymentMethod: "points",
    balanceAfter: wallet.pointsBalance,
    status: "paid_out",
    narration: `Points payout — claim ${String(claimId)}`,
  });

  return claim;
}

// ---------------------------------------------------------------------------
// 3. Query helpers (admin / agent views)
// ---------------------------------------------------------------------------

/**
 * Returns all claims for a specific agent, newest first.
 */
async function getAgentClaims(agentId) {
  const AgentWallet = require("./models/AgentWallet");
  const wallet = await AgentWallet.findOne({ agentId });
  if (!wallet) return [];
  return (wallet.pointsClaims || [])
    .slice()
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

/**
 * Returns all claims across all agents (admin view).
 */
async function getAllClaims() {
  const AgentWallet = require("./models/AgentWallet");
  const wallets = await AgentWallet.find({}, { agentId: 1, pointsClaims: 1 })
    .populate("agentId", "name email phone verification_status");

  const all = [];
  for (const w of wallets) {
    for (const c of (w.pointsClaims || [])) {
      all.push({
        ...c.toObject ? c.toObject() : c,
        agentId: w.agentId,
        walletId: w._id,
      });
    }
  }
  return all.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

module.exports = {
  addPointsForDelivery,
  getAgentPointsBalance,
  submitClaim,
  confirmClaimByAgent,
  approveClaimByAdmin,
  getAgentClaims,
  getAllClaims,
};
