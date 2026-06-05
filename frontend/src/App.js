import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProductDetails from "./pages/ProductDetails";
import CartPage from "./pages/CartPage";
import CategoryPage from "./pages/CategoryPage";
import CheckoutPage from "./pages/CheckoutPage";
import MyOrders from "./pages/MyOrders";
import BecomeLender from "./pages/BecomeLender";
import AddProduct from "./pages/AddProduct";
import LenderRoute from "./components/LenderRoute";
import MyListings from "./pages/MyListings";
import EditProduct from "./pages/EditProduct";
import SearchPage from "./pages/SearchPage";
import BecomeAgent from "./pages/BecomeAgent";
import AgentDashboard from "./pages/AgentDashboard";
import DeliveryTracking from "./pages/DeliveryTracking";
import DeliveryOrders from "./pages/DeliveryOrders";
import OrderTasks from "./pages/DeliveryTaskDetail";
import AdminAgentApprovals from "./pages/AdminAgentApprovals";
import LenderDashboard from "./pages/LenderDashboard";
import Wallet from "./pages/wallet";

// Auth guard for lender routes
function LenderGuard({ children }) {
  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (!user.isLender) {
    window.location.href = "/become-lender";
    return null;
  }

  return children;
}

// Auth guard for delivery agent routes
function AgentRoute({ children }) {
  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (!user.isDeliveryAgent || user.verification_status !== "approved") {
    window.location.href = "/become-agent";
    return null;
  }

  return children;
}

// Auth guard for admin routes
function AdminRoute({ children }) {
  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (!user.isAdmin) {
    window.location.href = "/";
    return null;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/category/:categoryName" element={<CategoryPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/become-lender" element={<BecomeLender />} />
        <Route
          path="/add-product"
          element={
            <LenderRoute>
              <AddProduct />
            </LenderRoute>
          }
        />
        <Route
          path="/my-listings"
          element={
            <LenderRoute>
              <MyListings />
            </LenderRoute>
          }
        />
        <Route
          path="/edit-product/:id"
          element={
            <LenderRoute>
              <EditProduct />
            </LenderRoute>
          }
        />
        <Route path="/search" element={<SearchPage />} />

        {/* Delivery Chain Routes */}
        <Route path="/become-agent" element={<BecomeAgent />} />
        <Route
          path="/delivery/dashboard"
          element={
            <AgentRoute>
              <AgentDashboard />
            </AgentRoute>
          }
        />
        <Route
          path="/delivery/orders"
          element={
            <AgentRoute>
              <DeliveryOrders />
            </AgentRoute>
          }
        />
        <Route
          path="/delivery/task/:taskId"
          element={
            <AgentRoute>
              <DeliveryTracking />
            </AgentRoute>
          }
        />
        <Route
          path="/delivery/tasks/:orderId"
          element={
            <AgentRoute>
              <OrderTasks />
            </AgentRoute>
          }
        />

        {/* Public tracking route (renters/lenders can view delivery status) */}
        <Route path="/tracking/:orderId" element={<DeliveryTracking />} />

        {/* Admin Routes */}
        <Route
          path="/admin/agent-approvals"
          element={
            <AdminRoute>
              <AdminAgentApprovals />
            </AdminRoute>
          }
        />

        {/* Lender Dashboard */}
        <Route path="/lender/dashboard" element={<LenderGuard><LenderDashboard /></LenderGuard>} />

        {/* Agent Wallet */}
        <Route path="/agent/wallet" element={<AgentRoute><Wallet /></AgentRoute>} />
      </Routes>
    </Router>
  );
}

export default App;