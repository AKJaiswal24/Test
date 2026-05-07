const express = require("express");
const router = express.Router();

const Order = require("../models/Order");

// =======================
// CREATE ORDER
// =======================
router.post("/create", async (req, res) => {
  try {
    const {
      userId,
      items,
      rentTotal,
      depositTotal,
      transport,
      insurance,
      grandTotal,
      deliveryDate,
    } = req.body;

    console.log("Received deliveryDate:", deliveryDate); // 🔥 DEBUG

    if (!deliveryDate) {
      return res.status(400).json({ message: "No delivery date" });
    }

    const order = new Order({
      userId,
      items,
      rentTotal,
      depositTotal,
      transport,
      insurance,
      grandTotal,

      // ✅ FIXED (NO TIMEZONE ISSUE)
      deliveryDate: new Date(deliveryDate),

      status: "Ongoing",
    });

    await order.save();

    res.json(order);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Order error" });
  }
});


// =======================
// GET USER ORDERS
// =======================
router.get("/:userId", async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.params.userId,
    })
      .populate("items.productId")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    res.status(500).json({
      message: "Fetch orders failed",
    });
  }
});


// =======================
// AUTO UPDATE STATUS (OPTIONAL)
// =======================
router.get("/status/update/:userId", async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.params.userId,
    });

    const now = new Date();

    for (let order of orders) {
      if (order.deliveryDate && now > order.deliveryDate) {
        order.status = "Delivered";
        await order.save();
      }
    }

    res.json({ message: "Status updated" });

  } catch (err) {
    res.status(500).json({
      message: "Status update failed",
    });
  }
});

module.exports = router;