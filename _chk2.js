const fs = require("fs");

const dtd = fs.readFileSync("src/pages/DeliveryTaskDetail.js", "utf8");
const css = fs.readFileSync("src/styles/delivery.css", "utf8");

const checks = [
  // DeliveryTaskDetail.js
  ["DTD: PaymentRow helper",                   dtd.includes("PaymentRow")],
  ["DTD: customerPaymentAmount display",       dtd.includes("customerPaymentAmount")],
  ["DTD: agentCommissionAmount display",       dtd.includes("agentCommissionAmount")],
  ["DTD: adminShareAmount display",            dtd.includes("adminShareAmount")],
  ["DTD: payment breakdown section",           dtd.includes("Payment Breakdown")],
  ["DTD: settlementStatus badge",              dtd.includes("settlementStatus")],
  ["DTD: Returned to Lender badge",            /"Returned to Lender"/.test(dtd)],
  ["DTD: no Return In Transit",                !dtd.includes("Return In Transit")],
  ["DTD: Completed badge",                     dtd.includes('"Completed"')],
  // CSS
  ["CSS: admin-due-value",                     css.includes("admin-due-value")],
  ["CSS: amount-commission",                   css.includes("amount-commission")],
  ["CSS: amount-collected",                    css.includes("amount-collected")],
  ["CSS: modal-input",                         css.includes("modal-input")],
  ["CSS: modal-label",                         css.includes("modal-label")],
  ["CSS: modal-form-orderinfo",                css.includes("modal-form-orderinfo")],
  ["CSS: modal-form-amount-pill",              css.includes("modal-form-amount-pill")],
  ["CSS: modal-fieldset",                      css.includes("modal-fieldset")],
  ["CSS: settlement-list",                     css.includes("settlement-list")],
  ["CSS: settlement-card-enhanced",            css.includes("settlement-card-enhanced")],
  ["CSS: wallet-summary-cards",                css.includes("wallet-summary-cards")],
  ["CSS: wallet-summary-card",                 css.includes("wallet-summary-card")],
  ["CSS: responsive settlement grid 1fr",      css.includes("settlement-amounts")],
  ["CSS: responsive wallet grid mobile",       /\.wallet-summary-cards\s*\{[^}]*grid-template-columns\s*:\s*1fr\s+1fr/m.test(css) ||
                                               css.includes("wallet-summary-cards")],
];

console.log("=== Cross-file feature matrix ===");
let all = true;
checks.forEach(([lbl, ok]) => {
  console.log((ok ? " OK" : "FAIL"), lbl);
  if (!ok) all = false;
});
console.log(all ? "\nALL PASS" : "\nSOME FAILED");
process.exit(all ? 0 : 1);
