const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      price: Number
    }
  ],

  rentTotal: Number,
  depositTotal: Number,
  transport: Number,
  insurance: Number,
  grandTotal: Number,

  status: { type: String, default: "Active" },
Dev_status: {
  type: String,
  default: "Ongoing" // Ongoing | Delivered
},
deliveredAt: Date,
returnDate: Date,
  createdAt: { type: Date, default: Date.now },
  deliveryDate: Date,
status: String,
});

module.exports = mongoose.model("Order", orderSchema);