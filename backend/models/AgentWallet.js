const mongoose = require("mongoose");
const { Schema } = mongoose;

const transactionSchema = new Schema({
  agentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  taskId: { type: Schema.Types.ObjectId, ref: "DeliveryTask" },
  type: { type: String, enum: ["cash_submitted", "cod_collected", "payout", "adjustment"], required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: "cash" },
  paymentRef: { type: String, default: "" },
  balanceAfter: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "credited", "verified", "paid_out", "payout"], default: "pending" },
  narration: { type: String, default: "" },
  notes: { type: String, default: "" },
}, { timestamps: true });

const agentWalletSchema = new Schema({
  agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  totalCollected: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
  pendingSettlement: { type: Number, default: 0 },
  settledAmount: { type: Number, default: 0 },
  withdrawableBalance: { type: Number, default: 0 },
  pendingBalance: { type: Number, default: 0 },
  shortBalance: { type: Number, default: 0 },
  totalSubmitted: { type: Number, default: 0 },
  totalShortage: { type: Number, default: 0 },
  totalIncentives: { type: Number, default: 0 },
  lastPayoutAt: { type: Date },
  lastPayoutAmount: { type: Number, default: 0 },
  lastSubmittedAt: { type: Date },
  lastSubmittedAmount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  version: { type: Number, default: 0 },

  // ── Points system ──────────────────────────────────────────────────────
  pointsBalance:      { type: Number, default: 0 },
  pointsReserved:     { type: Number, default: 0 },
  totalPointsEarned:  { type: Number, default: 0 },
  totalPointsPaidOut: { type: Number, default: 0 },
  pointsClaims: [new Schema({
    agentId:          { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedPoints:  { type: Number, required: true },
    status:           { type: String, enum: ["awaiting_agent_confirm", "pending_admin", "resolved"], default: "awaiting_agent_confirm" },
    note:             { type: String, default: "" },
    submittedAt:      { type: Date, default: Date.now },
    agentConfirmedAt: { type: Date },
    adminConfirmedAt: { type: Date },
    resolvedAt:       { type: Date },
    approvedBy:       { type: Schema.Types.ObjectId, ref: "User" },
  }, { _id: true })],
}, { timestamps: true });

agentWalletSchema.methods.addTransaction = function(type, amount, direction) {
  if (type === "collection") {
    this.totalCollected += amount;
  } else if (type === "commission") {
    this.totalCommission += amount;
  }
  if (direction === "credit") {
    this.withdrawableBalance += amount;
  }
  this.lastUpdated = new Date();
  this.version += 1;
};

agentWalletSchema.virtual("AgentWalletTransaction").get(function() {
  return mongoose.model("AgentWalletTransaction");
});

module.exports = mongoose.model("AgentWallet", agentWalletSchema);
module.exports.AgentWalletTransaction = mongoose.model("AgentWalletTransaction", transactionSchema);