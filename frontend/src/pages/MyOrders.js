import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import "../styles/orders.css";
import { formatYmdToEnIn } from "../utils/dateYmdIst";

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeExtend, setActiveExtend] = useState(null);
  const [isExtending, setIsExtending] = useState(false);

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const userId = user?._id || "";

  const fetchOrders = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get(`/api/orders/${userId}`);
      setOrders(Array.isArray(response?.data) ? response.data : []);
    } catch {
      setErrorMessage("Failed to load orders. Please try again.");
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleExtend = (orderId, itemId) => {
    const next = orderId && itemId ? { orderId, itemId } : null;
    setActiveExtend((prev) => {
      if (!prev) return next;
      if (prev.orderId === orderId && prev.itemId === itemId) return null;
      return next;
    });
  };

  const handleExtend = async ({ orderId, itemId, selectedPlan }) => {
    if (!orderId || !itemId || !selectedPlan?.duration || selectedPlan?.price == null) {
      alert("Please select a valid plan to extend.");
      return;
    }

    if (isExtending) return;

    try {
      setIsExtending(true);

      const response = await api.post("/api/orders/extend", {
        orderId,
        itemId,
        selectedPlan: {
          duration: selectedPlan.duration,
          price: selectedPlan.price,
        },
      });

      const updatedOrder = response?.data;
      if (updatedOrder?._id) {
        setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
      } else {
        await fetchOrders();
      }

      alert("Rental extended ✅");
      setActiveExtend(null);
    } catch {
      alert("Failed to extend ❌");
    } finally {
      setIsExtending(false);
    }
  };

  return (
    <div className="orders-page">
      <h1>My Orders</h1>

      {isLoading ? (
        <div className="orders-state">Loading orders...</div>
      ) : errorMessage ? (
        <div className="orders-state orders-error">{errorMessage}</div>
      ) : orders.length === 0 ? (
        <div className="orders-state">No orders yet 😕</div>
      ) : (
        orders.map((order, index) => {
          const deliveryLabel = order?.deliveryDate ? formatYmdToEnIn(order.deliveryDate) : "";
          const statusLabel = order?.status || "Ongoing";

          return (
            <div className="order-card" key={order._id}>
              <div className="order-header">
                <div>
                  <h3>Order #{index + 1}</h3>
                  <p className="order-sub">
                    Ordered:{" "}
                    {order?.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "-"}
                  </p>
                </div>

                <span
                  className={`status ${statusLabel === "Delivered" ? "delivered" : "ongoing"}`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="order-topline">
                <div className="order-total">
                  <div className="order-total-label">Grand Total</div>
                  <div className="order-total-value">₹{order?.grandTotal ?? 0}</div>
                </div>

                <div className="order-delivery">
                  <div className="order-total-label">Delivery Date</div>
                  <div className="order-delivery-value">{deliveryLabel || "Not assigned"}</div>
                </div>
              </div>

              <div className="order-items">
                {(order?.items || []).map((item) => {
                  const product = item?.productId;
                  if (!product) return null;

                  const itemId = item?._id;
                  const imageUrl = product?.image || product?.images?.[0] || product?.thumbnail || "";

                  const baseLabel =
                    item?.basePlan?.durationLabel ||
                    item?.duration ||
                    item?.selectedPlan?.duration ||
                    "";

                  const basePrice =
                    item?.basePlan?.unitPrice ?? item?.price ?? item?.selectedPlan?.price ?? 0;

                  const returnDateLabel = item?.returnDate ? formatYmdToEnIn(item.returnDate) : "";

                  const isExtendOpen =
                    Boolean(activeExtend) &&
                    activeExtend.orderId === order._id &&
                    activeExtend.itemId === itemId;

                  return (
                    <div className="order-item" key={itemId || `${order._id}_${product._id}`}>
                      {imageUrl ? (
                        <img className="order-item-img" src={imageUrl} alt={product?.name || "product"} />
                      ) : (
                        <div className="order-item-img placeholder" />
                      )}

                      <div className="order-item-info">
                        <div className="order-item-title">{product?.name || "Unnamed product"}</div>
                        <div className="order-item-meta">
                          <span>Qty: {item?.quantity ?? 0}</span>
                          {baseLabel ? <span className="chip">{baseLabel}</span> : null}
                          <span>₹{basePrice}</span>
                        </div>
                        <div className="order-item-meta">
                          <span className="muted">
                            Return: {returnDateLabel || "Not available"}
                          </span>
                        </div>

                        <div className="order-item-actions">
                          <button
                            type="button"
                            className="extend-btn"
                            onClick={() => toggleExtend(order._id, itemId)}
                            disabled={!itemId || isExtending}
                          >
                            {isExtendOpen ? "Close" : "Extend Rental"}
                          </button>
                        </div>

{isExtendOpen ? (
                           <div className="extend-box">
                             <div className="extend-title">Choose extension plan</div>
                             <div className="extend-plans">
                               {Object.entries(product?.pricing || {}).map(([key, price]) => {
                                 const duration = key === "daily" ? "Daily" : 
                                   key === "weekly" ? "Weekly" : 
                                   key === "monthly" ? "Monthly" : 
                                   key === "3_months" ? "3 Months" : 
                                   key === "6_months" ? "6 Months" : 
                                   key === "12_months" ? "12 Months" : key;
                                 return (
                                   <button
                                     key={`${itemId}_${key}_${price}`}
                                     type="button"
                                     className="plan-btn"
                                     onClick={() =>
                                       handleExtend({
                                         orderId: order._id,
                                         itemId,
                                         selectedPlan: { duration, price: Number(price) },
                                       })
                                     }
                                     disabled={isExtending}
                                   >
                                     <span className="plan-duration">{duration}</span>
                                     <span className="plan-price">₹{price}</span>
                                   </button>
                                 );
                               })}
                             </div>
                           </div>
                         ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default MyOrders;
