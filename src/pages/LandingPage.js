import React, { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import hero from "../assets/hero.png";
import "../styles/landing.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function LandingPage() {
  const navigate = useNavigate();

  // STATE
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const popularProducts = products.filter((p) => p.isPopular);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

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
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) return;

  const fetchCart = () => {
    axios
      .get(`http://localhost:5000/api/cart/${user._id}`)
      .then((res) => {
        setCartCount(res.data.items?.length || 0);
      })
      .catch((err) => console.log(err));
  };

  fetchCart();

  // 🔥 listen for updates
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
    axios
      .get("http://localhost:5000/api/products")
      .then((res) => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  }, []);

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  // CATEGORY LIST
  const categories = [
    "All",
    "Cleaning",
    "Power Tools",
    "Kitchen Machines",
    "Construction",
    "Electronics",
    "Vehicles",
    "Lighting",
    "Machinery",
    "Equipment",
  ];

  return (
    <div className="container">
      {/* NAVBAR */}
      <div className="navbar">
        <img src={logo} alt="logo" className="logo-img" />

        <input
          type="text"
          placeholder="Search for tools, machines..."
          className="search"
        />

      <div className="nav-actions">

  {user ? (
    <>
      {/* USER NAME */}
      <span className="user-name">Hi, {user.name}</span>

      {/* CART */}
      <div
        className="cart"
        onClick={() => navigate("/cart")}
      >
        🛒 <span className="cart-count">{cartCount}</span>
      </div>

      {/* HAMBURGER */}
<div
  className="menu-container"
  onClick={(e) => {
    e.stopPropagation(); // prevent closing immediately
    setMenuOpen(!menuOpen);
  }}
>
  ☰

  {menuOpen && (
    <div className="dropdown">
      <p onClick={() => navigate("/my-rentals")}>
        Order History
      </p>

      <p onClick={handleLogout}>
        Logout
      </p>
    </div>
  )}
</div>
    </>
  ) : (
    <button
      className="signin"
      onClick={() => navigate("/login")}
    >
      Sign In
    </button>
  )}

</div>
      </div>

      {/* HERO + CATEGORY SECTION */}
      <div className="category-section">
        {/* LEFT IMAGE */}
        <div className="category-left">
          <div className="image-card">
 <img src={hero} alt="hero" className="hero-img" />
            <button className="image-btn">Explore Rentals →</button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="category-right">
          <h2 className="category-title">
            Explore <span>our Top Categories</span>
          </h2>

          <div className="category-grid">
            {categories.map((cat, i) => (
<div
  className={`category-card-new ${
    selectedCategory === cat ? "active" : ""
  }`}
  key={i}
  onClick={() => {
    setSelectedCategory(cat); // optional (for UI highlight)
    navigate(`/category/${cat}`); // 🔥 important
  }}
>
  <img
    src="https://cdn-icons-png.flaticon.com/128/1046/1046857.png"
    alt="icon"
  />
  <p>{cat}</p>
</div>
            ))}
          </div>

          <p className="view-more">View More categories ↓</p>
        </div>
      </div>

      {/* PRODUCTS */}
      {/* <div className="products">

        <h2 className="section-title">
          {selectedCategory === "All"
            ? "All Rentals"
            : selectedCategory}
        </h2>

        <div className="product-grid">

          {loading ? (
            <p>Loading...</p>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((item) => (
              <div className="product-card-new" key={item._id}>
                <img src={item.image} alt={item.name} />
                <h4>{item.name}</h4>
                <p className="price">₹{item.price}/day</p>
                <button className="rent-btn">Explore</button>
              </div>
            ))
          ) : (
            <p>No products found</p>
          )}

        </div>
      </div> */}

      <div className="products">
        <h2 className="section-title">Most Popular Rentals 🔥</h2>

        <div className="product-grid">
          {loading ? (
            <div className="skeleton"></div>
          ) : popularProducts.length > 0 ? (
            popularProducts.map((item) => (
              <div className="product-card-new" key={item._id}>
                <img src={item.image} alt={item.name} />
                <h4>{item.name}</h4>
                <p className="price">₹{item.price}/day</p>

                <span className="badge">Popular</span>

                <button
                  className="rent-btn"
                  onClick={() => navigate(`/product/${item._id}`)}
                >
                  Explore
                </button>
              </div>
            ))
          ) : (
            <p>No popular products found</p>
          )}
        </div>
      </div>

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
            <p>About Us</p>
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
            <p>List Your Product</p>
            <p>Pricing</p>
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
