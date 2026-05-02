import React, { useEffect, useState } from "react";
import axios from "axios";

function MyOrders() {
  const [orders, setOrders] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user) return;

    axios
      .get(`http://localhost:5000/api/orders/${user._id}`)
      .then((res) => setOrders(res.data))
      .catch((err) => console.log(err));
  }, [user]);

  return (
    <div style={{ padding: "30px" }}>
      <h1>My Orders 📦</h1>

      {orders.length > 0 ? (
        orders.map((order, i) => (
          <div key={i} style={{
            background: "white",
            padding: "15px",
            marginTop: "10px",
            borderRadius: "10px"
          }}>
            <h3>Total: ₹{order.grandTotal}</h3>

            {order.items.map((item, j) => (
              <p key={j}>
                {item.productId?.name} × {item.quantity}
              </p>
            ))}
          </div>
        ))
      ) : (
        <p>No orders yet</p>
      )}
    </div>
  );
}

export default MyOrders;