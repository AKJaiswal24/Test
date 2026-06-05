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
  status: { type: String, enum: ["pending", "credited", "verified"], default: "pending" },
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