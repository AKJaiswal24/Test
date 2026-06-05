const jwt = require("jsonwebtoken");

const getBearerToken = (req) => {
  const header = req.headers?.authorization;
  if (!header || typeof header !== "string") return "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
};

module.exports = function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ message: "Server misconfigured" });

    const decoded = jwt.verify(token, secret);

    const userId = decoded?.id || decoded?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    req.user = { id: String(userId) };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

