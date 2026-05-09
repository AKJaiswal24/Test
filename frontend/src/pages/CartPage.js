import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import "../styles/cart.css";

function CartPage() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mutatingKey, setMutatingKey] = useState("");

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const userId = user?._id || "";

  const getItemKey = useCallback((item) => {
    const productId = item?.productId?._id || "unknown";
    const duration = item?.selectedPlan?.duration || "default";
    return `${productId}_${duration}`;
  }, []);

  const getItemUnitPrice = useCallback((item) => {
    const planPrice = item?.selectedPlan?.price;
    if (Number.isFinite(Number(planPrice))) return Number(planPrice);

    const productPrice = item?.productId?.price ?? 0;
    return Number.isFinite(Number(productPrice)) ? Number(productPrice) : 0;
  }, []);

  const getItemDeposit = useCallback((item) => {
    const deposit = item?.productId?.deposit ?? 0;
    return Number.isFinite(Number(deposit)) ? Number(deposit) : 0;
  }, []);

  const getItemImageUrl = useCallback(
    (item) =>
      item?.productId?.image ||
      item?.productId?.images?.[0] ||
      item?.productId?.thumbnail ||
      "",
    []
  );

  const fetchCart = useCallback(
    async (options = {}) => {
      if (!userId) {
        setCartItems([]);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await api.get(`/api/cart/${userId}`, {
          ...(options?.signal ? { signal: options.signal } : {}),
        });

        const items = response?.data?.items;
        setCartItems(Array.isArray(items) ? items : []);
      } catch (error) {
        const aborted = options?.signal?.aborted;
        if (!aborted) {
          setErrorMessage("Failed to load cart. Please try again.");
          setCartItems([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;

    fetchCart({ ...(controller ? { signal: controller.signal } : {}) });

    const handleCartUpdated = () => fetchCart();
    window.addEventListener("cartUpdated", handleCartUpdated);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdated);
      if (controller) controller.abort();
    };
  }, [fetchCart]);

  const requireLogin = useCallback(() => {
    if (userId) return true;
    alert("Please login first");
    navigate("/login");
    return false;
  }, [navigate, userId]);

  const handleRemove = useCallback(
    async (item) => {
      if (!requireLogin()) return;

      const productId = item?.productId?._id;
      if (!productId) return;

      const key = getItemKey(item);
      setMutatingKey(key);
      setErrorMessage("");

      try {
        await api.post("/api/cart/remove", {
          userId,
          productId,
          duration: item?.selectedPlan?.duration,
        });

        await fetchCart();
        window.dispatchEvent(new Event("cartUpdated"));
      } catch {
        setErrorMessage("Failed to remove item. Please try again.");
      } finally {
        setMutatingKey("");
      }
    },
    [fetchCart, getItemKey, requireLogin, userId]
  );

  const updateQty = useCallback(
    async (item, type) => {
      if (!requireLogin()) return;

      const productId = item?.productId?._id;
      if (!productId) return;

      const key = getItemKey(item);
      setMutatingKey(key);
      setErrorMessage("");

      try {
        await api.post("/api/cart/update", {
          userId,
          productId,
          type,
          duration: item?.selectedPlan?.duration,
        });

        await fetchCart();
        window.dispatchEvent(new Event("cartUpdated"));
      } catch {
        setErrorMessage("Failed to update quantity. Please try again.");
      } finally {
        setMutatingKey("");
      }
    },
    [fetchCart, getItemKey, requireLogin, userId]
  );

  const { totalQuantity, rentSubtotal, depositTotal } = useMemo(() => {
    const validItems = Array.isArray(cartItems)
      ? cartItems.filter((item) => item?.productId && Number(item?.quantity || 0) > 0)
      : [];

    const qty = validItems.reduce((sum, item) => sum + Number(item.quantity), 0);

    const rent = validItems.reduce((sum, item) => {
      const unitPrice = getItemUnitPrice(item);
      return sum + unitPrice * Number(item.quantity);
    }, 0);

    const deposit = validItems.reduce((sum, item) => {
      const unitDeposit = getItemDeposit(item);
      return sum + unitDeposit * Number(item.quantity);
    }, 0);

    return { totalQuantity: qty, rentSubtotal: rent, depositTotal: deposit };
  }, [cartItems, getItemDeposit, getItemUnitPrice]);

  const handleCheckout = () => {
    if (!requireLogin()) return;
    if (!cartItems.length) return;
    navigate("/checkout");
  };

  return (
    <div className="cart-page">
      <div className="cart-header">
        <div>
          <h1>Your Cart</h1>
          <p className="cart-subtitle">Review your items and proceed to checkout.</p>
        </div>
      </div>

      <div className="cart-grid">
        <div className="cart-list">
          {isLoading ? (
            <div className="cart-state">Loading cart...</div>
          ) : errorMessage ? (
            <div className="cart-state cart-error">{errorMessage}</div>
          ) : cartItems.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-title">Cart is empty</div>
              <div className="cart-empty-text">Add items to your cart to see them here.</div>
            </div>
          ) : (
            cartItems.map((item) => {
              const product = item?.productId;
              if (!product) return null;

              const key = getItemKey(item);
              const isMutating = mutatingKey === key;

              const unitPrice = getItemUnitPrice(item);
              const quantity = Number(item?.quantity || 0);
              const duration = item?.selectedPlan?.duration || "";
              const lineTotal = unitPrice * quantity;
              const imageUrl = getItemImageUrl(item);

              return (
                <div className="cart-card" key={key}>
                  <div className="cart-card-media">
                    {imageUrl ? (
                      <img className="cart-image" src={imageUrl} alt={product?.name || "product"} />
                    ) : (
                      <div className="cart-image-placeholder" />
                    )}
                  </div>

                  <div className="cart-card-content">
                    <div className="cart-card-top">
                      <div>
                        <h3 className="cart-title">{product?.name || "Unnamed product"}</h3>
                        {duration ? <span className="cart-badge">{duration}</span> : null}
                      </div>

                      <button
                        type="button"
                        className="cart-remove"
                        onClick={() => handleRemove(item)}
                        disabled={isMutating}
                        aria-label={`Remove ${product?.name || "item"}`}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="cart-meta">
                      <div className="cart-meta-row">
                        <span className="cart-meta-label">Total</span>
                        <span className="cart-meta-strong">₹{lineTotal}</span>
                      </div>
                    </div>

                    <div className="cart-qty">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => updateQty(item, "dec")}
                        disabled={isMutating || quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>

                      <div className="qty-value" aria-label="Quantity">
                        {quantity}
                      </div>

                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => updateQty(item, "inc")}
                        disabled={isMutating}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="cart-summary">
          <div className="summary-card">
            <h2>Summary</h2>

            <div className="summary-row">
              <span>Items</span>
              <span>{totalQuantity}</span>
            </div>

            <div className="summary-row">
              <span>Rent Subtotal</span>
              <span>₹{rentSubtotal}</span>
            </div>

            <div className="summary-row">
              <span>Security Deposit</span>
              <span>₹{depositTotal}</span>
            </div>

            <div className="summary-divider" />

            <button
              type="button"
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={!cartItems.length || isLoading}
            >
              Proceed to Checkout
            </button>

            <p className="summary-note">
              Delivery date and final charges (transport/insurance/platform) will be selected at
              checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
