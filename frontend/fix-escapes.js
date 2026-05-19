const fs = require("fs");
const file = "src/pages/AgentDashboard.js";
const t = fs.readFileSync(file, "utf8");

// All surrogate escapes already fixed above; only 4-char BMP escapes can remain
const lightning = "\u26A1";
const replaced = t.replace(/\\u26A1/g, lightning);

if (replaced !== t) fs.writeFileSync(file, replaced, "utf8");
console.log("done");
