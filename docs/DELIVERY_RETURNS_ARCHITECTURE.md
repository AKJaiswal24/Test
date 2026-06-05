# Delivery & Returns Management Interface Architecture

## Overview

Two primary tabs in AgentDashboard:

| Tab | Purpose | `DeliveryTask.taskType` values shown |
|---|---|---|
| **Delivery** | Machines being **delivered from vendor to customer** | `delivery`, `vendor_return` |
| **Returns** | Machines being **picked up from customer to vendor** | `pickup`, `return_pickup` |

---

## 1. Technical Logic

### Status Groupings per Tab (frontend)

```javascript
// Delivery tab: outbound from vendor → customer
const deliveryTasks = tasks.filter(t =>
  ["delivery", "vendor_return"].includes(t.taskType) &&
  ["Accepted", "Picking Up Product", "In Transit", "Delivered"].includes(t.status)
);

// Returns tab: inbound from customer → vendor
const returnTasks = tasks.filter(t =>
  ["pickup", "return_pickup"].includes(t.taskType) &&
  ["Pickup Scheduled", "Return In Transit", "Returned to Lender"].includes(t.status)
);
```

### Data Flow for Each Tab

**Delivery Tab (Live):**
- Only shows tasks agent has already **accepted** (manual action).
- Server keeps `status: "In Transit"` until **COD collected** (mandatory gate before "Delivered").
- Deposits are **not** part of this flow — they belong to the rental agreement, not the delivery task.

**Returns Tab (Auto-triggered):**
- Task **auto-created** daily via cron when an order's rental period expires.
- `taskType: "return_pickup"` with `status: "Pickup Scheduled"`.
- Agent sees it when the system **activates** at `returnDate`, changing to `"Waiting for Agent"` → `"Accepted"` → `"Return In Transit"`.
- Agent confirms condition; deposit may be withheld for damage.
- At `"Returned to Lender"` the cycle closes; admin can review deductions.

---

## 2. Database Schema Requirements

### Existing Fields Used

| Model | Field | How it's used |
|---|---|---|
| `DeliveryTask` | `taskType` | Primary partition key (`delivery`, `pickup`, `return_pickup`, `vendor_return`) |
| `DeliveryTask` | `status` | Per-tab active state |
| `DeliveryTask` | `pickupConditionVerified`, `pickupIsWorking`, `pickupConditionNotes` | Return inspection |
| `DeliveryTask` | `codVerified`, `codAmountReceived` | Delivery COD gate |
| `Order` | `returnDate`, `depositTotal` | Used by cron to create return tasks |
| `Order` | `status` | `"Ongoing"` or `"Delivered"` drives task creation |
| `User` | `verification_status` | Agent must be `"approved"` to see tasks |

### New Fields Required (if not present)

| Model | New Field | Type | Reason |
|---|---|---|---|
| `DeliveryTask` | `originalOrderId` | ObjectId (Order) | Links return task back to the rental order for deposit visibility |
| `Order` | `returnTaskId` | ObjectId (DeliveryTask) | Bidirectional link for quick lookup from order detail page |

---

## 3. Automated Transition Workflow (Rental → Return Request)

### Cron Job (backend/server.js)

```javascript
// Daily at 01:00 IST
cron.schedule("30 20 * * *", async () => {
  const today = getTodayIstYmd();

  // Find orders that are delivered and whose returnDate <= today
  const orders = await Order.find({
    status: "Delivered",
    returnDate: { $lte: today },
  }).populate("items.productId");

  for (const order of orders) {
    for (const item of order.items) {
      // Guard against duplicate task creation
      const exists = await DeliveryTask.findOne({
        orderId: order._id,
        productId: item.productId._id,
        taskType: "return_pickup",
      });
      if (!exists) {
        await DeliveryTask.create({
          orderId: order._id,
          productId: item.productId._id,
          lenderId: item.productId.lenderId,
          renterId: order.userId,
          taskType: "return_pickup",
          status: "Pickup Scheduled",
          pickupAddress: order.deliveryAddress,
          dropAddress: item.productId.lenderAddress,
        });
        // Link back to order for quick lookup
        order.returnTaskId = exists?._id;
        await order.save();
      }
    }
  }
});
```

### State Transition Diagram

```
Vendor → Customer (Delivery)
  ↓
order.status = "Ongoing" ── Agent accepts ──> task.status = "Accepted"
  ↓                                            ↓
task = "delivery"                         Pickup confirmed
  ↓                                            ↓
task.status = "Picking Up Product" ── Inspection OK ──> "In Transit"
  ↓                                            ↓
COD gate (collect-cod) OK                   Delivery at customer
  ↓                                            ↓
task.status = "Delivered" ── OTP + payment ──> "Completed"
  ↓
order.status = "Delivered"

Customer → Vendor (Returns)
  ↓
order.returnDate reached ── Daily cron ──> task = "return_pickup"
  ↓
task.status = "Pickup Scheduled"  → auto-activates to "Waiting for Agent" on returnDate
  ↓
Agent accepts ──> task.status = "Accepted"
  ↓
Agent arrives ──> task.status = "Return In Transit" (condition inspected)
  ↓
If NOT Working: deposit may be deducted, new earning created `type: "damage"`
  ↓
Machine at vendor ──> task.status = "Returned to Lender"
  ↓
Admin confirmation ──> task.status = "Completed"
  ↓
Admin settles deposit, creates Settlement record
```

---

## 4. API Endpoints Required

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `GET /api/delivery/outbound` | GET | Load **Delivery** tab tasks for logged-in agent | deliveryAgent |
| `GET /api/delivery/inbound` | GET | Load **Returns** tab tasks | deliveryAgent |
| `GET /api/order/:orderId/return-task` | GET | Get return task linked to an order | renter/lender |
| `POST /api/delivery/task/:taskId/confirm-return` | POST | Endpoint to finalize return handoff to vendor | deliveryAgent |
| `POST /api/delivery/task/:taskId/damage-report` | POST | Submit damage notes / deduction estimate | deliveryAgent |

---

## 5. Frontend Tab Structure Specification

### Route Change (frontend/src/App.js)

Replace existing tabs with:

```jsx
const tabs = [
  { id: "delivery", label: "📦 Delivery", count: deliveryTasks.length },
  { id: "returns", label: "📥 Returns", count: returnTasks.length },
  { id: "earnings", label: "💰 Earnings" },
];
```

### Tab Render Logic (frontend/src/pages/AgentDashboard.js)

```jsx
{activeTab === "delivery" && (
  <div className="tasks-tab">
    <h3>📦 Outbound Deliveries</h3>
    {deliveryTasks.length === 0
      ? <EmptyState text="No outbound deliveries">
      : deliveryTasks.map(task => (
          <TaskCard key={task._id} task={task}
            onStatusChange={updateTaskStatus}
            onPaid={handlePaid}
            isActive={true} />
        ))}
  </div>
)}

{activeTab === "returns" && (
  <div className="tasks-tab">
    <h3>📥 Return Pickups</h3>
    {returnTasks.length === 0
      ? <EmptyState text="No returns pending">
      : returnTasks.map(task => (
          <TaskCard key={task._id} task={task}
            onStatusChange={updateTaskStatus}
            isActive={true}
            showDeposit={true} /> // shows depositTotal and damage-claim CTA
        ))}
  </div>
)}
```

### Task Card Variants

| Prop | Variant | Displayed Elements |
|---|---|---|
| `taskType="delivery"` | Delivery | "Total Amount" input, "Customer OTP" input, "Delivered" CTA |
| `taskType="vendor_return"` | Delivery | "Rental Income" input, "Vendor OTP" input, "Returned" CTA |
| `taskType="pickup"` or `"return_pickup"` | Returns | "Deposit ₹X" badge, condition buttons, "Mark Return In Transit" CTA |
| `showDeposit=true` | Returns | Shows depositTotal, damage claim field inline |

---

## 6. Status Badge Mapping (shared)

| Status | Delivery Badge | Returns Badge |
|---|---|---|
| Waiting for Agent | `badge-yellow` | `badge-yellow` |
| Accepted | `badge-indigo` | `badge-indigo` |
| Picking Up Product | `badge-orange` | — (not used in returns) |
| In Transit | `badge-purple` | — |
| Return In Transit | — | `badge-purple` |
| Delivered | `badge-green` | — |
| Returned to Lender | — | `badge-emerald` |
| Completed | `badge-gray` | `badge-gray` |

---

## 7. Validation & Guard Rails

### Delivery Tab Validation

```javascript
// Same as existing cod gate in updateDeliveryTaskStatus
if (taskType === "delivery" && status === "Delivered") {
  if (!task.codVerified) return 400; // "Collect COD first"
}
```

### Returns Tab Validation

```javascript
// Deposit is available per order; damage notes required if condition = false
if (taskType === "return_pickup" && status === "Returned to Lender") {
  if (!pickupConditionVerified) return 400;
  if (!pickupIsWorking && !pickupConditionNotes) return 400; // damage must be described
}
```

---

## Summary Checklist for Implementation

- [ ] Add `returnTaskId` to `Order` model (migration)
- [ ] Update `taskType` enum to `"vendor_return"` if not already present
- [ ] Extend cron logic to set `returnTaskId` backlink on order
- [ ] Create `/api/delivery/outbound` + `/api/delivery/inbound` endpoints
- [ ] Swap AgentDashboard tabs from available/active to delivery/returns
- [ ] Update `TaskCard` to render return-specific UI when `taskType` ∈ `["pickup", "return_pickup"]`
- [ ] Add badge variants and tab styling in `delivery.css`