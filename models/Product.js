const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  image: String,
  category: String,

  // 🔥 NEW (IMPORTANT)
  pricing: [
    {
      duration: String, // "1 Month", "3 Months"
      price: Number
    }
  ],

  deposit: Number,
  isPopular: { type: Boolean, default: false }
});

module.exports = mongoose.model("Product", productSchema);