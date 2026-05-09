import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import "../styles/landing.css"; // reuse grid styles

function CategoryPage() {
  const { categoryName } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // For "All" category, fetch all products
    // Otherwise, use the new search endpoint with category filter
    const endpoint = categoryName === "All" 
      ? "/api/products"
      : `/api/products?category=${encodeURIComponent(categoryName)}`;

    api
      .get(endpoint)
      .then((res) => {
        // For "All", just show all products
        // For specific category, the backend already filters
        if (categoryName !== "All") {
          const data = Array.isArray(res.data) ? res.data : [];
          setProducts(data);
        } else {
          const data = Array.isArray(res.data) ? res.data : [];
          setProducts(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setProducts([]);
        setLoading(false);
      });
  }, [categoryName]);

  return (
    <div className="container">

      <h2 style={{ marginBottom: "20px" }}>
        {categoryName} Rentals
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
                ₹{item.pricing?.daily || item.monthlyRent || 0}
                <span style={{ fontSize: "12px", color: "#666" }}>/day</span>
              </p>
            </div>
          ))
        ) : (
          <p>No products found</p>
        )}

      </div>
    </div>
  );
}

export default CategoryPage;
