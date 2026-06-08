const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: [
      "delivery_assigned",
      "delivery_accepted",
      "delivery_picked_up",
      "delivery_in_transit",
      "delivery_completed",
      "pickup_scheduled",
      "pickup_completed",
      "return_in_transit",
      "returned_to_lender",
      "pickup_return_due",
      "payment_collected",
      "rental_extended",
      "agent_approved",
      "agent_rejected",
      "order_conflict",
      "settlement_submitted",
      "system"
    ],
    required: true,
  },
  read: { type: Boolean, default: false },
  relatedOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
  relatedTaskId: { type: Schema.Types.ObjectId, ref: "DeliveryTask" },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);