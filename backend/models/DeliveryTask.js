const mongoose = require("mongoose");
const { Schema } = mongoose;

const deliveryTaskSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  lenderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  renterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  agentId: { type: Schema.Types.ObjectId, ref: "User" }, // null until assigned
  taskType: { type: String, enum: ['delivery', 'pickup'], required: true },
  status: {
    type: String,
    enum: [
      'Waiting for Agent',
      'Accepted',
      'Picking Up Product',
      'In Transit',
      'Delivered',
      'Pickup Scheduled',
      'Return In Transit',
      'Returned to Lender',
      'Completed'
    ],
    default: 'Waiting for Agent'
  },
  paymentAmount: { type: Number, default: 0 },
  pickupAddress: {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  dropAddress: {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  otp: { type: String, default: "" },
  otpVerified: { type: Boolean, default: false },
  assignedAt: { type: Date },
  completedAt: { type: Date },
  trackingLogs: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    location: { type: String, default: "" }
  }],
  rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
  rejectionReason: { type: String, default: "" },
  // NEW: Payment and condition verification fields
  rentalPaymentConfirmed: { type: Boolean, default: false },
  paymentConfirmedAt: { type: Date },
  pickupConditionVerified: { type: Boolean, default: false },
  pickupIsWorking: { type: Boolean },
  pickupConditionNotes: { type: String }
}, { timestamps: true });

// Index for faster queries
deliveryTaskSchema.index({ status: 1, taskType: 1 });
deliveryTaskSchema.index({ agentId: 1, status: 1 });
deliveryTaskSchema.index({ orderId: 1 });

module.exports = mongoose.model("DeliveryTask", deliveryTaskSchema);