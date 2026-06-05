import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useToast } from "../components/UI/Toast";
import Modal from "../components/UI/Modal";
import "../styles/delivery.css";

/* ─────────────── Skeleton Card ─────────────── */
function SkeletonCard() {
  return (
    <div className="task-card">
      <div className="skeleton skeleton-head" />
      <div className="skeleton skeleton-body" />
      <div className="skeleton-row" />
      <div className="skeleton-row" />
      <div className="skeleton-row short" />
    </div>
  );
}

/* ─────────────── Task Card ─────────────── */
const getTaskTransactionAmount = (task) => {
  const grandTotal = Number(task?.orderId?.grandTotal || 0);
  if (grandTotal > 0) return grandTotal;
  const collectedAmount = Number(task?.codAmountReceived || 0);
  if (collectedAmount > 0) return collectedAmount;
  return Number(task?.paymentAmount || 0);
};

function TaskCard({ task, statusBadge, onAccept, onReject, onStatusChange, onPaid, isActive, navigate }) {
  const orderId = task?.orderId?._id || task?.orderId;
  const productName = task?.productId?.name || task?.productName || "Unknown Product";
  const productImage = task?.productId?.image || task?.productId?.images?.[0];
  const lenderName = task?.lenderId?.name || task?.lenderName || "Unknown";
  const renterName = task?.renterId?.name || task?.renterName || "Unknown";

  const transactionAmount = getTaskTransactionAmount(task);
  const [paymentAmount, setPaymentAmount] = useState(transactionAmount ? String(transactionAmount) : "");
  const [otp, setOtp] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    setPaymentAmount(transactionAmount ? String(transactionAmount) : "");
    setOtp("");
  }, [task?._id, transactionAmount]);

const getActionLabel = (status, taskType) => {
  if (status === "Accepted") return "🚀 Start Pickup";
  if (status === "Picking Up Product") return "🚛 Mark In Transit";
  if (status === "In Transit" && taskType === "delivery") return "📍 Record Payment & Deliver";
  if (status === "In Transit" && taskType === "pickup") return "🏠 Mark Returned";
  if (status === "In Transit" && taskType === "vendor_return") return "📍 Record Vendor OTP & Return";
  if (status === "Delivered" && taskType === "delivery") return "✅ Complete";
  if (status === "Returned to Lender") return "✅ Complete";
  if (status === "Returned to Vendor" && taskType === "vendor_return") return "✅ Complete";
  return null;
};

  const actionLabel = getActionLabel(task.status, task.taskType);
const actionNext = (() => {
  if (task.status === "Accepted") return "Picking Up Product";
  if (task.status === "Picking Up Product") return "In Transit";
  if (task.status === "In Transit" && task.taskType === "delivery") return "Delivered";
  if (task.status === "In Transit" && task.taskType === "pickup") return "Returned to Lender";
  if (task.status === "In Transit" && task.taskType === "vendor_return") return "Returned to Vendor";
  if (task.status === "Delivered" && task.taskType === "delivery") return "Completed";
  if (task.status === "Returned to Lender") return "Completed";
  if (task.status === "Returned to Vendor" && task.taskType === "vendor_return") return "Completed";
  return null;
})();

  const showInlinePaymentForm = isActive && (task.taskType === "delivery" || task.taskType === "vendor_return") && task.status === "In Transit";

  const handlePaid = async () => {
    if (!onPaid || isPaying) return;
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    if (!otp) return;
    setIsPaying(true);
    try {
      const completed = await onPaid(task._id, { amount: Number(paymentAmount), otp });
      if (completed) setOtp("");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="task-card">
      <div className="task-card-head">
        <div className="task-type-row">
          <span className="task-type-badge">{task.taskType === "delivery" ? "📦 DELIVERY" : task.taskType === "vendor_return" ? "📤 RETURN TO VENDOR" : "📥 PICKUP"}</span>
          {task.orderId?.grandTotal > 0 && <span className="task-earn-pill">₹{task.orderId.grandTotal}</span>}
        </div>
      </div>

      <div className="task-status-row">
        <span className={`status-badge ${statusBadge}`}>{task.status}</span>
        <span className="task-payment-badge">₹{task.paymentAmount}</span>
      </div>

      <div className="task-card-body">
        {productImage && <img src={productImage} alt={productName} className="task-product-img" />}
        <div className="task-info">
          <h4>{productName}</h4>
          <div className="task-detail-row"><span className="task-label">Order:</span><span>{orderId ? String(orderId).substring(0, 8) : "—"}</span></div>
          <div className="task-detail-row"><span className="task-label">From:</span><span>{lenderName}</span></div>
          <div className="task-detail-row"><span className="task-label">To:</span><span>{renterName}</span></div>
          <div className="task-detail-row"><span className="task-label">Scheduled:</span><span>{task.assignedAt ? new Date(task.assignedAt).toLocaleString("en-IN") : "Pending"}</span></div>

          {task.orderId?.grandTotal > 0 && (
            <div className="task-grandtotal">
              <div className="order-total-label">Grand Total</div>
              <div className="order-total-value">₹{(task.orderId.grandTotal ?? 0).toLocaleString("en-IN")}</div>
            </div>
          )}
        </div>
      </div>

      {task.trackingLogs && task.trackingLogs.length > 0 && (
        <div className="task-timeline-mini">
          {task.trackingLogs.slice(-3).reverse().map((log, idx) => (
            <div className="timeline-item-mini" key={idx}>
              <span className="timeline-dot" />
              <span className="timeline-text">{log.status}</span>
              <span className="timeline-time">{log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : ""}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Inline payment form for In-Transit delivery tasks ─── */}
{showInlinePaymentForm && (
  <div className="inline-payment-form">
    <div className="payment-field">
      <label>{task.taskType === "vendor_return" ? "Rental Income Amount (₹)" : "Total Amount (₹)"}</label>
      <input
        type="number"
        className="payment-input"
        value={paymentAmount}
        onChange={(e) => setPaymentAmount(e.target.value)}
        min="0"
        placeholder={task.taskType === "vendor_return" ? "Enter rental income amount" : "Enter amount collected"}
      />
    </div>
<div className="payment-field">
       <label>{task.taskType === "vendor_return" ? "OTP from Vendor" : "OTP from Customer"}</label>
       <input
        type="text"
        className="payment-input"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder={task.taskType === "vendor_return" ? "Enter Vendor OTP" : "Enter Customer OTP"}
        maxLength={6}
      />
    </div>
    <button
      className="btn-paid"
      onClick={handlePaid}
      disabled={isPaying || !paymentAmount || Number(paymentAmount) <= 0 || !otp}
    >
      {isPaying ? "Processing..." : task.taskType === "vendor_return" ? "💰 Record Vendor OTP & Return" : "💰 Mark as Delivered"}
    </button>
  </div>
)}

      <div className="task-card-actions">
        {task.status === "Waiting for Agent" && !isActive && (
          <>
            <button className="btn-accept" onClick={onAccept}>✓ Accept</button>
            <button className="btn-reject" onClick={onReject}>Reject</button>
          </>
        )}
        {actionLabel && !showInlinePaymentForm && isActive && (
          <button className="btn-action" onClick={() => onStatusChange(task._id, actionNext)}>
            {actionLabel}
          </button>
        )}
        {!isActive && task.status !== "Waiting for Agent" && (
          <button className="btn-view" onClick={() => navigate(`/delivery/task/${task._id}`)}>View Details →</button>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Stat Card ─────────────── */
function StatCard({ icon, value, label, colorClass, delay = 0 }) {
  return (
    <div className={`stat-card stat-anim ${colorClass}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </div>
  );
}

/* ─────────────── Earnings Card ─────────────── */
function EarningsCard({ amount, label, variant }) {
  return (
    <div className={`earnings-card earnings-anim ${variant}`}>
      <div className="earnings-amount">₹{amount.toLocaleString("en-IN")}</div>
      <div className="earnings-label">{label}</div>
    </div>
  );
}

/* ─────────────── Agent Dashboard ─────────────── */
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

  /* replay animations on mount */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { addToast, ToastContainer } = useToast();

  /* ── Modals ── */
  const [notesModal, setNotesModal] = useState({ open: false, onConfirm: null, label: "", placeholder: "", title: "", noteKey: "" });
  const [confirmModal, setConfirmModal] = useState({ open: false, onConfirm: null, message: "", title: "", danger: false });

  /* ── Fetch ── */
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [profileRes, tasksRes, availableRes, earningsRes] = await Promise.all([
        api.get("/api/delivery/profile"), api.get("/api/delivery/my-tasks"),
        api.get("/api/delivery/available-tasks"), api.get("/api/delivery/earnings"),
      ]);
      setProfile(profileRes.data.profile);
      setStats(profileRes.data.stats);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data?.tasks || []);
      setAvailableTasks(Array.isArray(availableRes.data) ? availableRes.data : availableRes.data?.tasks || []);
      setEarnings(earningsRes.data.earnings || []);
      setEarningsSummary(earningsRes.data.summary);
      setAvailability(profileRes.data.profile?.availability_status || "available");
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      addToast("Failed to load dashboard data", "error");
    }
    finally { setIsLoading(false); }
  }, [user, addToast]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  /* ── Availability toggle ── */
  const handleToggleAvailability = async () => {
    try {
      const newStatus = availability === "available" ? "unavailable" : "available";
      await api.put("/api/delivery/profile", { availability_status: newStatus });
      setAvailability(newStatus);
      addToast(newStatus === "available" ? "You are now online" : "You are now offline", newStatus === "available" ? "success" : "info");
      fetchDashboardData();
    } catch {
      addToast("Failed to update availability", "error");
    }
  };

  /* ── Reject handler ── */
  const handleTaskAction = async (taskId, action) => {
    if (action === "accept") {
      try {
        await api.post(`/api/delivery/accept-task/${taskId}`);
        addToast("Task accepted", "success");
        fetchDashboardData();
      } catch (err) { addToast(err?.response?.data?.message || "Failed to accept task", "error"); }
      return;
    }
    if (action === "reject") {
      openConfirm("Confirm Rejection", "Are you sure you want to reject this task?", true, async () => {
        try {
          await api.post(`/api/delivery/reject-task/${taskId}`);
          addToast("Task rejected", "success");
          fetchDashboardData();
        } catch (err) { addToast(err?.response?.data?.message || "Failed to reject task", "error"); }
      });
    }
  };

  /* ── Payment gateway modal (Step 3 — blocks In Transit and Delivered without COD evidence) ── */
  const [gatewayOpen,    setGatewayOpen]    = useState(false);
  const [gatewayTaskId,  setGatewayTaskId]  = useState(null);
  const [gatewayTaskType, setGatewayTaskType] = useState(""); // delivery or vendor_return
  const [gatewayAmount,  setGatewayAmount]  = useState("");
  const [gatewayMethod,  setGatewayMethod]  = useState("cash");
  const [gatewayPayId,   setGatewayPayId]   = useState("");    // Payment ID / Transaction ID
  const [gatewayOtp,     setGatewayOtp]     = useState("");    // OTP from customer/vendor
  const [gatewayTargetStatus, setGatewayTargetStatus] = useState("In Transit"); // status we will set after payment

  /* ── Open gateway modal — blocks delivery until agent confirms COD ── */
  const openGateway = (taskId, targetStatus, taskType) => {
    setGatewayTaskId(taskId);
    setGatewayTaskType(taskType || "");
    setGatewayAmount("");
    setGatewayMethod("cash");
    setGatewayPayId("");
    setGatewayOtp("");
    // remember which status we are about to apply once payment is confirmed
    setGatewayTargetStatus(targetStatus || "In Transit");
    setGatewayOpen(true);
  };

  /* ── Agent confirms "YES, COD collected" via gateway ──
   *  Handles two flows:
   *  1. "Picking Up Product" → "In Transit"   (collect COD at pickup time)
   *  2. "In Transit"        → "Delivered"      (collect COD at delivery time)
   *  ────────────────────────────────────────────────────────── */
  const confirmGatewayYes = async () => {
    if (!gatewayTaskId) { setGatewayOpen(false); return; }

    const amount  = Number(gatewayAmount);
    if (!amount || amount <= 0) {
      addToast("Enter the amount collected", "error"); return;
    }
    if (!gatewayOtp) {
      addToast(
        `Enter the OTP provided by the ${gatewayTaskType === "vendor_return" ? "vendor" : "customer"}`,
        "error"
      );
      return;
    }

    setGatewayOpen(false);
    const targetStatus = gatewayTargetStatus;       // save before we null the state
    const isDelivered = gatewayTargetStatus !== "In Transit";

    // Step A — record COD evidence (sets task.codVerified = true)
    try {
      await api.post(`/api/delivery/task/${gatewayTaskId}/collect-cod`, {
        codVerified:         true,
        codPaymentMethod:    gatewayMethod,
        codPaymentId:        gatewayPayId,
        codAmountReceived:   amount,
      });
      addToast("COD payment recorded", "success");
    } catch (err) {
      addToast(err?.response?.data?.message || "Failed to record COD", "error");
      return;
    }

    // Step B — status transition passes backend gate because collect-cod set codVerified=true
    try {
      const payload = { status: targetStatus, codVerified: true };
      if (isDelivered) {
        payload.otp               = gatewayOtp;
        payload.paymentConfirmed  = true;
      }
      await api.put(`/api/delivery/task/${gatewayTaskId}/status`, payload);
      addToast(`Task marked as ${targetStatus}`, "success");
      fetchDashboardData();
    } catch (err) {
      addToast(err?.response?.data?.message || "Failed to update status", "error");
    }
  };

  const confirmGatewayNo = () => {
    setGatewayOpen(false);
    addToast(
      gatewayTaskType === "vendor_return"
        ? "Vendor OTP verification and rental income recording is mandatory before completing this step. Record payment evidence first using the payment gateway."
        : "COD payment collection is mandatory before completing this step. Record payment evidence first using the payment gateway.",
      "error"
    );
  };

  /* ── Inline form "Paid" handler: marks the task Delivered with COD evidence and OTP ── */
  const handlePaid = async (taskId, { amount, otp }) => {
    try {
      // Step A — record COD evidence first (same gateway logic as confirmGatewayYes)
      await api.post(`/api/delivery/task/${taskId}/collect-cod`, {
        codVerified: true,
        codPaymentMethod: "cash",
        codPaymentId: "",
        codAmountReceived: amount,
      });

      // Step B — now codVerified=true so the backend gate passes
      const task = tasks.find(t => t._id === taskId);
      let status = "Delivered";
      if (task?.taskType === "vendor_return") {
        status = "Returned to Vendor";
      }
      await api.put(`/api/delivery/task/${taskId}/status`, {
        status,
        otp,
        paymentConfirmed: true,
        codVerified: true,
        codPaymentMethod: "cash",
        codPaymentId: "",
        codAmountReceived: amount,
      });

      const successMessage = task?.taskType === "vendor_return"
        ? "Task marked as Returned to Vendor"
        : "Task marked as Delivered";
      addToast(successMessage, "success");
      fetchDashboardData();
      return true;
    } catch (err) {
      addToast(err?.response?.data?.message || "Failed to mark as delivered", "error");
      return false;
    }
  };

  /* ── Update task status — opens the COD gateway for In Transit and Delivered ── */
  const updateTaskStatus = async (taskId, newStatus) => {
    /* ─── In Transit (from Picking Up Product) — gate on COD evidence ─── */
    if (newStatus === "In Transit") {
      const task = tasks.find(t => t._id === taskId);
      openGateway(taskId, "In Transit", task?.taskType);
      return;
    }
    /* ─── Delivered — gate on COD evidence ─── */
    if (newStatus === "Delivered") {
      const task = tasks.find(t => t._id === taskId);
      openGateway(taskId, "Delivered", task?.taskType);
      return;
    }
    /* ─── Returned to Vendor — gate on COD evidence ─── */
    if (newStatus === "Returned to Vendor") {
      const task = tasks.find(t => t._id === taskId);
      openGateway(taskId, "Returned to Vendor", task?.taskType);
      return;
    }
    /* Open a notes modal then call the API */
    const placeholders = {
      "In Transit": "Any updates along the way?",
      "Picking Up Product": "Any pickup notes for the lender?",
    };

    const placeholder = placeholders[newStatus] || "Add a note (optional)";

    setNotesModal({
      open: true,
      onConfirm: null,
      label: placeholder,
      placeholder,
      title: `Notes for "${newStatus}"`,
      noteKey: newStatus,
    });

    /* Once the modal is resolved, proceed to status update */
    setNotesModal((prev) => ({
      ...prev,
      onConfirm: async (note, isWorking, conditionNotes) => {
        setNotesModal((prev2) => ({ ...prev2, open: false }));
        try {
          const payload = { status: newStatus };
          if (["Delivered", "Picking Up Product", "In Transit"].includes(newStatus) && note) payload.notes = note;

if (newStatus === "Delivered" || newStatus === "Returned to Lender" || newStatus === "Returned to Vendor") {
             const otp = prompt("Enter the OTP provided by the user:");
             if (!otp) { addToast("OTP is required", "error"); return; }
             payload.otp = otp;
           }

          /* Payment confirmation required by backend for Delivered */
          if (newStatus === "Delivered") {
            payload.paymentConfirmed = true;
          }

          /* Pickup: also send condition verification */
          if (newStatus === "Picking Up Product") {
            payload.pickupConditionVerified = !!isWorking;
            payload.pickupIsWorking = !!isWorking;
            payload.pickupConditionNotes = conditionNotes || "";
          }

          await api.put(`/api/delivery/task/${taskId}/status`, payload);
          addToast(`Task marked as ${newStatus}`, "success");
          fetchDashboardData();
        } catch (err) {
          addToast(err?.response?.data?.message || "Failed to update status", "error");
        }
      },
    }));
  };

  const openConfirm = (title, message, danger, onConfirm) => {
    setConfirmModal({ open: true, onConfirm, message, title, danger });
  };


const getStatusBadge = (status) => {
  const colors = {
    "Waiting for Agent": "badge-yellow", "Accepted": "badge-blue",
    "Picking Up Product": "badge-orange", "In Transit": "badge-purple",
    "Delivered": "badge-green", "Pickup Scheduled": "badge-teal",
    "Return In Transit": "badge-indigo", "Returned to Lender": "badge-emerald",
    "Returned to Vendor": "badge-emerald",
    "Completed": "badge-gray", "Rejected": "badge-red",
  };
  return colors[status] || "badge-gray";
};

  /* ── Auth / Loading guards ── */
  if (isLoading) {
    return (
      <div className="delivery-page">
        <ToastContainer />
        <button className="btn-home" onClick={() => navigate("/")}>← Back to Home</button>
        <div className="stats-grid">
          {[0, 1, 2, 3].map((i) => <StatCard key={i} icon="…" value="—" label="Loading…" colorClass="stat-blue" delay={i * 100} />)}
        </div>
        <div className="task-list-loading">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="delivery-page">
        <ToastContainer />
        <div className="delivery-card delivery-card-centered">
          <h2>Please login first</h2>
          <button onClick={() => navigate("/login")} className="delivery-btn-primary">Go to Login</button>
        </div>
      </div>
    );
  }
  if (!user.isDeliveryAgent || user.verification_status !== "approved") {
    return (
      <div className="delivery-page">
        <ToastContainer />
        <div className="delivery-card delivery-card-centered">
          <h2>🚫 Access Denied</h2>
          <p>You need to be an approved delivery agent.</p>
          <button onClick={() => navigate("/become-agent")} className="delivery-btn-primary">Apply as Agent</button>
        </div>
      </div>
    );
  }

/* ── Derived data ── */
  const pendingTasks = availableTasks.filter((t) => t.status === "Waiting for Agent" && !t.agentId);
  const deliveryTasks = tasks.filter((t) =>
    ["delivery", "vendor_return"].includes(t.taskType) &&
    ["Accepted", "Picking Up Product", "In Transit", "Delivered"].includes(t.status));
  const returnTasks = tasks.filter((t) =>
    ["pickup", "return_pickup"].includes(t.taskType) &&
    ["Accepted", "Return In Transit", "Returned to Lender"].includes(t.status));

  // Separate: return tasks that are still available (Waiting for Agent)
  const availableReturnTasks = availableTasks.filter((t) =>
    ["pickup", "return_pickup"].includes(t.taskType));

  const completedTasks = tasks.filter((t) =>
    ["Delivered", "Returned to Lender", "Completed"].includes(t.status));

  const tabs = [
    { id: "dashboard", label: "Overview", showCount: false },
    { id: "delivery", label: "📦 Delivery", count: deliveryTasks.length },
    { id: "returns", label: "📥 Returns", count: returnTasks.length + availableReturnTasks.length },
    { id: "available", label: "Available", count: pendingTasks.length },
    { id: "completed", label: "Completed", count: completedTasks.length },
    { id: "earnings", label: "Earnings", showCount: false },
  ];


  return (
    <div className="delivery-page">
      <ToastContainer />

      <button className="btn-home" onClick={() => navigate("/")}>← Back to Home</button>

      {/* ─── Availability Banner ─── */}
      <div className={`availability-rail ${availability}`}>
        <div className="rail-left">
          <span className="rail-dot" />
          <span className="rail-label">
            {availability === "available" ? "● Available for tasks" : "○ Currently offline"}
          </span>
        </div>
        <button
          className={`rail-btn ${availability === "available" ? "rail-btn-offline" : "rail-btn-online"}`}
          onClick={handleToggleAvailability}
        >
          {availability === "available" ? "Go Offline" : "Go Online"}
        </button>
      </div>

      {/* ─── Stats ─── */}
      {mounted && (
        <div className="stats-grid">
          <StatCard icon="📦" value={pendingTasks.length} label="Available Tasks" colorClass="stat-blue" delay={0} />
          <StatCard icon="🚚" value={deliveryTasks.length + returnTasks.length} label="Active Tasks" colorClass="stat-orange" delay={60} />
          <StatCard icon="✅" value={completedTasks.length} label="Completed" colorClass="stat-green" delay={120} />
          <StatCard icon="💰" value={`₹${stats?.totalEarned || 0}`} label="Total Earned" colorClass="stat-purple" delay={180} />
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div className="tabs-nav">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? "tab-active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label} {t.showCount && t.count > 0 && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <div className="tab-content">
        {activeTab === "dashboard" && (
          <div className="dashboard-tab">
            {/* Profile Card */}
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="avatar-circle">{profile?.name?.[0]?.toUpperCase() || "A"}</div>
                <div>
                  <h3>{profile?.name}</h3>
                  <span className={`verification-badge ${profile?.verification_status === "approved" ? "verified" : "pending"}`}>
                    {profile?.verification_status === "approved" ? "✔ Verified Agent" : "⏳ Pending Verification"}
                  </span>
                </div>
              </div>
              <div className="profile-grid">
                <div className="profile-item"><label>Email</label><span>{profile?.email}</span></div>
                <div className="profile-item"><label>Phone</label><span>{profile?.phone || "—"}</span></div>
                <div className="profile-item"><label>Vehicle</label><span>{profile?.vehicle_type || "Not set"}</span></div>
                <div className="profile-item"><label>Transport</label><span>{profile?.transport_type || "Not set"}</span></div>
                <div className="profile-item"><label>Completed Deliveries</label><span>{profile?.completed_deliveries || 0}</span></div>
                <div className="profile-item"><label>Withdrawable Balance</label><span className="balance-value">₹{profile?.earnings_balance || 0}</span></div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>⚡ Quick Actions</h3>
              <div className="actions-grid">
                <button className="action-btn" onClick={() => setActiveTab("available")}>
                  <span className="action-icon">📦</span>
                  <div><strong>Find Work</strong><small>Available tasks</small></div>
                </button>
                <button className="action-btn" onClick={() => setActiveTab("delivery")}>
                  <span className="action-icon">🚚</span>
                  <div><strong>Delivery</strong><small>Outbound jobs</small></div>
                </button>
                <button className="action-btn" onClick={() => setActiveTab("returns")}>
                  <span className="action-icon">📥</span>
                  <div><strong>Returns</strong><small>Return pickups</small></div>
                </button>
                <button className="action-btn" onClick={() => setActiveTab("earnings")}>
                  <span className="action-icon">💰</span>
                  <div><strong>Earnings</strong><small>Income summary</small></div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab: Delivery ─── */}
        {activeTab === "delivery" && (
          <div className="tasks-tab">
            <h3>📦 Outbound Deliveries</h3>
            {deliveryTasks.length === 0 ? (
              <div className="empty-state"><span>🚚</span><p>No outbound deliveries</p><small>Accept delivery tasks from the Available tab</small></div>
            ) : (
              <div className="tasks-list">
                {deliveryTasks.map((task) => (
                  <TaskCard key={task._id} task={task} statusBadge={getStatusBadge(task.status)}
                    onStatusChange={updateTaskStatus} onPaid={handlePaid} isActive={true} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Returns ─── */}
        {activeTab === "returns" && (
          <div className="tasks-tab">
            <h3>📥 Return Pickups</h3>
            {returnTasks.length === 0 && availableReturnTasks.length === 0 ? (
              <div className="empty-state"><span>📋</span><p>No returns pending</p><small>Returns auto-generate on rental expiry</small></div>
            ) : (
              <div className="tasks-list">
                {/* Active return tasks (accepted by this agent) */}
                {returnTasks.map((task) => (
                  <TaskCard key={task._id} task={task} statusBadge={getStatusBadge(task.status)}
                    onStatusChange={updateTaskStatus} isActive={true} navigate={navigate} />
                ))}
                {/* Available return tasks (waiting for agent) */}
                {availableReturnTasks.map((task) => (
                  <TaskCard key={task._id} task={task} statusBadge={getStatusBadge(task.status)}
                    onAccept={() => handleTaskAction(task._id, "accept")}
                    onReject={() => handleTaskAction(task._id, "reject")}
                    navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Available ─── */}
        {activeTab === "available" && (
          <div className="tasks-tab">
            <h3>📦 Available Tasks</h3>
            {pendingTasks.length === 0 ? (
              <div className="empty-state"><span>📭</span><p>No available tasks right now</p><small>Check back later or go online to receive assignments</small></div>
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

        {/* ─── Tab: Completed ─── */}
        {activeTab === "completed" && (
          <div className="tasks-tab">
            <h3>✅ Completed Tasks</h3>
            {completedTasks.length === 0 ? (
              <div className="empty-state"><span>📋</span><p>No completed tasks yet</p><small>Finish a delivery or pickup to see it here</small></div>
            ) : (
              <div className="tasks-list">
                {completedTasks.map((task) => (
                  <TaskCard key={task._id} task={task} statusBadge={getStatusBadge(task.status)} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Earnings ─── */}
        {activeTab === "earnings" && (
          <div className="earnings-tab">
            <h3>💰 Earnings Summary</h3>
            <div className="earnings-summary-grid">
              <EarningsCard amount={earningsSummary?.pendingAmount || 0} label={`Pending (${earningsSummary?.pendingCount || 0} tasks)`} variant="earnings-pending" />
              <EarningsCard amount={earningsSummary?.paidAmount || 0} label={`Paid (${earningsSummary?.paidCount || 0} tasks)`} variant="earnings-paid" />
              <EarningsCard amount={earningsSummary?.totalEarned || 0} label="Total Earned" variant="earnings-total" />
              <EarningsCard amount={profile?.earnings_balance || 0} label="Withdrawable Balance" variant="earnings-balance" />
            </div>

            <div className="earnings-history">
              <h4>Earnings History</h4>
              {earnings.length === 0 ? (
                <p className="empty-text">No earnings yet</p>
              ) : (
                <div className="earnings-table">
                  <div className="earnings-table-header">
                    <span>Date</span><span>Task</span><span>Type</span><span>Amount</span><span>Status</span>
                  </div>
                  {earnings.map((e) => (
                    <div className="earnings-table-row" key={e._id}>
                      <span>{new Date(e.createdAt).toLocaleDateString("en-IN")}</span>
                      <span>{e.taskId?._id?.substring(0, 8)}…</span>
                      <span className="badge-delivery">{e.earningType === "delivery" ? "📦 Delivery" : "📥 Pickup"}</span>
                      <span className="earnings-amount-cell">₹{e.amount.toLocaleString("en-IN")}</span>
                      <span className={e.status === "paid" ? "badge-paid" : "badge-pending-earn"}>{e.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}

      {/* Notes Modal */}
      <Modal
        title={notesModal.title}
        icon="📝"
        isOpen={notesModal.open}
        onClose={() => {
          setNotesModal((p) => ({ ...p, open: false, onConfirm: null }));
        }}
      >
        <div className="modal-form">
          {notesModal.label && <label>{notesModal.label}</label>}
          <textarea
            className="modal-textarea"
            placeholder={notesModal.placeholder}
            rows={3}
            defaultValue=""
            ref={(el) => { if (el && notesModal.open) el.focus(); }}
          />
          {/* Condition check for pickup */}
          {notesModal.noteKey === "Picking Up Product" && (
            <>
              <div className="condition-box">
                <label className="condition-label">Is the product in working condition?</label>
                <div className="condition-btn-group">
                  <button
                    className="condition-btn condition-yes"
                    onClick={(e) => { e.currentTarget.parentElement.dataset.choice = "yes"; }}
                  >
                    ✔ Yes, Working
                  </button>
                  <button
                    className="condition-btn condition-no"
                    onClick={(e) => { e.currentTarget.parentElement.dataset.choice = "no"; }}
                  >
                    ✖ Not Working
                  </button>
                </div>
                <textarea className="modal-textarea" placeholder="Any condition notes? (optional)" rows={2} />
              </div>
            </>
          )}
          <div className="modal-actions">
            <button className="modal-btn-secondary" onClick={() => setNotesModal((p) => ({ ...p, open: false, onConfirm: null }))}>Cancel</button>
            <button
              className="modal-btn-primary"
              onClick={() => {
                const textarea = document.querySelector(".modal-textarea");
                const note = textarea ? textarea.value : "";
                if (notesModal.noteKey === "Picking Up Product") {
                  const conditionBox = document.querySelector(".condition-btn-group");
                  const conditionNotesEl = conditionBox?.nextElementSibling;
                  const conditionNotes = conditionNotesEl?.value || "";
                  const choice = conditionBox?.dataset?.choice === "yes";
                  notesModal.onConfirm?.(note, choice, conditionNotes);
                } else {
                  notesModal.onConfirm?.(note);
                }
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        title={confirmModal.title}
        icon={confirmModal.danger ? "⚠️" : "✓"}
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal((p) => ({ ...p, open: false, onConfirm: null }))}
      >
        <p className="confirm-msg">{confirmModal.message}</p>
        <div className="modal-actions">
          <button className="modal-btn-secondary" onClick={() => setConfirmModal((p) => ({ ...p, open: false, onConfirm: null }))}>Cancel</button>
          <button
            className={`modal-confirm-btn ${confirmModal.danger ? "modal-confirm-danger" : "modal-confirm-ok"}`}
            onClick={() => {
              confirmModal.onConfirm?.();
              setConfirmModal((p) => ({ ...p, open: false, onConfirm: null }));
            }}
          >
            {confirmModal.danger ? "Reject Task" : "Confirm"}
          </button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════
           STEP 3 — Mandatory COD Payment Gateway
           Agent cannot mark Delivered without confirming COD collection here
      ══════════════════════════════════════════ */}
      <Modal
        title={gatewayTaskType === "vendor_return" ? "Confirm Vendor Handover?" : "Has payment been collected?"}
        icon="💵"
        isOpen={gatewayOpen}
        onClose={() => setGatewayOpen(false)}
      >
        <div className="gateway-inner">
          <p style={{ marginBottom: "0.25rem", color: "#555" }}>
        {gatewayTaskType === "vendor_return"
          ? "Vendor OTP verification and rental income recording is <strong>mandatory</strong> before completing return."
          : "COD payment collection is <strong>mandatory</strong> before completing delivery."
        }
      </p>
          <p style={{ marginBottom: "1rem", fontSize: "12px", color: "#9ca3af", fontWeight: 700 }}>
            Required: Amount · Payment Method · OTP &nbsp;|&nbsp; Optional: Payment / Transaction ID
          </p>

          <div style={{ marginBottom: "1rem" }}>
<label style={{ display: "block", fontWeight: 700, marginBottom: "0.35rem", fontSize: "13px", color: "#374151" }}>
        {gatewayTaskType === "vendor_return" ? "Rental Income Amount (₹)" : "Amount Collected (₹)"} <span style={{ color: "#ef4444" }}>*</span>
      </label>
            <input
              type="number"
              className="modal-input"
              placeholder="e.g. 15000"
              min="0"
              autoFocus
              value={gatewayAmount}
              onChange={(e) => setGatewayAmount(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "0.35rem", fontSize: "13px", color: "#374151" }}>
              Payment Method <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              className="modal-input"
              defaultValue="cash"
              autoFocus
              style={{ width: "100%", boxSizing: "border-box" }}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "0.35rem", fontSize: "13px", color: "#374151" }}>
              Payment / Transaction ID <span style={{ color: "#9ca3af", fontWeight: 600 }}>(optional)</span>
            </label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. UPI TXN123456…"
              value={gatewayPayId}
              onChange={(e) => setGatewayPayId(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
<label style={{ display: "block", fontWeight: 700, marginBottom: "0.35rem", fontSize: "13px", color: "#374151" }}>
        {gatewayTaskType === "vendor_return" ? "OTP from Vendor" : "OTP from Customer"} <span style={{ color: "#ef4444" }}>*</span>
      </label>
            <input
              type="number"
              className="modal-input"
              placeholder={gatewayTaskType === "vendor_return" ? "6-digit OTP given by the vendor" : "6-digit OTP given by the customer"}
              min="0"
              value={gatewayOtp}
              onChange={(e) => setGatewayOtp(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

<div className="gateway-actions">
      <button className="gateway-btn gateway-btn-yes" onClick={confirmGatewayYes}>
        {gatewayTaskType === "vendor_return"
          ? "✅ YES — Record Vendor OTP & Complete Return"
          : "✅ YES — Record Payment &amp; Complete Delivery"}
      </button>
      <button className="gateway-btn gateway-btn-no" onClick={confirmGatewayNo}>
        {gatewayTaskType === "vendor_return"
          ? "❌ NO — Block Return"
          : "❌ NO — Block Delivery"}
      </button>
    </div>
        </div>
      </Modal>

    </div>
  );
}

export default AgentDashboard;
