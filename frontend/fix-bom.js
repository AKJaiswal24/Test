const fs = require("fs");
const file = "src/pages/AgentDashboard.js";
const b = fs.readFileSync(file);
// Strip BOM if present (UTF-8: EF BB BF)
if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) {
  fs.writeFileSync(file, b.slice(3));
  console.log("stripped BOM");
} else {
  console.log("no BOM found");
}
