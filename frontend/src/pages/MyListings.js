import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import "../styles/listings.css";

function MyListings() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("listings"); // "listings" | "negotiations"
  const [negotiations, setNegotiations] = useState([]);
  const [isLoadingNegotiations, setIsLoadingNegotiations] = useState(false);

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const isLender = user?.isLender === true;
  const userId = user?._id || "";

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    if (!isLender) {
      navigate("/become-lender");
    }
  }, [isLender, navigate, userId]);

  const fetchProducts = useCallback(async () => {
    if (!userId || !isLender) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await api.get(`/api/products/lender/${userId}`);
      setProducts(Array.isArray(response?.data) ? response.data : []);
    } catch {
      setErrorMessage("Failed to load listings.");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLender, userId]);

  const fetchNegotiations = useCallback(async () => {
    if (!userId || !isLender) return;
    setIsLoadingNegotiations(true);
    try {
      const response = await api.get(`/api/negotiation/seller/${userId}`);
      setNegotiations(Array.isArray(response?.data) ? response.data : []);
    } catch {
      console.error("Failed to fetch negotiations");
      setNegotiations([]);
    } finally {
      setIsLoadingNegotiations(false);
    }
  }, [isLender, userId]);

  useEffect(() => {
    fetchProducts();
    fetchNegotiations();
  }, [fetchProducts, fetchNegotiations]);

  // 🔥 Real-time polling for negotiation updates (no page refresh needed)
  useEffect(() => {
    if (!userId || !isLender) return;

    const POLLING_INTERVAL = 5000; // 5 seconds
    let intervalId;

    const pollNegotiations = async () => {
      try {
        const response = await api.get(`/api/negotiation/seller/${userId}`);
        const data = Array.isArray(response?.data) ? response.data : [];

        // Only update state if data has actually changed
        setNegotiations((prev) => {
          if (prev.length !== data.length) return data;
          const changed = data.some(
            (n, i) => prev[i]?._id !== n._id || prev[i]?.updatedAt !== n.updatedAt
          );
          return changed ? data : prev;
        });
      } catch {
        // Silently ignore polling errors
      }
    };

    intervalId = setInterval(pollNegotiations, POLLING_INTERVAL);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [userId, isLender]);

  const handleDelete = async (id) => {
    if (!id) return;
    try {
      await api.delete(`/api/products/${id}`);
      alert("Deleted ✅");
      fetchProducts();
    } catch {
      alert("Delete failed ❌");
    }
  };

  const handleEdit = (id) => {
    navigate(`/edit-product/${id}`);
  };

  const handleNegotiationResponse = async (negotiationId, status) => {
    try {
      await api.put(`/api/negotiation/respond/${negotiationId}`, { status });
      alert(`Negotiation ${status}!`);
      fetchNegotiations();
      fetchProducts();
    } catch (err) {
      alert(`Failed to ${status} negotiation: ${err?.response?.data?.message || "Unknown error"}`);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  if (!userId || !isLender) return <h2>Redirecting...</h2>;

  // Stats
  const pendingNegotiations = negotiations.filter((n) => n.status === "pending");
  const counteredNegotiations = negotiations.filter((n) => n.status === "countered");
  const acceptedNegotiations = negotiations.filter((n) => n.status === "accepted");

  return (
    <div className="listings-page">
      <h1>My Listings</h1>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === "listings" ? "active" : ""}`}
          onClick={() => setActiveTab("listings")}
        >
          📦 Products ({products.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "negotiations" ? "active" : ""}`}
          onClick={() => setActiveTab("negotiations")}
        >
          🤝 Negotiations
          {pendingNegotiations.length > 0 && (
            <span className="tab-badge">{pendingNegotiations.length}</span>
          )}
        </button>
      </div>

      {/* ===== PRODUCTS TAB ===== */}
      {activeTab === "listings" && isLoading ? (
        <p>Loading...</p>
      ) : activeTab === "listings" && errorMessage ? (
        <p>{errorMessage}</p>
      ) : activeTab === "listings" ? (
        <div className="grid">
          {/* Add New Product Card */}
          <div
            className="card add-product-card"
            onClick={() => navigate("/add-product")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigate("/add-product");
              }
            }}
          >
            <div className="add-icon">+</div>
            <h3>Add New Product</h3>
            <p>List a new item for rent</p>
          </div>

          {/* Existing Product Cards */}
          {products.map((item) => (
            <div className="card" key={item._id}>
              <img src={item.image || item.images?.[0]} alt="product" />
              <h3>{item.name}</h3>
              <p className="category">{item.category}</p>
              {/* Show monthly price from pre-calculated pricing object */}
              <p className="price">
                ₹{item.pricing?.monthly?.toLocaleString("en-IN") || item.monthlyRent?.toLocaleString("en-IN")}
              </p>

              {/* Negotiation activity indicator */}
              <div className="product-negotiation-meta">
                {negotiations.some(
                  (n) =>
                    String(n.productId?._id) === String(item._id) &&
                    n.status === "pending"
                ) && (
                  <span className="negotiation-dot" title="Pending negotiation">
                    🔵
                  </span>
                )}
                {negotiations.some(
                  (n) =>
                    String(n.productId?._id) === String(item._id) &&
                    n.status === "accepted"
                ) && (
                  <span className="negotiation-dot accepted" title="Accepted negotiation">
                    ✅
                  </span>
                )}
              </div>

              <div className="actions">
                <button className="edit" onClick={() => handleEdit(item._id)}>
                  Edit
                </button>
                <button className="delete" onClick={() => handleDelete(item._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ===== NEGOTIATIONS TAB ===== */}
      {activeTab === "negotiations" && (
        <div className="negotiations-panel">
          {/* Negotiation Stats */}
          <div className="negotiation-stats">
            <div className="stat-card stat-pending">
              <span className="stat-number">{pendingNegotiations.length}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-card stat-countered">
              <span className="stat-number">{counteredNegotiations.length}</span>
              <span className="stat-label">Countered</span>
            </div>
            <div className="stat-card stat-accepted">
              <span className="stat-number">{acceptedNegotiations.length}</span>
              <span className="stat-label">Accepted</span>
            </div>
            <div className="stat-card stat-total">
              <span className="stat-number">{negotiations.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>

          {/* Negotiations List */}
          {isLoadingNegotiations ? (
            <p>Loading negotiations...</p>
          ) : negotiations.length === 0 ? (
            <div className="negotiation-empty">
              <p>No negotiations yet</p>
              <p className="negotiation-empty-sub">
                When renters negotiate on your products, you'll see them here.
              </p>
            </div>
          ) : (
            <div className="negotiation-list">
              {negotiations.map((neg) => {
                const productName = neg.productId?.name || "Unknown Product";
                const buyerName = neg.buyerId?.name || "Unknown Buyer";
                const isPending = neg.status === "pending";
                const isCountered = neg.status === "countered";
                const isAccepted = neg.status === "accepted";
                return (
                  <div key={neg._id} className={`negotiation-card ${neg.status}`}>
                    <div className="negotiation-card-header">
                      <div>
                        <h4>{productName}</h4>
                        <p className="negotiation-buyer">from {buyerName}</p>
                      </div>
                      <span className={`negotiation-status-pill ${neg.status}`}>
                        {neg.status === "pending" && "⏳ Pending"}
                        {neg.status === "countered" && "🔄 Countered"}
                        {neg.status === "accepted" && "✅ Accepted"}
                        {neg.status === "rejected" && "❌ Rejected"}
                        {neg.status === "expired" && "⌛ Expired"}
                      </span>
                    </div>

                    <div className="negotiation-card-body">
                      <div className="negotiation-price-row">
                        <span>Original Price:</span>
                        <span className="price-strikethrough">
                          {formatCurrency(neg.originalPrice)}
                        </span>
                      </div>

                      <div className="negotiation-price-row">
                        <span>Buyer's Offer:</span>
                        <span className="price-offer">
                          {formatCurrency(neg.proposedPrice)}
                        </span>
                      </div>

                      {isCountered && (
                        <div className="negotiation-price-row">
                          <span>Your Counter:</span>
                          <span className="price-counter">
                            {formatCurrency(neg.counteredPrice)}
                          </span>
                        </div>
                      )}

                      {isAccepted && neg.approvedPrice && (
                        <div className="negotiation-price-row">
                          <span>Approved Price:</span>
                          <span className="price-approved">
                            {formatCurrency(neg.approvedPrice)}
                          </span>
                        </div>
                      )}

                      {neg.durationLabel && (
                        <div className="negotiation-duration">
                          Duration: {neg.durationLabel}
                        </div>
                      )}

                      {neg.message && (
                        <p className="negotiation-message">
                          💬 {neg.message}
                        </p>
                      )}

                      {neg.messages?.length > 0 && (
                        <details className="negotiation-messages-collapse">
                          <summary>View conversation ({neg.messages.length} messages)</summary>
                          <div className="negotiation-messages-list">
                            {neg.messages.map((msg, i) => (
                              <div
                                key={i}
                                className={`neg-message ${
                                  msg.senderRole === "buyer"
                                    ? "neg-message-buyer"
                                    : "neg-message-seller"
                                }`}
                              >
                                <strong>
                                  {msg.senderRole === "buyer"
                                    ? "Buyer"
                                    : "You"}
                                  :
                                </strong>{" "}
                                {msg.message}
                                {msg.proposedPrice && (
                                  <span> — {formatCurrency(msg.proposedPrice)}</span>
                                )}
                                <br />
                                <small>
                                  {new Date(
                                    msg.createdAt
                                  ).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </small>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    {/* Action Buttons for Pending/Countered */}
                    {(isPending || isCountered) && (
                      <div className="negotiation-card-actions">
                        {(isPending || isCountered) && (
                          <>
                            <button
                              className="neg-action-btn accept"
                              onClick={() =>
                                handleNegotiationResponse(neg._id, "accepted")
                              }
                            >
                              ✅ Accept
                            </button>
                            <button
                              className="neg-action-btn counter"
                              onClick={async () => {
                                const counterPrice = prompt(
                                  "Enter your counter price:",
                                  neg.counteredPrice ||
                                    Math.round(neg.proposedPrice * 0.9)
                                );
                                if (counterPrice === null) return;
                                const price = Number(counterPrice);
                                if (isNaN(price) || price <= 0) {
                                  alert("Please enter a valid price");
                                  return;
                                }
                                try {
                                  await api.put(
                                    `/api/negotiation/respond/${neg._id}`,
                                    {
                                      status: "countered",
                                      counteredPrice: price,
                                      message: `Counter offer by seller`,
                                    }
                                  );
                                  alert("Counter offer sent!");
                                  fetchNegotiations();
                                } catch (err) {
                                  alert(
                                    "Failed to send counter: " +
                                      err?.response?.data?.message
                                  );
                                }
                              }}
                            >
                              🔄 Counter
                            </button>
                            <button
                              className="neg-action-btn reject"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to reject this negotiation?"
                                  )
                                ) {
                                  handleNegotiationResponse(neg._id, "rejected");
                                }
                              }}
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MyListings;
