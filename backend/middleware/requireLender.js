const User = require("../models/User");

module.exports = async function requireLender(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select("isLender");
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (user.isLender !== true) {
      return res.status(403).json({ message: "Lender access required" });
    }

    next();
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

