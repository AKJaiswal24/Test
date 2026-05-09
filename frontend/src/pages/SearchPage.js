import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import "../styles/landing.css";

function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .get(`/api/products?search=${encodeURIComponent(query)}`)
      .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="container">
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => navigate("/")} className="signin">
          ← Back to Home
        </button>
      </div>

      <h2 style={{ marginBottom: "20px" }}>
        Search Results for: <span style={{ color: "#3B82F6" }}>{query}</span>
      </h2>

      <div className="product-grid">
        {loading ? (
          <div className="skeleton"></div>
        ) : products.length > 0 ? (
          products.map((item) => (
            <div
              className="product-card-new"
              key={item._id}
              onClick={() => navigate(`/product/${item._id}`)}
            >
              <img src={item.image || item.images?.[0]} alt={item.name} />
              <h4>{item.name}</h4>
              <p className="price">
                ₹{item.price || item.pricePerMonth || item.pricing?.monthly || 0}
                <span style={{ fontSize: "12px", color: "#666" }}>/day</span>
              </p>
              <span className="badge">Rent</span>
            </div>
          ))
        ) : (
          <p>No products found for "{query}"</p>
        )}
      </div>
    </div>
  );
}

export default SearchPage;