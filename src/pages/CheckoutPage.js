import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/checkout.css";

const API_BASE_URL = "http://localhost:5000";
const IST_OFFSET_MINUTES = 330; // IST = UTC + 05:30 (no DST)
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (value) => String(value).padStart(2, "0");
const formatYmd = (year, month, day) => `${year}-${pad2(month)}-${pad2(day)}`;

const getDaysInMonth = (year, month1Based) =>
  new Date(Date.UTC(year, month1Based, 0)).getUTCDate();

const parseYmd = (ymd) => {
  if (!YMD_REGEX.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12) return null;
  const dim = getDaysInMonth(y, m);
  if (d < 1 || d > dim) return null;
  return { year: y, month: m, day: d };
};

const addDaysToYmd = (ymd, daysToAdd) => {
  const parsed = parseYmd(ymd);
  if (!parsed) return null;
  const dateUtc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  dateUtc.setUTCDate(dateUtc.getUTCDate() + daysToAdd);
  return formatYmd(dateUtc.getUTCFullYear(), dateUtc.getUTCMonth() + 1, dateUtc.getUTCDate());
};

const addMonthsToYmd = (ymd, monthsToAdd) => {
  const parsed = parseYmd(ymd);
  if (!parsed) return null;

  let targetYear = parsed.year;
  let targetMonth = parsed.month + monthsToAdd; // 1-based

  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }
  while (targetMonth < 1) {
    targetMonth += 12;
    targetYear -= 1;
  }

  const targetDim = getDaysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(parsed.day, targetDim);

  return formatYmd(targetYear, targetMonth, targetDay);
};

const getTodayIstYmd = () => {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return formatYmd(istNow.getUTCFullYear(), istNow.getUTCMonth() + 1, istNow.getUTCDate());
};

const getTomorrowMinDateIst = () => addDaysToYmd(getTodayIstYmd(), 1) || "";

const getMsUntilNextIstMidnight = () => {
  const nowMs = Date.now();
  const istNow = new Date(nowMs + IST_OFFSET_MS);

  const nextMidnightShiftedUtcMs = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );

  const nextMidnightUtcMs = nextMidnightShiftedUtcMs - IST_OFFSET_MS;
  return Math.max(0, nextMidnightUtcMs - nowMs + 1000);
};

const getProductPrice = (product) => {
  const price = product?.price ?? product?.pricePerMonth ?? product?.pricing?.[0]?.price ?? 0;
  return Number.isFinite(Number(price)) ? Number(price) : 0;
};

const getItemUnitPrice = (item) => {
  if (item?.selectedPlan?.price !== undefined) {
    return Number(item.selectedPlan.price);
  }

  console.warn("Missing selectedPlan → fallback triggered", item);
  return 0; // ❌ DO NOT fallback to product price
};

const getProductDeposit = (product) => {
  const deposit = product?.deposit ?? 0;
  return Number.isFinite(Number(deposit)) ? Number(deposit) : 0;
};

function CheckoutPage() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [isInsuranceSelected, setIsInsuranceSelected] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");

  const [minDeliveryDate, setMinDeliveryDate] = useState(() => getTomorrowMinDateIst());
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [cartError, setCartError] = useState("");

  const transport = 200;
  const platformCharge = 20;

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const userId = user?._id || "";

  useEffect(() => {
    let timeoutId = null;

    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        setMinDeliveryDate(getTomorrowMinDateIst());
        schedule();
      }, getMsUntilNextIstMidnight());
    };

    schedule();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setCartItems([]);
      return;
    }

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;

    const fetchCart = async () => {
      setIsLoadingCart(true);
      setCartError("");
      try {
        const response = await axios.get(`${API_BASE_URL}/api/cart/${userId}`, {
          ...(controller ? { signal: controller.signal } : {}),
        });

        const items = response?.data?.items;
        setCartItems(Array.isArray(items) ? items : []);
      } catch (error) {
        const aborted = controller?.signal?.aborted;
        if (!aborted) {
          setCartError("Failed to load cart. Please try again.");
          setCartItems([]);
        }
      } finally {
        setIsLoadingCart(false);
      }
    };

    fetchCart();

    return () => {
      if (controller) controller.abort();
    };
  }, [userId]);

  const { rentTotal, depositTotal, insuranceAmount, grandTotal, orderItems } = useMemo(() => {
    const validItems = Array.isArray(cartItems)
      ? cartItems.filter((item) => item?.productId && Number(item?.quantity || 0) > 0)
      : [];

    const computedRentTotal = validItems.reduce((sum, item) => {
      const unitPrice = getItemUnitPrice(item);
      return sum + unitPrice * Number(item.quantity);
    }, 0);

    const computedDepositTotal = validItems.reduce((sum, item) => {
      const deposit = getProductDeposit(item.productId);
      return sum + deposit * Number(item.quantity);
    }, 0);

    const computedInsurance = isInsuranceSelected ? Math.round(computedRentTotal * 0.1) : 0;

    const computedGrandTotal =
      computedRentTotal +
      computedDepositTotal +
      transport +
      platformCharge +
      computedInsurance;

const payloadItems = validItems.map((item) => ({
  productId: item.productId._id,
  quantity: Number(item.quantity),

  // 🔥 STRICT PLAN DATA
  price: item.selectedPlan?.price ?? 0,
  duration: item.selectedPlan?.duration ?? "",
}));

    return {
      rentTotal: computedRentTotal,
      depositTotal: computedDepositTotal,
      insuranceAmount: computedInsurance,
      grandTotal: computedGrandTotal,
      orderItems: payloadItems,
    };
  }, [cartItems, isInsuranceSelected, transport, platformCharge]);

  const validateDeliveryDateOrAlert = (selectedYmd) => {
    if (!selectedYmd) {
      alert("Please select delivery date");
      return false;
    }

    const parsed = parseYmd(selectedYmd);
    if (!parsed) {
      alert("Please select a valid delivery date");
      return false;
    }

    const currentMin = getTomorrowMinDateIst();
    if (!currentMin || selectedYmd < currentMin) {
      alert("Please select delivery date from tomorrow onwards 🚚");
      return false;
    }

    return true;
  };

  const clearCartOnServer = useCallback(async () => {
    if (!userId) return;

    try {
      await axios.post(`${API_BASE_URL}/api/cart/clear`, { userId });
      return;
    } catch {
      const itemsToRemove = (Array.isArray(cartItems) ? cartItems : [])
        .filter((item) => item?.productId?._id)
        .map((item) => ({
          productId: item.productId._id,
          duration: item?.selectedPlan?.duration,
        }));

      if (!itemsToRemove.length) return;

      await Promise.allSettled(
        itemsToRemove.map(({ productId, duration }) =>
          axios.post(`${API_BASE_URL}/api/cart/remove`, {
            userId,
            productId,
            ...(duration ? { duration } : {}),
          })
        )
      );
    }
  }, [userId, cartItems]);

  const handlePlaceOrder = async () => {
    if (!userId) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    if (isPlacingOrder) return;

    if (!orderItems.length) {
      alert("Your cart is empty");
      return;
    }

    const isValid = validateDeliveryDateOrAlert(deliveryDate);
    if (!isValid) return;

    const returnDate = addMonthsToYmd(deliveryDate, 1);
    if (!returnDate) {
      alert("Unable to calculate return date. Please re-select delivery date.");
      return;
    }

    setIsPlacingOrder(true);
    try {
      await axios.post(`${API_BASE_URL}/api/orders/create`, {
        userId,
        items: orderItems,
        rentTotal,
        depositTotal,
        transport,
        insurance: insuranceAmount,
        grandTotal,
        deliveryDate,
        returnDate,
      });

      await clearCartOnServer();
      setCartItems([]);
      window.dispatchEvent(new Event("cartUpdated"));

      alert("Order placed successfully ✅");
      navigate("/orders");
    } catch {
      alert("Order failed ❌");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <div className="checkout-layout">
        <div className="checkout-items">
          {isLoadingCart ? (
            <p>Loading cart...</p>
          ) : cartError ? (
            <p>{cartError}</p>
          ) : cartItems.length > 0 ? (
            cartItems.map((item) => {
              const product = item?.productId;
              if (!product) return null;

              const unitPrice = getItemUnitPrice(item);
              const quantity = Number(item?.quantity || 0);
              const duration = item?.selectedPlan?.duration || "";

              const imageUrl = product?.image || product?.images?.[0] || product?.thumbnail || "";

              return (
                <div className="checkout-item" key={item._id || product._id}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={product?.name || "product"} />
                  ) : (
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        background: "#f2f2f2",
                        borderRadius: 8,
                      }}
                    />
                  )}

                  <div>
                    <h3>{product?.name || "Unnamed product"}</h3>
                    {duration ? (
  <p style={{ margin: 0, color: "#6b7280", fontWeight: "500" }}>
    Plan: {duration}
  </p>
) : (
  <p style={{ color: "red" }}>⚠ Plan missing</p>
)}
                    <p>₹{unitPrice}</p>
                    <p>Qty: {quantity}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p>Your cart is empty 😕</p>
          )}
        </div>

        <div className="checkout-summary">
          <h2>Payment Summary</h2>

          <p>Rent Total: ₹{rentTotal}</p>
          <p>Security Deposit: ₹{depositTotal}</p>
          <p>Transportation: ₹{transport}</p>
          <p>Platform Charge: ₹{platformCharge}</p>

          <div className="delivery-box">
            <label htmlFor="delivery-date">Select Delivery Date</label>
            <input
              id="delivery-date"
              type="date"
              value={deliveryDate}
              min={minDeliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
            <p style={{ fontSize: "12px", color: "gray" }}>
              * Delivery available from tomorrow onwards (IST)
            </p>
          </div>

          <label className="insurance-box">
            <input
              type="checkbox"
              checked={isInsuranceSelected}
              onChange={(e) => setIsInsuranceSelected(e.target.checked)}
            />
            Add Damage Protection (10%)
          </label>

          {isInsuranceSelected && <p>Insurance: ₹{insuranceAmount}</p>}

          <hr />

          <h3>Total Payable: ₹{grandTotal}</h3>

          <button
            className="place-order-btn"
            onClick={handlePlaceOrder}
            disabled={!deliveryDate || isPlacingOrder || !orderItems.length}
          >
            {isPlacingOrder ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
