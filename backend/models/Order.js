const mongoose = require("mongoose");

const { Schema } = mongoose;

const orderItemExtensionSchema = new Schema(
  {
    durationLabel: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    durationUnit: { type: String, required: true, enum: ["day", "month"] },
    durationValue: { type: Number, required: true, min: 1 },
    extendedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    basePlan: {
      durationLabel: { type: String, required: true },
      unitPrice: { type: Number, required: true },
      durationUnit: { type: String, required: true, enum: ["day", "month"] },
      durationValue: { type: Number, required: true, min: 1 },
    },
    returnDate: { type: String, required: true }, // YYYY-MM-DD
    extensions: { type: [orderItemExtensionSchema], default: [] },
  },
  { _id: true }
);

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deliveryDate: { type: String, required: true }, // YYYY-MM-DD
    returnDate: { type: String, required: true }, // YYYY-MM-DD (max of items)
    // Address fields
    deliveryAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    items: { type: [orderItemSchema], default: [] },
    rentTotal: { type: Number, default: 0 },
    depositTotal: { type: Number, default: 0 },
    transport: { type: Number, default: 200 },
    platformCharge: { type: Number, default: 20 },
    insurance: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: { type: String, enum: ["Ongoing", "Delivered", "Cancelled"], default: "Ongoing" },
    deliveredAt: { type: Date },
    rentalPaymentConfirmed: { type: Boolean, default: false },
    paymentConfirmedAt: { type: Date },
    // COD fields for cash-on-delivery tracking
    codStatus: { type: String, enum: ["pending", "verified", "collected"], default: "pending" },
    codAmountCollected: { type: Number, default: 0 },
    codPaymentMethod: { type: String, default: "" },
    codPaymentId: { type: String, default: "" },
    codCollectedAt: { type: Date },
    codCollectedByAgent: { type: Schema.Types.ObjectId, ref: "User" },
    codVerifiedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);

