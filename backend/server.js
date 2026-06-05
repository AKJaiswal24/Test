"use strict";
const express = require('express');
const cron = require('node-cron');
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const errorHandler = require("./middleware/errorHandler");
const lenderRoutes = require("./routes/lenderRoutes");

const app = express();
app.disable("x-powered-by");

// CORS CONFIG (tight by default; add domains as you deploy)
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://your-frontend-domain.com",
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients / same-origin requests
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      const err = new Error("Not allowed by CORS");
      err.status = 403;
      return callback(err);
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "200kb" }));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/lender", lenderRoutes);
app.use("/api/negotiation", require("./routes/negotiationRoutes"));
app.use("/api/delivery", require("./routes/deliveryRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/uploads", express.static("uploads"));

app.use((req, res) => res.status(404).json({ message: "Not found" }));
app.use(errorHandler);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));



// ════════════════════════════════════════════════════════════════
// Daily cron: at 00:05 IST every day, promote pickup tasks whose
// returnDate has been reached  →  "Waiting for Agent"
// ════════════════════════════════════════════════════════════════
const { expirePickupsOnReturnDate, generateTasksForExpiredDeliveries } = require("./controllers/deliveryController");
const IST_OFFSET_MINUTES = 330; // UTC+5:30

// Schedule: 00:05 IST = 18:35 UTC the previous day
cron.schedule("35 18 * * *", async () => {
  try {
    const result = await expirePickupsOnReturnDate();
    if (result.activated > 0) {
      console.log(`[cron] ${result.activated} pickup task(s) activated for agents`);
    }
  } catch (err) {
    console.error("[cron] expirePickupsOnReturnDate:", err.message);
  }
});

// ════════════════════════════════════════════════════════════
// Every 5 min: scan Delivered orders past returnDate and
// auto-generate pickup (return to lender) or delivery (reuse
// for a new order) tasks.
// ════════════════════════════════════════════════════════════

cron.schedule("*/5 * * * *", async () => {
  try {
    const result = await generateTasksForExpiredDeliveries();
    const generated = Number(result.generated || 0);
    const activated = Number(result.activated || 0);
    if (generated > 0 || activated > 0) {
      console.log(`[cron] ${generated} return task(s) generated, ${activated} pickup task(s) activated`);
    }
    if (result.error || result.errors?.length) {
      console.error("[cron] generateTasksForExpiredDeliveries result:", result.error || result.errors);
    }
  } catch (err) {
    console.error("[cron] generateTasksForExpiredDeliveries:", err.message);
  }
});


const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`Server running on port ${port}`));
