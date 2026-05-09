const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const Lender = require("../models/Lender");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/aadhaar/";
    // Create directory if it doesn't exist
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

    // 🔥 VALIDATION
    if (!req.user?.id || !businessName || !phone) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    // 🔥 CHECK IF ALREADY EXISTS
    const existing = await Lender.findOne({ userId: req.user.id });

    if (existing) {
      return res.status(400).json({
        message: "User is already a lender",
      });
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

    // Update user's isLender flag
    await User.findByIdAndUpdate(req.user.id, { isLender: true });

    res.json({
      message: "Registered successfully",
      lender,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server error",
    });
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
    
    // Return the URL where the file is accessible
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

    res.json({
      isLender: !!lender,
    });

  } catch (err) {
    res.status(500).json({
      message: "Check failed",
    });
  }
});

// ===============================
// 📄 GET LENDER DETAILS
// ===============================
router.get("/:userId", requireAuth, async (req, res) => {
  try {
    if (String(req.params.userId) !== String(req.user?.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const lender = await Lender.findOne({
      userId: req.params.userId,
    });

    if (!lender) {
      return res.status(404).json({
        message: "Lender not found",
      });
    }

    res.json(lender);

  } catch (err) {
    res.status(500).json({
      message: "Fetch error",
    });
  }
});

module.exports = router;
