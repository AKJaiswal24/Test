import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/orders.css";

function MyOrders() {
  const [orders, setOrders] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user) return;

    axios
      .get(`http://localhost:5000/api/orders/${user._id}`)
      .then((res) => setOrders(res.data || []))
      .catch((err) => console.log(err));
  }, [user]);

  // 🔥 EXTEND RENTAL
  const handleExtend = async (orderId) => {
    try {
      await axios.post("http://localhost:5000/api/orders/extend", {
        orderId,
      });

      alert("Rental extended by 1 month ✅");

      // refresh
      window.location.reload();
    } catch (err) {
      alert("Failed to extend ❌");
    }
  };

  return (
    <div className="orders-page">

      <h1>My Orders 📦</h1>

      {orders.length > 0 ? (
        orders.map((order, i) => (
          <div className="order-card" key={order._id}>

            {/* HEADER */}
            <div className="order-header">
              <h3>Order #{i + 1}</h3>

              <span
                className={`status ${
                  order.status === "Delivered"
                    ? "delivered"
                    : "ongoing"
                }`}
              >
                {order.status || "Ongoing"}
              </span>
            </div>

            {/* TOTAL */}
            <h2 className="order-price">₹{order.grandTotal}</h2>

            {/* ITEMS */}
            <div className="order-items">
              {order.items.map((item, j) => (
                <div key={j} className="order-item-row">
                  <p>
                    {item.productId?.name} × {item.quantity}
                  </p>

                  <span className="plan">
                    {item.duration}
                  </span>
                </div>
              ))}
            </div>

            {/* DATES */}
            <div className="order-dates">
              <p>
                Ordered:{" "}
                {new Date(order.createdAt).toLocaleDateString("en-IN")}
              </p>

              <p>
                Delivery:{" "}
                {order.deliveryDate
                  ? new Date(order.deliveryDate).toLocaleDateString("en-IN")
                  : "Not assigned"}
              </p>
            </div>

            {/* ACTION */}
            <button
              className="extend-btn"
              onClick={() => handleExtend(order._id)}
            >
              Extend Rental
            </button>

          </div>
        ))
      ) : (
        <p>No orders yet 😕</p>
      )}

    </div>
  );
}

export default MyOrders;