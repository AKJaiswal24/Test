"use strict";
const fs = require("fs");
const path = require("path");

const filePath = "D:/demowork/start2rent/backend/controllers/deliveryController.js";
let code = fs.readFileSync(filePath, "utf8");
const lines = code.split("\n");
const result = [];
let skipUntilNextFunction = false;
let skipDepth = 0;
let i = 0;

// We'll do a targeted fix of the acceptDeliveryTask function
// Find the broken section and fix it

// Strategy: Parse line by line, track indentation context
// The broken lines are around 252-316 where indentation is inconsistent

while (i < lines.length) {
  const line = lines[i];

  // Find the start of acceptDeliveryTask function
  if (line.includes("const acceptDeliveryTask = async") || line.includes("const applyAsDeliveryAgent")) {
    // Once we hit a const function declaration, reset skip tracking
    skipUntilNextFunction = false;
    skipDepth = 0;
  }

  if (!skipUntilNextFunction) {
    // Check for broken indentation patterns in the acceptDeliveryTask function
    // Lines that have 8+ spaces of indent when they should have 6
    // Specifically lines 252-280 range in the original
    if (line.match(/^        if \(task\.status/) ||
        line.match(/^        \/\/ Prevent agent/) ||
        line.match(/^        \/\/ Check if agent/) ||
        line.match(/^        const activeTasks/) ||
        line.match(/^        if \(activeTasks/) ||
        line.match(/^        \/\/ Atomic:/) ||
        line.match(/^        const claimedTask/) ||
        line.match(/^        if \(!claimedTask/) ||
        line.match(/^        await addTrackingLog/) ||
        line.match(/^        \/\/ Notify lender/) ||
        line.match(/^        if \(String\(claimedTask\.lenderId\)/) ||
        line.match(/^        \/\/ Notify renter/) ||
        line.match(/^        if \(String\(claimedTask\.renterId\)/) ||
        line.match(/^        \/\/ OTP expiry/) ||
        line.match(/^        \/\/ Populate for response/) ||
        line.match(/^        await claimedTask\.populate/) ||
        line.match(/^        res\.json\(/)) {
      // These lines should have 6 spaces, not 8
      result.push("      " + line.trimStart());
      i++;
      continue;
    }

    // Check for lines that lost indentation entirely (start with `if` at column 0 or wrong level)
    // In the acceptDeliveryTask function body, these should be at 4 spaces (class method body)
    if (line.match(/^if \(task\.status !== "Waiting/) ||
        line.match(/^const claimedTask = await DeliveryTask\.findOneAndUpdate/)) {
      result.push("    " + line.trimStart());
      i++;
      continue;
    }

    // Fix lines starting with 7 spaces (should be 6 or 4)
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;
    if (trimmed.length > 0 && trimmed !== "}" && indent === 7) {
      result.push("      " + trimmed);
      i++;
      continue;
    }

    result.push(line);
  } else {
    result.push(line);
  }

  i++;
}

let fixedCode = result.join("\n");

// Also fix the duplicate `const role = ...` and `await addTrackingLog` issue
// Replace the broken acceptTask block with a properly indented one
const fixed = fixedCode.replace(
  /const acceptDeliveryTask = async \(req, res\) => \{[\s\S]*?try \{[\s\S]*?const agent = await User\.findById\(agentId\);[\s\S]*?if \(!agent \|\| agent\.isDeliveryAgent !== true \|\| agent\.verification_status !== "approved"\) \{[\s\S]*?return res\.status\(403\)\.json\(\{ message: "Not an approved delivery agent" \}\);[\s\S]*?\}[\s\S]*?if \(agent\.availability_status !== "available"\) \{[\s\S]*?return res\.status\(403\)\.json\(\{ message: "Agent not available" \}\);[\s\S]*?\}[\s\S]*?const task = await DeliveryTask\.findById\(taskId\);[\s\S]*?if \(!task\) \{[\s\S]*?return res\.status\(404\)\.json\(\{ message: "Task not found" \}\);[\s\S]*?\}[\s\S]*?if \(task\.status !== "Waiting for Agent"\) \{[\s\S]*?return res\.status\(400\)\.json\(\{ message: "Task already taken or processed" \}\);[\s\S]*?\}[\s\S]*?\/\/ Prevent agent from accepting their own order[\s\S]*?return res\.status\(400\)\.json\(\{ message: "Cannot accept delivery for your own order" \}\);[\s\S]*?\}[\s\S]*?\/\/ Check if agent already has an active task[\s\S]*?\}[\s\S]*?// Atomic: claim the task[\s\S]*?const claimedTask = await DeliveryTask\.findOneAndUpdate\(\[\s\S]*?\{ _id: taskId, status: "Waiting for Agent", agentId: null \},[\s\S]*?\{[\s\S]*?agentId,[\s\S]*?status: "Accepted",[\s\S]*?assignedAt: new Date\(\),[\s\S]*?\},[\s\S]*?\{ new: true \}[\s\S]*?\)[\s\S]*?if \(!claimedTask\) \{[\s\S]*?return res\.status\(400\)\.json\(\{ message: "Task was already claimed by another agent" \}\);[\s\S]*?\}[\s\S]*?await addTrackingLog\(claimedTask/gs,
  function() {
    // Use a marker approach - just ensure proper indentation around the known problematic lines
    return "const acceptDeliveryTask = async (req, res) => {\n  try {\n    const { taskId } = req.params;\n    const agentId = req.user?.id;\n\n    if (!taskId || !agentId) {\n      return res.status(400).json({ message: \"Missing taskId or agentId\" });\n    }\n\n    const agent = await User.findById(agentId);\n    if (!agent || agent.isDeliveryAgent !== true || agent.verification_status !== \"approved\") {\n      return res.status(403).json({ message: \"Not an approved delivery agent\" });\n    }\n\n    if (agent.availability_status !== \"available\") {\n      return res.status(403).json({ message: \"Agent not available\" });\n    }\n\n    const task = await DeliveryTask.findById(taskId);\n    if (!task) {\n      return res.status(404).json({ message: \"Task not found\" });\n    }\n\n    if (task.status !== \"Waiting for Agent\") {\n      return res.status(400).json({ message: \"Task already taken or processed\" });\n    }\n\n    // Prevent agent from accepting their own order (as lender or renter)\n    if (String(task.lenderId) === String(agentId) || String(task.renterId) === String(agentId)) {\n      return res.status(400).json({ message: \"Cannot accept delivery for your own order\" });\n    }\n\n    // Check if agent already has an active task (one task at a time)\n    const activeTasks = await DeliveryTask.countDocuments({\n      agentId,\n      status: { $in: [\"Waiting for Agent\", \"Accepted\", \"Picking Up Product\", \"In Transit\", \"Pickup Scheduled\", \"Return In Transit\"] },\n    });\n\n    if (activeTasks > 0) {\n      return res.status(400).json({ message: \"You already have an active task. Complete it first.\" });\n    }\n\n    // Atomic: claim the task only if still unclaimed\n    const claimedTask = await DeliveryTask.findOneAndUpdate(\n      { _id: taskId, status: \"Waiting for Agent\", agentId: null },\n      {\n        agentId,\n        status: \"Accepted\",\n        assignedAt: new Date(),\n        // Keep the OTP that was generated at order creation time.\n        // Do NOT regenerate - the OTP belongs to the user (renter) for delivery verification.\n      },\n      { new: true }\n    );\n\n    if (!claimedTask) {\n      return res.status(400).json({ message: \"Task was already claimed by another agent\" });\n    }\n\n    await addTrackingLog(claimedTask._id, claimedTask.orderId, \"Accepted\", `Task accepted by agent ${agent.name}`, agentId, \"agent\");\n\n    // Notify lender\n    if (String(claimedTask.lenderId) !== agentId) {\n      await notifyDeliveryAccepted(claimedTask.lenderId, claimedTask.orderId, claimedTask._id, agent.name);\n    }\n    // Notify renter\n    if (String(claimedTask.renterId) !== agentId) {\n      await notifyRenterDeliveryUpdate(claimedTask.renterId, claimedTask.orderId, claimedTask._id, \"Accepted\", agent.name);\n    }";
  }
);

// Also fix the populate/notification block after Accepted section
fixedCode = fixedCode.replace(
  // Fix remaining indentation issues with specific line patterns
  /\n       await claimedTask\.populate/g,
  () => "\n      await claimedTask.populate"
);

fixedCode = fixedCode.replace(
  /\n       res\.json\(\{/g,
  () => "\n      res.json({"
);

fs.writeFileSync(filePath, fixedCode, "utf8");
console.log("Delivery controller indentation fixed!");