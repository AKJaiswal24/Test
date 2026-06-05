const User = require("../models/User");

// Factory function to create authorization middleware for given roles
function authorize(...roles) {
  return async function (req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await User.findById(userId).select(
        "isLender isDeliveryAgent isAdmin verification_status"
      );
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const hasRole = roles.some((role) => {
        switch (role) {
          case "admin":
            return user.isAdmin === true;
          case "lender":
            return user.isLender === true;
          case "deliveryAgent":
            return user.isDeliveryAgent === true && user.verification_status === "approved";
          case "user":
            return true;
          default:
            return false;
        }
      });

      if (!hasRole) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };
}

module.exports = { authorize };