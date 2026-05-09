const mongoose = require("mongoose");

const lenderSchema = new mongoose.Schema(
  {
    userId: String,
    businessName: String,
    phone: String,
    address: String,
    city: String,
    pincode: String,
    aadhaarCardUrl: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lender", lenderSchema);