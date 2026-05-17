import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import "../styles/delivery.css";

// Simple toast notification component
const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const ToastContainer = () => (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: t.type === "success" ? "#dcfce7" : t.type === "error" ? "#fee2e2" : "#dbeafe",
            color: t.type === "success" ? "#166534" : t.type === "error" ? "#991b1b" : "#1e40af",
            padding: "12px 20px",
            borderRadius: 8,
            marginBottom: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontWeight: 500,
            borderLeft: `4px solid ${t.type === "success" ? "#22c55e" : t.type === "error" ? "#ef4444" : "#3b82f6"}`,
          }}
        >
          {t.type === "success" && "✅ "}
          {t.type === "error" && "❌ "}
          {t.message}
        </div>
      ))}
    </div>
  );

  return { addToast, ToastContainer };
};

function BecomeAgent() {
  const navigate = useNavigate();
  const { addToast, ToastContainer } = useToast();

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [agentData, setAgentData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [localUser, setLocalUser] = useState(user);
  const pollIntervalRef = useRef(null);

  const isDeliveryAgent = localUser?.isDeliveryAgent === true;
  const isApproved = localUser?.verification_status === "approved";
  const isRejected = localUser?.verification_status === "rejected";

  const [form, setForm] = useState({
    phone: "",
    vehicle_type: "",
    transport_type: "",
  });

  // Fetch current agent status from backend
  const fetchAgentStatus = useCallback(async () => {
    try {
      const res = await api.get("/api/delivery/my-status");
      const data = res.data;
      setAgentData(data);

      // Update local user state with latest status
      setLocalUser((prev) => ({
        ...prev,
        isDeliveryAgent: data.isDeliveryAgent,
        verification_status: data.verification_status,
        availability_status: data.availability_status,
        phone: data.phone,
        vehicle_type: data.vehicle_type,
        transport_type: data.transport_type,
      }));

      // Update localStorage
      localStorage.setItem("user", JSON.stringify({
        ...localUser,
        isDeliveryAgent: data.isDeliveryAgent,
        verification_status: data.verification_status,
        availability_status: data.availability_status,
      }));
    } catch (err) {
      console.error("Failed to fetch agent status:", err);
    } finally {
      setIsLoading(false);
    }
  }, [localUser]);

  // Navigate to dashboard if approved
  useEffect(() => {
    if (isApproved && isDeliveryAgent) {
      clearInterval(pollIntervalRef.current);
      addToast("🎉 Your agent application has been approved!", "success");
      navigate("/delivery/dashboard");
    }
  }, [isApproved, isDeliveryAgent, addToast, navigate]);

  // Start polling for status updates every 10 seconds
  useEffect(() => {
    if (isDeliveryAgent && !isApproved && !isRejected) {
      fetchAgentStatus();
      pollIntervalRef.current = setInterval(fetchAgentStatus, 10000);
    } else if (isRejected) {
      // Stop polling if rejected
      clearInterval(pollIntervalRef.current);
    } else if (isApproved) {
      clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isDeliveryAgent, isApproved, isRejected, fetchAgentStatus]);

  // Load initial agent status
  useEffect(() => {
    if (isDeliveryAgent && !isApproved && !isRejected) {
      fetchAgentStatus();
    } else {
      setIsLoading(false);
    }
  }, [isDeliveryAgent, isApproved, isRejected, fetchAgentStatus]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.phone || !form.vehicle_type || !form.transport_type) {
      alert("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/api/delivery/apply", {
        phone: form.phone,
        vehicle_type: form.vehicle_type,
        transport_type: form.transport_type,
      });
      // Optimistic update
      const updatedUser = {
        ...user,
        isDeliveryAgent: true,
        verification_status: "pending",
        phone: form.phone,
        vehicle_type: form.vehicle_type,
        transport_type: form.transport_type,
      };
      setLocalUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      addToast("Application submitted successfully! Awaiting admin approval.", "success");
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to apply";
      addToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="delivery-page">
        <div className="delivery-card">
          <h2>Please login first</h2>
          <button onClick={() => navigate("/login")} className="delivery-btn-primary">
            Go to Login
          </button>
        </div>
        <ToastContainer />
      </div>
    );
  }

  // Show rejected state
  if (isRejected) {
    return (
      <div className="delivery-page">
        <button className="btn-home" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
        <div className="delivery-card max-w-lg">
          <div className="delivery-icon">❌</div>
          <h1>Application Rejected</h1>
          <p>Your delivery agent application has been rejected.</p>
          <div className="agent-info-grid">
            <div className="info-item">
              <b>
                <label>Status: </label>
              </b>
              <span className="badge-rejected">Rejected</span>
            </div>
            {agentData?.rejectionReason && (
              <div className="info-item">
                <b>
                  <label>Reason: </label>
                </b>
                <span>{agentData.rejectionReason}</span>
              </div>
            )}
            <div className="info-item">
              <b>
                <label>Email: </label>
              </b>
              <span>{user.email}</span>
            </div>
          </div>
          {agentData?.rejectedAt && (
            <p className="hint-text">
              Rejected on:{" "}
              {new Date(agentData.rejectedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
          <p className="hint-text">
            Feel free to contact support if you believe this was a mistake, or you can re-apply.
          </p>
        </div>
        <ToastContainer />
      </div>
    );
  }

  // Show pending/awaiting approval state
  if (isDeliveryAgent && !isApproved && !isRejected) {
    if (isLoading) {
      return (
        <div className="delivery-page">
          <div className="delivery-card">
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Fetching your application status...</p>
            </div>
          </div>
          <ToastContainer />
        </div>
      );
    }

    return (
      <div className="delivery-page">
        <button className="btn-home" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
        <div className="delivery-card">
          <div className="delivery-icon">⏳</div>
          <h1>Application Under Review</h1>
          <p>Your delivery agent application is being reviewed by our admin team.</p>
          <div className="agent-info-grid">
            <div className="info-item">
              <b>
                <label>Name: </label>
              </b>
              <span>{agentData?.name || localUser?.name || user.name}</span>
            </div>
            <div className="info-item">
              <b>
                <label>Status: </label>
              </b>
              <span className="badge-pending">Pending Approval</span>
            </div>
            <div className="info-item">
              <b>
                <label>Email: </label>
              </b>
              <span>{user.email}</span>
            </div>
            {agentData?.phone && (
              <div className="info-item">
                <b>
                  <label>Phone: </label>
                </b>
                <span>{agentData.phone}</span>
              </div>
            )}
            {agentData?.vehicle_type && (
              <div className="info-item">
                <b>
                  <label>Vehicle: </label>
                </b>
                <span>{agentData.vehicle_type}</span>
              </div>
            )}
            {agentData?.transport_type && (
              <div className="info-item">
                <b>
                  <label>Transport: </label>
                </b>
                <span>{agentData.transport_type}</span>
              </div>
            )}
            {agentData?.appliedAt && (
              <div className="info-item">
                <b>
                  <label>Applied On: </label>
                </b>
                <span>
                  {new Date(agentData.appliedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
          <p className="hint-text">You will be notified once your application is approved.</p>
        </div>
        <ToastContainer />
      </div>
    );
  }

  // Auto-redirect if approved
  if (isDeliveryAgent && isApproved && agentData) {
    navigate("/delivery/dashboard");
    return null;
  }

  // Application form (not yet applied)
  return (
    <div className="delivery-page">
      <button className="btn-home" onClick={() => navigate("/")}>
        ← Back to Home
      </button>
      <div className="delivery-card max-w-lg">
        <div className="delivery-header-section">
          <div className="delivery-icon">🚚</div>
          <h1>Become a Delivery Agent</h1>
          <p>Join our delivery network and earn money by delivering rental products</p>
        </div>

        <form onSubmit={handleSubmit} className="delivery-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={user.name}
              disabled
              className="form-input disabled"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="form-input disabled"
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter 10-digit phone number"
              maxLength={10}
              required
            />
          </div>

          <div className="form-group">
            <label>Vehicle Type *</label>
            <select
              name="vehicle_type"
              value={form.vehicle_type}
              onChange={handleChange}
              required
            >
              <option value="">Select vehicle</option>
              <option value="2-wheeler">2-Wheeler (Bike/Scooter)</option>
              <option value="3-wheeler">3-Wheeler (Auto)</option>
              <option value="4-wheeler">4-Wheeler (Car/Van)</option>
              <option value="truck">Truck</option>
              <option value="mini-truck">Mini Truck</option>
            </select>
          </div>

          <div className="form-group">
            <label>Transport Type *</label>
            <select
              name="transport_type"
              value={form.transport_type}
              onChange={handleChange}
              required
            >
              <option value="">Select transport type</option>
              <option value="local">Local Delivery (Within City)</option>
              <option value="intercity">Intercity Delivery</option>
              <option value="both">Both Local & Intercity</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="delivery-btn-primary w-full"
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>

        <div className="benefits-section">
          <h3>💰 Why Become a Delivery Agent?</h3>
          <div className="benefits-grid">
            <div className="benefit-card">
              <span className="benefit-amount">₹75</span>
              <span className="benefit-label">Per Delivery</span>
            </div>
            <div className="benefit-card">
              <span className="benefit-amount">₹75</span>
              <span className="benefit-label">Per Pickup</span>
            </div>
            <div className="benefit-card">
              <span className="benefit-amount">Flexible</span>
              <span className="benefit-label">Working Hours</span>
            </div>
            <div className="benefit-card">
              <span className="benefit-amount">Weekly</span>
              <span className="benefit-label">Payouts</span>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default BecomeAgent;