const mongoose = require("mongoose");
const { Schema } = mongoose;

const transactionSchema = new Schema({
  agentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  taskId: { type: Schema.Types.ObjectId, ref: "DeliveryTask" },
  settlementId: { type: Schema.Types.ObjectId, ref: "Settlement" },
  amount: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ["collection", "commission", "settlement", "adjustment", "payment", "refund"], 
    required: true 
  },
  direction: { 
    type: String, 
    enum: ["credit", "debit"], 
    required: true 
  },
  method: { 
    type: String, 
    enum: ["cash", "upi", "bank_transfer", "adjustment", "platform"], 
    default: "cash" 
  },
  status: { 
    type: String, 
    enum: ["pending", "completed", "failed", "cancelled", "paid"], 
    default: "completed" 
  },
  description: { type: String, default: "" },
  reference: { type: String, default: "" },
  referenceId: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

transactionSchema.index({ agentId: 1, createdAt: -1 });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);