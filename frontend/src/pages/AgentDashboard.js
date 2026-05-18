import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import "../styles/delivery.css";

function TaskCard({ task, statusBadge, onAccept, onReject, onStatusChange, isActive, navigate }) {
   const orderId = task?.orderId?._id || task?.orderId;
   // Handle both populated object and raw ObjectId, plus fallback server-side fields
   const productName = task?.productId?.name || task?.productName || "Unknown Product";
   const productImage = task?.productId?.image || task?.productId?.images?.[0];
   const lenderName = task?.lenderId?.name || task?.lenderName || "Unknown";
   const renterName = task?.renterId?.name || task?.renterName || "Unknown";

   return (
     <div className="task-card">
       <div className="task-card-header">
         <div className="task-type-badge">{task.taskType === "delivery" ? "📦 DELIVERY" : "📥 PICKUP"}</div>
         <span className={`status-badge ${statusBadge}`}>{task.status}</span>
       </div>

       <div className="task-card-body">
         {productImage && <img src={productImage} alt={productName} className="task-product-img" />}
         <div className="task-info">
           <h4>{productName}</h4>
           <div className="task-detail-row">
             <span className="task-label">Order:</span>
             <span>{orderId ? String(orderId).substring(0, 8) : "N/A"}</span>
           </div>
           <div className="task-detail-row">
             <span className="task-label">From:</span>
             <span>{lenderName}</span>
           </div>
           <div className="task-detail-row">
             <span className="task-label">To:</span>
             <span>{renterName}</span>
           </div>
           <div className="task-detail-row">
             <span className="task-label">Payment:</span>
             <span>₹{task.paymentAmount}</span>
           </div>
           <div className="task-detail-row">
             <span className="task-label">Assigned:</span>
             <span>{task.assignedAt ? new Date(task.assignedAt).toLocaleString("en-IN") : "N/A"}</span>
           </div>
         </div>
       </div>

      {task.trackingLogs && task.trackingLogs.length > 0 && (
        <div className="task-timeline-mini">
          {task.trackingLogs.slice(-3).reverse().map((log, idx) => (
            <div className="timeline-item-mini" key={idx}>
              <span className="timeline-dot"></span>
              <span className="timeline-text">{log.status}</span>
              <span className="timeline-time">{log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : ""}</span>
            </div>
          ))}
        </div>
      )}

      <div className="task-card-actions">
        {task.status === "Waiting for Agent" && !isActive && (
          <>
            <button className="btn-accept" onClick={onAccept}>Accept Task</button>
            <button className="btn-reject" onClick={onReject}>Reject</button>
          </>
        )}
        {isActive && task.status === "Accepted" && (
          <button className="btn-action" onClick={() => onStatusChange(task._id, "Picking Up Product")}>Start Pickup</button>
        )}
        {isActive && task.status === "Picking Up Product" && (
          <button className="btn-action" onClick={() => onStatusChange(task._id, "In Transit")}>Mark In Transit</button>
        )}
        {isActive && task.status === "In Transit" && task.taskType === "delivery" && (
          <button className="btn-action" onClick={() => onStatusChange(task._id, "Delivered")}>Mark Delivered</button>
        )}
        {isActive && task.status === "In Transit" && task.taskType === "pickup" && (
          <button className="btn-action" onClick={() => onStatusChange(task._id, "Returned to Lender")}>Mark Returned</button>
        )}
        {isActive && task.status === "Delivered" && task.taskType === "delivery" && (
          <button className="btn-action" onClick={() => onStatusChange(task._id, "Completed")}>Complete Task</button>
        )}
        {isActive && task.status === "Returned to Lender" && (
          <button className="btn-action" onClick={() => onStatusChange(task._id, "Completed")}>Complete Task</button>
        )}
        {!isActive && task.status !== "Waiting for Agent" && (
          <button className="btn-view" onClick={() => navigate(`/delivery/task/${task._id}`)}>View Details</button>
        )}
      </div>
    </div>
  );
}

function AgentDashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  }, []);

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [availability, setAvailability] = useState("available");

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [profileRes, tasksRes, availableRes, earningsRes] = await Promise.all([
        api.get("/api/delivery/profile"),
        api.get("/api/delivery/my-tasks"),
        api.get("/api/delivery/available-tasks"),
        api.get("/api/delivery/earnings"),
      ]);
      setProfile(profileRes.data.profile);
      setStats(profileRes.data.stats);

      const tasksPayload = tasksRes.data;
      setTasks(Array.isArray(tasksPayload) ? tasksPayload : tasksPayload?.tasks || []);

      const availablePayload = availableRes.data;
      setAvailableTasks(
        Array.isArray(availablePayload) ? availablePayload : availablePayload?.tasks || []
      );
      setEarnings(earningsRes.data.earnings || []);
      setEarningsSummary(earningsRes.data.summary);
      setAvailability(profileRes.data.profile?.availability_status || "available");
    } catch (err) { console.error("Dashboard fetch error:", err); }
    finally { setIsLoading(false); }
  }, [user]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleToggleAvailability = async () => {
    try {
      const newStatus = availability === "available" ? "unavailable" : "available";
      await api.put("/api/delivery/profile", { availability_status: newStatus });
      setAvailability(newStatus);
      fetchDashboardData();
    } catch (err) { alert("Failed to update availability"); }
  };

const handleTaskAction = async (taskId, action) => {
      try {
        if (action === "accept") {
          await api.post(`/api/delivery/accept-task/${taskId}`);
        } else if (action === "reject") {
         const reason = prompt("Enter rejection reason:");
         if (!reason) return;
         await api.post(`/api/delivery/reject-task/${taskId}`, { reason });
       }
       fetchDashboardData();
     } catch (err) { alert(err?.response?.data?.message || "Operation failed"); }
   };

const updateTaskStatus = async (taskId, newStatus) => {
      try {
        const payload = { status: newStatus };

        // For delivery completion or return, always ask the user for OTP.
        // The OTP belongs to the user (renter), not the agent.
        if (newStatus === "Delivered" || newStatus === "Returned to Lender") {
          const otp = prompt(`Enter the OTP provided by the user (for ${newStatus === "Delivered" ? "delivery" : "return pickup"}):`);
          if (!otp) {
            alert("OTP is required to verify delivery/return.");
            return;
          }
          payload.otp = otp;
        }

        if (["Delivered", "Picking Up Product", "In Transit"].includes(newStatus)) {
          const note = prompt("Add notes (optional):");
          if (note) payload.notes = note;
        }
        await api.put(`/api/delivery/task/${taskId}/status`, payload);
        fetchDashboardData();
      } catch (err) { alert(err?.response?.data?.message || "Failed to update status"); }
    };

  const getStatusBadge = (status) => {
    const colors = {
      "Waiting for Agent": "badge-yellow", "Accepted": "badge-blue",
      "Picking Up Product": "badge-orange", "In Transit": "badge-purple",
      "Delivered": "badge-green", "Pickup Scheduled": "badge-teal",
      "Return In Transit": "badge-indigo", "Returned to Lender": "badge-emerald",
      "Completed": "badge-gray", "Rejected": "badge-red",
    };
    return colors[status] || "badge-gray";
  };

  if (isLoading) {
    return <div className="delivery-page"><div className="loading-container"><div className="spinner"></div><p>Loading dashboard...</p></div></div>;
  }
  if (!user) {
    return <div className="delivery-page"><div className="delivery-card"><h2>Please login first</h2><button onClick={() => navigate("/login")} className="delivery-btn-primary">Go to Login</button></div></div>;
  }
  if (!user.isDeliveryAgent || user.verification_status !== "approved") {
    return <div className="delivery-page"><div className="delivery-card"><h2>🚫 Access Denied</h2><p>You need to be an approved delivery agent.</p><button onClick={() => navigate("/become-agent")} className="delivery-btn-primary">Apply as Agent</button></div></div>;
  }

  const pendingTasks = availableTasks.filter((t) => t.status === "Waiting for Agent" && !t.agentId);
  const myActiveTasks = tasks.filter((t) =>
    ["Accepted", "Picking Up Product", "In Transit", "Pickup Scheduled", "Return In Transit"].includes(t.status));
  const completedTasks = tasks.filter((t) =>
    ["Delivered", "Returned to Lender", "Completed"].includes(t.status));

  return (
    <div className="delivery-page">
      <button className="btn-home" onClick={() => navigate("/")}>← Back to Home</button>
      <div className="stats-grid">
        <div className="stat-card stat-blue"><div className="stat-icon">📦</div><div className="stat-info"><h3>{pendingTasks.length}</h3><p>Available Tasks</p></div></div>
        <div className="stat-card stat-orange"><div className="stat-icon">🚚</div><div className="stat-info"><h3>{myActiveTasks.length}</h3><p>Active Tasks</p></div></div>
        <div className="stat-card stat-green"><div className="stat-icon">✅</div><div className="stat-info"><h3>{completedTasks.length}</h3><p>Completed</p></div></div>
        <div className="stat-card stat-purple"><div className="stat-icon">💰</div><div className="stat-info"><h3>₹{stats?.totalEarned || 0}</h3><p>Total Earned</p></div></div>
      </div>

      <div className="availability-bar">
        <span>Status: <strong>{availability === "available" ? "🟢 Available" : "🔴 Unavailable"}</strong></span>
        <button onClick={handleToggleAvailability} className="availability-toggle-btn">
          {availability === "available" ? "Go Offline" : "Go Online"}
        </button>
      </div>

      <div className="tabs-nav">
        <button className={`tab-btn ${activeTab === "dashboard" ? "tab-active" : ""}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
        <button className={`tab-btn ${activeTab === "available" ? "tab-active" : ""}`} onClick={() => setActiveTab("available")}>Available ({pendingTasks.length})</button>
        <button className={`tab-btn ${activeTab === "active" ? "tab-active" : ""}`} onClick={() => setActiveTab("active")}>My Tasks ({myActiveTasks.length})</button>
        <button className={`tab-btn ${activeTab === "completed" ? "tab-active" : ""}`} onClick={() => setActiveTab("completed")}>Completed ({completedTasks.length})</button>
        <button className={`tab-btn ${activeTab === "earnings" ? "tab-active" : ""}`} onClick={() => setActiveTab("earnings")}>Earnings</button>
      </div>

      <div className="tab-content">
        {activeTab === "dashboard" && (
          <div className="dashboard-tab">
            <div className="profile-section">
              <h3>👤 Agent Profile</h3>
              <div className="profile-grid">
                <div className="profile-item"><label>Name</label><span>{profile?.name}</span></div>
                <div className="profile-item"><label>Email</label><span>{profile?.email}</span></div>
                <div className="profile-item"><label>Phone</label><span>{profile?.phone || "Not set"}</span></div>
                <div className="profile-item"><label>Vehicle</label><span>{profile?.vehicle_type || "Not set"}</span></div>
                <div className="profile-item"><label>Transport</label><span>{profile?.transport_type || "Not set"}</span></div>
                <div className="profile-item"><label>Completed</label><span>{profile?.completed_deliveries || 0}</span></div>
                <div className="profile-item"><label>Balance</label><span>₹{profile?.earnings_balance || 0}</span></div>
                <div className="profile-item"><label>Verification</label><span className="badge-approved">{profile?.verification_status}</span></div>
              </div>
            </div>
            <div className="quick-actions"><h3>⚡ Quick Actions</h3>
              <div className="actions-grid">
                <button className="action-btn" onClick={() => setActiveTab("available")}>📦 View Available Tasks</button>
                <button className="action-btn" onClick={() => setActiveTab("active")}>🚚 My Active Tasks</button>
                <button className="action-btn" onClick={() => setActiveTab("earnings")}>💰 Earnings</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "available" && (
          <div className="tasks-tab">
            <h3>📦 Available Delivery Tasks ({pendingTasks.length})</h3>
            {pendingTasks.length === 0 ? (
              <div className="empty-state"><span>📭</span><p>No available tasks at the moment</p></div>
            ) : (
              <div className="tasks-list">
{pendingTasks.map((task) => (
                    <TaskCard key={task._id} task={task} statusBadge={getStatusBadge(task.status)}
                      onAccept={() => handleTaskAction(task._id, "accept")}
                      onReject={() => handleTaskAction(task._id, "reject")}
                      navigate={navigate} />
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "active" && (
          <div className="tasks-tab">
            <h3>🚚 Active Tasks ({myActiveTasks.length})</h3>
            {myActiveTasks.length === 0 ? (
              <div className="empty-state"><span>🚛</span><p>No active tasks</p></div>
            ) : (
              <div className="tasks-list">
{myActiveTasks.map((task) => (
                    <TaskCard key={task._id} task={task} statusBadge={getStatusBadge(task.status)}
                      onStatusChange={updateTaskStatus} isActive={true} navigate={navigate} />
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "completed" && (
          <div className="tasks-tab">
            <h3>✅ Completed Tasks ({completedTasks.length})</h3>
            {completedTasks.length === 0 ? (
              <div className="empty-state"><span>📋</span><p>No completed tasks yet</p></div>
            ) : (
              <div className="tasks-list">
{completedTasks.map((task) => (
                    <TaskCard key={task._id} task={task} statusBadge={getStatusBadge(task.status)} navigate={navigate} />
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "earnings" && (
          <div className="earnings-tab">
            <h3>💰 Earnings Summary</h3>
            <div className="earnings-summary-grid">
              <div className="earnings-card earnings-pending"><div className="earnings-amount">₹{earningsSummary?.pendingAmount || 0}</div><div className="earnings-label">Pending ({earningsSummary?.pendingCount || 0} tasks)</div></div>
              <div className="earnings-card earnings-paid"><div className="earnings-amount">₹{earningsSummary?.paidAmount || 0}</div><div className="earnings-label">Paid ({earningsSummary?.paidCount || 0} tasks)</div></div>
              <div className="earnings-card earnings-total"><div className="earnings-amount">₹{earningsSummary?.totalEarned || 0}</div><div className="earnings-label">Total Earned</div></div>
              <div className="earnings-card earnings-balance"><div className="earnings-amount">₹{profile?.earnings_balance || 0}</div><div className="earnings-label">Withdrawable Balance</div></div>
            </div>
            <div className="earnings-history"><h4>Earnings History</h4>
              {earnings.length === 0 ? <p className="empty-text">No earnings yet</p> : (
                <div className="earnings-table">
                  <div className="earnings-table-header"><span>Date</span><span>Task</span><span>Type</span><span>Amount</span><span>Status</span></div>
                  {earnings.map((e) => (
                    <div className="earnings-table-row" key={e._id}>
                      <span>{new Date(e.createdAt).toLocaleDateString("en-IN")}</span>
                      <span>{e.taskId?._id?.substring(0, 8)}...</span>
                      <span className="badge-delivery">{e.earningType === "delivery" ? "📦 Delivery" : "📥 Pickup"}</span>
                      <span>₹{e.amount}</span>
                      <span className={e.status === "paid" ? "badge-paid" : "badge-pending-earn"}>{e.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentDashboard;
