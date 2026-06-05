import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { getDurationOptions } from "../utils/pricing";
import "../styles/product.css";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [negotiation, setNegotiation] = useState(null);
  const [isLoadingNegotiation, setIsLoadingNegotiation] = useState(false);
  const [negotiationPrice, setNegotiationPrice] = useState("");
  const [isSubmittingNegotiation, setIsSubmittingNegotiation] = useState(false);
  const [negotiationError, setNegotiationError] = useState("");
  const [negotiationSuccess, setNegotiationSuccess] = useState("");

  const messagesEndRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?._id;

  // Helper: Convert pricing object to array for rendering
  const getPricingArray = (product) => {
    if (!product) return [];
    const pricing = product.pricing || {};
    const options = getDurationOptions();

    return options.map((opt) => ({
      duration: opt.value,
      durationLabel: opt.label,
      price: pricing[opt.value] || 0,
    }));
  };

  // 🔥 FETCH PRODUCT
  useEffect(() => {
    api
      .get(`/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        setMainImage(res.data?.image || res.data?.images?.[0] || "");

        // ✅ DEFAULT PLAN (pick monthly or first available)
        const pricingOptions = getPricingArray(res.data);
        const defaultOption = pricingOptions.find((p) => p.duration === "monthly") || pricingOptions[0];

        if (defaultOption) {
          setSelectedPlan({
            duration: defaultOption.duration,
            price: defaultOption.price,
            durationLabel: defaultOption.durationLabel,
          });
        }
      })
      .catch(() => {
        setProduct(null);
      });
  }, [id]);

  // 🔥 FETCH NEGOTIATION for this product + current user (buyer)
  useEffect(() => {
    if (!userId || !id) return;

    const fetchNegotiation = async () => {
      setIsLoadingNegotiation(true);
      setNegotiationError("");
      try {
        const response = await api.get(`/api/negotiation/product/${id}`);
        if (response.data?.hasNegotiation && response.data?.negotiation) {
          setNegotiation(response.data.negotiation);
        } else {
          setNegotiation(null);
        }
      } catch (err) {
        console.error("Negotiation fetch error:", err);
      } finally {
        setIsLoadingNegotiation(false);
      }
    };

    fetchNegotiation();
  }, [id, userId]);

  // 🔥 Real-time polling for negotiation updates (no page refresh needed)
  useEffect(() => {
    if (!userId || !id) return;

    const POLLING_INTERVAL = 5000; // 5 seconds
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/api/negotiation/product/${id}`);
        if (response.data?.hasNegotiation && response.data?.negotiation) {
          setNegotiation((prev) => {
            const updated = response.data.negotiation;
            // Only update if something actually changed
            if (prev && prev._id === updated._id && prev.updatedAt === updated.updatedAt) {
              return prev;
            }
            // Auto-dismiss success message when status changes
            if (prev && prev.status !== updated.status) {
              if (updated.status === "accepted") {
                setNegotiationSuccess("🎉 Offer accepted! Negotiated price applied.");
              } else if (updated.status === "countered") {
                setNegotiationSuccess("🔄 Owner sent a counter-offer.");
              } else if (updated.status === "rejected") {
                setNegotiationError("❌ Your offer was rejected.");
              }
            }
            return updated;
          });
        }
      } catch {
        // Silently ignore polling errors
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [id, userId]);

  // Auto-scroll negotiation messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [negotiation?.messages]);

  // 🔥 ADD TO CART
  const handleAddToCart = async () => {
    if (!user) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    if (!selectedPlan) {
      alert("Please select a plan");
      return;
    }

    // Check if there's an approved negotiation for this product
    const hasApprovedNegotiation =
      negotiation?.status === "accepted" &&
      negotiation?.productId?._id === id &&
      negotiation?.duration === selectedPlan.duration;

    let priceToUse = selectedPlan.price;
    if (hasApprovedNegotiation) {
      priceToUse = negotiation.approvedPrice || negotiation.proposedPrice || selectedPlan.price;
    }

    try {
      await api.post("/api/cart/add", {
        userId: user._id,
        productId: product._id,
        selectedPlan: {
          duration: selectedPlan.duration,
          price: priceToUse,
          durationLabel: selectedPlan.durationLabel,
        },
      });

      alert("Added to cart ✅");
      window.dispatchEvent(new Event("cartUpdated"));
    } catch {
      alert("Error adding to cart");
    }
  };

  // 🔥 SUBMIT NEGOTIATION
  const handleSubmitNegotiation = async (e) => {
    e.preventDefault();

    if (!userId) {
      alert("Please login first to negotiate");
      navigate("/login");
      return;
    }

    const proposedPrice = Number(negotiationPrice || "");

    if (!proposedPrice || proposedPrice <= 0) {
      setNegotiationError("Please enter a valid proposed price");
      return;
    }

    if (!selectedPlan) {
      setNegotiationError("Please select a plan first");
      return;
    }

    // Check if seller is trying to negotiate with themselves
    if (String(userId) === String(product?.userId)) {
      setNegotiationError("You cannot negotiate on your own product");
      return;
    }

    setIsSubmittingNegotiation(true);
    setNegotiationError("");
    setNegotiationSuccess("");

    try {
      const response = await api.post("/api/negotiation/propose", {
        productId: id,
        sellerId: product.userId,
        proposedPrice,
        originalPrice: selectedPlan.price,
        duration: selectedPlan.duration,
        durationLabel: selectedPlan.durationLabel,
      });

      setNegotiation(response.data.negotiation);
      setNegotiationSuccess("Negotiation request sent!");
      setNegotiationPrice("");
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to send negotiation request";
      setNegotiationError(message);
    } finally {
      setIsSubmittingNegotiation(false);
    }
  };

  // Get effective price (negotiated or standard)
  const getEffectivePrice = (plan) => {
    if (negotiation?.status === "accepted" && String(negotiation?.duration) === String(plan?.duration)) {
      const price = negotiation?.approvedPrice || negotiation?.proposedPrice;
      if (price) return price;
    }
    return plan?.price || 0;
  };

  const getEffectivePriceLabel = () => {
    const price = negotiation?.approvedPrice || negotiation?.proposedPrice;
    if (
      negotiation?.status === "accepted" &&
      price &&
      negotiation?.duration === selectedPlan?.duration
    ) {
      return `₹${Number(price).toLocaleString("en-IN")} (Negotiated ✅)`;
    }
    return null;
  };

  // Get status badge class
  const getStatusBadge = (status) => {
    const map = {
      pending: "badge-pending",
      accepted: "badge-accepted",
      rejected: "badge-rejected",
      countered: "badge-countered",
      expired: "badge-expired",
    };
    return map[status] || "badge-pending";
  };

  const getStatusText = (status) => {
    const map = {
      pending: "⏳ Pending",
      accepted: "✅ Accepted",
      rejected: "❌ Rejected",
      countered: "🔄 Countered",
      expired: "⌛ Expired",
    };
    return map[status] || status;
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!product) return <p>Loading...</p>;

  return (
    <div className="full-product">
      <button className="btn-home" onClick={() => navigate("/")}>← Back to Home</button>
    <div className="product-page">
      {/* LEFT SIDE */}
      <div className="product-left">
        <div className="main-image">
          <img src={mainImage} alt="product" />
        </div>

        <div className="thumbnail-row">
          {(product.images?.length
            ? product.images
            : [product.image].filter(Boolean)
          ).map((img, i) => (
            <img
              key={i}
              src={img}
              alt="thumb"
              onClick={() => setMainImage(img)}
              className={mainImage === img ? "active-thumb" : ""}
            />
          ))}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="product-right">
        <h2>{product.name}</h2>
        <p className="description">{product.description}</p>

        {/* PRICE */}
        <h3 className="price">
          {getEffectivePriceLabel() || formatCurrency(selectedPlan?.price)}
        </h3>

        {/* NEGOTIATED PRICE BADGE */}
        {getEffectivePriceLabel() && (
          <div className="negotiated-price-banner">
            <span className="negotiated-icon">🤝</span>
            <span>
              Special negotiated price applied —{" "}
              <strong>{getEffectivePriceLabel()}</strong>
            </span>
          </div>
        )}


        {/* PLAN SELECTION */}
        <div className="plan-section">
          <h3>Select Plan</h3>

          {(() => {
            const pricingOptions = getPricingArray(product);
            return pricingOptions.map((plan, i) => {
              const effectivePrice = getEffectivePrice(plan);
              const isNegotiatedForThisPlan =
                negotiation?.status === "accepted" &&
                String(negotiation?.duration) === String(plan.duration);

              return (
                <div
                  key={i}
                  className={`plan-card ${
                    selectedPlan?.duration === plan.duration ? "active" : ""
                  } ${isNegotiatedForThisPlan ? "negotiated" : ""}`}
                  onClick={() =>
                    setSelectedPlan({
                      duration: plan.duration,
                      price: plan.price,
                      durationLabel: plan.durationLabel,
                    })
                  }
                >
                  <p>{plan.durationLabel}</p>
                  <div className="plan-price-row">
                    {isNegotiatedForThisPlan ? (
                      <>
                        <span className="original-price-crossed">
                          {formatCurrency(plan.price)}
                        </span>
                        <h4 className="negotiated-price-text">
                          {formatCurrency(effectivePrice)}
                        </h4>
                      </>
                    ) : (
                      <h4>{formatCurrency(effectivePrice)}</h4>
                    )}
                  </div>
                  {isNegotiatedForThisPlan && (
                    <span className="negotiated-badge-inline">Negotiated ✅</span>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* DEPOSIT INFO */}
        {product?.deposit > 0 && (
          <div className="deposit-info">
            <span>
              💰 Security Deposit: {formatCurrency(product.deposit)} (Refundable)
            </span>
          </div>
        )}

        {/* ====================
            NEGOTIATION SECTION
            ==================== */}
        <div className="negotiation-section">
          <div className="negotiation-header">
            <h3>🤝 Negotiate Your Rental Price</h3>
            <p className="negotiation-subtitle">
              Propose a lower price to the owner. They can accept, reject, or
              counter-offer.
            </p>
          </div>

          {isLoadingNegotiation && !negotiation ? (
            <div className="negotiation-notice">
              <p>Loading negotiation status...</p>
            </div>
          ) : null}

          {/* Negotiation Status Card */}
          {negotiation && (
            <div className={`negotiation-status-card ${getStatusBadge(negotiation.status)}`}>
              <div className="negotiation-status-header">
                <span className="negotiation-status-badge">
                  {getStatusText(negotiation.status)}
                </span>
                <span className="negotiation-status-date">
                  {formatDate(negotiation.updatedAt)}
                </span>
              </div>

              {negotiation.status === "pending" && (
                <p className="negotiation-status-text">
                  Your offer of {formatCurrency(negotiation.proposedPrice)} is
                  awaiting the owner's response.
                </p>
              )}

              {negotiation.status === "countered" && (
                <div className="counter-offer-info">
                  <p className="negotiation-status-text">
                    The owner countered with <strong>{formatCurrency(negotiation.counteredPrice)}</strong>
                  </p>
                  <p className="negotiation-original-text">
                    Your original offer: {formatCurrency(negotiation.originalPrice)}
                  </p>
                </div>
              )}

              {negotiation.status === "accepted" && (
                <div className="accepted-info">
                  <p className="negotiation-status-text">
                    🎉 Offer accepted! You will be charged{" "}
                    <strong>{formatCurrency(negotiation.approvedPrice || negotiation.proposedPrice)}</strong>{" "}
                    for the {negotiation.durationLabel} plan.
                  </p>
                  {negotiation.expiresAt && (
                    <p className="negotiation-expiry">
                      ⏰ This offer expires:{" "}
                      {new Date(negotiation.expiresAt).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
              )}

              {negotiation.status === "rejected" && (
                <p className="negotiation-status-text">
                  Unfortunately, the owner rejected your offer. You may submit
                  a new proposal below.
                </p>
              )}

              {negotiation.status === "expired" && (
                <p className="negotiation-status-text">
                  This negotiation has expired. Please submit a new proposal.
                </p>
              )}
            </div>
          )}

          {/* Negotiation Messages Timeline */}
          {negotiation?.messages?.length > 0 && (
            <div className="negotiation-messages">
              <h4>📨 Negotiation History</h4>
              <div className="messages-timeline">
                {negotiation.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`message-bubble ${
                      msg.senderRole === "buyer"
                        ? "message-buyer"
                        : "message-seller"
                    }`}
                  >
                    <div className="message-header">
                      <span className="message-sender">
                        {msg.senderRole === "buyer" ? "👤 You" : "🏠 Owner"}
                      </span>
                      <span className="message-time">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                    <p className="message-text">{msg.message}</p>
                    {msg.proposedPrice && (
                      <span className="message-price">
                        Proposed: {formatCurrency(msg.proposedPrice)}
                      </span>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Negotiation Form */}
          {!user ? (
            <p className="negotiation-login-prompt">
              Please{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "#1d4ed8",
                  textDecoration: "underline",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                login
              </button>{" "}
              to start a negotiation.
            </p>
          ) : String(userId) === String(product?.userId) ? (
            <div className="negotiation-notice">
              <p>You cannot negotiate on your own product.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitNegotiation} className="negotiation-form">
              <div className="negotiation-input-group">
                <label htmlFor="negotiationPrice">
                  Your Proposed Price (₹)
                </label>
                <div className="negotiation-input-wrapper">
                  <span className="negotiation-currency">₹</span>
                  <input
                    type="number"
                    id="negotiationPrice"
                    value={negotiationPrice || ""}
                    onChange={(e) => setNegotiationPrice(e.target.value)}
                    placeholder={`e.g., ${Math.round(
                      (selectedPlan?.price || 0) * 0.8
                    )}`}
                    min="1"
                    max={selectedPlan?.price - 1 || 1000000}
                    required
                    disabled={
                      isSubmittingNegotiation ||
                      negotiation?.status === "accepted"
                    }
                  />
                </div>
{selectedPlan && (
                   <small className="negotiation-hint">
                     Current price: {formatCurrency(selectedPlan.price)}
                     {negotiation?.status === "countered" &&
                       ` | Owner's counter: ${formatCurrency(negotiation.counteredPrice)}`}
                   </small>
                 )}
               </div>

               {/* Action Buttons */}
               <div className="negotiation-actions">
                {/* Submit / Update Proposal */}
                {(!negotiation ||
                  ["rejected", "expired"].includes(negotiation.status)) && (
                  <button
                    type="submit"
                    className="negotiation-btn btn-propose"
                    disabled={isSubmittingNegotiation}
                  >
                    {isSubmittingNegotiation ? (
                      <>
                        <span className="spinner-small"></span> Sending...
                      </>
                    ) : (
                      "🤝 Send Negotiation"
                    )}
                  </button>
                )}

                {/* Accept Counter-Offer */}
                {negotiation?.status === "countered" && (
                  <button
                    type="button"
                    className="negotiation-btn btn-accept"
                    onClick={async () => {
                      try {
                        const response = await api.put(
                          `/api/negotiation/counter-respond/${negotiation._id}`,
                          { status: "accepted" }
                        );
                        setNegotiation(response.data.negotiation);
                        setNegotiationSuccess(
                          `Counter-offer accepted! Price: ${formatCurrency(
                            response.data.negotiation.approvedPrice || response.data.negotiation.counteredPrice
                          )}`
                        );
                      } catch (err) {
                        setNegotiationError(
                          err?.response?.data?.message ||
                            "Failed to accept counter-offer"
                        );
                      }
                    }}
                  >
                    ✅ Accept Counter-Offer ({formatCurrency(
                      negotiation.counteredPrice
                    )}
                    )
                  </button>
                )}

                {/* Reject Counter-Offer */}
                {negotiation?.status === "countered" && (
                  <button
                    type="button"
                    className="negotiation-btn btn-reject"
                    onClick={async () => {
                      try {
                        const response = await api.put(
                          `/api/negotiation/counter-respond/${negotiation._id}`,
                          { status: "rejected" }
                        );
                        setNegotiation(response.data.negotiation);
                        setNegotiationSuccess("Counter-offer rejected.");
                      } catch (err) {
                        setNegotiationError(
                          err?.response?.data?.message ||
                            "Failed to reject counter-offer"
                        );
                      }
                    }}
                  >
                    ❌ Reject Counter-Offer
                  </button>
                )}

                {/* Update Proposal (when pending) */}
                {negotiation?.status === "pending" && (
                  <button
                    type="button"
                    className="negotiation-btn btn-update"
                    onClick={async () => {
if (!negotiationPrice) {
                         setNegotiationError(
                           "Please enter a new proposed price"
                         );
                         return;
                       }
                       try {
                         const response = await api.put(
                           `/api/negotiation/update-proposal/${negotiation._id}`,
                           {
                             proposedPrice: Number(negotiationPrice),
                           }
                         );
                         setNegotiation(response.data.negotiation);
                         setNegotiationSuccess("Offer updated!");
                       } catch (err) {
                        setNegotiationError(
                          err?.response?.data?.message ||
                            "Failed to update proposal"
                        );
                      }
                    }}
                  >
                    📝 Update Offer
                  </button>
                )}
              </div>

              {/* Alerts */}
              {negotiationError && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠️</span>
                  {negotiationError}
                </div>
              )}

              {negotiationSuccess && (
                <div className="alert alert-success">
                  <span className="alert-icon">✅</span>
                  {negotiationSuccess}
                </div>
              )}
            </form>
          )}
        </div>

        {/* SELECTED PLAN SUMMARY */}
        {selectedPlan && (
          <div className="selected-plan-summary">
            <h3>Rental Summary</h3>
            <div className="summary-row">
              <span>Plan:</span>
              <strong>{selectedPlan.durationLabel}</strong>
            </div>
            <div className="summary-row">
              <span>
                Rent:
              </span>
              <strong>{" "}
                {negotiation?.status === "accepted" &&
                negotiation.duration === selectedPlan.duration ? (
                  <>
                    <span className="original-price-crossed summary">
                      {formatCurrency(selectedPlan.price)}
                    </span>{" "}
                    <strong className="negotiated-text">
                      {formatCurrency(negotiation.approvedPrice)}
                    </strong>{" "}
                    <span className="negotiated-label">(Negotiated)</span>
                  </>
                ) : (
                  <strong>{formatCurrency(selectedPlan.price)}</strong>
                )}</strong>
            </div>
            {product?.deposit > 0 && (
              <div className="summary-row">
                <span>Security Deposit:</span>
                <strong>{formatCurrency(product.deposit)}</strong>
              </div>
            )}
            <div className="summary-row total">
              <span>Total Payable:</span>
              <strong>
                {formatCurrency(
                  getEffectivePrice(selectedPlan) +
                    (product?.deposit || 0)
                )}
              </strong>
            </div>
          </div>
        )}

        {/* BREAKDOWN */}
        {/* {selectedPlan && (
          <div className="rent-breakdown">
            <p>
              <strong>Plan:</strong> {selectedPlan.durationLabel}
            </p>
            <p>
              <strong>Rent:</strong> {formatCurrency(getEffectivePrice(selectedPlan))}
            </p>
            <p className="deposit">
              <strong>Deposit:</strong> {formatCurrency(product.deposit || 0)}
            </p>
          </div>
        )} */}

        {/* 🔥 PREMIUM CTA BAR */}
        <div className="cta-bar">
          <button className="cta-full" onClick={handleAddToCart}>
            Add to Cart
          </button>
        </div>

        {/* VIEW CART */}
        <button
          className="view-cart-btn"
          onClick={() => navigate("/cart")}
        >
          View Cart
        </button>
      </div>
    </div>
    </div>
  );
}

export default ProductDetails;
