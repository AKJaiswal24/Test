/**
 * MongoDB Seed Script for Delivery Chain Testing
 * Run: mongosh < your-db-connection-string> < seed_data.js
 *
 * This script:
 * 1. Creates an admin user
 * 2. Creates delivery agent applicants
 * 3. Creates a lender with products
 * 4. Creates a renter with an order
 * 5. Creates delivery tasks assigned to an agent
 * 6. Creates sample notifications
 */

// ================ CLEANUP ================
db.users.deleteMany({});
db.products.deleteMany({});
db.orders.deleteMany({});
db.deliverytasks.deleteMany({});
db.deliveryearnings.deleteMany({});
db.deliverytrackinglogs.deleteMany({});
db.carts.deleteMany({});
db.lenders.deleteMany({});
db.notifications.deleteMany({});

// ================ USERS ================
// 1. Admin User
const adminUser = db.users.insertOne({
  name: "Admin User",
  email: "admin@start2rent.com",
  password: "$2a$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYn", // "password123"
  isAdmin: true,
  isLender: false,
  isDeliveryAgent: false,
  phone: "9999999999",
  verification_status: "approved",
  availability_status: "unavailable",
  completed_deliveries: 0,
  earnings_balance: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Admin user created");

// 2. Approved Delivery Agent
const approvedAgent = db.users.insertOne({
  name: "Rahul Sharma",
  email: "agent1@start2rent.com",
  password: "$2a$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYn",
  isAdmin: false,
  isLender: false,
  isDeliveryAgent: true,
  phone: "9876543210",
  vehicle_type: "4-wheeler",
  transport_type: "both",
  verification_status: "approved",
  availability_status: "available",
  completed_deliveries: 2,
  earnings_balance: 150,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Approved delivery agent created");

// 3. Pending Delivery Agent
const pendingAgent = db.users.insertOne({
  name: "Priya Patel",
  email: "agent2@start2rent.com",
  password: "$2a$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYn",
  isAdmin: false,
  isLender: false,
  isDeliveryAgent: true,
  phone: "9876543211",
  vehicle_type: "2-wheeler",
  transport_type: "local",
  verification_status: "pending",
  availability_status: "unavailable",
  completed_deliveries: 0,
  earnings_balance: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Pending delivery agent created");

// 4. Rejected Delivery Agent
const rejectedAgent = db.users.insertOne({
  name: "Amit Singh",
  email: "agent3@start2rent.com",
  password: "$2a$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYn",
  isAdmin: false,
  isLender: false,
  isDeliveryAgent: true,
  phone: "9876543212",
  vehicle_type: "3-wheeler",
  transport_type: "local",
  verification_status: "rejected",
  availability_status: "unavailable",
  completed_deliveries: 0,
  earnings_balance: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Rejected delivery agent created");

// 5. Lender User
const lenderUser = db.users.insertOne({
  name: "Amit Kumar",
  email: "lender@start2rent.com",
  password: "$2a$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYn",
  isAdmin: false,
  isLender: true,
  isDeliveryAgent: false,
  phone: "9876543213",
  verification_status: "approved",
  availability_status: "unavailable",
  completed_deliveries: 0,
  earnings_balance: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Lender user created");

// 6. Renter User
const renterUser = db.users.insertOne({
  name: "Suresh Babu",
  email: "renter@start2rent.com",
  password: "$2a$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYn",
  isAdmin: false,
  isLender: false,
  isDeliveryAgent: false,
  phone: "9876543214",
  verification_status: "approved",
  availability_status: "unavailable",
  completed_deliveries: 0,
  earnings_balance: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Renter user created");

// ================ LENDER PROFILE ================
db.lenders.insertOne({
  userId: lenderUser.insertedId,
  businessName: "Kumar Tools & Equipment",
  phone: "9876543213",
  address: "Shop No 45, MG Road, Bangalore",
  city: "Bangalore",
  pincode: "560001",
  aadhaarCardUrl: "/uploads/aadhaar/lender_aadhaar.jpg",
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Lender profile created");

// ================ PRODUCTS ================
const drill = db.products.insertOne({
  name: "Bosch Hammer Drill",
  description: "Professional grade hammer drill for construction work",
  category: "Power Tools",
  deposit: 5000,
  monthlyRent: 3000,
  transport: 200,
  platformCharge: 20,
  image: "https://via.placeholder.com/400x300?text=Bosch+Drill",
  images: [
    "https://via.placeholder.com/400x300?text=Drill+Front",
    "https://via.placeholder.com/400x300?text=Drill+Side"
  ],
  pricing: {
    daily: 100,
    weekly: 600,
    monthly: 3000,
    "3_months": 8100,
    "6_months": 15000,
    "12_months": 27000
  },
  availability: "available",
  userId: lenderUser.insertedId,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Bosch Hammer Drill created");

const grinder = db.products.insertOne({
  name: "Makita Angle Grinder",
  description: "7-inch angle grinder for metal cutting and grinding",
  category: "Power Tools",
  deposit: 3000,
  monthlyRent: 2500,
  transport: 200,
  platformCharge: 20,
  image: "https://via.placeholder.com/400x300?text=Angle+Grinder",
  pricing: {
    daily: 80,
    weekly: 500,
    monthly: 2500,
    "3_months": 6750,
    "6_months": 12500,
    "12_months": 22500
  },
  availability: "available",
  userId: lenderUser.insertedId,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Makita Angle Grinder created");

const mixer = db.products.insertOne({
  name: "Electric Concrete Mixer",
  description: "500L capacity electric concrete mixer for construction",
  category: "Construction",
  deposit: 10000,
  monthlyRent: 5000,
  transport: 200,
  platformCharge: 20,
  image: "https://via.placeholder.com/400x300?text=Concrete+Mixer",
  pricing: {
    daily: 200,
    weekly: 1200,
    monthly: 5000,
    "3_months": 13500,
    "6_months": 25000,
    "12_months": 45000
  },
  availability: "available",
  userId: lenderUser.insertedId,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Electric Concrete Mixer created");

// ================ ORDERS ================
const order1 = db.orders.insertOne({
  userId: renterUser.insertedId,
  deliveryDate: "2026-05-15",
  returnDate: "2026-05-22",
  deliveryAddress: {
    street: "123 MG Road, HSR Layout, Bangalore, Karnataka 560102",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560102",
    phone: "9876543214"
  },
  items: [
    {
      productId: drill.insertedId,
      quantity: 1,
      basePlan: {
        durationLabel: "Weekly",
        unitPrice: 600,
        durationUnit: "day",
        durationValue: 7
      },
      returnDate: "2026-05-22",
      extensions: []
    }
  ],
  rentTotal: 600,
  depositTotal: 5000,
  transport: 200,
  platformCharge: 20,
  insurance: 60,
  grandTotal: 5880,
  status: "Ongoing",
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Order 1 created (Drill - Weekly)");

const order2 = db.orders.insertOne({
  userId: renterUser.insertedId,
  deliveryDate: "2026-05-10",
  returnDate: "2026-06-09",
  deliveryAddress: {
    street: "456 Whitefield Main Road, Bengaluru, Karnataka 560066",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560066",
    phone: "9876543214"
  },
  items: [
    {
      productId: mixer.insertedId,
      quantity: 1,
      basePlan: {
        durationLabel: "Monthly",
        unitPrice: 5000,
        durationUnit: "month",
        durationValue: 1
      },
      returnDate: "2026-06-09",
      extensions: []
    }
  ],
  rentTotal: 5000,
  depositTotal: 10000,
  transport: 200,
  platformCharge: 20,
  insurance: 500,
  grandTotal: 15720,
  status: "Ongoing",
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Order 2 created (Mixer - Monthly)");

// ================ DELIVERY TASKS ================
// Delivery task for Order 1 - In Transit
const deliveryTask1 = db.deliverytasks.insertOne({
  orderId: order1.insertedId,
  productId: drill.insertedId,
  lenderId: lenderUser.insertedId,
  renterId: renterUser.insertedId,
  agentId: approvedAgent.insertedId,
  taskType: "delivery",
  status: "In Transit",
  paymentAmount: 75,
  pickupAddress: {
    street: "Shop No 45, MG Road, Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    phone: "9876543213"
  },
  dropAddress: {
    street: "123 MG Road, HSR Layout, Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560102",
    phone: "9876543214"
  },
  otp: "482913",
  otpVerified: false,
  assignedAt: new Date("2026-05-12T08:00:00.000Z"),
  completedAt: null,
  trackingLogs: [
    { status: "Waiting for Agent", notes: "Delivery task created for Order #1", location: "Bangalore", updatedBy: null, role: "system" },
    { status: "Accepted", notes: "Rahul Sharma accepted the task", location: "Bangalore", updatedBy: approvedAgent.insertedId, role: "agent" },
    { status: "Picking Up Product", notes: "Picking up drill from lender", location: "MG Road, Bangalore", updatedBy: approvedAgent.insertedId, role: "agent" },
    { status: "In Transit", notes: "Delivering to renter location", location: "HSR Layout, Bangalore", updatedBy: approvedAgent.insertedId, role: "agent" }
  ],
  rejectedBy: null,
  rejectionReason: "",
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Delivery Task 1 created (Drill - In Transit)");

// Pickup task for Order 1 - Waiting (auto-scheduled)
const pickupTask1 = db.deliverytasks.insertOne({
  orderId: order1.insertedId,
  productId: drill.insertedId,
  lenderId: lenderUser.insertedId,
  renterId: renterUser.insertedId,
  agentId: null,
  taskType: "pickup",
  status: "Pickup Scheduled",
  paymentAmount: 75,
  pickupAddress: {
    street: "123 MG Road, HSR Layout, Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560102",
    phone: "9876543214"
  },
  dropAddress: {
    street: "Shop No 45, MG Road, Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    phone: "9876543213"
  },
  otp: "753951",
  otpVerified: false,
  assignedAt: null,
  completedAt: null,
  trackingLogs: [
    { status: "Pickup Scheduled", notes: "Return pickup auto-scheduled after delivery", location: "Bangalore", updatedBy: null, role: "system" }
  ],
  rejectedBy: null,
  rejectionReason: "",
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Pickup Task 1 created (Drill - Scheduled)");

// Delivery task for Order 2 - Waiting
const deliveryTask2 = db.deliverytasks.insertOne({
  orderId: order2.insertedId,
  productId: mixer.insertedId,
  lenderId: lenderUser.insertedId,
  renterId: renterUser.insertedId,
  agentId: null,
  taskType: "delivery",
  status: "Waiting for Agent",
  paymentAmount: 75,
  pickupAddress: {
    street: "Shop No 45, MG Road, Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    phone: "9876543213"
  },
  dropAddress: {
    street: "456 Whitefield Main Road, Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560066",
    phone: "9876543214"
  },
  otp: "963852",
  otpVerified: false,
  assignedAt: null,
  completedAt: null,
  trackingLogs: [
    { status: "Waiting for Agent", notes: "Delivery task created for Mixer order", location: "Bangalore", updatedBy: null, role: "system" }
  ],
  rejectedBy: null,
  rejectionReason: "",
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Delivery Task 2 created (Mixer - Waiting for Agent)");

// ================ EARNINGS ================
db.deliveryearnings.insertMany([
  {
    agentId: approvedAgent.insertedId,
    taskId: deliveryTask1.insertedId,
    amount: 75,
    earningType: "delivery",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    agentId: approvedAgent.insertedId,
    taskId: deliveryTask1.insertedId,
    amount: 75,
    earningType: "pickup",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);
print("✅ Delivery earnings created");

// ================ TRACKING LOGS ================
db.deliverytrackinglogs.insertMany([
  {
    taskId: deliveryTask1.insertedId,
    orderId: order1.insertedId,
    status: "Accepted",
    notes: "Task accepted by Rahul Sharma",
    location: "Bangalore",
    role: "agent",
    updatedBy: approvedAgent.insertedId,
    createdAt: new Date("2026-05-12T08:05:00.000Z")
  },
  {
    taskId: deliveryTask1.insertedId,
    orderId: order1.insertedId,
    status: "Picking Up Product",
    notes: "Arrived at lender location",
    location: "MG Road, Bangalore",
    role: "agent",
    updatedBy: approvedAgent.insertedId,
    createdAt: new Date("2026-05-12T08:30:00.000Z")
  },
  {
    taskId: deliveryTask1.insertedId,
    orderId: order1.insertedId,
    status: "In Transit",
    notes: "Product picked up, heading to renter",
    location: "HSR Layout, Bangalore",
    role: "agent",
    updatedBy: approvedAgent.insertedId,
    createdAt: new Date("2026-05-12T09:00:00.000Z")
  },
  {
    taskId: pickupTask1.insertedId,
    orderId: order1.insertedId,
    status: "Pickup Scheduled",
    notes: "Return pickup auto-scheduled",
    location: "Bangalore",
    role: "system",
    updatedBy: null,
    createdAt: new Date("2026-05-12T10:00:00.000Z")
  }
]);
print("✅ Tracking logs created");

// ================ NOTIFICATIONS ================
db.notifications.insertMany([
  {
    userId: approvedAgent.insertedId,
    title: "📦 New Delivery Task Assigned",
    message: "A new delivery task has been assigned to you for Order Bosch Hammer Drill.",
    type: "delivery_assigned",
    read: false,
    relatedOrderId: order1.insertedId,
    relatedTaskId: deliveryTask1.insertedId,
    metadata: {},
    createdAt: new Date("2026-05-12T08:05:00.000Z")
  },
  {
    userId: lenderUser.insertedId,
    title: "✅ Delivery Accepted",
    message: "Rahul Sharma has accepted your delivery task. Your product will be picked up shortly.",
    type: "delivery_accepted",
    read: false,
    relatedOrderId: order1.insertedId,
    relatedTaskId: deliveryTask1.insertedId,
    metadata: {},
    createdAt: new Date("2026-05-12T08:05:00.000Z")
  },
  {
    userId: renterUser.insertedId,
    title: "📦 Delivery Update: Accepted",
    message: "Rahul Sharma has accepted the delivery task. Your product will be picked up shortly.",
    type: "delivery_accepted",
    read: false,
    relatedOrderId: order1.insertedId,
    relatedTaskId: deliveryTask1.insertedId,
    metadata: {},
    createdAt: new Date("2026-05-12T08:05:00.000Z")
  },
  {
    userId: renterUser.insertedId,
    title: "📦 Delivery Update: In Transit",
    message: "Rahul Sharma is delivering your product.",
    type: "delivery_in_transit",
    read: false,
    relatedOrderId: order1.insertedId,
    relatedTaskId: deliveryTask1.insertedId,
    metadata: {},
    createdAt: new Date("2026-05-12T09:00:00.000Z")
  }
]);
print("✅ Notifications created");

// ================ CART (empty after order) ================
db.carts.insertOne({
  userId: renterUser.insertedId,
  items: [],
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✅ Empty cart created for renter");

// ================ SUMMARY ================
print("\n" + "=".repeat(60));
print("📋 SEED DATA SUMMARY");
print("=".repeat(60));
print("👤 Users: 6 (1 admin, 1 approved agent, 1 pending agent, 1 rejected agent, 1 lender, 1 renter)");
print("📦 Products: 3 (Bosch Drill, Makita Grinder, Concrete Mixer)");
print("🛒 Orders: 2 (Order #1: Drill Weekly, Order #2: Mixer Monthly)");
print("🚚 Delivery Tasks: 3 (1 In Transit, 2 Pickup Scheduled, 1 Waiting for Agent)");
print("💰 Earnings: 2 (₹150 total pending)");
print("📋 Tracking Logs: 4 entries");
print("🔔 Notifications: 4 entries");
print("=".repeat(60));
print("\n✅ Seed complete! Database ready for testing.");