const path = require("path");
const fs = require("fs");

// Remove this temporary verification script
const scriptPath = path.join(__dirname, "scripts", "verify.js");
if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);

const modules = [
  "../controllers/deliveryController.js",
  "../controllers/lenderController.js",
  "../models/Commission.js",
  "../routes/lenderRoutes.js",
  "../routes/deliveryRoutes.js",
  "../models/Order.js",
  "../models/DeliveryTask.js",
  "../models/Product.js",
  "../models/User.js",
  "../models/DeliveryEarning.js",
  "../models/Notification.js",
  "../server.js",
];
let ok = true;
for (const m of modules) {
  try {
    require(path.join(__dirname, m));
    console.log(`OK: ${m}`);
  } catch (e) {
    console.log(`ERROR: ${m} - ${e.message}`);
    ok = false;
  }
}
if (ok) console.log("\nAll modules + server loaded successfully!");
else console.log("\nSome modules have errors!");