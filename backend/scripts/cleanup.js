const path = require("path");
const fs = require("fs");
const scriptPath = path.join(__dirname, "scripts", "verify.js");
if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
console.log("Cleanup complete");