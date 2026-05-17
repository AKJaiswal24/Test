require('dotenv').config({ path: "D:/demowork/start2rent/backend/.env" });
const path = require("path");

const modelsDir = "D:/demowork/start2rent/backend/models";

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.on("open", async () => {
  console.log("Connected to MongoDB");

  const Product = require(path.join(modelsDir, "Product"));
  const DeliveryTask = require(path.join(modelsDir, "DeliveryTask"));
  const Commission = require(path.join(modelsDir, "Commission"));
  const Order = require(path.join(modelsDir, "Order"));
  const User = require(path.join(modelsDir, "User"));

  console.log("=== USERS ===");
  const users = await User.find({}).limit(10);
  console.log("Users found:", users.length);
  users.forEach(u => console.log("  " + u._id + " | isLender: " + !!u.isLender + " | isAgent: " + !!u.isDeliveryAgent + " | name: " + u.name));

  console.log("=== PRODUCTS ===");
  const products = await Product.find({}).limit(10);
  console.log("Products found:", products.length);
  products.forEach(p => console.log("  " + p._id + " | userId: " + p.userId + " | name: " + p.name));

  console.log("=== ORDERS ===");
  const orders = await Order.find({}).limit(10);
  console.log("Orders found:", orders.length);

  console.log("=== DELIVERY TASKS ===");
  const tasks = await DeliveryTask.find({}).limit(20);
  console.log("Tasks found:", tasks.length);

  console.log("=== LENDER DASHBOARD QUERY ===");
  const lenderUsers = await User.find({ isLender: true });
  console.log("Lender users:", lenderUsers.length);

  if (lenderUsers.length > 0) {
    const lender = lenderUsers[0];
    console.log("Testing with lender: " + lender.name);

    const lenderProducts = await Product.find({ userId: lender._id });
    console.log("  Products: " + lenderProducts.length);

    const productIds = lenderProducts.map(p => p._id);

    const completedTasks = await DeliveryTask.find({
      productId: { $in: productIds },
      status: "Completed",
      taskType: "delivery",
    });
    console.log("  Completed delivery tasks: " + completedTasks.length);

    const activeTasks = await DeliveryTask.find({
      productId: { $in: productIds },
      status: { $in: ["Accepted", "Picking Up Product", "In Transit", "Delivered", "Pickup Scheduled", "Return In Transit"] },
    });
    console.log("  Active tasks: " + activeTasks.length);
  } else {
    console.log("No lender users found! This is the root problem.");
  }

  console.log("Done.");
  process.exit(0);
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error: " + err.message);
  process.exit(1);
});