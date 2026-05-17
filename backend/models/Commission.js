const mongoose = require("mongoose");
const { Schema } = mongoose;

const commissionSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  lenderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  agentId: { type: Schema.Types.ObjectId, ref: "User" },
  renterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  orderItemId: { type: Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true, min: 0 },
  commissionRate: { type: Number, required: true, default: 10 }, // percentage
  commissionAmount: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ["delivery", "pickup"], required: true },
  status: { type: String, enum: ["pending", "paid"], default: "pending" },
}, { timestamps: true });

// Index for faster queries
commissionSchema.index({ lenderId: 1, status: 1 });
commissionSchema.index({ orderId: 1 });

module.exports = mongoose.model("Commission", commissionSchema);