const fs = require("fs");

// ---------- Backend ----------
const backendFiles = [
  "controllers/deliveryController.js",
  "controllers/walletController.js",
  "routes/walletRoutes.js",
  "routes/deliveryRoutes.js",
  "models/DeliveryTask.js",
  "models/AgentWallet.js",
  "models/Transaction.js",
  "models/Settlement.js",
];

console.log("=== Backend syntax ===");
backendFiles.forEach((f) => {
  try {
    require("module")._load(require("path").resolve(f));
    console.log(" OK", f);
  } catch (e) {
    // Syntax-only check via node --check
    const { execSync } = require("child_process");
    try {
      execSync(`node --check "${f}"`, { cwd: __dirname, stdio: "pipe" });
      console.log(" OK", f);
    } catch (e2) {
      console.log(" FAIL", f, "–", e2.message.split("\n")[0]);
    }
  }
});

// ---------- Frontend token checks ----------
const dash = fs.readFileSync("src/pages/AgentDashboard.js", "utf8");
const admin = fs.readFileSync("src/pages/AdminWallet.js", "utf8");

console.log("\n=== Frontend token checks ===");
const fc = [
  ["AD:dashboard", dash.includes("dashboard")],
  ["AD:deliveryForm state", dash.includes("const [deliveryForm, setDeliveryForm]")],
  ["AD:handleDeliverClick", dash.includes("handleDeliverClick")],
  ["AD:submitDeliveryForm", dash.includes("submitDeliveryForm")],
  ["AD:Complete Delivery modal", dash.includes("Complete Delivery")],
  ["AD:customerPayment input", dash.includes("customerPayment")],
  ["AD:OTP field", dash.includes("deliveryForm.otp")],
  ["AD:paymentConfirmed:true", dash.includes("paymentConfirmed: true")],
  ["AD:prompt() is gone", !dash.includes("prompt(")],
  ["AD:no Return In Transit", !dash.includes("Return In Transit")],
  ["AW:handleCompleteSettlement", admin.includes("handleCompleteSettlement")],
  ["AW:handleVerifySettlement", admin.includes("handleVerifySettlement")],
  ["AW:handleAdjustWallet", admin.includes("handleAdjustWallet")],
  ["AW:complete endpoint", admin.includes('/api/wallet/admin/settlement/complete')],
  ["AW:Complete Cycle btn", admin.includes("Complete Cycle")],
  ["AW:totalCommissionsPaid", admin.includes("totalCommissionsPaid")],
  ["AW:Adjust Balance modal", admin.includes("Adjust Balance for")],
  ["AW:auto-refresh 30s", admin.includes("30000")],
];

let all = true;
fc.forEach(([l, v]) => {
  console.log((v ? " OK" : "FAIL"), l);
  if (!v) all = false;
});
console.log(all ? "\nAll checks passed." : "\nSome checks FAILED — see above.");
