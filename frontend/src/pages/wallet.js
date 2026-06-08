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
  const [pointsBalance, setPointsBalance] = useState(0);
  const [myClaims, setMyClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
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
        const [walletsRes, settlementsRes, allClaimsRes] =
          await Promise.all([
            api.get("/api/wallet/admin/wallets"),
            api.get("/api/wallet/admin/settlements?status=submitted"),
            api.get("/api/wallet/admin/wallet/points/claims"),
          ]);

        setWallets(walletsRes.data.wallets || []);
        setSettlements(settlementsRes.data.settlements || []);
        setAllClaims(allClaimsRes.data.claims || []);
      } else {
        const [walletRes, txRes, pointsRes, myClaimsRes] =
          await Promise.all([
            api.get("/api/wallet/wallet"),
            api.get("/api/wallet/transactions"),
            api.get("/api/wallet/wallet/points/balance"),
            api.get("/api/wallet/wallet/points/claims"),
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
        setSettlements(walletRes.data.pendingSettlements || []);
        setPointsBalance(pointsRes.data.pointsBalance || 0);
        setMyClaims(myClaimsRes.data.claims || []);
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

    if (
      !window.confirm(
        `Submit ₹${pendingAmount.toLocaleString("en-IN")} to admin?`
      )
    ) {
      return;
    }

    try {
      await api.post("/api/wallet/request-settlement");
      addToast("Cash submitted to admin successfully ✅", "success");
      fetchData();
    } catch (err) {
      addToast(
        err?.response?.data?.message || "Settlement failed ❌",
        "error"
      );
    }
  };

  // ── Admin "Amount Received" helper ──
  const handleAcceptSettlement = async (settlementId) => {
    try {
      await api.put("/api/wallet/admin/settlement/accept", {
        settlementId,
      });
      addToast(
        "Amount received ✅ — Agent wallet reset to zero",
        "success"
      );
      fetchData();
    } catch (err) {
      addToast(
        err?.response?.data?.message || "Failed to accept settlement",
        "error"
      );
    }
  };

  // ── Agent points claim submit ──
  const handleClaimSubmit = async (amount) => {
    try {
      await api.post("/api/wallet/wallet/points/claim", {
        requestedPoints: amount,
      });
      addToast("Claim submitted. Please confirm.", "success");
      fetchData();
    } catch (err) {
      addToast(
        err?.response?.data?.message || "Failed to submit claim",
        "error"
      );
    }
  };

  // ── Badge helper ──
  const statusBadgeClass = (status) => {
    switch (status) {
      case "submitted":
        return "badge-yellow";
      case "completed":
        return "badge-green";
      case "verified":
        return "badge-blue";
      case "rejected":
        return "badge-red";
      default:
        return "badge-gray";
    }
  };

  const pointsClaimBadgeClass = (status) => {
    switch (status) {
      case "awaiting_agent_confirm":
        return "badge-yellow";
      case "pending_admin":
        return "badge-blue";
      case "resolved":
        return "badge-green";
      default:
        return "badge-gray";
    }
  };

  return (
    <div className="delivery-page">
      <ToastContainer />

      <button
        className="btn-home"
        onClick={() => navigate("/")}
        aria-label="Back to home"
      >
        ← Back to Home
      </button>

      <header className="admin-header">
        <div>
          <h2 className="section-title">
            {isAgentView ? "💳 My Wallet" : "💰 Admin Finance Dashboard"}
          </h2>
          <p className="admin-subtitle">
            {isAgentView
              ? "View your balance, points and claims"
              : "Manage agent wallets and settlements"}
          </p>
        </div>
      </header>

      {/* ══════════════ TABS ══════════════ */}
      <nav className="tabs-nav" role="tablist" aria-label="Wallet sections">
        {isAgentView && (
          <>
            <button
              role="tab"
              aria-selected={activeTab === "my-wallet"}
              aria-label="My Wallet"
              className={`tab-btn ${activeTab === "my-wallet" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("my-wallet")}
            >
              💳 My Wallet
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "points"}
              aria-label="Points"
              className={`tab-btn ${activeTab === "points" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("points")}
            >
              ⭐ Points
            </button>
          </>
        )}

        {isAdminView && (
          <>
            <button
              role="tab"
              aria-selected={activeTab === "wallets"}
              aria-label="Agent Wallets"
              className={`tab-btn ${activeTab === "wallets" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("wallets")}
            >
              👥 Wallets
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "settlements"}
              aria-label="Settlements"
              className={`tab-btn ${activeTab === "settlements" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("settlements")}
            >
              💰 Settlements
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "points"}
              aria-label="Points"
              className={`tab-btn ${activeTab === "points" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("points")}
            >
              ⭐ Points
            </button>
          </>
        )}
      </nav>

      {/* ══════════════ CONTENT ══════════════ */}
      {isLoading ? (
        <div className="loading-container" role="status" aria-live="polite">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="tab-content">
          {/* ─── AGENT MY WALLET ─── */}
          {activeTab === "my-wallet" && isAgentView && (
            <section aria-labelledby="wallet-hero-heading">
              <div className="wallet-hero">
                <p id="wallet-hero-heading" className="wallet-hero-title">
                  Total Customer Cash Collected
                </p>
                <p
                  className="wallet-amount-xl"
                  aria-label={`Total collected ${(wallets[0]?.totalCollected || 0).toLocaleString("en-IN")} rupees`}
                >
                  ₹
                  {(
                    wallets[0]?.totalCollected || 0
                  ).toLocaleString("en-IN")}
                </p>
                <div className="wallet-metrics">
                  <div className="wallet-metric-card">
                    <p className="wallet-metric-label">
                      Pending Submission To Admin
                    </p>
                    <p className="wallet-metric-value">
                      ₹
                      {(
                        (wallets[0]?.totalCollected || 0) -
                        (wallets[0]?.settledAmount || 0)
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="wallet-metric-card">
                    <p className="wallet-metric-label">
                      Settled Amount
                    </p>
                    <p className="wallet-metric-value">
                      ₹
                      {(
                        wallets[0]?.settledAmount || 0
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="wallet-metric-card">
                    <p className="wallet-metric-label">
                      Shortage
                    </p>
                    <p className="wallet-metric-value">
                      ₹
                      {(
                        wallets[0]?.shortBalance || 0
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="wallet-card">
                <h3 className="wallet-section-title">
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
                  className="wallet-metric-card"
                  style={{
                    background: "#eff6ff",
                    marginBottom: "20px",
                  }}
                >
                  <p className="wallet-metric-label">
                    Amount Being Submitted
                  </p>
                  <p
                    className="wallet-amount-xl"
                    style={{
                      fontSize: "40px",
                      color: "#1d4ed8",
                    }}
                  >
                    ₹
                    {(
                      (wallets[0]?.totalCollected || 0) -
                      (wallets[0]?.settledAmount || 0)
                    ).toLocaleString("en-IN")}
                  </p>
                </div>
                <button
                  className="wallet-action-btn primary"
                  style={{ width: "100%" }}
                  onClick={handleSubmitSettlement}
                >
                  Submit To Admin
                </button>
              </div>
            </section>
          )}

          {/* ─── POINTS & CLAIMS ─── */}
          {activeTab === "points" && (
            <section aria-labelledby="points-heading">
              <div className="wallet-hero">
                <p id="points-heading" className="wallet-hero-title">
                  {isAgentView ? "Available Points" : "Points Overview"}
                </p>
                <p
                  className="wallet-amount-xl"
                  aria-label={`Available points ${pointsBalance}`}
                >
                  {pointsBalance.toLocaleString("en-IN")}
                </p>
                <div className="wallet-metrics">
                  <div className="wallet-metric-card">
                    <p className="wallet-metric-label">Total Earned</p>
                    <p className="wallet-metric-value">
                      {(wallets[0]?.totalPointsEarned || 0).toLocaleString(
                        "en-IN"
                      )}
                    </p>
                  </div>
                  <div className="wallet-metric-card">
                    <p className="wallet-metric-label">Paid Out</p>
                    <p className="wallet-metric-value">
                      {(wallets[0]?.totalPointsPaidOut || 0).toLocaleString(
                        "en-IN"
                      )}
                    </p>
                  </div>
                  <div className="wallet-metric-card">
                    <p className="wallet-metric-label">Reserved</p>
                    <p className="wallet-metric-value">
                      {(wallets[0]?.pointsReserved || 0).toLocaleString(
                        "en-IN"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {isAgentView && (
                <div className="wallet-card">
                  <h3 className="wallet-section-title">
                    New Claim
                  </h3>
                  <p
                    style={{
                      color: "#6b7280",
                      marginBottom: "12px",
                    }}
                  >
                    Enter the points you want to claim. Your claim must be
                    confirmed by you and approved by the admin before
                    payout.
                  </p>
                  <div className="claim-form">
                    <input
                      id="claimAmountInput"
                      type="number"
                      className="claim-input"
                      min="1"
                      max={pointsBalance}
                      placeholder="Amount to claim"
                      aria-label="Claim amount"
                    />
                    <button
                      className="claim-submit-btn"
                      onClick={async () => {
                        const input = document.getElementById(
                          "claimAmountInput"
                        );
                        const amount = Number(input?.value);
                        if (!amount || amount <= 0) {
                          addToast("Enter a valid amount", "error");
                          return;
                        }
                        if (amount > pointsBalance) {
                          addToast(
                            "Amount exceeds available points",
                            "error"
                          );
                          return;
                        }
                        await handleClaimSubmit(amount);
                      }}
                    >
                      Submit Claim
                    </button>
                  </div>
                  <small className="claim-hint">
                    Max claimable: {pointsBalance.toLocaleString("en-IN")}{" "}
                    points
                  </small>
                </div>
              )}

              <div className="wallet-card">
                <h3 className="wallet-section-title">
                  {isAgentView ? "My Claims" : "All Agent Claims"}
                </h3>
                {(isAgentView ? myClaims : allClaims).length === 0 ? (
                  <div className="wallet-empty">
                    <span>📭</span>
                    <p>No claims yet</p>
                  </div>
                ) : (
                  (isAgentView ? myClaims : allClaims).map((c) => (
                    <div key={c._id} className="claim-row">
                      <div>
                        <div className="claim-row-header">
                          <strong>
                            {isAgentView
                              ? "Claim"
                              : `Agent: ${c.agentId?.name || "Agent"}`}
                          </strong>
                          <span
                            className={`claim-status-badge ${pointsClaimBadgeClass(c.status)}`}
                          >
                            {c.status
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </div>
                        <div className="claim-meta">
                          {new Date(c.submittedAt).toLocaleString(
                            "en-IN"
                          )}
                        </div>
                        <div className="claim-amount">
                          {c.requestedPoints?.toLocaleString?.() ||
                            c.requestedPoints}{" "}
                          pts
                        </div>
                        {c.note && (
                          <div className="claim-meta">
                            Note: {c.note}
                          </div>
                        )}
                      </div>
                      <div>
                        {isAgentView &&
                          c.status === "awaiting_agent_confirm" && (
                            <button
                              className="wallet-action-btn info"
                              style={{ width: "auto" }}
                              onClick={async () => {
                                try {
                                  await api.post(
                                    "/api/wallet/wallet/points/confirm",
                                    { claimId: c._id }
                                  );
                                  addToast(
                                    "Claim confirmed and sent to admin",
                                    "success"
                                  );
                                  fetchData();
                                } catch (err) {
                                  addToast(
                                    err?.response?.data?.message ||
                                      "Failed to confirm claim",
                                    "error"
                                  );
                                }
                              }}
                            >
                              Confirm & Send to Admin
                            </button>
                          )}
                        {!isAgentView &&
                          c.status === "pending_admin" && (
                            <button
                              className="wallet-action-btn success"
                              style={{ width: "auto" }}
                              onClick={async () => {
                                try {
                                  await api.put(
                                    `/api/wallet/admin/wallet/points/approve/${c._id}`
                                  );
                                  addToast(
                                    "Claim approved and points deducted",
                                    "success"
                                  );
                                  fetchData();
                                } catch (err) {
                                  addToast(
                                    err?.response?.data?.message ||
                                      "Failed to approve claim",
                                    "error"
                                  );
                                }
                              }}
                            >
                              Approve & Pay
                            </button>
                          )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* ─── ADMIN WALLETS ─── */}
          {activeTab === "wallets" && isAdminView && (
            <section aria-labelledby="wallets-heading">
              <h3
                id="wallets-heading"
                className="wallet-section-title"
              >
                Agent Wallets
              </h3>
              {wallets.length === 0 ? (
                <div className="wallet-empty">
                  <span>📭</span>
                  <p>No agent wallets found</p>
                </div>
              ) : (
                <div>
                  {wallets.map((w) => (
                    <div
                      key={w._id}
                      className="wallet-card"
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              fontSize: "15px",
                              color: "var(--text)",
                            }}
                          >
                            {w.agentId?.name || "Agent"}
                          </strong>
                          <br />
                          <small style={{ color: "#6b7280" }}>
                            {w.agentId?.email}
                          </small>
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: "900",
                              color: "var(--primary)",
                            }}
                          >
                            ₹
                            {(
                              w.withdrawableBalance || 0
                            ).toLocaleString("en-IN")}
                          </div>
                          <small style={{ color: "#6b7280" }}>
                            Withdrawable
                          </small>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "8px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        <div>
                          <strong>Total Collected:</strong>{" "}
                          ₹
                          {(
                            w.totalCollected || 0
                          ).toLocaleString("en-IN")}
                        </div>
                        <div>
                          <strong>Pending Settlement:</strong>{" "}
                          ₹
                          {(
                            w.pendingSettlement || 0
                          ).toLocaleString("en-IN")}
                        </div>
                        <div>
                          <strong>Settled:</strong>{" "}
                          ₹
                          {(
                            w.settledAmount || 0
                          ).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ─── ADMIN SETTLEMENTS ─── */}
          {activeTab === "settlements" && isAdminView && (
            <section aria-labelledby="settlements-heading">
              <h3
                id="settlements-heading"
                className="wallet-section-title"
              >
                Pending Agent Submissions
              </h3>
              {settlements.length === 0 ? (
                <div className="wallet-empty">
                  <span>📭</span>
                  <p>No settlement submissions</p>
                  <small>
                    Agent-submitted cash handovers will appear here
                  </small>
                </div>
              ) : (
                <div>
                  {settlements.map((s) => (
                    <div
                      key={s._id}
                      className="wallet-card"
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <div>
                          <strong>Agent:</strong> {s.agentId?.name}
                          <br />
                          <small style={{ color: "#6b7280" }}>
                            Order: {s.orderId?.orderId || "—"}
                          </small>
                        </div>
                        <span
                          className={`claim-status-badge ${statusBadgeClass(s.status)}`}
                        >
                          {s.status === "submitted"
                            ? "Submitted"
                            : s.status.charAt(0).toUpperCase() +
                              s.status.slice(1)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: "10px",
                          fontSize: "14px",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              color: "#6b7280",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            Customer Payment
                          </span>
                          <div style={{ fontWeight: "900" }}>
                            ₹
                            {s.customerPayment?.toLocaleString() ?? "—"}
                          </div>
                        </div>
                        <div>
                          <span
                            style={{
                              color: "#6b7280",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            Admin Share
                          </span>
                          <div style={{ fontWeight: "900" }}>
                            ₹
                            {(
                              (s.customerPayment ?? 0) -
                              (s.agentCommission ?? 0)
                            ).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span
                            style={{
                              color: "#6b7280",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            Agent Fee
                          </span>
                          <div style={{ fontWeight: "900" }}>
                            ₹
                            {(
                              s.agentCommission || 0
                            ).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span
                            style={{
                              color: "#6b7280",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            Submitted On
                          </span>
                          <div>
                            {s.submittedAt
                              ? new Date(
                                  s.submittedAt
                                ).toLocaleDateString("en-IN")
                              : new Date(
                                  s.createdAt
                                ).toLocaleDateString("en-IN")}
                          </div>
                        </div>
                      </div>
                      {s.status === "submitted" && (
                        <div
                          style={{
                            marginTop: "16px",
                          }}
                        >
                          <button
                            className="wallet-action-btn success"
                            style={{ width: "100%" }}
                            onClick={() =>
                              handleAcceptSettlement(s._id)
                            }
                          >
                            ✅ Amount Received
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default Wallet;
