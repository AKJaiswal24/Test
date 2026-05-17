const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const { authorize } = require("../middleware/authorize");
const {
  getUserNotifications,
  markNotificationsRead,
} = require("../utils/notifications");

// Get notifications for current user
router.get("/", requireAuth, async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user?.id);
    const unreadCount = notifications.filter(n => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark all notifications as read
router.put("/read-all", requireAuth, async (req, res) => {
  try {
    await markNotificationsRead(req.user?.id);
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark specific notifications as read
router.put("/read", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ message: "ids must be an array" });
    }
    await markNotificationsRead(req.user?.id, ids);
    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;