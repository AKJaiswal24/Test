const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");

// =======================
// ADD TO CART
// =======================
router.post("/add", async (req, res) => {
  try {
    const { userId, productId, selectedPlan } = req.body;

    if (!selectedPlan || !selectedPlan.price || !selectedPlan.durationLabel) {
      return res.status(400).json({ message: "Invalid plan data" });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // match product + plan
    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.selectedPlan?.duration === selectedPlan.duration
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        productId,
        quantity: 1,
        selectedPlan: {
          duration: selectedPlan.duration,
          price: selectedPlan.price,
          durationLabel: selectedPlan.durationLabel,
        },
      });
    }

    await cart.save();
    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: "Add error" });
  }
});

// =======================
// GET CART
// =======================
router.get("/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId })
      .populate("items.productId");

    res.json(cart || { items: [] });

  } catch (err) {
    res.status(500).json({ message: "Fetch error" });
  }
});

// =======================
// REMOVE ITEM
// =======================
router.post("/remove", async (req, res) => {
  try {
    const { userId, productId, duration } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ items: [] });

    cart.items = cart.items.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          item.selectedPlan?.duration === duration
        )
    );

    await cart.save();

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: "Remove error" });
  }
});

// =======================
// UPDATE QUANTITY
// =======================
router.post("/update", async (req, res) => {
  try {
    const { userId, productId, type, duration } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (i) =>
        i.productId.toString() === productId &&
        i.selectedPlan?.duration === duration
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (type === "inc") item.quantity += 1;
    if (type === "dec") item.quantity -= 1;

    if (item.quantity <= 0) {
      cart.items = cart.items.filter(
        (i) =>
          !(
            i.productId.toString() === productId &&
            i.selectedPlan?.duration === duration
          )
      );
    }

    await cart.save();
    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: "Update error" });
  }
});

// =======================
// CLEAR CART
// =======================
router.post("/clear", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ items: [] });

    cart.items = [];
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: "Clear error" });
  }
});

module.exports = router;
