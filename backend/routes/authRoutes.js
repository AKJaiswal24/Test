const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  isLender: user.isLender === true,
  isDeliveryAgent: user.isDeliveryAgent === true,
  isAdmin: user.isAdmin === true,
  verification_status: user.verification_status || "pending",
  availability_status: user.availability_status || "unavailable",
  phone: user.phone || "",
  vehicle_type: user.vehicle_type || "",
  transport_type: user.transport_type || "",
});

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const trimmedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const rawPassword = String(password || "");

    if (!trimmedName || !normalizedEmail || !rawPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (rawPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(rawPassword, 10);
    const user = new User({
      name: trimmedName,
      email: normalizedEmail,
      password: hashed,
    });

    await user.save();

    return res.json({ message: "Signup successful" });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return res.status(500).json({ message: "Signup error" });
  }
});

// BOOTSTRAP ADMIN - Create first admin user (only works if no admin exists)
router.post("/bootstrap-admin", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ isAdmin: true });
    if (existingAdmin) {
      return res.status(403).json({ message: "Admin already exists. Contact support." });
    }

    const trimmedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const rawPassword = String(password || "");

    if (!trimmedName || !normalizedEmail || !rawPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (rawPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(rawPassword, 10);
    const admin = new User({
      name: trimmedName,
      email: normalizedEmail,
      password: hashed,
      isAdmin: true,
    });

    await admin.save();

    const secret = process.env.JWT_SECRET;
    const token = jwt.sign({ id: admin._id.toString() }, secret, { expiresIn: "7d" });

    return res.json({
      message: "Admin account created successfully!",
      token,
      user: sanitizeUser(admin),
    });
  } catch (err) {
    console.error("BOOTSTRAP ADMIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const rawPassword = String(password || "");

    if (!normalizedEmail || !rawPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(rawPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "Server misconfigured" });
    }

    const token = jwt.sign({ id: user._id.toString() }, secret, { expiresIn: "7d" });

    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

