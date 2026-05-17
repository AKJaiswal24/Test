const mongoose = require("mongoose");
const { Schema } = mongoose;

const deliveryEarningSchema = new Schema({
  agentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  taskId: { type: Schema.Types.ObjectId, ref: "DeliveryTask", required: true },
  amount: { type: Number, required: true }, // ₹75 per task
  earningType: { type: String, enum: ['delivery', 'pickup'], required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model("DeliveryEarning", deliveryEarningSchema);