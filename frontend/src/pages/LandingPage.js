import React, { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import hero from "../assets/hero.png";
import "../styles/landing.css";
import "../styles/notifications.css";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import NotificationBell from "../components/NotificationBell";

function LandingPage() {
  const navigate = useNavigate();

  // STATE
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingNegotiationCount, setPendingNegotiationCount] = useState(0);
  const [pendingDeliveryTasks, setPendingDeliveryTasks] = useState(0);
  const [pendingSettlements, setPendingSettlements] = useState(0);

  // FETCH CATEGORIES DYNAMICALLY FROM BACKEND
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/api/products/categories");
        const apiCategories = response.data.categories || [];
        setCategories(apiCategories);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setCategories(["All", "Cleaning", "Power Tools", "Kitchen Machines", "Construction",
          "Electronics", "Vehicles", "Lighting", "Machinery", "Equipment",
          "Audio Visual", "Medical Equipment", "Sports & Fitness", "Garden & Outdoor",
          "Party Supplies", "Baby & Kids", "Office Equipment", "Tools & Hardware",
          "Photography", "Musical Instruments"]);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // hamburger
  useEffect(() => {
    const handleClickOutside = () => {
      setMenuOpen(false);
    };

    if (menuOpen) {
      window.addEventListener("click", handleClickOutside);
    }

    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [menuOpen]);

  // cart 
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    const fetchCart = () => {
      api
        .get(`/api/cart/${storedUser._id}`)
        .then((res) => setCartCount(res.data?.items?.length || 0))
        .catch(() => setCartCount(0));
    };

    fetchCart();
    window.addEventListener("cartUpdated", fetchCart);

    return () => {
      window.removeEventListener("cartUpdated", fetchCart);
    };
  }, []);

  // LOAD USER
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // FETCH PENDING NEGOTIATIONS (for sellers)
  useEffect(() => {
    if (!user) {
      setPendingNegotiationCount(0);
      return;
    }

    const fetchPendingNegotiations = async () => {
      try {
        const response = await api.get(`/api/negotiation/seller/${user._id}`);
        const negotiations = Array.isArray(response.data) ? response.data : [];
        const pending = negotiations.filter(n => n.status === "pending" || n.status === "countered");
        setPendingNegotiationCount(pending.length);
      } catch {
        setPendingNegotiationCount(0);
      }
    };

    fetchPendingNegotiations();
    const interval = setInterval(fetchPendingNegotiations, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [user]);

  // FETCH AVAILABLE DELIVERY TASKS (for approved agents)
  useEffect(() => {
    if (!user || user.isDeliveryAgent !== true || user.verification_status !== "approved") {
      setPendingDeliveryTasks(0);
      return;
    }

    const fetchAvailableTasks = async () => {
      try {
        const response = await api.get("/api/delivery/available-tasks");
        const tasks = Array.isArray(response.data?.tasks) ? response.data.tasks : [];
        setPendingDeliveryTasks(tasks.length);
      } catch {
        setPendingDeliveryTasks(0);
      }
    };

    fetchAvailableTasks();
    const interval = setInterval(fetchAvailableTasks, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [user]);

  // FETCH PENDING SETTLEMENTS (for admins)
  useEffect(() => {
    if (!user || !user.isAdmin) {
      setPendingSettlements(0);
      return;
    }

    const fetchPendingSettlements = async () => {
      try {
        const response = await api.get("/api/wallet/admin/settlements?status=submitted");
        const settlements = Array.isArray(response.data?.settlements) ? response.data.settlements : [];
        setPendingSettlements(settlements.length);
      } catch {
        setPendingSettlements(0);
      }
    };

    fetchPendingSettlements();
    const interval = setInterval(fetchPendingSettlements, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [user]);

  // FETCH PRODUCTS
  useEffect(() => {
    setLoading(true);
    api
      .get("/api/products")
      .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  // SEARCH HANDLER
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // CATEGORY CLICK HANDLER
  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    if (cat === "All") {
      navigate("/");
    } else {
      navigate(`/category/${cat}`);
    }
  };

  // FILTERED PRODUCTS FOR "ALL" CATEGORY DISPLAY
  const displayedProducts = selectedCategory === "All"
    ? products
    : products.filter((p) => 
        p.category && p.category.toLowerCase() === selectedCategory.toLowerCase()
      );

  // Calculate isLender from user object
  const isLender = user?.isLender === true;

  return (
    <div className="container">
      {/* NAVBAR */}
      <div className="navbar">
        <img 
          src={logo} 
          alt="logo" 
          className="logo-img" 
          onClick={() => navigate("/")}
        />

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search tools, machines, equipment..."
            className="search-main"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-btn-main">🔍</button>
        </form>

        <div className="nav-actions">
          {user ? (
            <>
              <span className="user-name">Hi, {user.name}</span>

              <div className="cart" onClick={() => navigate("/cart")}>
                🛒 <span className="cart-count">{cartCount}</span>
              </div>

              <NotificationBell />

              <div
                className="menu-container"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
              >
                ☰

                {menuOpen && (
                  <div className="dropdown">
                    <p onClick={() => navigate("/orders")}>Order History</p>
                    {user?.isDeliveryAgent === true && user?.verification_status === "approved" && (
                      <>
                        <p onClick={() => navigate("/delivery/dashboard")}>Delivery Dashboard</p>
                        <p onClick={() => navigate("/delivery/orders")}>Delivery Orders</p>
                        <p onClick={() => navigate("/agent/wallet")}>My Wallet</p>
                      </>
                    )}
{user?.isAdmin && (
                       <>
                          <p onClick={() => navigate("/admin/agent-approvals")}>Agent Approvals</p>
                          <p onClick={() => navigate("/admin/wallet")}>Admin Wallet</p>
                       </>
                     )}
                    {isLender && (
                      <>
                        <p onClick={() => navigate("/my-listings")}>My Listings</p>
                        <p onClick={() => navigate("/lender/dashboard")}>Lender Dashboard</p>
                      </>
                    )}
                    {user?.isDeliveryAgent && user?.verification_status !== "approved" && (
                      <p onClick={() => navigate("/become-agent")}>Agent Application Status</p>
                    )}
                    <p onClick={handleLogout}>Logout</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button className="signin" onClick={() => navigate("/login")}>
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* NEGOTIATION NOTIFICATION - Only visible for sellers with pending negotiations */}
      {user && isLender && pendingNegotiationCount > 0 && (
        <div
          className="negotiation-notification-bar"
          onClick={() => navigate("/my-listings")}
          title="View pending negotiations"
        >
          🤝 You have {pendingNegotiationCount} pending negotiation{pendingNegotiationCount > 1 ? 's' : ''} - Click to view
        </div>
      )}

      {/* DELIVERY AGENT NOTIFICATION */}
      {user && user.isDeliveryAgent === true && user.verification_status === "approved" && pendingDeliveryTasks > 0 && (
        <div
          className="negotiation-notification-bar"
          style={{ background: '#dbeafe', color: '#1e3a8a', borderColor: '#93c5fd' }}
          onClick={() => navigate("/delivery/dashboard")}
          title="View available tasks"
        >
          🚚 You have {pendingDeliveryTasks} available delivery task{pendingDeliveryTasks > 1 ? 's' : ''} - Click to view
        </div>
      )}

      {/* ADMIN SETTLEMENT NOTIFICATION */}
      {user && user.isAdmin && pendingSettlements > 0 && (
        <div
          className="negotiation-notification-bar"
          style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }}
        onClick={() => navigate("/admin/wallet")}
        title="View pending settlement approvals"
        >
          💰 You have {pendingSettlements} pending settlement request{pendingSettlements > 1 ? 's' : ''} - Click to review
        </div>
      )}

      {/* HERO SECTION */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Rent Anything. Anytime. Anywhere.</h1>
          <p className="hero-subtitle">
            Find tools, equipment, and machines for rent near you
          </p>
        </div>
      </div>

      {/* CATEGORY SECTION */}
      <div className="category-section">
        <div className="category-left">
          <div className="image-card">
            <img src={hero} alt="hero" className="hero-img" />
            <button 
              className="image-btn"
              onClick={() => navigate("/category/All")}
            >
              Explore Rentals →
            </button>
          </div>
        </div>

        <div className="category-right">
          <h2 className="category-title">
            Explore <span>our Top Categories</span>
          </h2>

          <div className="category-grid">
            {(isLoadingCategories ? ["Loading..."] : ["All", ...categories]).map((cat) => (
              <div
                className={`category-card-new ${
                  selectedCategory === cat ? "active" : ""
                }`}
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                >
                  <p>{cat}</p>
              </div>
            ))}
          </div>

         
        </div>
      </div>

      {/* PRODUCTS SECTION - SHOWS WHEN "ALL" IS SELECTED */}
      {selectedCategory === "All" && (
        <div className="products">
          <h2 className="section-title">Most Popular Rentals 🔥</h2>

          <div className="product-grid">
            {loading ? (
              <div className="skeleton"></div>
            ) : displayedProducts.length > 0 ? (
              displayedProducts.map((item) => (
                <div 
                  className="product-card-new" 
                  key={item._id}
                  onClick={() => navigate(`/product/${item._id}`)}
                >
                  <img src={item.image || item.images?.[0]} alt={item.name} />
                  <h4>{item.name}</h4>
                  <p className="price">
                    ₹{item.pricing?.daily || item.monthlyRent || 0}
                    <span style={{ fontSize: "12px", color: "#666" }}>/day</span>
                  </p>
                  <span className="badge">Popular</span>
                  <button
                    className="rent-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/product/${item._id}`);
                    }}
                  >
                    Explore
                  </button>
                </div>
              ))
            ) : (
              <p>No products found</p>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="footer">
        <div className="footer-top">
          <div className="brandnm">
            <img src={logo} alt="logo" className="footer-logo" />
            <h2>Start2Rent</h2>
          </div>
          <p>Rent anything. Anytime. Anywhere.</p>
        </div>
        <div className="footer-links">
          <div>
            <h4>Company</h4>
            <p onClick={() => navigate("/")}>About Us</p>
            <p>Careers</p>
            <p>Blog</p>
          </div>

          <div>
            <h4>Support</h4>
            <p>Help Center</p>
            <p>Contact Us</p>
            <p>FAQs</p>
          </div>

          <div>
            <h4>Services</h4>
            <p>Rent Equipment</p>
            <p onClick={() => navigate("/add-product")}>List Your Product</p>
            <p onClick={() => navigate("/become-agent")}>Delivery Chain</p>
          </div>

          <div>
            <h4>Follow Us</h4>
            <p>Instagram</p>
            <p>Facebook</p>
            <p>Twitter</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Start2Rent. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;