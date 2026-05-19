const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const DeliveryTask = require("../models/DeliveryTask");
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));
const requireAuth = require("../middleware/requireAuth");
const { isObjectIdHex } = require("../utils/validation");

const IST_OFFSET_MS = 330 * 60 * 1000; // IST = UTC + 05:30 (no DST)
const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
  let targetMonth = parsed.month + add; // 1-based

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

const getTomorrowIstYmd = () => addDaysYmd(getTodayIstYmd(), 1);

const isValidDeliveryDate = (ymd) => {
  const parsed = parseYmd(ymd);
  if (!parsed) return false;
  const tomorrow = getTomorrowIstYmd();
  if (!tomorrow) return false;
  return ymd >= tomorrow;
};

const parseDurationLabel = (durationLabel) => {
  if (!durationLabel || typeof durationLabel !== "string") return null;
  const normalized = durationLabel.trim().toLowerCase();
  if (!normalized) return null;

  // Handle simple labels (Daily, Weekly, Monthly)
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

// Helper: Convert display label to pricing key (e.g., "3 Months" -> "3_months")
const getPricingKeyFromLabel = (durationLabel) => {
  if (!durationLabel || typeof durationLabel !== "string") return null;
  const normalized = durationLabel.trim().toLowerCase();
  
  const labelToKey = {
    daily: "daily",
    weekly: "weekly", 
    monthly: "monthly",
    "3 months": "3_months",
    "6 months": "6_months",
    "12 months": "12_months",
  };
  
  return labelToKey[normalized] || normalized;
};

const addDurationYmd = (ymd, duration) => {
  if (!duration || !duration.unit || !duration.value) return null;
  return duration.unit === "day" ? addDaysYmd(ymd, duration.value) : addMonthsYmd(ymd, duration.value);
};

// =======================
// CREATE ORDER
// =======================
router.post("/create", requireAuth, async (req, res) => {
  try {
    const { userId, items, deliveryDate, deliveryAddress } = req.body;

    const authUserId = req.user?.id;
    if (!authUserId || !isObjectIdHex(authUserId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    if (userId && String(userId) !== String(authUserId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!deliveryDate || !isValidDeliveryDate(deliveryDate)) {
      return res.status(400).json({ message: "Invalid deliveryDate" });
    }

    // Validate delivery address
    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city ||
        !deliveryAddress.state || !deliveryAddress.pincode || !deliveryAddress.phone) {
      return res.status(400).json({ message: "Delivery address is required" });
    }

    // Validate delivery address length requirements
    const street = deliveryAddress.street.trim();
    const city = deliveryAddress.city.trim();
    const state = deliveryAddress.state.trim();
    const pincode = deliveryAddress.pincode.trim();
    const phone = deliveryAddress.phone.trim();

    if (street.length < 20 || street.length > 100) {
      return res.status(400).json({ message: "Street Address must be between 20 and 100 characters" });
    }

    if (city.length > 15) {
      return res.status(400).json({ message: "City must be 15 characters or less" });
    }

    if (state.length > 20) {
      return res.status(400).json({ message: "State must be 20 characters or less" });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ message: "Pincode must be exactly 6 digits" });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Phone Number must be exactly 10 digits" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items" });
    }

    const normalizedItems = items
      .map((item) => ({
        productId: item?.productId,
        quantity: Number(item?.quantity || 0),
        durationLabel: item?.basePlan?.durationLabel || "",
        unitPrice: Number(item?.basePlan?.unitPrice ?? item?.price ?? 0),
      }))
      .filter((item) => item.productId && item.quantity > 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: "No valid items" });
    }

    // 🔒 FINAL AVAILABILITY CHECK - ensure no double booking
    for (const item of normalizedItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.productId}` });
      }

      const duration = parseDurationLabel(item.durationLabel);
      if (!duration) {
        return res.status(400).json({ message: `Invalid duration: ${item.durationLabel}` });
      }

      const returnDate = addDurationYmd(deliveryDate, duration);
      if (!returnDate) {
        return res.status(400).json({ message: "Unable to compute return date" });
      }

      // Check for conflicting ongoing orders for THIS product item (use per-item returnDate)
      const conflicting = await Order.find({
        status: "Ongoing",
        deliveryDate: { $lt: returnDate },
        items: {
          $elemMatch: {
            productId: product._id,
            returnDate: { $gt: deliveryDate },
          },
        },
      });

      if (conflicting.length > 0) {
        return res.status(409).json({
          message: `Product "${product.name}" is already booked for the selected dates.`,
          conflict: {
            productId: product._id,
            productName: product.name,
            requestedDelivery: deliveryDate,
            requestedReturn: returnDate,
            conflicts: conflicting.map(o => ({
              orderId: o._id,
              deliveryDate: o.deliveryDate,
              returnDate: o.returnDate
            }))
          }
        });
      }
    }

    const productIds = [...new Set(normalizedItems.map((i) => i.productId))];
    const products = await Product.find({ _id: { $in: productIds } });
    const productById = new Map(products.map((p) => [String(p._id), p]));

    const orderItems = [];
    let rentTotal = 0;
    let depositTotal = 0;
    let returnDate = "";

    for (const item of normalizedItems) {
      const product = productById.get(String(item.productId));
      if (!product) {
        return res.status(400).json({ message: "Invalid product in items" });
      }

      const duration = parseDurationLabel(item.durationLabel);
      if (!duration) {
        return res.status(400).json({ message: `Invalid plan duration: ${item.durationLabel}` });
      }

      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({ message: "Invalid unit price" });
      }

      // Pricing is an object, not an array - access by duration key
      const pricingKey = getPricingKeyFromLabel(item.durationLabel);
      
      // Validate that the plan exists for this product
      const matchedPrice = product.pricing?.[pricingKey];
      if (matchedPrice === undefined) {
        return res.status(400).json({ 
          message: `Invalid plan "${item.durationLabel}" for this product. Please remove and add again.`
        });
      }

      // Note: We allow orders to proceed even if cart price differs from current price
      // This handles cases where product prices changed after item was added to cart
      // The cart price is honored as the user agreed to it when adding to cart

      const itemReturnDate = addDurationYmd(deliveryDate, duration);
      if (!itemReturnDate) {
        return res.status(400).json({ message: "Unable to compute returnDate" });
      }

      if (!returnDate || itemReturnDate > returnDate) {
        returnDate = itemReturnDate;
      }

      const itemRent = unitPrice * item.quantity;
      rentTotal += itemRent;

      const unitDeposit = Number(product.deposit || 0);
      depositTotal += unitDeposit * item.quantity;

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        basePlan: {
          durationLabel: String(item.durationLabel),
          unitPrice,
          durationUnit: duration.unit,
          durationValue: duration.value,
        },
        returnDate: itemReturnDate,
        extensions: [],
      });
    }

    const transport = Number.isFinite(Number(req.body.transport)) ? Number(req.body.transport) : 200;
    const platformCharge = Number.isFinite(Number(req.body.platformCharge)) ? Number(req.body.platformCharge) : 20;

    const wantsInsurance =
      Boolean(req.body.insuranceSelected) || (Number.isFinite(Number(req.body.insurance)) && Number(req.body.insurance) > 0);
    const insurance = wantsInsurance ? Math.round(rentTotal * 0.1) : 0;

    const grandTotal = rentTotal + depositTotal + transport + platformCharge + insurance;

    const order = new Order({
      userId: authUserId,
      items: orderItems,
      rentTotal,
      depositTotal,
      transport,
      platformCharge,
      insurance,
      grandTotal,
      deliveryDate,
      returnDate,
      status: "Ongoing",
      deliveryAddress: {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        pincode: deliveryAddress.pincode,
        phone: deliveryAddress.phone,
      },
    });

    await order.save();
    await order.populate("items.productId");

    // Auto-create delivery tasks for each item in the order
    try {
      for (let i = 0; i < orderItems.length; i++) {
        const item = orderItems[i];
        const product = productById.get(String(item.productId));
        const lenderId = product ? product.userId : authUserId; // Product owner is the lender

        // Delivery task: lender -> renter
        const deliveryTask = new DeliveryTask({
          orderId: order._id,
          productId: item.productId,
          lenderId: lenderId,
          renterId: authUserId, // Renter is the order creator
          taskType: "delivery",
          status: "Waiting for Agent",
          paymentAmount: 75,
          pickupAddress: {
            street: deliveryAddress.street,
            city: deliveryAddress.city,
            state: deliveryAddress.state,
            pincode: deliveryAddress.pincode,
            phone: deliveryAddress.phone,
          },
          dropAddress: {
            street: deliveryAddress.street,
            city: deliveryAddress.city,
            state: deliveryAddress.state,
            pincode: deliveryAddress.pincode,
            phone: deliveryAddress.phone,
          },
          otp: generateOTP(),
          trackingLogs: [
            { status: "Waiting for Agent", notes: "Delivery task created for order" },
          ],
        });
        await deliveryTask.save();

        // Pickup task: renter -> lender (auto-scheduled for return)
        const pickupTask = new DeliveryTask({
          orderId: order._id,
          productId: item.productId,
          lenderId: lenderId,
          renterId: authUserId,
          taskType: "pickup",
          status: "Pickup Scheduled",
          paymentAmount: 75,
          pickupAddress: {
            street: deliveryAddress.street,
            city: deliveryAddress.city,
            state: deliveryAddress.state,
            pincode: deliveryAddress.pincode,
            phone: deliveryAddress.phone,
          },
          dropAddress: {
            street: deliveryAddress.street,
            city: deliveryAddress.city,
            state: deliveryAddress.state,
            pincode: deliveryAddress.pincode,
            phone: deliveryAddress.phone,
          },
          otp: generateOTP(),
          trackingLogs: [
            { status: "Pickup Scheduled", notes: "Return pickup auto-scheduled" },
          ],
        });
        await pickupTask.save();
      }
    } catch (taskErr) {
      console.error("Error creating delivery tasks:", taskErr);
      // Don't fail the order if task creation fails
    }

    // Best-effort: clear cart after order success
    await Cart.updateOne({ userId: String(authUserId) }, { $set: { items: [] } });

    res.json(order);
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ message: "Order error", error: err.message });
  }
});

// =======================
// GET USER ORDERS
// =======================
router.get("/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !isObjectIdHex(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    if (String(userId) !== String(req.user?.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const orders = await Order.find({ userId }).populate("items.productId").sort({ createdAt: -1 });
    
    // Populate OTP from delivery tasks for each order
    const ordersWithOtp = await Promise.all(orders.map(async (order) => {
      const orderObj = order.toObject ? order.toObject() : order;
      // Find delivery tasks for this order to get OTP
      const deliveryTasks = await DeliveryTask.find({ orderId: order._id, taskType: "delivery" });
      if (deliveryTasks && deliveryTasks.length > 0) {
        // Use the first delivery task's OTP (there should be one per item, but we'll show the first)
        orderObj.otp = deliveryTasks[0].otp;
        orderObj.deliveryTaskId = deliveryTasks[0]._id;
      } else {
        orderObj.otp = "";
        orderObj.deliveryTaskId = null;
      }
      return orderObj;
    }));
    
    // Auto-update order status to "Delivered" if delivery date has passed
    const todayIst = getTodayIstYmd();
    const updates = [];
    
    for (const order of orders) {
      if (order.status !== "Delivered" && order.deliveryDate && todayIst > order.deliveryDate) {
        order.status = "Delivered";
        order.deliveredAt = new Date();
        updates.push(order.save());
      }
    }
    
    if (updates.length) await Promise.allSettled(updates);
    
    res.json(ordersWithOtp);
  } catch (err) {
    res.status(500).json({ message: "Fetch orders failed" });
  }
});

// =======================
// EXTEND RENTAL (PER ITEM)
// =======================
router.post("/extend", requireAuth, async (req, res) => {
  try {
    const { orderId, itemId, selectedPlan } = req.body;

    if (!orderId || !isObjectIdHex(orderId)) {
      return res.status(400).json({ message: "Invalid orderId" });
    }

    if (!itemId || !isObjectIdHex(itemId)) {
      return res.status(400).json({ message: "Invalid itemId" });
    }

    const durationLabel = selectedPlan?.duration;
    const unitPrice = Number(selectedPlan?.price);

    if (!durationLabel || !Number.isFinite(unitPrice)) {
      return res.status(400).json({ message: "Invalid selectedPlan" });
    }

    const duration = parseDurationLabel(durationLabel);
    if (!duration) {
      return res.status(400).json({ message: "Invalid duration" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.userId) !== String(req.user?.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const product = await Product.findById(item.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Pricing is an object, not an array - access by duration key
    const pricingKey = getPricingKeyFromLabel(durationLabel);
    const matchedPrice = product.pricing?.[pricingKey];
    if (matchedPrice === undefined || Number(matchedPrice) !== unitPrice) {
      return res.status(400).json({ message: "Plan mismatch for product" });
    }

    const prevReturnDate = item.returnDate;
    const newReturnDate = addDurationYmd(prevReturnDate, duration);
    if (!newReturnDate) {
      return res.status(400).json({ message: "Unable to compute returnDate" });
    }

    // Prevent extension conflicts with other bookings for the same product
    const extensionConflict = await Order.findOne({
      _id: { $ne: order._id },
      status: "Ongoing",
      deliveryDate: { $lt: newReturnDate },
      items: {
        $elemMatch: {
          productId: product._id,
          returnDate: { $gt: prevReturnDate },
        },
      },
    }).select("_id deliveryDate returnDate");

    if (extensionConflict) {
      return res.status(409).json({
        message: "Cannot extend: conflicts with another booking for this product.",
        conflict: {
          orderId: extensionConflict._id,
          deliveryDate: extensionConflict.deliveryDate,
          returnDate: extensionConflict.returnDate,
        },
      });
    }

    item.returnDate = newReturnDate;
    item.extensions.push({
      durationLabel: String(durationLabel),
      unitPrice,
      durationUnit: duration.unit,
      durationValue: duration.value,
      extendedAt: new Date(),
    });

    const prevRentTotal = Number(order.rentTotal || 0);
    const extraRent = unitPrice * Number(item.quantity || 0);
    const nextRentTotal = prevRentTotal + extraRent;

    const hadInsurance = Number(order.insurance || 0) > 0;
    const prevInsurance = Number(order.insurance || 0);
    const nextInsurance = hadInsurance ? Math.round(nextRentTotal * 0.1) : 0;

    order.rentTotal = nextRentTotal;
    order.insurance = nextInsurance;

    const transport = Number(order.transport || 0);
    const platformCharge = Number(order.platformCharge || 0);
    const depositTotal = Number(order.depositTotal || 0);

    order.grandTotal = nextRentTotal + depositTotal + transport + platformCharge + nextInsurance;

    // Update order-level returnDate to max of items
    const maxReturn = (order.items || []).reduce((max, it) => (it.returnDate && it.returnDate > max ? it.returnDate : max), "");
    order.returnDate = maxReturn || order.returnDate;

    await order.save();
    await order.populate("items.productId");

     res.json(order);
   } catch (err) {
     res.status(500).json({ message: "Extend failed" });
   }
});

// =======================
// CANCEL ORDER
// =======================
router.post("/cancel", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId || !isObjectIdHex(orderId)) {
      return res.status(400).json({ message: "Invalid orderId" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.userId) !== String(req.user?.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Only allow cancellation of ongoing orders
    if (order.status !== "Ongoing") {
      return res.status(400).json({ message: "Only ongoing orders can be cancelled" });
    }

    order.status = "Cancelled";
    await order.save();
    await order.populate("items.productId");

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Cancel failed" });
  }
});

module.exports = router;
