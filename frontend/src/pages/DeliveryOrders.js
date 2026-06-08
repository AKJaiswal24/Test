import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useToast } from "../components/UI/Toast";
import "../styles/delivery.css";
import { formatYmdToEnIn } from "../utils/dateYmdIst";

function DeliveryOrders() {
  const navigate = useNavigate();
  const { addToast, ToastContainer } = useToast();
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  }, []);

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchOrders = async () => {
    if (!user?._id) {
      setFetchError("User id missing");
      setIsLoading(false);
      return;
    }
    try {
      setFetchError("");
      const res = await api.get(`/api/orders/${user._id}`);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setFetchError(err?.response?.data?.message || "Failed to load orders");
      addToast(err?.response?.data?.message || "Failed to load orders", "error");
      setOrders([]);
    } finally { setIsLoading(false); }
  };

  const getDeliveryStatus = (order) => {
    if (order.status === "Delivered") return { text: "Delivered", class: "badge-green" };
    if (order.status === "Ongoing") {
      const today = new Date().toISOString().split("T")[0];
      if (today > order.deliveryDate) return { text: "Out for Delivery", class: "badge-blue" };
      return { text: "Order Placed", class: "badge-yellow" };
    }
    return { text: order.status, class: "badge-gray" };
  };

  if (!user) return null;

  return (
    <div className="delivery-page">
      <ToastContainer />
      <button className="btn-home" onClick={() => navigate("/")} aria-label="Back to home">← Back to Home</button>
      <h2 className="section-title">🚚 My Orders & Delivery</h2>

      {fetchError && (
        <div className="delivery-card" style={{ border: "1px solid #fecaca", background: "#fff5f5" }}>
          <p style={{ color: "#991b1b", fontWeight: 800 }}>Error</p>
          <p style={{ color: "#7f1d1d" }}>{fetchError}</p>
          <button className={"/api/wallet/admin/wallet/points/approve/"} className="btn-view" onClick={fetchOrders}>Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-container" role="status" aria-live="polite"><div className="spinner"></div><p>Loading orders...</p></div>
      ) : !fetchError && orders.length === 0 ? (
        <div className="delivery-card">
          <div className="empty-state">
            <span>📦</span>
            <p>No orders yet</p>
            <small>Your upcoming and past rentals will appear here.</small>
          </div>
        </div>
      ) : (
        orders.map((order) => {
          const statusInfo = getDeliveryStatus(order);
          return (
            <div className="delivery-card order-tracking-card" key={order._id} onClick={() => navigate(`/delivery/tasks/${order._id}`)}>
              <div className="order-tracking-header">
                <span className="order-id">Order #{String(order._id).substring(0, 8)}</span>
                <span className={`status-badge ${statusInfo.class}`}>{statusInfo.text}</span>
              </div>
              <div className="order-tracking-items">
                {(order.items || []).map((item, i) => (
                  <div className="order-tracking-item" key={item._id || i}>
                    <span className="item-name">{item?.productId?.name || "Unknown"}</span>
                    <span className="item-plan">×{item.quantity} | {item.basePlan?.durationLabel || ""} | Return: {formatYmdToEnIn(item.returnDate)}</span>
                  </div>
                ))}
              </div>
              <div className="order-tracking-footer">
                <span>Total: ₹{order.grandTotal}</span>
                <button className="btn-view" onClick={(e) => { e.stopPropagation(); navigate(`/delivery/tasks/${order._id}`); }}>Track Delivery →</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default DeliveryOrders;