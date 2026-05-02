import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/cart.css";

function CartPage() {
  const [cart, setCart] = useState([]);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  // FETCH CART
  const fetchCart = useCallback(() => {
    if (!user) return;

    axios
      .get(`http://localhost:5000/api/cart/${user._id}`)
      .then((res) => setCart(res.data.items || []))
      .catch((err) => console.log(err));
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // REMOVE
  const handleRemove = async (productId, duration) => {
    await axios.post("http://localhost:5000/api/cart/remove", {
      userId: user._id,
      productId,
      duration,
    });

    fetchCart();
    window.dispatchEvent(new Event("cartUpdated"));
  };

  // UPDATE QTY
  const updateQty = async (productId, type, duration) => {
    await axios.post("http://localhost:5000/api/cart/update", {
      userId: user._id,
      productId,
      type,
      duration,
    });

    fetchCart();
    window.dispatchEvent(new Event("cartUpdated"));
  };

  // TOTAL
  const total = cart.reduce((sum, item) => {
    if (!item.productId) return sum;

    const price =
      item.selectedPlan?.price ??
      item.productId.price ??
      0;

    return sum + price * item.quantity;
  }, 0);

  return (
    <div className="cart-page">

      <h1>Your Cart 🛒</h1>

      <div className="cart-layout">

        {/* LEFT */}
        <div className="cart-list">

          {cart.length > 0 ? (
            cart.map((item) => {
              if (!item.productId) return null;

              const price =
                item.selectedPlan?.price ??
                item.productId.price ??
                0;

              return (
                <div className="cart-item" key={item._id}>

                  <img
                    src={item.productId.image}
                    alt="product"
                  />

                  <div className="cart-info">

                    <h3>{item.productId.name}</h3>

                    {/* ✅ PLAN */}
                    <p className="plan">
                      {item.selectedPlan?.duration}
                    </p>

                    <p className="price">₹{price}</p>

                    {/* QTY */}
                    <div className="qty-box">
                      <button
                        onClick={() =>
                          updateQty(
                            item.productId._id,
                            "dec",
                            item.selectedPlan?.duration
                          )
                        }
                      >
                        -
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        onClick={() =>
                          updateQty(
                            item.productId._id,
                            "inc",
                            item.selectedPlan?.duration
                          )
                        }
                      >
                        +
                      </button>
                    </div>

                    {/* REMOVE */}
                    <button
                      className="remove-btn"
                      onClick={() =>
                        handleRemove(
                          item.productId._id,
                          item.selectedPlan?.duration
                        )
                      }
                    >
                      Remove
                    </button>

                  </div>

                </div>
              );
            })
          ) : (
            <p>Cart is empty 😕</p>
          )}

        </div>

        {/* RIGHT */}
        <div className="cart-summary">

          <h2>Summary</h2>

          <p>Total Items: {cart.length}</p>

          <h3>Total: ₹{total}</h3>

          <button
            className="checkout-btn"
            onClick={() => navigate("/checkout")}
          >
            Proceed to Checkout
          </button>

        </div>

      </div>

    </div>
  );
}

export default CartPage;