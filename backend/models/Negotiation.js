const mongoose = require("mongoose");

const negotiationMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["buyer", "seller"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    proposedPrice: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true, _id: true }
);

const negotiationSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    proposedPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    counteredPrice: {
      type: Number,
      default: null,
    },
    counteredBy: {
      type: String,
      enum: ["seller", "buyer"],
      default: null,
    },
    approvedPrice: {
      type: Number,
      default: null,
    },
    duration: {
      type: String,
      required: true,
    },
    durationLabel: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "countered", "expired"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    singleUse: {
      type: Boolean,
      default: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    messages: [negotiationMessageSchema],
  },
  { timestamps: true }
);

// Index for efficient lookups
negotiationSchema.index({ productId: 1, buyerId: 1, status: 1 });
negotiationSchema.index({ sellerId: 1, status: 1 });
negotiationSchema.index({ buyerId: 1, status: 1 });

// Auto-expire middleware: only applies to direct find() calls looking for pending negotiations
// This prevents expired negotiations from appearing in seller/buyer dashboards
negotiationSchema.pre("find", function () {
  // Only auto-expire conditions on queries that don't explicitly filter for non-pending statuses
  const filter = this.getFilter();
  if (!filter.status || filter.status === "pending" || Array.isArray(filter.status)) {
    this.where({
      $or: [
        { status: { $ne: "pending" } },
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null },
      ],
    });
  }
});

module.exports = mongoose.model("Negotiation", negotiationSchema);