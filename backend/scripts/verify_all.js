const path = require("path");
const modules = [
  "../controllers/deliveryController.js",
  "../controllers/lenderController.js",
  "../models/Commission.js",
  "../routes/lenderRoutes.js",
  "../models/Order.js",
  "../models/DeliveryTask.js",
  "../models/Product.js",
  "../models/User.js",
  "../models/DeliveryEarning.js",
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
if (ok) console.log("\nAll modules loaded successfully!");
else console.log("\nSome modules have errors!");