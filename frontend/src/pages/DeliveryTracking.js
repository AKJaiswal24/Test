import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import "../styles/delivery.css";

function DeliveryTracking() {
  const navigate = useNavigate();
  const { taskId } = useParams();

  const [task, setTask] = useState(null);
  const [trackingLogs, setTrackingLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!taskId) {
      navigate("/delivery/orders");
      return;
    }
    fetchTaskDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      const res = await api.get(`/api/delivery/task/${taskId}`);
      setTask(res.data.task);
      setTrackingLogs(res.data.trackingLogs || []);
    } catch (err) {
      console.error("Fetch task error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressSteps = () => {
    const baseSteps = task?.taskType === "pickup"
      ? ["Waiting for Agent", "Accepted", "Pickup Scheduled", "Return In Transit", "Returned to Lender", "Completed"]
      : ["Waiting for Agent", "Accepted", "Picking Up Product", "In Transit", "Delivered", "Completed"];
    return baseSteps;
  };

  if (isLoading) {
    return <div className="delivery-page"><div className="loading-container"><div className="spinner"></div><p>Loading tracking details...</p></div></div>;
  }

  if (!task) {
    return <div className="delivery-page"><div className="delivery-card"><h2>Task not found</h2></div></div>;
  }

  const steps = getProgressSteps();
  const currentStepIndex = steps.indexOf(task.status);
  const productImage = task?.productId?.image || task?.productId?.images?.[0];

  return (
    <div className="delivery-page">
      <button className="btn-home" onClick={() => navigate("/")}>← Back to Home</button>
      <div className="tracking-page">
        {/* Header */}
        <div className="tracking-header">
          <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
          <h2>Delivery Tracking</h2>
          <span className={`status-badge ${getStatusBadge(task.status)}`}>{task.status}</span>
        </div>

        {/* Task Summary */}
        <div className="tracking-summary-card">
          <div className="tracking-product">
            {productImage && <img src={productImage} alt={task?.productId?.name} className="tracking-product-img" />}
            <div>
              <h3>{task?.productId?.name || "Unknown Product"}</h3>
              <p className="tracking-order-id">Order: #{String(task?.orderId?._id || task?.orderId).substring(0, 8)}</p>
              <p className="tracking-type-badge">{task.taskType === "delivery" ? "📦 Delivery" : "📥 Return Pickup"}</p>
            </div>
          </div>
        </div>

        {/* Timeline Steps */}
        <div className="timeline-container">
          <h3>Progress</h3>
          <div className="timeline-steps">
            {steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isCompleted = idx < currentStepIndex;
              return (
                <div className={`timeline-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`} key={step}>
                  <div className="step-indicator">
                    {isCompleted ? <span className="step-check">✓</span> : (isActive ? <span className="step-dot-active"></span> : <span className="step-dot"></span>)}
                  </div>
                  <div className="step-label">{step}</div>
                  {idx < steps.length - 1 && <div className={`step-line ${isCompleted ? "line-completed" : ""}`}></div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Info */}
        {task?.agentId && (
          <div className="agent-info-card">
            <h3>🚚 Assigned Agent</h3>
            <div className="agent-details">
              <div className="agent-detail-row"><span className="agent-detail-label">Name:</span><span>{task.agentId.name}</span></div>
              <div className="agent-detail-row"><span className="agent-detail-label">Phone:</span><span>{task.agentId.phone}</span></div>
              <div className="agent-detail-row"><span className="agent-detail-label">Vehicle:</span><span>{task.agentId.vehicle_type}</span></div>
              <div className="agent-detail-row"><span className="agent-detail-label">Transport:</span><span>{task.agentId.transport_type}</span></div>
            </div>
          </div>
        )}

        {/* Pickup / Drop Location */}
        <div className="location-card">
          <h3>📍 Route Details</h3>
          <div className="location-row">
            <div className="location-item">
              <span className="location-icon">📍</span>
              <div>
                <label>Pickup Address</label>
                <p>{task?.pickupAddress?.street}, {task?.pickupAddress?.city}, {task?.pickupAddress?.state} - {task?.pickupAddress?.pincode}</p>
              </div>
            </div>
            <div className="location-item">
              <span className="location-icon">🏠</span>
              <div>
                <label>Drop Address</label>
                <p>{task?.dropAddress?.street}, {task?.dropAddress?.city}, {task?.dropAddress?.state} - {task?.dropAddress?.pincode}</p>
              </div>
            </div>
          </div>
        </div>

{/* OTP Section (for renters to verify delivery) */}
         {task.taskType === "delivery" && ["Accepted", "Picking Up Product", "In Transit"].includes(task.status) && (
           <div className="otp-card">
             <h3>🔐 Delivery Verification</h3>
             <p>Your OTP for delivery verification is: <strong>{task.otp}</strong></p>
             <p className="hint">Share this OTP with the delivery agent when you receive the product.</p>
           </div>
         )}

         {task.taskType === "pickup" && ["Pickup Scheduled", "Return In Transit"].includes(task.status) && (
           <div className="otp-card">
             <h3>🔐 Return Verification</h3>
             <p>Your OTP for return verification is: <strong>{task.otp}</strong></p>
             <p className="hint">Share this OTP with the pickup agent when you hand over the product.</p>
           </div>
         )}

        {/* Tracking History */}
        <div className="tracking-history-card">
          <h3>📋 Tracking History</h3>
          {trackingLogs.length === 0 ? (
            <p className="empty-text">No tracking updates yet</p>
          ) : (
            trackingLogs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((log, idx) => (
              <div className="tracking-log-item" key={idx}>
                <div className="tracking-log-time">{new Date(log.createdAt).toLocaleString("en-IN")}</div>
                <div className="tracking-log-status">{log.status}</div>
                {log.notes && <div className="tracking-log-notes">{log.notes}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status) {
  const colors = {
    "Waiting for Agent": "badge-yellow", "Accepted": "badge-blue",
    "Picking Up Product": "badge-orange", "In Transit": "badge-purple",
    "Delivered": "badge-green", "Pickup Scheduled": "badge-teal",
    "Return In Transit": "badge-indigo", "Returned to Lender": "badge-emerald",
    "Completed": "badge-gray",
  };
  return colors[status] || "badge-gray";
}

export default DeliveryTracking;