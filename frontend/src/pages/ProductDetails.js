import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { getDurationOptions } from "../utils/pricing";
import "../styles/product.css";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mainImage, setMainImage] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  // Helper: Convert pricing object to array for rendering
  const getPricingArray = (product) => {
    if (!product) return [];
    const pricing = product.pricing || {};
    const options = getDurationOptions();
    
    return options.map(opt => ({
      duration: opt.value,
      durationLabel: opt.label,
      price: pricing[opt.value] || 0,
    }));
  };

  // 🔥 FETCH PRODUCT
  useEffect(() => {
    api
      .get(`/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        setMainImage(res.data?.image || res.data?.images?.[0] || "");

        // ✅ DEFAULT PLAN (pick monthly or first available)
        const pricingOptions = getPricingArray(res.data);
        const defaultOption = pricingOptions.find(p => p.duration === 'monthly') || pricingOptions[0];
        
        if (defaultOption) {
          setSelectedPlan({
            duration: defaultOption.duration,
            price: defaultOption.price,
            durationLabel: defaultOption.durationLabel,
          });
        }
      })
      .catch(() => {
        setProduct(null);
      });
  }, [id]);

  // 🔥 ADD TO CART
  const handleAddToCart = async () => {
    if (!user) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    if (!selectedPlan) {
      alert("Please select a plan");
      return;
    }

    try {
      await api.post("/api/cart/add", {
        userId: user._id,
        productId: product._id,
        selectedPlan, // ✅ correct plan goes to backend
      });

      alert("Added to cart ✅");
      window.dispatchEvent(new Event("cartUpdated"));
    } catch {
      alert("Error adding to cart");
    }
  };

  if (!product) return <p>Loading...</p>;

  return (
    <div className="product-page">

      {/* LEFT SIDE */}
      <div className="product-left">

        <div className="main-image">
          <img src={mainImage} alt="product" />
        </div>

        <div className="thumbnail-row">
          {(product.images?.length ? product.images : [product.image].filter(Boolean)).map(
            (img, i) => (
              <img
                key={i}
                src={img}
                alt="thumb"
                onClick={() => setMainImage(img)}
                className={mainImage === img ? "active-thumb" : ""}
              />
            )
          )}
        </div>

      </div>

      {/* RIGHT SIDE */}
      <div className="product-right">

        <h2>{product.name}</h2>

        <p className="description">{product.description}</p>

        {/* PRICE */}
        <h3 className="price">
          ₹{selectedPlan?.price}
        </h3>

        {/* TRUST BADGES */}
        <div className="trust-badges">
          {/* <span>🚚 4–6 days delivery</span>
          <span>🛡 Damage Protection</span>
          <span>💯 Verified Product</span> */}
        </div>

        {/* PLAN SELECTION */}
        <div className="plan-section">
          <h3>Select Plan</h3>

          {(() => {
            const pricingOptions = getPricingArray(product);
            return pricingOptions.map((plan, i) => (
              <div
                key={i}
                className={`plan-card ${
                  selectedPlan?.duration === plan.duration ? "active" : ""
                }`}
                onClick={() =>
                  setSelectedPlan({
                    duration: plan.duration,
                    price: plan.price,
                    durationLabel: plan.durationLabel,
                  })
                }
              >
                <p>{plan.durationLabel}</p>
                <h4>₹{plan.price.toLocaleString('en-IN')}</h4>
              </div>
            ));
          })()}
        </div>

        {/* Deposit Info */}
        {product?.deposit > 0 && (
          <div className="deposit-info">
            <span>💰 Security Deposit: ₹{product.deposit.toLocaleString('en-IN')} (Refundable)</span>
          </div>
        )}

        {/* SELECTED PLAN SUMMARY */}
        {selectedPlan && (
          <div className="selected-plan-summary">
            <h3>Rental Summary</h3>
            <div className="summary-row">
              <span>Plan:</span>
              <strong>{selectedPlan.durationLabel}</strong>
            </div>
            <div className="summary-row">
              <span>Rent:</span>
              <strong>₹{selectedPlan.price.toLocaleString('en-IN')}</strong>
            </div>
            {product?.deposit > 0 && (
              <div className="summary-row">
                <span>Security Deposit:</span>
                <strong>₹{product.deposit.toLocaleString('en-IN')}</strong>
              </div>
            )}
            <div className="summary-row total">
              <span>Total Payable:</span>
              <strong>₹{(selectedPlan.price + (product?.deposit || 0)).toLocaleString('en-IN')}</strong>
            </div>
          </div>
        )}

        {/* BREAKDOWN */}
        {selectedPlan && (
          <div className="rent-breakdown">
            <p><strong>Plan:</strong> {selectedPlan.duration}</p>
            <p><strong>Rent:</strong> ₹{selectedPlan.price}</p>
            <p className="deposit">
              <strong>Deposit:</strong> ₹{product.deposit || 0}
            </p>
          </div>
        )}

        {/* 🔥 PREMIUM CTA BAR */}
        <div className="cta-bar">
          <div className="cta-left">
            100% Refundable Deposit: ₹{product.deposit || 0}
          </div>

          <button className="cta-right" onClick={handleAddToCart}>
            Add to Cart
          </button>
        </div>

        {/* VIEW CART */}
        <button
          className="view-cart-btn"
          onClick={() => navigate("/cart")}
        >
          View Cart
        </button>

      </div>

    </div>
  );
}

export default ProductDetails;
