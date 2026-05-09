import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import "../styles/listings.css";

function MyListings() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const isLender = user?.isLender === true;
  const userId = user?._id || "";

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    if (!isLender) {
      navigate("/become-lender");
    }
  }, [isLender, navigate, userId]);

  const fetchProducts = useCallback(async () => {
    if (!userId || !isLender) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await api.get(`/api/products/lender/${userId}`);
      setProducts(Array.isArray(response?.data) ? response.data : []);
    } catch {
      setErrorMessage("Failed to load listings.");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLender, userId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id) => {
    if (!id) return;
    try {
      await api.delete(`/api/products/${id}`);
      alert("Deleted ✅");
      fetchProducts();
    } catch {
      alert("Delete failed ❌");
    }
  };

  const handleEdit = (id) => {
    navigate(`/edit-product/${id}`);
  };

  if (!userId || !isLender) return <h2>Redirecting...</h2>;

  return (
    <div className="listings-page">
      <h1>My Listings</h1>

      {isLoading ? (
        <p>Loading...</p>
      ) : errorMessage ? (
        <p>{errorMessage}</p>
      ) : (
        <div className="grid">
          {/* Add New Product Card */}
          <div
            className="card add-product-card"
            onClick={() => navigate("/add-product")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigate("/add-product");
              }
            }}
          >
            <div className="add-icon">+</div>
            <h3>Add New Product</h3>
            <p>List a new item for rent</p>
          </div>

          {/* Existing Product Cards */}
          {products.map((item) => (
            <div className="card" key={item._id}>
              <img src={item.image || item.images?.[0]} alt="product" />
              <h3>{item.name}</h3>
              <p className="category">{item.category}</p>
              {/* Show monthly price from pre-calculated pricing object */}
              <p className="price">₹{item.pricing?.monthly?.toLocaleString('en-IN') || item.monthlyRent?.toLocaleString('en-IN')}</p>

              <div className="actions">
                <button className="edit" onClick={() => handleEdit(item._id)}>
                  Edit
                </button>
                <button className="delete" onClick={() => handleDelete(item._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyListings;

