const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const requireAuth = require("../middleware/requireAuth");

const assertSelf = (req, res, userId) => {
  const authUserId = req.user?.id;
  if (!authUserId) {
    res.status(401).json({ message: "Unauthorized" });
    return false;
  }

  if (userId && String(userId) !== String(authUserId)) {
    res.status(403).json({ message: "Forbidden" });
    return false;
  }

  return true;
};

// =======================
// ADD TO CART
// =======================
router.post("/add", requireAuth, async (req, res) => {
  try {
    const { userId, productId, selectedPlan } = req.body;
    if (!assertSelf(req, res, userId)) return;

    const authUserId = req.user.id;

    if (!selectedPlan || !selectedPlan.price || !selectedPlan.durationLabel) {
      return res.status(400).json({ message: "Invalid plan data" });
    }

    let cart = await Cart.findOne({ userId: authUserId });

    if (!cart) {
      cart = new Cart({ userId: authUserId, items: [] });
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
router.get("/:userId", requireAuth, async (req, res) => {
  try {
    if (!assertSelf(req, res, req.params.userId)) return;

    const cart = await Cart.findOne({ userId: req.user.id })
      .populate("items.productId");

    res.json(cart || { items: [] });

  } catch (err) {
    res.status(500).json({ message: "Fetch error" });
  }
});

// =======================
// REMOVE ITEM
// =======================
router.post("/remove", requireAuth, async (req, res) => {
  try {
    const { userId, productId, duration } = req.body;
    if (!assertSelf(req, res, userId)) return;

    const cart = await Cart.findOne({ userId: req.user.id });
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
router.post("/update", requireAuth, async (req, res) => {
  try {
    const { userId, productId, type, duration } = req.body;
    if (!assertSelf(req, res, userId)) return;

    const cart = await Cart.findOne({ userId: req.user.id });
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
router.post("/clear", requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!assertSelf(req, res, userId)) return;

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.json({ items: [] });

    cart.items = [];
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: "Clear error" });
  }
});

module.exports = router;
