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
        <Route path="/add-product" element={<AddProduct />} />
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
      </Routes>
    </Router>
  );
}

export default App;
