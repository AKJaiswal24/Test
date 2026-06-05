const mongoose = require("mongoose");
const pricing = require("../utils/pricing");

const productSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    category: String,

    // 🔥 SECURITY DEPOSIT (refundable)
    deposit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 🔥 BASE MONTHLY RENT - all other rental prices calculated from this
    monthlyRent: {
      type: Number,
      required: true,
      min: 1000,
      max: 10000000,
    },

    // 🔥 MULTIPLE IMAGES
    images: [String],

    // 🔥 CALCULATED RENTAL PRICING (auto-populated from monthlyRent)
    pricing: {
      daily: Number,
      weekly: Number,
      monthly: Number,
      '3_months': Number,
      '6_months': Number,
      '12_months': Number,
    },

    userId: String,
  },
  { timestamps: true }
);

// Middleware: auto-calculate all rental prices from monthlyRent before every save
productSchema.pre("save", async function () {
  // Handle monthlyRent pricing calculation
  if (this.monthlyRent) {
    try {
      const calculated = pricing.getAllPricingOptions(this.monthlyRent);

      // Build pricing object
      this.pricing = {
        daily: calculated.find(p => p.duration === "daily")?.totalPrice || 0,
        weekly: calculated.find(p => p.duration === "weekly")?.totalPrice || 0,
        monthly: calculated.find(p => p.duration === "monthly")?.totalPrice || 0,
        "3_months": calculated.find(p => p.duration === "3_months")?.totalPrice || 0,
        "6_months": calculated.find(p => p.duration === "6_months")?.totalPrice || 0,
        "12_months": calculated.find(p => p.duration === "12_months")?.totalPrice || 0,
      };
    } catch (error) {
      console.error("Error in product pricing middleware:", error);
      // Set default values if pricing calculation fails
      this.pricing = {
        daily: 0,
        weekly: 0,
        monthly: 0,
        "3_months": 0,
        "6_months": 0,
        "12_months": 0,
      };
    }
  }
});


module.exports = mongoose.model("Product", productSchema);