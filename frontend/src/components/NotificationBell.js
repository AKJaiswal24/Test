import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

function NotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/api/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Silently fail
    }
  };

  const markAllRead = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      alert("Failed to mark as read");
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      delivery_assigned: "📦",
      delivery_accepted: "✅",
      delivery_picked_up: "🤲",
      delivery_in_transit: "🚚",
      delivery_delivered: "📍",
      delivery_completed: "✔️",
      pickup_scheduled: "📅",
      pickup_completed: "📥",
      return_in_transit: "🔄",
      returned_to_lender: "🏠",
      payment_collected: "💰",
      rental_extended: "⏰",
      agent_approved: "🎉",
      agent_rejected: "❌",
      system: "⚙️",
    };
    return icons[type] || "🔔";
  };

  const getTypeColor = (type) => {
    const colors = {
      delivery_assigned: "#3b82f6",
      delivery_accepted: "#22c55e",
      delivery_picked_up: "#f97316",
      delivery_in_transit: "#8b5cf6",
      delivery_delivered: "#10b981",
      delivery_completed: "#6b7280",
      pickup_scheduled: "#06b6d4",
      pickup_completed: "#10b981",
      return_in_transit: "#8b5cf6",
      returned_to_lender: "#10b981",
      payment_collected: "#eab308",
      rental_extended: "#f97316",
      agent_approved: "#22c55e",
      agent_rejected: "#ef4444",
      system: "#6b7280",
    };
    return colors[type] || "#6b7280";
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button className="bell-btn" onClick={() => setIsOpen(!isOpen)} title="Notifications">
        🔔
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h4>Notifications ({unreadCount} unread)</h4>
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="no-notifications">No notifications yet</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`notification-item ${!notif.read ? "unread" : ""}`}
                  onClick={() => {
                    if (!notif.read) {
                      api.put("/api/notifications/read", { ids: [notif._id] });
                      setNotifications((prev) =>
                        prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
                      );
                      setUnreadCount((c) => Math.max(0, c - 1));
                    }
                    if (notif.relatedOrderId) {
                      navigate(`/delivery/tasks/${notif.relatedOrderId}`);
                      setIsOpen(false);
                    }
                  }}
                >
                  <span className="notif-icon" style={{ color: getTypeColor(notif.type) }}>
                    {getNotificationIcon(notif.type)}
                  </span>
                  <div className="notif-content">
                    <div className="notif-title">{notif.title}</div>
                    <div className="notif-message">{notif.message}</div>
                    <div className="notif-time">
                      {new Date(notif.createdAt).toLocaleString("en-IN")}
                    </div>
                  </div>
                  {!notif.read && <span className="notif-dot"></span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;