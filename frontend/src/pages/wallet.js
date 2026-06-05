import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";

import { useNavigate } from "react-router-dom";

import api from "../api/client";

import { useToast } from "../components/UI/Toast";

import "../styles/delivery.css";

function Wallet() {
  const navigate = useNavigate();
  const { addToast, ToastContainer } = useToast();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const isAdminView = user?.isAdmin;

  const isAgentView =
    user?.isDeliveryAgent &&
    user?.verification_status === "approved";

  const [wallets, setWallets] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    isAgentView ? "my-wallet" : "wallets"
  );

  // ── Role guard ──
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const isAgentAuthorized =
      user.isDeliveryAgent &&
      user.verification_status === "approved";
    if (!user.isAdmin && !isAgentAuthorized) {
      navigate("/");
    }
  }, [user, navigate]);

  // ── Fetch all data ──
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      if (isAdminView) {
        const [walletsRes, settlementsRes, analyticsRes] = await Promise.all([
          api.get("/api/wallet/admin/wallets"),
          api.get("/api/wallet/admin/settlements?status=submitted"),
          api.get("/api/wallet/admin/analytics"),
        ]);

        setWallets(walletsRes.data.wallets || []);
        setSettlements(settlementsRes.data.settlements || []);
        setAnalytics(analyticsRes.data.analytics);
      } else {
        const [walletRes, txRes] = await Promise.all([
          api.get("/api/wallet/wallet"),
          api.get("/api/wallet/transactions"),
        ]);

        const w = walletRes.data.wallet;
        setWallets(
          w
            ? [
                {
                  ...w,
                  agentId: {
                    name: user?.name || "You",
                    email: user?.email || "",
                  },
                },
              ]
            : []
        );
        setTransactions(txRes.data.transactions || []);
        setSettlements(
          walletRes.data.pendingSettlements || []
        );
      }
    } catch (err) {
      console.log(err);
      addToast("Failed to fetch data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [isAdminView, user, addToast]);

  const refreshInterval = useRef(null);

  useEffect(() => {
    fetchData();
    refreshInterval.current = setInterval(() => fetchData(), 30000);
    return () => clearInterval(refreshInterval.current);
  }, [fetchData]);

  if (!user) return null;

  // ── Agent submit helper ──
  const handleSubmitSettlement = async () => {
    const pendingAmount =
      (wallets[0]?.totalCollected || 0) -
      (wallets[0]?.settledAmount || 0);

    if (!window.confirm(
      `Submit ₹${pendingAmount.toLocaleString("en-IN")} to admin?`
    )) {
      return;
    }

    try {
      await api.post("/api/wallet/request-settlement");
      addToast("Cash submitted to admin successfully ✅", "success");
      fetchData();
    } catch (err) {
      addToast(err?.response?.data?.message || "Settlement failed ❌", "error");
    }
  };

  // ── Admin "Amount Received" helper ──
  const handleAcceptSettlement = async (settlementId) => {
    try {
      await api.put("/api/wallet/admin/settlement/accept", {
        settlementId,
      });
      addToast("Amount received ✅ — Agent wallet reset to zero", "success");
      fetchData();
    } catch (err) {
      addToast(err?.response?.data?.message || "Failed to accept settlement", "error");
    }
  };

  // Parse notification-style CSS classes for settlement badges
  const statusBadgeClass = (status) => {
    switch (status) {
      case "submitted": return "badge-yellow";
      case "completed": return "badge-green";
      case "verified":  return "badge-blue";
      case "rejected":  return "badge-red";
      default:          return "badge-gray";
    }
  };

  return (
    <div className="delivery-page">
      <ToastContainer />

      <button
        className="btn-home"
        onClick={() => navigate("/")}
      >
        ← Back to Home
      </button>

      <div className="admin-header">
        <div>
          <h2 className="section-title">
            {isAgentView
              ? "💳 My Wallet"
              : "💰 Admin Finance Dashboard"}
          </h2>
          <p className="admin-subtitle">
            {isAgentView
              ? "View your balance and transactions"
              : "Manage agent wallets and settlements"}
          </p>
        </div>
      </div>

      {/* ══════════════ TABS ══════════════ */}
      <div className="tabs-nav">
        {isAgentView && (
          <>
            <button
              className={`tab-btn ${activeTab === "my-wallet" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("my-wallet")}
            >
              💳 My Wallet
            </button>
            <button
              className={`tab-btn ${activeTab === "transactions" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("transactions")}
            >
              📋 Transactions
            </button>
          </>
        )}

        {isAdminView && (
          <>
            <button
              className={`tab-btn ${activeTab === "wallets" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("wallets")}
            >
              👥 Wallets
            </button>
            <button
              className={`tab-btn ${activeTab === "settlements" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("settlements")}
            >
              💰 Settlements
            </button>
            <button
              className={`tab-btn ${activeTab === "analytics" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("analytics")}
            >
              📊 Analytics
            </button>
          </>
        )}
      </div>

      {/* ══════════════ CONTENT ══════════════ */}
      {isLoading ? (
        <div className="loading-container">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="tab-content">

          {/* ─── AGENT MY WALLET ─── */}
          {activeTab === "my-wallet" && isAgentView && (
            <div>
              {/* Total Collected */}
              <div className="delivery-card">
                <h3
                  style={{
                    fontSize: "18px",
                    marginBottom: "12px",
                    color: "#111827",
                  }}
                >
                  Total Customer Cash Collected
                </h3>
                <h1
                  style={{
                    fontSize: "52px",
                    fontWeight: "800",
                    marginBottom: "24px",
                    color: "#111827",
                  }}
                >
                  ₹
                  {(
                    wallets[0]?.totalCollected || 0
                  ).toLocaleString("en-IN")}
                </h1>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div
                    className="wallet-stat-box"
                    style={{
                      background: "#fef2f2",
                      padding: "20px",
                      borderRadius: "16px",
                    }}
                  >
                    <p
                      style={{
                        color: "#6b7280",
                        marginBottom: "8px",
                        fontSize: "14px",
                      }}
                    >
                      Pending Submission To Admin
                    </p>
                    <strong
                      style={{
                        color: "#dc2626",
                        fontSize: "28px",
                      }}
                    >
                      ₹
                      {(
                        (wallets[0]?.totalCollected || 0) -
                        (wallets[0]?.settledAmount || 0)
                      ).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Submit To Admin */}
              <div
                className="delivery-card"
                style={{
                  marginTop: "24px",
                  border: "2px solid #dbeafe",
                }}
              >
                <h3 style={{ fontSize: "24px", marginBottom: "12px" }}>
                  🏢 Submit Cash To Admin
                </h3>
                <p
                  style={{
                    color: "#6b7280",
                    marginBottom: "20px",
                  }}
                >
                  Confirm that you have handed over the collected customer
                  cash to the admin/owner.
                </p>
                <div
                  style={{
                    background: "#eff6ff",
                    padding: "20px",
                    borderRadius: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    Amount Being Submitted
                  </p>
                  <h1
                    style={{
                      fontSize: "42px",
                      fontWeight: "800",
                      color: "#1d4ed8",
                    }}
                  >
                    ₹
                    {(
                      (wallets[0]?.totalCollected || 0) -
                      (wallets[0]?.settledAmount || 0)
                    ).toLocaleString("en-IN")}
                  </h1>
                </div>
                <button
                  className="btn-settle-enhanced"
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "14px",
                    fontSize: "18px",
                    fontWeight: "700",
                    background:
                      "linear-gradient(90deg,#2563eb,#1d4ed8)",
                  }}
                  onClick={handleSubmitSettlement}
                >
                  Submit To Admin
                </button>
              </div>
            </div>
          )}

          {/* ─── AGENT TRANSACTIONS ─── */}
          {activeTab === "transactions" && isAgentView && (
            <div className="delivery-card">
              <h3>Transactions</h3>
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <span>📭</span>
                  <p>No transactions yet</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="transaction-row"
                  >
                    <span>{tx.description}</span>
                    <strong>
                      ₹{tx.amount}
                    </strong>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─── ADMIN WALLETS ─── */}
          {activeTab === "wallets" && isAdminView && (
            <div className="tasks-list">
              {wallets.length === 0 ? (
                <div className="delivery-card">
                  <div className="empty-state">
                    <span>📭</span>
                    <p>No agent wallets found</p>
                  </div>
                </div>
              ) : (
                wallets.map((w) => (
                  <div
                    key={w._id}
                    className="admin-wallet-card"
                  >
                    <div className="admin-wallet-header">
                      <div>
                        <span className="admin-wallet-name">
                          {w.agentId?.name || "Agent"}
                        </span>
                        <br />
                        <small>{w.agentId?.email}</small>
                        {w.agentId?.totalTasks && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          >
                            📦 {w.agentId.totalTasks} tasks &nbsp;
                            ({w.agentId.completedTasks} completed)
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="admin-balance">
                          ₹{(w.withdrawableBalance || 0).toLocaleString()}
                        </div>
                        <small style={{ color: "#6b7280" }}>
                          Withdrawable
                        </small>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "8px",
                        fontSize: "13px",
                      }}
                    >
                      <div>
                        <strong>Total Collected:</strong>{" "}
                        ₹{(w.totalCollected || 0).toLocaleString()}
                      </div>
                      <div>
                        <strong>Pending Settlement:</strong>{" "}
                        ₹{(w.pendingSettlement || 0).toLocaleString()}
                      </div>
                      <div>
                        <strong>Settled:</strong>{" "}
                        ₹{(w.settledAmount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─── ADMIN SETTLEMENTS — Pending Agent Submissions ─── */}
          {activeTab === "settlements" && isAdminView && (
            <div style={{ padding: "16px" }}>
              <h3 style={{ marginBottom: "16px" }}>
                Pending Agent Submissions
              </h3>

              {settlements.length === 0 ? (
                <div className="delivery-card">
                  <div className="empty-state">
                    <span>📭</span>
                    <p>No settlement submissions</p>
                    <small>
                      Agent-submitted cash handovers will appear here
                    </small>
                  </div>
                </div>
              ) : (
                settlements.map((s) => (
                  <div
                    key={s._id}
                    className="settlement-card-enhanced"
                  >
                    <div className="settlement-header-enhanced">
                      <span>
                        <strong>Agent:</strong> {s.agentId?.name}
                        <br />
                        <small>
                          Order:{" "}
                          {s.orderId?.orderId || "—"}
                        </small>
                      </span>
                      <span
                        className={`settlement-status-badge ${statusBadgeClass(s.status)}`}
                      >
                        {s.status === "submitted"
                          ? "Submitted"
                          : s.status.charAt(0).toUpperCase() +
                            s.status.slice(1)}
                      </span>
                    </div>

                    <div className="settlement-amounts">
                      <div className="settlement-amount-row">
                        <span className="settlement-amount-label">
                          Customer Payment
                        </span>
                        <span className="settlement-amount-value">
                          ₹{s.customerPayment?.toLocaleString() ?? "—"}
                        </span>
                      </div>
                      {s.agentCommission > 0 && (
                        <>
                          <div className="settlement-amount-row">
                            <span className="settlement-amount-label">
                              Agent Fee
                            </span>
                            <span className="settlement-amount-value">
                              ₹{s.agentCommission?.toLocaleString()}
                            </span>
                          </div>
                          <div className="settlement-amount-row">
                            <span className="settlement-amount-label">
                              Admin Share
                            </span>
                            <span className="settlement-amount-value">
                              ₹{(
                                (s.customerPayment ?? 0) -
                                (s.agentCommission ?? 0)
                              ).toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}
                      {(!s.agentCommission || s.agentCommission === 0) && (
                        <div className="settlement-amount-row">
                          <span className="settlement-amount-label">
                            Admin Share
                          </span>
                          <span className="settlement-amount-value">
                            ₹{(s.customerPayment ?? 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="settlement-amount-row">
                        <span className="settlement-amount-label">
                          Submitted On
                        </span>
                        <span className="settlement-amount-value">
                          {s.submittedAt
                            ? new Date(
                                s.submittedAt
                              ).toLocaleDateString("en-IN")
                            : new Date(
                                s.createdAt
                              ).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {s.status === "submitted" && (
                      <div className="settlement-actions-enhanced">
                        <button
                          className="btn-settle-enhanced"
                          style={{ background: "#10b981" }}
                          onClick={() =>
                            handleAcceptSettlement(s._id)
                          }
                        >
                          ✅ Amount Received
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─── ADMIN ANALYTICS ─── */}
          {activeTab === "analytics" &&
            analytics &&
            isAdminView && (
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3>
                    ₹
                    {analytics.totalPlatformRevenue?.toLocaleString()}
                  </h3>
                  <p>Platform Revenue</p>
                </div>
                <div className="analytics-card">
                  <h3>
                    ₹
                    {analytics.pendingSettlements?.toLocaleString()}
                  </h3>
                  <p>Pending Settlements Value</p>
                </div>
                <div className="analytics-card">
                  <h3>
                    {analytics.pendingSettlementsCount || 0}
                  </h3>
                  <p>Pending Settlements Count</p>
                </div>
                <div className="analytics-card">
                  <h3>
                    {analytics.completedSettlements || 0}
                  </h3>
                  <p>Completed Settlements</p>
                </div>
                <div className="analytics-card">
                  <h3>
                    {analytics.totalAgents || 0}
                  </h3>
                  <p>Total Agents</p>
                </div>
                <div className="analytics-card">
                  <h3>
                    {analytics.recentCollections || 0}
                  </h3>
                  <p>Recent Collections (7 d)</p>
                </div>
                <div className="analytics-card">
                  <h3>
                    {analytics.recentSettlements || 0}
                  </h3>
                  <p>Recent Settlements (7 d)</p>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export default Wallet;
