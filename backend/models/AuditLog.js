const mongoose = require("mongoose");
const { Schema } = mongoose;

const auditLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User" },
  actorRole: { type: String, enum: ["admin", "agent", "lender", "renter", "system"], default: "system" },
  category: { type: String, enum: ["order", "delivery", "payment", "agent_cash", "settlement"], required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId },
  changes: { type: Schema.Types.Mixed, default: {} },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ip: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("AuditLog", auditLogSchema);