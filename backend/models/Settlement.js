const mongoose = require("mongoose");
const { Schema } = mongoose;

const settlementSchema = new Schema({
  agentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  taskId: { type: Schema.Types.ObjectId, ref: "DeliveryTask", required: true },
  customerPayment: { type: Number, required: true },
  agentCommission: { type: Number, required: true },
  adminShare: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ["pending", "submitted", "verified", "rejected", "completed"], 
    default: "pending" 
  },
  requestedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  verifiedAt: { type: Date },
  verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  rejectionReason: { type: String, default: "" },
  notes: { type: String, default: "" },
  paymentMethod: { type: String, enum: ["cash", "upi", "bank_transfer"], default: "cash" },
  referenceNumber: { type: String, default: "" },
}, { timestamps: true });

settlementSchema.index({ agentId: 1, status: 1 });
settlementSchema.index({ orderId: 1 });
settlementSchema.index({ status: 1 });
settlementSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Settlement", settlementSchema);