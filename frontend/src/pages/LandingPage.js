import React, { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import hero from "../assets/hero.png";
import "../styles/landing.css";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

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
                    {isLender && (
                      <p onClick={() => navigate("/my-listings")}>My Listings</p>
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
            {(isLoadingCategories ? ["Loading..."] : ["All", ...categories]).map((cat, i) => (
              <div
                className={`category-card-new ${
                  selectedCategory === cat ? "active" : ""
                }`}
                key={i}
                onClick={() => handleCategoryClick(cat)}
              >
                <img
                  src={`https://cdn-icons-png.flaticon.com/128/${1046857 + (i % 5)}/1046${857 + (i % 5)}.png`}
                  alt="icon"
                  onError={(e) => {
                    e.target.src = "https://cdn-icons-png.flaticon.com/128/1046/1046857.png";
                  }}
                />
                <p>{cat}</p>
              </div>
            ))}
          </div>

          <p className="view-more">View More categories ↓</p>
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
            <p>Delivery Chain</p>
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