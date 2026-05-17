import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import "../styles/checkout.css";
import {
  addDaysYmd,
  addMonthsYmd,
  formatYmdToEnIn,
  getTomorrowIstYmd,
  isValidDeliveryDate,
} from "../utils/dateYmdIst";
import { parsePlanDuration } from "../utils/plan";
import { getDurationOptions } from "../utils/pricing";

const getMsUntilNextIstMidnight = () => {
  const IST_OFFSET_MS = 330 * 60 * 1000;
  const nowMs = Date.now();
  const istNow = new Date(nowMs + IST_OFFSET_MS);

  const nextIstMidnightShiftedUtcMs = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );

  const nextIstMidnightUtcMs = nextIstMidnightShiftedUtcMs - IST_OFFSET_MS;
  return Math.max(0, nextIstMidnightUtcMs - nowMs + 1000);
};

const getItemImageUrl = (product) =>
  product?.image || product?.images?.[0] || product?.thumbnail || "";

// Helper: derive durationLabel from duration value (fallback for old cart items)
const getDurationLabelFromValue = (duration) => {
  const options = getDurationOptions();
  const match = options.find(opt => opt.value === duration);
  return match?.label || "";
};

function CheckoutPage() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [isInsuranceSelected, setIsInsuranceSelected] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  
  // Address state
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
  });

  const [minDeliveryDate, setMinDeliveryDate] = useState(() => getTomorrowIstYmd());
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  const [cartError, setCartError] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

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
        setMinDeliveryDate(getTomorrowIstYmd());
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
        const response = await api.get(`/api/cart/${userId}`, {
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

  const {
    rentTotal,
    depositTotal,
    insuranceAmount,
    grandTotal,
    orderItems,
    orderReturnDate,
  } = useMemo(() => {
    const validItems = Array.isArray(cartItems)
      ? cartItems.filter((item) => item?.productId && Number(item?.quantity || 0) > 0)
      : [];

    const computedRentTotal = validItems.reduce((sum, item) => {
      const planPrice = item?.selectedPlan?.price;
      const unitPrice = Number.isFinite(Number(planPrice)) ? Number(planPrice) : 0;
      return sum + unitPrice * Number(item.quantity);
    }, 0);

    const computedDepositTotal = validItems.reduce((sum, item) => {
      const deposit = item?.productId?.deposit ?? 0;
      const unitDeposit = Number.isFinite(Number(deposit)) ? Number(deposit) : 0;
      return sum + unitDeposit * Number(item.quantity);
    }, 0);

    const computedInsurance = isInsuranceSelected ? Math.round(computedRentTotal * 0.1) : 0;

    const computedGrandTotal =
      computedRentTotal + computedDepositTotal + transport + platformCharge + computedInsurance;

let latestReturnDate = "";

       const payloadItems = validItems.map((item) => {
         const productId = item.productId._id;
         const quantity = Number(item.quantity);
   
         // Fallback: derive durationLabel from duration if missing (for old cart items)
         const durationLabel = item?.selectedPlan?.durationLabel 
           || getDurationLabelFromValue(item?.selectedPlan?.duration) 
           || "";
         const planPrice = item?.selectedPlan?.price;
         const unitPrice = Number.isFinite(Number(planPrice)) ? Number(planPrice) : 0;
   
         const parsedDuration = parsePlanDuration(durationLabel);

         let returnDate = "";
         if (deliveryDate && parsedDuration) {
           returnDate =
             parsedDuration.unit === "day"
               ? addDaysYmd(deliveryDate, parsedDuration.value)
               : addMonthsYmd(deliveryDate, parsedDuration.value);
         }

         if (returnDate && (!latestReturnDate || returnDate > latestReturnDate)) {
           latestReturnDate = returnDate;
         }

         return {
           productId,
           quantity,
           basePlan: {
             durationLabel,
             unitPrice,
             durationUnit: parsedDuration?.unit || "",
             durationValue: parsedDuration?.value || 0,
           },
           returnDate,
         };
       });

    return {
      rentTotal: computedRentTotal,
      depositTotal: computedDepositTotal,
      insuranceAmount: computedInsurance,
      grandTotal: computedGrandTotal,
      orderItems: payloadItems,
      orderReturnDate: latestReturnDate,
    };
  }, [cartItems, deliveryDate, isInsuranceSelected]);

  const requireLogin = useCallback(() => {
    if (userId) return true;
    alert("Please login first");
    navigate("/login");
    return false;
  }, [navigate, userId]);

  const validateDeliveryDateOrAlert = useCallback((selectedYmd) => {
    if (!selectedYmd) {
      alert("Please select delivery date");
      return false;
    }

    if (!isValidDeliveryDate(selectedYmd)) {
      alert("Please select delivery date from tomorrow onwards 🚚");
      return false;
    }

    return true;
  }, []);

  const clearCartOnServer = useCallback(async () => {
    if (!userId) return;
    try {
      await api.post("/api/cart/clear", { userId });
    } catch {
      // Best-effort: UI will still clear locally
    }
  }, [userId]);

  const handlePlaceOrder = async () => {
    if (!requireLogin()) return;
    if (isPlacingOrder) return;

    if (!cartItems.length) {
      alert("Your cart is empty");
      return;
    }

    // Validate address with specific length requirements
    const street = address.street.trim();
    const city = address.city.trim();
    const state = address.state.trim();
    const pincode = address.pincode.trim();
    const phone = address.phone.trim();

    if (!street || !city || !state || !pincode || !phone) {
      alert("Please fill in all address fields");
      return;
    }

    // Street: 20-100 characters
    if (street.length < 20 || street.length > 100) {
      alert("Street Address must be between 20 and 100 characters");
      return;
    }

    // City: max 15 characters
    if (city.length > 15) {
      alert("City must be 15 characters or less");
      return;
    }

    // State: max 20 characters
    if (state.length > 20) {
      alert("State must be 20 characters or less");
      return;
    }

    // Pincode: exactly 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      alert("Pincode must be exactly 6 digits");
      return;
    }

    // Phone: exactly 10 digits
    if (!/^\d{10}$/.test(phone)) {
      alert("Phone Number must be exactly 10 digits");
      return;
    }

    const isDateValid = validateDeliveryDateOrAlert(deliveryDate);
    if (!isDateValid) return;

    const itemsWithInvalidPlan = orderItems.filter(
      (item) => !item.basePlan.durationUnit || !item.basePlan.durationValue
    );

    if (itemsWithInvalidPlan.length > 0) {
      alert("One or more items have an invalid plan. Please remove and add again.");
      return;
    }

    const hasMissingReturnDate = orderItems.some((item) => !item.returnDate);
    if (hasMissingReturnDate || !orderReturnDate) {
      alert("Unable to calculate return date. Please re-select delivery date.");
      return;
    }

    // Check product availability
    try {
      const availabilityResponse = await api.post("/api/products/check-availability", {
        items: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          durationLabel: item.basePlan.durationLabel
        })),
        deliveryDate
      });

      if (!availabilityResponse.data.available) {
        const reasons = (availabilityResponse.data.unavailable || [])
          .map(u => `${u.productId ? 'Product ID: ' + u.productId.substring(0,8) + '...' : ''} ${u.reason || 'Unavailable'}`)
          .join('\n');
        alert(`Some products are not available for the selected dates:\n\n${reasons}\n\nPlease adjust your delivery date or remove unavailable items.`);
        return;
      }
    } catch (err) {
      console.error("Availability check failed:", err);
      alert("Failed to check product availability. Please try again.");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const response = await api.post("/api/orders/create", {
        userId,
        items: orderItems,
        rentTotal,
        depositTotal,
        transport,
        platformCharge,
        insurance: insuranceAmount,
        grandTotal,
        deliveryDate,
        returnDate: orderReturnDate,
        deliveryAddress: address,
      });

      if (response.data?.conflict) {
        const conflict = response.data.conflict;
        alert(`Order conflict:\n\n${conflict.productName || 'Product'} is already booked for the selected dates.\n\nPlease choose a different delivery date.`);
        setIsPlacingOrder(false);
        return;
      }

      await clearCartOnServer();
      setCartItems([]);
      window.dispatchEvent(new Event("cartUpdated"));

      alert("Order placed successfully ✅");
      navigate("/orders");
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      if (status === 409 && data?.conflict) {
        alert(`Booking conflict:\n\n${data.conflict.productName || 'Product'} is already rented for those dates.\n\nPlease adjust your delivery date.`);
      } else if (data?.message) {
        alert(`Order failed: ${data.message}`);
      } else {
        alert("Order failed ❌. Please try again.");
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

return (
     <div className="checkout-page">
       <button className="btn-home" onClick={() => navigate("/")}>← Back to Home</button>
      <h1>Checkout</h1>

      <div className="checkout-layout">
        <div className="checkout-items">
          {isLoadingCart ? (
            <p>Loading cart...</p>
          ) : cartError ? (
            <p>{cartError}</p>
          ) : cartItems.length === 0 ? (
            <p>Your cart is empty 😕</p>
          ) : (
            cartItems.map((item) => {
              const product = item?.productId;
              if (!product) return null;

              const quantity = Number(item?.quantity || 0);
              const durationLabel = item?.selectedPlan?.duration || "";
              const unitPrice = Number(item?.selectedPlan?.price || 0);
              const imageUrl = getItemImageUrl(product);

              return (
                <div className="checkout-item" key={item._id || product._id}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={product?.name || "product"} />
                  ) : (
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 10,
                        background: "#f3f4f6",
                      }}
                    />
                  )}

                  <div>
                    <h3>{product?.name || "Unnamed product"}</h3>
                    {durationLabel ? (
                      <p style={{ margin: 0, color: "#6b7280", fontSize: 12 }}>{durationLabel}</p>
                    ) : null}
                    <p>₹{unitPrice}</p>
                    <p>Qty: {quantity}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="checkout-summary">
          <h2>Payment Summary</h2>
          <p>Payment Method: Cash on Delivery (COD)</p>

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
              onFocus={() => setMinDeliveryDate(getTomorrowIstYmd())}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
            <p className="hint">* Delivery available from tomorrow onwards (IST)</p>
            {deliveryDate ? (
              <p className="hint">Selected: {formatYmdToEnIn(deliveryDate)}</p>
            ) : null}
          </div>

          {/* Address Form */}
          <div className="address-box">
            <h3>Delivery Address</h3>
            <input
              type="text"
              placeholder="Street Address (20-100 characters)"
              value={address.street}
              maxLength={100}
              onChange={(e) => setAddress({...address, street: e.target.value})}
            />
            <input
              type="text"
              placeholder="City (max 15 characters)"
              value={address.city}
              maxLength={15}
              onChange={(e) => setAddress({...address, city: e.target.value})}
            />
            <input
              type="text"
              placeholder="State (max 20 characters)"
              value={address.state}
              maxLength={20}
              onChange={(e) => setAddress({...address, state: e.target.value})}
            />
            <input
              type="text"
              placeholder="Pincode (6 digits)"
              value={address.pincode}
              maxLength={6}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setAddress({...address, pincode: val});
              }}
            />
            <input
              type="tel"
              placeholder="Phone Number (10 digits)"
              value={address.phone}
              maxLength={10}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setAddress({...address, phone: val});
              }}
            />
          </div>

          <label className="insurance-box">
            <input
              type="checkbox"
              checked={isInsuranceSelected}
              onChange={(e) => setIsInsuranceSelected(e.target.checked)}
            />
            Add Damage Protection (10%)
          </label>

          {isInsuranceSelected ? <p>Insurance: ₹{insuranceAmount}</p> : null}

          <hr />

          <h3>Total Payable: ₹{grandTotal}</h3>

          <button
            className="place-order-btn"
            onClick={handlePlaceOrder}
            disabled={!deliveryDate || isPlacingOrder || !cartItems.length}
          >
            {isPlacingOrder ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
