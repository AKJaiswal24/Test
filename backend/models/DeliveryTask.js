const mongoose = require("mongoose");
const { Schema } = mongoose;

const deliveryTaskSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  lenderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  renterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  agentId: { type: Schema.Types.ObjectId, ref: "User" },
  taskType: { type: String, enum: ['delivery', 'pickup', 'return_pickup', 'vendor_return'], required: true },
  status: {
    type: String,
    enum: [
      'Waiting for Agent',
      'Accepted',
      'Picking Up Product',
      'In Transit',
      'Cod Payment Collected',   // Step 3 — mandatory COD gate
      'Delivered',
      'Pickup Scheduled',
      'Return In Transit',
      'Returned to Lender',
      'Returned to Vendor',
      'Completed'
    ],
    default: 'Waiting for Agent'
  },
  paymentAmount: { type: Number, default: 0 },
  pickupAddress: {
    street: { type: String, default: "" },
    city:   { type: String, default: "" },
    state:  { type: String, default: "" },
    pincode: { type: String, default: "" },
    phone:  { type: String, default: "" },
  },
  dropAddress: {
    street: { type: String, default: "" },
    city:   { type: String, default: "" },
    state:  { type: String, default: "" },
    pincode: { type: String, default: "" },
    phone:  { type: String, default: "" },
  },
  otp:             { type: String, default: "" },
  otpVerified:     { type: Boolean, default: false },
  assignedAt:      { type: Date },
  completedAt:     { type: Date },
  trackingLogs: [{
    status:        { type: String, required: true },
    timestamp:     { type: Date, default: Date.now },
    notes:         { type: String, default: "" },
    location:      { type: String, default: "" },
    actorRole:     { type: String, default: "" },
    actorId:       { type: Schema.Types.ObjectId, ref: "User" },
  }],
  rejectedBy:       { type: Schema.Types.ObjectId, ref: "User" },
  rejectionReason:  { type: String, default: "" },

  // ── Step 3 — COD collection evidence ──
  codVerified:         { type: Boolean, default: false },
  codPaymentMethod:    { type: String, default: "" },
  codPaymentId:        { type: String, default: "" },
  codPaymentProofDoc:  { type: String, default: "" }, // s3 / upload path
  codAmountReceived:   { type: Number, default: 0 },
  codCollectedAt:      { type: Date },
  codAgentConfirmation:{ type: Boolean, default: false },

  // ── Step 4 — Agent cash reconciliation ──
  agentCashTotal:       { type: Number, default: 0 },
  agentCashSubmitted:   { type: Boolean, default: false },
  agentSubmissionAmount:{ type: Number, default: 0 },
  agentCashShortage:    { type: Number, default: 0 },
  agentCashDocs:        { type: [String], default: [] },
  agentCashSubmittedAt: { type: Date },

  // ── Legacy payment-verification fields ──
  rentalPaymentConfirmed: { type: Boolean, default: false },
  paymentConfirmedAt:     { type: Date },
  pickupConditionVerified:{ type: Boolean, default: false },
  pickupIsWorking:        { type: Boolean },
  pickupConditionNotes:   { type: String },
}, { timestamps: true });

// ── Status transitions (includes new "Cod Payment Collected" gate) ──
deliveryTaskSchema.virtual("allowedNextStatuses").get(function () {
  const map = {
    'Waiting for Agent':      ['Accepted'],
    'Accepted':               ['Picking Up Product', 'Rejected'],
    'Picking Up Product':     ['In Transit'],
    'In Transit':             ['Cod Payment Collected', 'Delivered', 'Returned to Vendor'],
    'Cod Payment Collected':  ['Delivered', 'Returned to Vendor'],
    'Delivered':              ['Pickup Scheduled'],
    'Pickup Scheduled':       ['Return In Transit'],
    'Return In Transit':      ['Returned to Lender'],
    'Returned to Lender':     ['Completed'],
    'Returned to Vendor':     ['Completed'],
    'Completed':              [],
  };
  return map[this.status] || [];
});

// Indexes
deliveryTaskSchema.index({ status: 1, taskType: 1 });
deliveryTaskSchema.index({ agentId: 1, status: 1 });
deliveryTaskSchema.index({ orderId: 1 });

module.exports = mongoose.model("DeliveryTask", deliveryTaskSchema);
