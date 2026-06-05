# Version 1.0
# Last updated: 2026-06-03

> Reference: DeliveryTask model fields pickupConditionVerified, pickupIsWorking, pickupConditionNotes, rejectionReason, taskType enum (delivery | pickup | return_pickup | vendor_return), Order.depositTotal.

## 1. Inspection Requirements

Before accepting any pickup or delivery task, agents must conduct a thorough inspection of the product condition. This includes checking for visible damage, verifying the product is in working condition, and documenting any issues.

### Required Documentation
- Take clear photos of the product from all angles
- Record any damage in the condition notes field
- Verify the serial number or unique identifier matches the order
- For damaged goods: photograph the damage and tag the item appropriately

### Condition Verification
Agents must assess:
- Physical damage (scratches, dents, breaks)
- Functional status (working / not working)
- Missing accessories or components
- Safety hazards (exposed wiring, gas leaks, etc.)

---

## 2. Vendor Pickup Protocol — Collecting Products from Lenders

Applies to tasks with `taskType = "delivery"`.

### Prerequisites
- Verify product availability at the scheduled time
- Confirm the lender's identity and contact information
- Check product quantity against the order details

### Process
1. Arrive at the vendor/lender location within the scheduled time window.
2. Introduce yourself and present your agent credentials.
3. Inspect the product following Inspection Requirements above.
4. Mark the task as "Picking Up Product" in the system.
5. Record condition verification and any notes.
6. Once verified, mark the task as "In Transit" to proceed to the customer location.

### When to Reject
Reject pickup only if:
- Product is significantly different from the listing
- Vendor cannot provide required OTP or identity mismatch
- Active safety hazards exist requiring professional handling

---

## 3. Customer Pickup Protocol for Damaged Goods

Applies to tasks with `taskType = "pickup"` or `taskType = "return_pickup"`.

### Process
1. Verify the customer's identity at the drop-off location.
2. Inspect the returned product.
3. If damaged, follow the Irreparable Damage Policy below.
4. If in acceptable condition, record OTP from customer and mark as "Returned to Lender".
5. Update task status to "Completed" after handover.

---

## 4. Vendor Return Protocol — Returning Products to Vendors

Applies to tasks with `taskType = "vendor_return"`. These are returns **to the vendor/lender's location** after the rental period.

### Inspection at vendor address

Before handing over the product to the vendor, the agent should verify that the product is in the same condition as when it was collected from the customer (or as noted in the task). However, the vendor is the final authority on acceptance. The agent must obtain the vendor's OTP to confirm handover.

### Vendor OTP verification steps

1. Upon arrival at the vendor's location, the agent presents the product to the vendor for inspection.
2. The vendor, upon verifying the product, provides a 6-digit OTP to the agent.
3. The agent enters the OTP in the system under the "OTP from Vendor" field.
4. The agent also records the rental income/payment amount being transferred to the vendor for the completed rental period.
5. The agent must submit both the OTP and the rental income amount before marking the return as complete.

### Rental income recording

The rental income amount is the total earnings from the rental that are due to the vendor. The agent enters this amount in the "Rental Income Amount (₹)" field. This amount is typically the total paid by the customer minus the platform commission, but the exact calculation is handled by the platform.

### Agent and vendor confirmation

- The agent confirms the handover by entering the OTP and rental income amount and tapping "Record Vendor OTP & Return".
- The vendor confirms by providing the OTP (which the agent enters) and may also sign off in the vendor's system (outside the scope of this SOP).
- The system requires both the OTP and the rental income amount to proceed.

### After successful OTP verification and income recording

The agent updates the task status to "Returned to Vendor". The platform then updates the product status and settles the payment to the vendor.

### When to proceed

Proceed with the return even if the product shows signs of wear and tear, as long as the vendor accepts it via OTP. Do not refuse the vendor return unless:

- The vendor refuses to provide an OTP or cannot be matched to the task's vendor ID.
- There are active safety hazards (exposed wiring, gas leak, etc.) that require professional handling.

In those cases, tag the location, photograph, and escalate to platform support before leaving the site.

---

## 5. Irreparable Damage Policy

When a product is returned with damage that cannot be repaired on-site:

1. Document the damage with clear photos from multiple angles.
2. Record detailed condition notes in the system.
3. Attempt to contact the vendor to discuss repair options.
4. If the vendor accepts the return (via OTP), proceed normally.
5. If the vendor refuses, escalate to platform support immediately.

---

## 6. Summary: Status Transition Reference

| Status | Trigger | Agent Action |
|--------|---------|--------------|
| Waiting for Agent | Task created, no agent assigned | Accept or Reject task |
| Accepted | Agent accepts task | Navigate to pickup location |
| Picking Up Product | At vendor location | Inspect, verify condition, record notes |
| In Transit | Product collected | Proceed to destination |
| **Delivered** | Delivery to customer complete | OTP from customer + mark complete |
| **Returned to Vendor** | Return to vendor complete | OTP from vendor + rental income recorded |
| Returned to Lender | Returned to original lender | OTP from lender + mark complete |
| Completed | Final confirmation | Task archived in history |
| Rejected | Task cannot proceed | Provide rejection reason |

**Key Notes:**
- `Delivered` (delivery task): Requires customer OTP and COD confirmation
- `Returned to Vendor` (vendor_return task): Requires vendor OTP and rental income recording
- `Returned to Lender` (pickup task): Requires lender OTP