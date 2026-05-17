const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  isLender: { type: Boolean, default: false },
  isDeliveryAgent: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  phone: String,
  vehicle_type: String,
  transport_type: String,
  verification_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  availability_status: { type: String, enum: ['available', 'unavailable'], default: 'unavailable' },
  completed_deliveries: { type: Number, default: 0 },
  earnings_balance: { type: Number, default: 0 },
  appliedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,
  rejectionReason: String,
});

module.exports = mongoose.model("User", userSchema);