const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const pricing = require("../utils/pricing");

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const IST_OFFSET_MS = 330 * 60 * 1000;

const pad2 = (value) => String(value).padStart(2, "0");
const formatYmd = (year, month, day) => `${year}-${pad2(month)}-${pad2(day)}`;

const getDaysInMonth = (year, month1Based) =>
  new Date(Date.UTC(year, month1Based, 0)).getUTCDate();

const parseYmd = (ymd) => {
  if (!YMD_REGEX.test(ymd)) return null;
  const [year, month, day] = ymd.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  const dim = getDaysInMonth(year, month);
  if (day < 1 || day > dim) return null;
  return { year, month, day };
};

const addDaysYmd = (ymd, daysToAdd) => {
  const parsed = parseYmd(ymd);
  if (!parsed) return null;
  const dateUtc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  dateUtc.setUTCDate(dateUtc.getUTCDate() + Number(daysToAdd || 0));
  return formatYmd(dateUtc.getUTCFullYear(), dateUtc.getUTCMonth() + 1, dateUtc.getUTCDate());
};

const addMonthsYmd = (ymd, monthsToAdd) => {
  const parsed = parseYmd(ymd);
  if (!parsed) return null;

  const add = Number(monthsToAdd || 0);
  if (!Number.isFinite(add)) return null;

  let targetYear = parsed.year;
  let targetMonth = parsed.month + add;

  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }
  while (targetMonth < 1) {
    targetMonth += 12;
    targetYear -= 1;
  }

  const dim = getDaysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(parsed.day, dim);

  return formatYmd(targetYear, targetMonth, targetDay);
};

const getTodayIstYmd = () => {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return formatYmd(istNow.getUTCFullYear(), istNow.getUTCMonth() + 1, istNow.getUTCDate());
};

const parseDurationLabel = (durationLabel) => {
  if (!durationLabel || typeof durationLabel !== "string") return null;
  const normalized = durationLabel.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized === "daily") return { unit: "day", value: 1 };
  if (normalized === "weekly") return { unit: "day", value: 7 };
  if (normalized === "monthly") return { unit: "month", value: 1 };

  const monthMatch = normalized.match(/(\d+)\s*(month|months|mo)\b/i);
  if (monthMatch) {
    const months = Number(monthMatch[1]);
    if (!Number.isInteger(months) || months <= 0) return null;
    return { unit: "month", value: months };
  }

  const dayMatch = normalized.match(/(\d+)\s*(day|days|d)\b/i);
  if (dayMatch) {
    const days = Number(dayMatch[1]);
    if (!Number.isInteger(days) || days <= 0) return null;
    return { unit: "day", value: days };
  }

  return null;
};

const addDurationYmd = (ymd, duration) => {
  if (!duration || !duration.unit || !duration.value) return null;
  return duration.unit === "day" ? addDaysYmd(ymd, duration.value) : addMonthsYmd(ymd, duration.value);
};

// GET ALL CATEGORIES
router.get("/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    // Filter out empty strings and null values, then sort
    const filteredCategories = categories
      .filter(cat => cat && cat.trim() !== "")
      .map(cat => cat.trim())
      .filter((cat, index, self) => self.indexOf(cat) === index) // Remove duplicates
      .sort();
    res.json({ categories: filteredCategories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Error fetching categories" });
  }
});

// ADD PRODUCT
router.post("/add", async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      deposit,
      monthlyRent, // Single base monthly rent
      images,
      userId,
    } = req.body;

    // 🔥 VALIDATION
    if (!name || !category || !userId || !monthlyRent) {
      return res.status(400).json({
        message: "Missing required fields: name, category, userId, monthlyRent",
      });
    }

    // 🔥 VALIDATE MONTHLY RENT using pricing engine
    const rentValidation = pricing.validateMonthlyRent(monthlyRent);
    if (!rentValidation.isValid) {
      return res.status(400).json({
        message: rentValidation.error,
      });
    }

    if (!images || images.length < 3) {
      return res.status(400).json({
        message: "At least 3 images required",
      });
    }

    // Let the schema middleware auto-calculate pricing
    const product = new Product({
      name,
      description,
      category,
      deposit: deposit ? Number(deposit) : 0,
      monthlyRent: Number(monthlyRent),
      images,
      userId,
    });

    await product.save();

    res.json({ message: "Product added", product });

  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ message: "Error adding product" });
  }
});

// GET ALL
router.get("/", async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by category
    if (category && category !== "All") {
      query.category = { $regex: `^${category}$`, $options: "i" };
    }

    const products = await Product.find(query);
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// CHECK AVAILABILITY
router.post("/check-availability", async (req, res) => {
  try {
    const { items, deliveryDate } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ available: true });
    }

    if (!deliveryDate || !YMD_REGEX.test(deliveryDate)) {
      return res.status(400).json({ message: "Invalid or missing deliveryDate" });
    }

    const unavailable = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        unavailable.push({
          productId: item.productId,
          reason: "Product not found"
        });
        continue;
      }

      // Parse duration
      const duration = parseDurationLabel(item.durationLabel || item.basePlan?.durationLabel);
      if (!duration) {
        unavailable.push({
          productId: item.productId,
          reason: `Invalid duration: ${item.durationLabel || item.basePlan?.durationLabel}`
        });
        continue;
      }

      // Calculate return date
      const returnDate = addDurationYmd(deliveryDate, duration);
      if (!returnDate) {
        unavailable.push({
          productId: item.productId,
          reason: "Unable to calculate return date"
        });
        continue;
      }

      // Check for conflicting orders
      const conflictingOrders = await Order.find({
        "items.productId": product._id,
        status: "Ongoing",
        $or: [
          // Existing order starts before or during requested delivery
          {
            deliveryDate: { $lte: deliveryDate },
            returnDate: { $gt: deliveryDate }
          },
          // Existing order starts during rental period
          {
            deliveryDate: { $gt: deliveryDate },
            deliveryDate: { $lte: returnDate }
          },
          // Existing order completely wraps requested period
          {
            deliveryDate: { $lte: deliveryDate },
            returnDate: { $gte: returnDate }
          }
        ]
      });

      if (conflictingOrders.length > 0) {
        unavailable.push({
          productId: item.productId,
          reason: "Product already booked for selected dates",
          conflictingOrders: conflictingOrders.map(o => ({
            id: o._id,
            deliveryDate: o.deliveryDate,
            returnDate: o.returnDate
          }))
        });
      }
    }

    res.json({
      available: unavailable.length === 0,
      unavailable
    });
  } catch (err) {
    console.error("Availability check error:", err);
    res.status(500).json({ message: "Availability check failed", error: err.message });
  }
});

// GET ONE
router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  res.json(product);
});

// DELETE ONE
router.delete("/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

// UPDATE ONE
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, monthlyRent, ...updateData } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.userId.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // If monthlyRent provided, validate it
    if (monthlyRent !== undefined) {
      const rentValidation = pricing.validateMonthlyRent(monthlyRent);
      if (!rentValidation.isValid) {
        return res.status(400).json({ message: rentValidation.error });
      }
      updateData.monthlyRent = Number(monthlyRent);
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    res.json({ message: "Product updated", product: updatedProduct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating product" });
  }
});

// GET ALL BY LENDER ID
router.get("/lender/:userId", async (req, res) => {
  try {
    const products = await Product.find({
      userId: req.params.userId,
    });

    res.json(products);

  } catch (err) {
    res.status(500).json({ message: "Error fetching products" });
  }
});

module.exports = router;
