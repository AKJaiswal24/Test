import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useToast } from "../components/UI/Toast";
import "../styles/delivery.css";

function AdminAgentApprovals() {
  const navigate = useNavigate();
  const { addToast, ToastContainer } = useToast();

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  }, []);

  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState("");

  // Redirect non-admins
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!user.isAdmin) {
      navigate("/");
      return;
    }
  }, [user, navigate]);

  const fetchApplications = useCallback(async () => {
    try {
      setError("");
      setIsLoading(true);
      const res = await api.get(`/api/delivery/applications?verification_status=${filter}`);
      setApplications(res.data.agents || []);
    } catch (err) {
      console.error("Fetch applications error:", err);
      setError("Failed to fetch applications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    fetchApplications();
  }, [filter, user?.isAdmin, fetchApplications]);

  // Periodic refresh every 15 seconds to keep data in sync
  useEffect(() => {
    if (!user?.isAdmin) return;
    const interval = setInterval(fetchApplications, 15000);
    return () => clearInterval(interval);
  }, [user?.isAdmin, fetchApplications]);

  const handleApprove = async (agentId, agentName) => {
    if (!window.confirm(`Approve ${agentName} as a delivery agent?`)) return;
    try {
      const reason = prompt(`Enter approval reason for ${agentName} (optional):`);
      if (reason === null) return; // User cancelled
      await api.put(`/api/delivery/approve/${agentId}`, { isApproved: true, reason: reason || "" });
      // Update local state immediately
      setApplications((prev) =>
        prev.map((a) =>
          a._id === agentId
            ? { ...a, verification_status: "approved", approvedAt: new Date().toISOString() }
            : a
        )
      );
      addToast(`${agentName} has been approved as a delivery agent!`, "success");
    } catch (err) {
      addToast(err?.response?.data?.message || `Failed to approve agent`, "error");
      // Refresh on error to ensure consistency
      fetchApplications();
    }
  };

  const handleReject = async (agentId, agentName) => {
    const reason = prompt(`Enter rejection reason for ${agentName}:`);
    if (!reason) {
      addToast("Please provide a rejection reason", "error");
      return;
    }
    if (!window.confirm(`Reject ${agentName}? Reason: ${reason}`)) return;
    try {
      await api.put(`/api/delivery/reject/${agentId}`, { reason });
      // Update local state immediately
      setApplications((prev) =>
        prev.filter((a) => a._id !== agentId)
      );
      addToast(`${agentName} has been rejected.`, "success");
    } catch (err) {
      addToast(err?.response?.data?.message || `Failed to reject agent`, "error");
      fetchApplications();
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      "pending": "badge-yellow",
      "approved": "badge-green",
      "rejected": "badge-red",
    };
    return colors[status] || "badge-gray";
  };

  if (!user) return null;
  if (!user.isAdmin) return null;

  const pendingCount = applications.filter((a) => a.verification_status === "pending").length;
  const approvedCount = applications.filter((a) => a.verification_status === "approved").length;
  const rejectedCount = applications.filter((a) => a.verification_status === "rejected").length;

  return (
    <div className="delivery-page">
      <ToastContainer />
      <button className="btn-home" onClick={() => navigate("/")}>← Back to Home</button>
      <div className="admin-header">
        <div>
          <h2 className="section-title">👥 Agent Application Management</h2>
          <p className="admin-subtitle">Review and approve delivery agent applications</p>
        </div>
        <div className="admin-stats">
          <span className="stat-pill">Pending: {pendingCount}</span>
          <span className="stat-pill approved-pill">Approved: {approvedCount}</span>
          <span className="stat-pill rejected-pill">Rejected: {rejectedCount}</span>
        </div>
      </div>

      <div className="tabs-nav" style={{ marginBottom: "20px" }}>
        <button className={`tab-btn ${filter === "pending" ? "tab-active" : ""}`} onClick={() => setFilter("pending")}>
          Pending ({pendingCount})
        </button>
        <button className={`tab-btn ${filter === "approved" ? "tab-active" : ""}`} onClick={() => setFilter("approved")}>
          ✅ Approved ({approvedCount})
        </button>
        <button className={`tab-btn ${filter === "rejected" ? "tab-active" : ""}`} onClick={() => setFilter("rejected")}>
          ❌ Rejected ({rejectedCount})
        </button>
        <button className={`tab-btn ${filter === "all" ? "tab-active" : ""}`} onClick={() => setFilter("all")}>
          All ({applications.length})
        </button>
      </div>

      {error && (
        <div className="delivery-card" style={{ borderColor: "#fee2e2", background: "#fff1f2" }}>
          <p style={{ color: "#991b1b", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="delivery-card">
          <div className="empty-state">
            <span>{filter === "pending" ? "📭" : filter === "approved" ? "✅" : "❌"}</span>
            <p>No {filter === "all" ? "" : filter} applications found</p>
          </div>
        </div>
      ) : (
        <div className="tasks-list">
          {applications.map((agent) => (
            <div className="delivery-card agent-app-card" key={agent._id}>
              <div className="agent-app-header">
                <div className="agent-app-info">
                  <div className="agent-app-name-row">
                    <h3 style={{ margin: 0 }}>{agent.name}</h3>
                    <span className={`status-badge ${getStatusBadge(agent.verification_status)}`}>
                      {agent.verification_status?.toUpperCase()}
                    </span>
                  </div>
                  <p className="agent-app-email">
                    📧 {agent.email} &nbsp;|&nbsp; 📞 {agent.phone || "No phone"}
                  </p>
                </div>
              </div>

              <div className="agent-details-grid">
                <div className="agent-detail-item">
                  <label>🚗 Vehicle</label>
                  <span>{agent.vehicle_type || "Not specified"}</span>
                </div>
                <div className="agent-detail-item">
                  <label>🚚 Transport</label>
                  <span>{agent.transport_type || "Not specified"}</span>
                </div>
                <div className="agent-detail-item">
                  <label>📦 Completed</label>
                  <span>{agent.completed_deliveries || 0} deliveries</span>
                </div>
                <div className="agent-detail-item">
                  <label>💰 Balance</label>
                  <span>₹{agent.earnings_balance || 0}</span>
                </div>
                <div className="agent-detail-item">
                  <label>📅 Applied</label>
                  <span>{agent.appliedAt ? new Date(agent.appliedAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A"}</span>
                </div>
                {agent.approvedAt && (
                  <div className="agent-detail-item">
                    <label>✅ Approved</label>
                    <span>{new Date(agent.approvedAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                {agent.rejectedAt && (
                  <div className="agent-detail-item">
                    <label>❌ Rejected</label>
                    <span>{new Date(agent.rejectedAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
              </div>

              {filter === "pending" && (
                <div className="agent-app-actions">
                  <button className="btn-approve" onClick={() => handleApprove(agent._id, agent.name)}>
                    ✅ Approve
                  </button>
                  <button className="btn-reject-admin" onClick={() => handleReject(agent._id, agent.name)}>
                    ❌ Reject
                  </button>
                </div>
              )}

              {filter === "rejected" && agent.rejectionReason && (
                <div className="rejection-reason">
                  <label>Rejection Reason:</label>
                  <span>{agent.rejectionReason}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminAgentApprovals;
