import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/checkout.css";

function CheckoutPage() {
  const [cart, setCart] = useState([]);
  const [insurance, setInsurance] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const transport = 200;

  // 🔥 FETCH CART
  useEffect(() => {
    if (!user) return;

    axios
      .get(`http://localhost:5000/api/cart/${user._id}`)
      .then((res) => setCart(res.data.items || []))
      .catch((err) => console.log(err));
  }, [user]);

  // 🔥 TOTAL CALCULATION (FIXED)
  const rentTotal = cart.reduce((sum, item) => {
    if (!item.productId) return sum;

    const price =
      item.selectedPlan?.price ??
      item.productId.price ??
      0;

    return sum + price * item.quantity;
  }, 0);

  const depositTotal = cart.reduce((sum, item) => {
    if (!item.productId) return sum;
    return sum + (item.productId.deposit || 0);
  }, 0);

  const insuranceCost = insurance ? Math.round(rentTotal * 0.1) : 0;

  const grandTotal =
    rentTotal + depositTotal + transport + insuranceCost;

  // 🔥 PLACE ORDER
  const handlePlaceOrder = async () => {
    if (!deliveryDate) {
      alert("Select delivery date");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/orders/create", {
        userId: user._id,

        // 🔥 FIXED ITEMS
        items: cart.map((item) => ({
          productId: item.productId._id,
          quantity: item.quantity,

          // ✅ IMPORTANT
          price:
            item.selectedPlan?.price ??
            item.productId.price ??
            0,

          duration: item.selectedPlan?.duration,
        })),

        rentTotal,
        depositTotal,
        transport,
        insurance: insuranceCost,
        grandTotal,
        deliveryDate,
      });

      alert("Order placed successfully ✅");

      window.dispatchEvent(new Event("cartUpdated"));

      navigate("/"); // no my rentals
    } catch (err) {
      console.log(err);
      alert("Order failed ❌");
    }
  };

  return (
    <div className="checkout-page">

      <h1>Checkout</h1>

      <div className="checkout-layout">

        {/* LEFT SIDE */}
        <div className="checkout-items">

          {cart.length > 0 ? (
            cart.map((item) => {
              if (!item.productId) return null;

              const price =
                item.selectedPlan?.price ??
                item.productId.price ??
                0;

              return (
                <div
                  className="checkout-item"
                  key={item._id}
                >
                  <img
                    src={item.productId.image}
                    alt="product"
                  />

                  <div>
                    <h3>{item.productId.name}</h3>

                    {/* 🔥 SHOW PLAN */}
                    <p>
                      <strong>
                        {item.selectedPlan?.duration}
                      </strong>
                    </p>

                    <p>₹{price}</p>
                    <p>Qty: {item.quantity}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p>Cart empty</p>
          )}

        </div>

        {/* RIGHT SIDE */}
        <div className="checkout-summary">

          <h2>Summary</h2>

          <p>Rent Total: ₹{rentTotal}</p>
          <p>Deposit: ₹{depositTotal}</p>
          <p>Transport: ₹{transport}</p>

          <label>
            <input
              type="checkbox"
              checked={insurance}
              onChange={() => setInsurance(!insurance)}
            />
            Add Insurance
          </label>

          <input
            type="date"
            value={deliveryDate}
            onChange={(e) =>
              setDeliveryDate(e.target.value)
            }
          />

          <h3>Total: ₹{grandTotal}</h3>

          <button onClick={handlePlaceOrder}>
            Place Order
          </button>

        </div>

      </div>

    </div>
  );
}

export default CheckoutPage;