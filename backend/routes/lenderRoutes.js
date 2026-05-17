const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const Lender = require("../models/Lender");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const DeliveryTask = require("../models/DeliveryTask");
const Commission = require("../models/Commission");
const requireAuth = require("../middleware/requireAuth");

const COMMISSION_RATE = 10; // 10% platform commission on rentals

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/aadhaar/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

// ===============================
// ➕ REGISTER AS LENDER
// ===============================
router.post("/register", requireAuth, async (req, res) => {
  try {
    const { userId, businessName, phone, address, city, pincode, aadhaarCardUrl } = req.body;

    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    if (userId && String(userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!req.user?.id || !businessName || !phone) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await Lender.findOne({ userId: req.user.id });

    if (existing) {
      return res.status(400).json({ message: "User is already a lender" });
    }

    const lender = new Lender({
      userId: req.user.id,
      businessName,
      phone,
      address,
      city,
      pincode,
    });

    await lender.save();
    await User.findByIdAndUpdate(req.user.id, { isLender: true });

    res.json({ message: "Registered successfully", lender });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================
// 📤 UPLOAD AADHAAR CARD
// ===============================
router.post("/upload-aadhaar", requireAuth, upload.single("aadhaarCard"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileUrl = `/uploads/aadhaar/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "File upload failed" });
  }
});

// ===============================
// 🔍 CHECK IF USER IS LENDER
// ===============================
router.get("/check/:userId", requireAuth, async (req, res) => {
  try {
    if (String(req.params.userId) !== String(req.user?.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const lender = await Lender.findOne({
      userId: req.params.userId,
    });

    if (!lender) {
      return res.status(404).json({ message: "Lender not found" });
    }

    res.json(lender);
  } catch (err) {
    res.status(500).json({ message: "Fetch error" });
  }
});

// ===============================
// 📄 GET LENDER DETAILS
// ===============================
router.get("/user/:userId", requireAuth, async (req, res) => {
  try {
    if (String(req.params.userId) !== String(req.user?.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const lender = await Lender.findOne({
      userId: req.params.userId,
    });

    if (!lender) {
      return res.status(404).json({ message: "Lender not found" });
    }

    res.json(lender);
  } catch (err) {
    res.status(500).json({ message: "Fetch error" });
  }
});

// ===============================
// 📊 LENDER DASHBOARD OVERVIEW
// ===============================
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const products = await Product.find({ userId });
    const productIds = products.map((p) => p._id);

    const completedTasks = await DeliveryTask.find({
      productId: { $in: productIds },
      status: "Completed",
      taskType: "delivery",
    })
      .populate("orderId", "orderId grandTotal status")
      .populate("renterId", "name email phone")
      .populate("agentId", "name")
      .populate("productId", "name image monthlyRent pricing")
      .sort({ completedAt: -1 });

    const activeTasks = await DeliveryTask.find({
      productId: { $in: productIds },
      status: { $in: ["Accepted", "Picking Up Product", "In Transit", "Delivered", "Pickup Scheduled", "Return In Transit"] },
    })
      .populate("orderId", "orderId grandTotal status deliveryDate returnDate")
      .populate("renterId", "name email phone")
      .populate("agentId", "name")
      .populate("productId", "name image monthlyRent pricing")
      .sort({ createdAt: -1 });

    const totalRentIncome = completedTasks.reduce((sum, task) => {
      if (task.orderId) {
        return sum + (Number(task.orderId.rentTotal) || 0);
      }
      return sum;
    }, 0);

    const totalAgentFees = completedTasks.length * 75;
    const totalNetIncome = totalRentIncome - totalAgentFees;

    const commissions = await Commission.find({ lenderId: userId })
      .populate("orderId", "orderId")
      .populate("productId", "name image")
      .populate("agentId", "name")
      .sort({ createdAt: -1 });

    const totalCommissionEarned = commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
    const totalCommissionPending = commissions.filter((c) => c.status === "pending").reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

    const orders = await Order.find({
      "items.productId": { $in: productIds },
      status: "Ongoing",
    }).populate("items.productId", "name image pricing");

    let totalRentalIncome = 0;
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (productIds.some((pid) => String(pid) === String(item.productId?._id))) {
          totalRentalIncome += Number(item.basePlan?.unitPrice || 0) * Number(item.quantity || 0);
        }
      });
    });

    res.json({
      summary: {
        totalProducts: products.length,
        completedDeliveries: completedTasks.length,
        activeRentals: activeTasks.length,
        totalRentIncome,
        totalAgentFees,
        totalNetIncome,
        totalRentalBooked: totalRentalIncome,
        totalCommissionEarned,
        totalCommissionPending,
      },
      products: products.map((p) => ({
        _id: p._id,
        name: p.name,
        image: p.image || p.images?.[0],
        monthlyRent: p.monthlyRent,
        pricing: p.pricing,
        deposit: p.deposit,
      })),
      completedDeliveries: completedTasks.map((task) => ({
        _id: task._id,
        orderId: task.orderId?._id,
        orderIdShort: String(task.orderId?._id || "").substring(0, 8),
        orderStatus: task.orderId?.status || "N/A",
        product: task.productId,
        renterName: task.renterId?.name || "Unknown",
        agentName: task.agentId?.name || "Unassigned",
        completedAt: task.completedAt,
        rentTotal: task.orderId?.rentTotal || 0,
        deliveryFee: 75,
        netIncome: (task.orderId?.rentTotal || 0) - 75,
      })),
      activeRentals: activeTasks.map((task) => ({
        _id: task._id,
        orderId: task.orderId?._id,
        orderIdShort: String(task.orderId?._id || "").substring(0, 8),
        taskType: task.taskType,
        status: task.status,
        product: task.productId,
        renter: {
          name: task.renterId?.name || "Unknown",
          phone: task.renterId?.phone || "",
        },
        agentName: task.agentId?.name || "Unassigned",
        deliveryDate: task.orderId?.deliveryDate,
        returnDate: task.orderId?.returnDate,
        rentTotal: task.orderId?.rentTotal || 0,
      })),
      commissions: commissions.map((c) => ({
        _id: c._id,
        orderId: c.orderId?._id,
        orderIdShort: String(c.orderId?._id || "").substring(0, 8),
        product: c.productId,
        agentName: c.agentId?.name || "N/A",
        orderItemId: c.orderItemId,
        amount: c.amount,
        commissionRate: c.commissionRate,
        commissionAmount: c.commissionAmount,
        type: c.type,
        status: c.status,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("Lender dashboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================
// 📋 GET LENDER PRODUCTS
// ===============================
router.get("/products", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const products = await Product.find({ userId }).sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    console.error("Lender products error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================
// 💰 CREATE COMMISSION RECORD
// ===============================
router.post("/commissions", requireAuth, async (req, res) => {
  try {
    const { orderId, orderItemId, productId, lenderId, agentId, renterId, type, amount } = req.body;

    if (!orderId || !orderItemId || !productId || !lenderId || !renterId || !type || !amount) {
      return res.status(400).json({ message: "All fields required" });
    }

    const isAdmin = req.user && req.user.id && (await User.findById(req.user.id))?.isAdmin;
    if (!isAdmin && String(req.user?.id) !== String(lenderId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const commissionAmount = Math.round(amount * COMMISSION_RATE / 100);

    const commission = new Commission({
      orderId,
      productId,
      lenderId,
      agentId: agentId || null,
      renterId,
      orderItemId,
      amount,
      commissionRate: COMMISSION_RATE,
      commissionAmount,
      type,
      status: "pending",
    });

    await commission.save();

    res.json({ message: "Commission record created", commission });
  } catch (err) {
    console.error("Create commission error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================
// 📈 GET COMMISSION STATS
// ===============================
router.get("/commissions/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const commissions = await Commission.find({ lenderId: userId });

    const total = commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
    const pending = commissions.filter((c) => c.status === "pending").reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
    const paid = commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

    res.json({
      total,
      pending,
      paid,
      count: commissions.length,
      pendingCount: commissions.filter((c) => c.status === "pending").length,
      paidCount: commissions.filter((c) => c.status === "paid").length,
    });
  } catch (err) {
    console.error("Commission stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
