import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import "../styles/delivery.css";

function OrderTasks() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  }, []);

  const [tasks, setTasks] = useState([]);
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) { navigate("/delivery/orders"); return; }
    fetchOrderTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchOrderTasks = async () => {
    try {
      const res = await api.get(`/api/delivery/order/${orderId}`);
      setTasks(res.data.tasks || []);
      if (res.data.tasks.length > 0) {
        setOrder(res.data.tasks[0]?.orderId || null);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const getStatusBadge = (status) => {
    const colors = {
      "Waiting for Agent": "badge-yellow", "Accepted": "badge-blue",
      "Picking Up Product": "badge-orange", "In Transit": "badge-purple",
      "Delivered": "badge-green", "Pickup Scheduled": "badge-teal",
      "Returned to Lender": "badge-emerald", "Returned to Vendor": "badge-emerald",
      "Completed": "badge-gray",
    };
    return colors[status] || "badge-gray";
  };

  /* Payment breakdown row helper */
  const PaymentRow = ({ label, value, highlight }) => (
    <div
      className="task-detail-row"
      style={{ justifyContent: "space-between", alignItems: "center" }}
    >
      <span className="task-label" style={{ minWidth: "auto", textTransform: "none", letterSpacing: "0" }}>
        {label}
      </span>
      <span style={{
        fontWeight: highlight ? 900 : 700,
        color: highlight ? "#16a34a" : "#111827",
      }}>
        ₹{(value || 0).toLocaleString("en-IN")}
      </span>
    </div>
  );

  if (!user) return null;

  return (
    <div className="delivery-page">
      <button className="btn-home" onClick={() => navigate("/")}>← Back to Home</button>
      <h2 className="section-title">📦 Order Tasks</h2>
      {isLoading ? (
        <div className="loading-container"><div className="spinner"></div><p>Loading...</p></div>
      ) : tasks.length === 0 ? (
        <div className="delivery-card"><p>No tasks found for this order.</p></div>
      ) : (
        <>
          <div className="delivery-card">
            <div className="order-header">
              <div>
                <h3>Order #{String(orderId).substring(0, 8)}</h3>
                {order && (
                  <p className="order-sub">
                    Grand Total: ₹{order?.grandTotal || 0} | Status: {order?.status || "N/A"}
                  </p>
                )}
              </div>
            </div>
          </div>
          {tasks.map((task) => (
            <div className="delivery-card" key={task._id}>
              <div className="task-card-header">
                <div className="task-type-badge">{task.taskType === "delivery" ? "📦 DELIVERY" : task.taskType === "vendor_return" ? "📤 RETURN TO VENDOR" : "📥 PICKUP"}</div>
                <span className={`status-badge ${getStatusBadge(task.status)}`}>{task.status}</span>
              </div>

              <div className="task-detail-row"><span className="task-label">Agent:</span><span>{task?.agentId?.name || "Not assigned"}</span></div>
              <div className="task-detail-row"><span className="task-label">Pickup:</span><span>{task?.pickupAddress?.street || "N/A"}, {task?.pickupAddress?.city || ""}</span></div>
              <div className="task-detail-row"><span className="task-label">Drop:</span><span>{task?.dropAddress?.street || "N/A"}, {task?.dropAddress?.city || ""}</span></div>

              {/* ── Payment Breakdown ── */}
              {(task.customerPaymentAmount > 0 || task.paymentAmount > 0) && (
                <div className="task-detail-row" style={{flexDirection:'column',gap:'4px',marginTop:'8px'}}>
                  <span className="task-label" style={{textTransform:'uppercase',letterSpacing:'0.05em',fontSize:'10px'}}>
                    💰 Payment Breakdown
                  </span>
                  {task.customerPaymentAmount > 0 && (
                    <>
                      <PaymentRow label="Customer Paid" value={task.customerPaymentAmount} />
                      <PaymentRow label={`Agent Fee (₹75 flat)`} value={task.agentCommissionAmount} highlight />
                      <PaymentRow label={`Admin / Platform Due`} value={task.adminShareAmount} />
                    </>
                  )}
                  {task.customerPaymentAmount === 0 && task.paymentAmount > 0 && (
                    <PaymentRow label="Delivery Fee" value={task.paymentAmount} />
                  )}
                </div>
              )}

              <div className="task-detail-row"><span className="task-label">Assigned:</span><span>{task.assignedAt ? new Date(task.assignedAt).toLocaleString("en-IN") : "Pending"}</span></div>
              <div className="task-detail-row"><span className="task-label">Settlement:</span><span className={`badge-${task.settlementStatus === 'verified' ? 'paid' : task.settlementStatus === 'rejected' ? 'rejected' : 'pending-earn'}`}>{task.settlementStatus}</span></div>
              <div className="task-detail-row"><span className="task-label">Completed:</span><span>{task.completedAt ? new Date(task.completedAt).toLocaleString("en-IN") : "N/A"}</span></div>

              {task.trackingLogs && task.trackingLogs.length > 0 && (
                <div className="task-timeline-mini">
                  {task.trackingLogs.slice(-5).reverse().map((log, idx) => (
                    <div className="timeline-item-mini" key={idx}>
                      <span className="timeline-dot"></span>
                      <span className="timeline-text">{log.status}</span>
                      <span className="timeline-time">{log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default OrderTasks;