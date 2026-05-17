const express = require("express");
const router = express.Router();
const Negotiation = require("../models/Negotiation");
const requireAuth = require("../middleware/requireAuth");

// Helper: validate required fields
const validateFields = (res, fields) => {
  const missing = fields.filter((f) => f.value === undefined || f.value === null || f.value === "");
  if (missing.length > 0) {
    return res.status(400).json({ message: `Missing required fields: ${missing.map((f) => f.name).join(", ")}` });
  }
  return null;
};

// =======================
// SUBMIT NEGOTIATION REQUEST
// =======================
router.post("/propose", requireAuth, async (req, res) => {
  try {
    const { productId, sellerId, proposedPrice, duration, durationLabel, message } = req.body;
    const buyerId = req.user.id;

    const err = validateFields(res, [
      { name: "productId", value: productId },
      { name: "sellerId", value: sellerId },
      { name: "proposedPrice", value: proposedPrice },
      { name: "duration", value: duration },
    ]);
    if (err) return err;

    if (proposedPrice <= 0) {
      return res.status(400).json({ message: "Proposed price must be greater than 0" });
    }

    // Prevent self-negotiation
    if (String(buyerId) === String(sellerId)) {
      return res.status(400).json({ message: "You cannot negotiate with yourself" });
    }

    // Check existing active negotiation (one active per product per buyer)
    const existing = await Negotiation.findOne({
      productId,
      buyerId,
      status: { $in: ["pending", "countered"] },
    });

    if (existing) {
      return res.status(409).json({ message: "A negotiation is already in progress for this product" });
    }

    const negotiation = new Negotiation({
      productId,
      buyerId,
      sellerId,
      proposedPrice,
      originalPrice: proposedPrice, // Will be overridden by product price if needed
      duration,
      durationLabel: durationLabel || "",
      message: message || "",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
      singleUse: true,
      messages: [
        {
          senderId: buyerId,
          senderRole: "buyer",
          message: `I'd like to negotiate the price. My offer: ₹${proposedPrice}${message ? " - " + message : ""}`,
          proposedPrice,
        },
      ],
    });

    await negotiation.save();

    // Populate buyer and product info for response
    const populated = await Negotiation.populate(negotiation, [
      { path: "buyerId", select: "name email" },
      { path: "sellerId", select: "name email" },
      { path: "productId", select: "name images price monthlyRent" },
    ]);

    res.status(201).json({ message: "Negotiation request sent", negotiation: populated });
  } catch (err) {
    console.error("Negotiation propose error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "A negotiation already exists for this product" });
    }
    res.status(500).json({ message: "Failed to send negotiation request" });
  }
});

// =======================
// GET NEGOTIATIONS FOR SELLER (pending + recent)
// =======================
router.get("/seller/:sellerId", requireAuth, async (req, res) => {
  try {
    const sellerId = req.params.sellerId;

    // Verify auth
    if (String(req.user.id) !== String(sellerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const negotiations = await Negotiation.find({ sellerId })
      .populate("productId", "name images price monthlyRent")
      .populate("buyerId", "name email")
      .sort({ createdAt: -1 });

    res.json(negotiations);
  } catch (err) {
    console.error("Negotiation seller fetch error:", err);
    res.status(500).json({ message: "Failed to fetch negotiations" });
  }
});

// =======================
// GET NEGOTIATIONS FOR BUYER
// =======================
router.get("/buyer/:buyerId", requireAuth, async (req, res) => {
  try {
    const buyerId = req.params.buyerId;

    // Verify auth
    if (String(req.user.id) !== String(buyerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const negotiations = await Negotiation.find({ buyerId })
      .populate("productId", "name images price monthlyRent")
      .populate("sellerId", "name email")
      .sort({ createdAt: -1 });

    res.json(negotiations);
  } catch (err) {
    console.error("Negotiation buyer fetch error:", err);
    res.status(500).json({ message: "Failed to fetch negotiations" });
  }
});

// =======================
// SELLER RESPONDS (approve, reject, counter-offer)
// =======================
router.put("/respond/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, counteredPrice, message } = req.body;

    if (!["accepted", "rejected", "countered"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'accepted', 'rejected', or 'countered'" });
    }

    const negotiation = await Negotiation.findById(id);
    if (!negotiation) return res.status(404).json({ message: "Negotiation not found" });

    // Verify seller identity
    if (String(req.user.id) !== String(negotiation.sellerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Cannot respond to completed negotiations
    if (["accepted", "rejected"].includes(negotiation.status)) {
      return res.status(400).json({ message: "This negotiation has already been finalized" });
    }

    const updateData = { status };

    const newMessage = {
      senderId: req.user.id,
      senderRole: "seller",
      message: message || "",
    };

    if (status === "countered") {
      if (!counteredPrice || counteredPrice <= 0) {
        return res.status(400).json({ message: "Counter price must be greater than 0" });
      }
      updateData.counteredPrice = counteredPrice;
      updateData.counteredBy = "seller";
      updateData.proposedPrice = counteredPrice;
      newMessage.proposedPrice = counteredPrice;
      newMessage.message = `Counter-offer: ₹${counteredPrice}${message ? " - " + message : ""}`;
    } else if (status === "accepted") {
      updateData.approvedPrice = negotiation.proposedPrice;
      newMessage.message = `✅ Offer accepted at ₹${negotiation.proposedPrice}`;
    } else if (status === "rejected") {
      newMessage.message = `❌ Offer rejected${message ? ". " + message : ""}`;
    }

    updateData.$push = { messages: newMessage };

    const updated = await Negotiation.findByIdAndUpdate(id, updateData, { new: true })
      .populate("productId", "name images price monthlyRent")
      .populate("buyerId", "name email");

    res.json({ message: `Negotiation ${status}`, negotiation: updated });
  } catch (err) {
    console.error("Negotiation respond error:", err);
    res.status(500).json({ message: "Failed to respond to negotiation" });
  }
});

// =======================
// BUYER RESPONDS TO COUNTER-OFFER
// =======================
router.put("/counter-respond/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, proposedPrice, message } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'rejected'" });
    }

    const negotiation = await Negotiation.findById(id);
    if (!negotiation) return res.status(404).json({ message: "Negotiation not found" });

    // Verify buyer identity
    if (String(req.user.id) !== String(negotiation.buyerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (negotiation.status !== "countered") {
      return res.status(400).json({ message: "No counter-offer to respond to" });
    }

    const updateData = { status };

    const newMessage = {
      senderId: req.user.id,
      senderRole: "buyer",
    };

    if (status === "accepted") {
      if (!negotiation.counteredPrice && negotiation.counteredPrice !== 0) {
        return res.status(400).json({ message: "Counter-offer price not found" });
      }
      updateData.approvedPrice = negotiation.counteredPrice;
      newMessage.message = `✅ Accepted counter-offer at ₹${negotiation.counteredPrice}`;
      newMessage.proposedPrice = negotiation.counteredPrice;
    } else {
      newMessage.message = `❌ Rejected counter-offer${message ? ". " + message : ""}`;
      newMessage.proposedPrice = negotiation.counteredPrice;
    }

    updateData.$push = { messages: newMessage };

    const updated = await Negotiation.findByIdAndUpdate(id, updateData, { new: true })
      .populate("productId", "name images price monthlyRent")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email");

    res.json({ message: `Negotiation ${status}`, negotiation: updated });
  } catch (err) {
    console.error("Buyer counter-respond error:", err);
    res.status(500).json({ message: "Failed to respond to counter-offer" });
  }
});

// =======================
// BUYER UPDATES THEIR OFFER (while pending)
// =======================
router.put("/update-proposal/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { proposedPrice, message } = req.body;

    const negotiation = await Negotiation.findById(id);
    if (!negotiation) return res.status(404).json({ message: "Negotiation not found" });

    // Verify buyer identity
    if (String(req.user.id) !== String(negotiation.buyerId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!["pending"].includes(negotiation.status)) {
      return res.status(400).json({ message: "Can only update while negotiation is pending" });
    }

    if (proposedPrice <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    negotiation.proposedPrice = proposedPrice;
    negotiation.message = message || negotiation.message;

    negotiation.messages.push({
      senderId: req.user.id,
      senderRole: "buyer",
      message: `Updated offer to ₹${proposedPrice}${message ? " - " + message : ""}`,
      proposedPrice,
    });

    await negotiation.save();

    const populated = await Negotiation.populate(negotiation, [
      { path: "productId", select: "name images price monthlyRent" },
      { path: "sellerId", select: "name email" },
    ]);

    res.json({ message: "Offer updated", negotiation: populated });
  } catch (err) {
    console.error("Update proposal error:", err);
    res.status(500).json({ message: "Failed to update proposal" });
  }
});

// =======================
// GET NEGOTIATION BY ID
// =======================
router.get("/by-id/:id", requireAuth, async (req, res) => {
  try {
    const negotiation = await Negotiation.findById(req.params.id)
      .populate("productId", "name images price monthlyRent")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email");

    if (!negotiation) return res.status(404).json({ message: "Negotiation not found" });

    // Verify user is part of this negotiation
    const userId = req.user.id;
    if (
      String(negotiation.buyerId._id) !== String(userId) &&
      String(negotiation.sellerId._id) !== String(userId)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(negotiation);
  } catch (err) {
    console.error("Get negotiation error:", err);
    res.status(500).json({ message: "Failed to fetch negotiation" });
  }
});

// =======================
// GET NEGOTIATION FOR SPECIFIC PRODUCT + BUYER
// =======================
router.get("/product/:productId", requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const buyerId = req.user.id;

    const negotiation = await Negotiation.findOne({
      productId,
      buyerId,
      status: { $in: ["pending", "countered", "accepted"] },
    })
      .populate("productId", "name images price monthlyRent")
      .populate("sellerId", "name email");

    if (!negotiation) {
      return res.json({ hasNegotiation: false });
    }

    res.json({ hasNegotiation: true, negotiation });
  } catch (err) {
    console.error("Get negotiation for product error:", err);
    res.status(500).json({ message: "Failed to fetch negotiation" });
  }
});

module.exports = router;
