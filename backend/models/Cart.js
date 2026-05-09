const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: String,

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },

      quantity: {
        type: Number,
        default: 1,
      },

      // 🔥 IMPORTANT: store selected plan
      selectedPlan: {
        duration: String,
        price: Number,
        durationLabel: String,
      },
    },
  ],
});

module.exports = mongoose.model("Cart", cartSchema);