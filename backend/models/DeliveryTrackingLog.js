const mongoose = require("mongoose");
const { Schema } = mongoose;

const deliveryTrackingLogSchema = new Schema({
  taskId: { type: Schema.Types.ObjectId, ref: "DeliveryTask", required: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
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
      'Completed',
      'Rejected'
    ],
    required: true
  },
  notes: { type: String, default: "" },
  location: { type: String, default: "" },
  otpVerified: { type: Boolean, default: false },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  role: { type: String, enum: ['agent', 'admin', 'system'], default: 'system' }
}, { timestamps: true });

deliveryTrackingLogSchema.index({ taskId: 1, createdAt: -1 });
deliveryTrackingLogSchema.index({ orderId: 1 });

module.exports = mongoose.model("DeliveryTrackingLog", deliveryTrackingLogSchema);