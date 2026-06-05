import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import "../styles/lender.css";

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

function LenderDashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  }, []);

  const [summary, setSummary] = useState({});
  const [products, setProducts] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [activeRentals, setActiveRentals] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [commissionStats, setCommissionStats] = useState({});
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    let dashSummary = {};
    let dashProducts = [];
    let dashCompleted = [];
    let dashActive = [];
    let dashCommissions = [];
    let dashCommissionStats = {};

    try {
      // Try fetching all dashboard data in one call
      const dashRes = await api.get("/api/lender/dashboard");
      const data = dashRes.data || {};
      dashSummary = data.summary || {};
      dashProducts = data.products || [];
      dashCompleted = data.completedDeliveries || [];
      dashActive = data.activeRentals || [];
      dashCommissions = data.commissions || [];
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard. " + (err?.response?.data?.message || ""));
    }

    try {
      const commRes = await api.get("/api/lender/commissions/stats");
      dashCommissionStats = commRes.data || {};
    } catch (err) {
      console.error("Commission stats error:", err);
    }

    setSummary(dashSummary);
    setProducts(dashProducts);
    setCompletedDeliveries(dashCompleted);
    setActiveRentals(dashActive);
    setCommissions(dashCommissions);
    setCommissionStats(dashCommissionStats);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchDashboard();
  }, [user, fetchDashboard, navigate]);

  if (!user) return null;
  if (!user.isLender) {
    return (
      <div className="lender-page">
        <h1>🔒 Access Denied</h1>
        <p>You need to be a registered lender to access this page.</p>
        <button className="submit-btn" onClick={() => navigate("/become-lender")}>Become a Lender</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="lender-page overview">
        <div className="loading-container"><div className="spinner"></div><p>Loading lender dashboard...</p></div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    if (!amount) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getStatusBadge = (status) => {
    const colors = {
      "Accepted": "badge-blue", "Picking Up Product": "badge-orange",
      "In Transit": "badge-purple", "Delivered": "badge-green",
      "Pickup Scheduled": "badge-teal", "Return In Transit": "badge-indigo",
      "Returned to Lender": "badge-emerald", "Completed": "badge-gray",
    };
    return colors[status] || "badge-gray";
  };

  return (
    <div className="lender-page overview">
      <button className="btn-home" onClick={() => navigate("/")} style={{cursor:"pointer"}}>← Back to Home</button>

      <h1 className="section-title">🏠 Lender Dashboard</h1>

      {error && (
        <div className="profile-section" style={{background: "#fee2e2", borderColor: "#fca5a5"}}>
          <p style={{ color: "#991b1b", margin: 0 }}>
            ⚠️ {error}{" "}
            <button
              type="button"
              onClick={fetchDashboard}
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
              Retry
            </button>
          </p>
        </div>
      )}

      {/* SUMMARY STATS */}
      <div className="stats-grid" role="region" aria-label="Dashboard statistics">
        <StatCard icon="📦" label="Products Listed" value={summary.totalProducts || 0} color="#1e3a8a" />
        <StatCard icon="✅" label="Completed Deliveries" value={summary.completedDeliveries || 0} color="#166534" />
        <StatCard icon="🚚" label="Active Rentals" value={summary.activeRentals || 0} color="#9333ea" />
        <StatCard icon="💰" label="Net Income (Rent - Fees)" value={formatCurrency(summary.totalNetIncome || 0)} color="#d97706"
          sub={`Rental: ${formatCurrency(summary.totalRentIncome || 0)} · Agent Fees: -₹${(summary.totalAgentFees || 0).toLocaleString("en-IN")}`} />
        <StatCard icon="📈" label="Commission (Platform Cut)" value={formatCurrency(commissionStats.total || 0)} color="#dc2626"
          sub={`Pending: ${formatCurrency(commissionStats.pending || 0)} · Paid: ${formatCurrency(commissionStats.paid || 0)}`} />
        <StatCard icon="🔖" label="Total Revenue Booked" value={formatCurrency(summary.totalRentalBooked || 0)} color="#0891b2" />
      </div>

      {/* TABS */}
      <div className="tabs-nav" role="tablist">
        <button className={`tab-btn ${activeTab === "overview" ? "tab-active" : ""}`} onClick={() => setActiveTab("overview")} role="tab">📊 Overview</button>
        <button className={`tab-btn ${activeTab === "products" ? "tab-active" : ""}`} onClick={() => setActiveTab("products")} role="tab">📦 Products ({summary.totalProducts || 0})</button>
        <button className={`tab-btn ${activeTab === "rentals" ? "tab-active" : ""}`} onClick={() => setActiveTab("rentals")} role="tab">🚚 Active Rentals ({summary.activeRentals || 0})</button>
        <button className={`tab-btn ${activeTab === "history" ? "tab-active" : ""}`} onClick={() => setActiveTab("history")} role="tab">✅ Completed ({summary.completedDeliveries || 0})</button>
        <button className={`tab-btn ${activeTab === "commissions" ? "tab-active" : ""}`} onClick={() => setActiveTab("commissions")} role="tab">📈 Commissions</button>
      </div>

      <div className="tab-content">

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="dashboard-tab">
            <div className="profile-section">
              <h3>📊 Earnings Overview</h3>
              <div className="profile-grid">
                <div className="profile-item"><label>Total Rent Income</label><span>{formatCurrency(summary.totalRentIncome || 0)}</span></div>
                <div className="profile-item"><label>Agent Delivery Fees</label><span>-{formatCurrency(summary.totalAgentFees || 0)}</span></div>
                <div className="profile-item"><label>Net Income</label><span style={{ color: "#166534", fontWeight: "bold" }}>{formatCurrency(summary.totalNetIncome || 0)}</span></div>
                <div className="profile-item"><label>Platform Commission (10%)</label><span>{formatCurrency(commissionStats.total || 0)}</span></div>
                <div className="profile-item"><label>Commission Pending</label><span className="badge-pending">{formatCurrency(commissionStats.pending || 0)}</span></div>
                <div className="profile-item"><label>Commission Paid</label><span className="badge-paid">{formatCurrency(commissionStats.paid || 0)}</span></div>
              </div>
            </div>
            <div className="quick-actions">
              <h3>⚡ Quick Actions</h3>
              <div className="actions-grid">
                <button className="action-btn" onClick={() => navigate("/add-product")}>➕ Add New Product</button>
                <button className="action-btn" onClick={() => setActiveTab("products")}>📦 View Products</button>
                <button className="action-btn" onClick={() => setActiveTab("rentals")}>🚚 View Active Rentals</button>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
          <div className="tasks-tab">
            <h3>📦 Your Products ({products.length})</h3>
            {products.length === 0 ? (
              <div className="empty-state">
                <span>📭</span>
                <p>
                  No products listed yet.{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/add-product")}
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
                    Add your first product
                  </button>
                </p>
              </div>
            ) : (
              <div className="tasks-list">
                {products.map((p) => (
                  <div className="lender-product-card" key={p._id}>
                    <img src={p.image || p.images?.[0] || "https://via.placeholder.com/80"} alt={p.name} className="product-thumb" />
                    <div className="product-info">
                      <h4>{p.name}</h4>
                      <div className="product-pricing">
                        <span className="price-tag">₹{p.monthlyRent?.toLocaleString("en-IN")}/mo</span>
                        <span className="price-small">Daily: ₹{p.pricing?.daily || 0}</span>
                        <span className="price-small">Weekly: ₹{p.pricing?.weekly || 0}</span>
                      </div>
                      <div className="product-meta">
                        <span>Deposit: ₹{(p.deposit || 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    <button className="btn-view" onClick={() => navigate(`/product/${p._id}`)}>View →</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE RENTALS TAB */}
        {activeTab === "rentals" && (
          <div className="tasks-tab">
            <h3>🚚 Active Rentals ({activeRentals.length})</h3>
            {activeRentals.length === 0 ? (
              <div className="empty-state"><span>🚛</span><p>No active rentals yet. Products you list will appear here when delivery tasks are assigned.</p></div>
            ) : (
              <div className="tasks-list">
                {activeRentals.map((task) => (
                  <div className="lender-rental-card" key={task._id}>
                    <div className="rental-header">
                      <div className="rental-product">
                        <img src={task.product?.image || "https://via.placeholder.com/40"} alt={task.product?.name} />
                        <div>
                          <h4>{task.product?.name || "Unknown Product"}</h4>
                          <p className="rental-meta">Order #{task.orderIdShort} · Renter: {task.renter?.name || "Unknown"}</p>
                        </div>
                      </div>
                      <span className={`status-badge ${getStatusBadge(task.status)}`}>{task.status}</span>
                    </div>
                     <div className="rental-details">
                       <div className="detail-row"><span className="detail-label">From:</span>
                         <span>{formatDate(task.deliveryDate)}</span>
                       </div>
                       <div className="detail-row"><span className="detail-label">To:</span>
                         <span>{formatDate(task.returnDate)}</span>
                       </div>
                       <div className="detail-row"><span className="detail-label">To Collect:</span>
                         <span>{formatCurrency(task.grandTotal ?? task.rentTotal)}</span>
                       </div>
                       <div className="detail-row"><span className="detail-label">Assigned:</span>
                         <span>{task.agentName || "Unassigned"}</span>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMPLETED DELIVERIES TAB */}
        {activeTab === "history" && (
          <div className="tasks-tab">
            <h3>✅ Completed Deliveries ({completedDeliveries.length})</h3>
            {completedDeliveries.length === 0 ? (
              <div className="empty-state"><span>📋</span><p>No completed deliveries yet. Completed tasks will appear here automatically.</p></div>
            ) : (
              <div className="tasks-list">
                {completedDeliveries.map((task) => (
                  <div className="lender-rental-card" key={task._id}>
                    <div className="rental-header">
                      <div className="rental-product">
                        <img src={task.product?.image || "https://via.placeholder.com/40"} alt={task.product?.name} />
                        <div>
                          <h4>{task.product?.name || "Unknown Product"}</h4>
                          <p className="rental-meta">Order #{task.orderIdShort} · Renter: {task.renterName}</p>
                        </div>
                      </div>
                      <span className="badge-gray">✓ Completed</span>
                    </div>
                    <div className="rental-details">
                      <div className="detail-row"><span className="detail-label">Completed:</span><span>{formatDate(task.completedAt)}</span></div>
                      <div className="detail-row"><span className="detail-label">Agent:</span><span>{task.agentName}</span></div>
                      <div className="detail-row"><span className="detail-label">Collected from Customer:</span><span>{formatCurrency(task.grandTotal ?? task.rentTotal)}</span></div>
                      <div className="detail-row"><span className="detail-label">Agent Fee:</span><span>-₹75</span></div>
                      <div className="detail-row"><span className="detail-label">Your Net:</span>
                        <span style={{ color: "#166534", fontWeight: "bold" }}>{formatCurrency(task.netIncome)}</span>
                      </div>
                      {task.pickupIsWorking !== undefined && (
                        <div className="detail-row">
                          <span className="detail-label">Product Condition:</span>
                          <span style={{ 
                            color: task.pickupIsWorking ? "#166534" : "#dc2626", 
                            fontWeight: "bold" 
                          }}>
                            {task.pickupIsWorking ? "✓ Working" : "✗ Not Working"}
                          </span>
                        </div>
                      )}
                      {task.pickupConditionNotes && task.pickupConditionNotes.trim() !== "" && (
                        <div className="detail-row">
                          <span className="detail-label">Condition Notes:</span>
                          <span>{task.pickupConditionNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMMISSIONS TAB */}
        {activeTab === "commissions" && (
          <div className="tasks-tab">
            <h3>📈 Platform Commission Records</h3>
            <div className="commission-summary">
              <div className="commission-stat"><strong>{commissionStats.pendingCount || 0}</strong> Pending</div>
              <div className="commission-stat"><strong>{commissionStats.paidCount || 0}</strong> Paid</div>
              <div className="commission-stat"><strong>{commissionStats.count || 0}</strong> Total</div>
            </div>
            {commissions.length === 0 ? (
              <div className="empty-state"><span>📊</span><p>No commission records yet. Commissions are created when deliveries or pickups are completed.</p></div>
            ) : (
              <div className="tasks-list">
                {commissions.map((c) => (
                  <div className="commission-card" key={c._id}>
                    <div className="commission-header">
                      <div>
                        <h4>{c.product?.name || "Unknown Product"}</h4>
                        <p className="commission-meta">Order #{c.orderIdShort} · {c.type === "delivery" ? "📦 Delivery" : "📥 Pickup"} · Agent: {c.agentName}</p>
                      </div>
                      <span className={`status-badge ${c.status === "paid" ? "badge-green" : "badge-yellow"}`}>{c.status}</span>
                    </div>
                    <div className="commission-details">
                      <span className="commission-amount">{formatCurrency(c.commissionAmount)}</span>
                      <span className="commission-rate">({c.commissionRate}% of {formatCurrency(c.amount)})</span>
                      <span className="commission-date">{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LenderDashboard;
