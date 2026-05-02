import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/product.css";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mainImage, setMainImage] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  // 🔥 FETCH PRODUCT
  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        setMainImage(res.data.image);

        // ✅ DEFAULT PLAN (optional)
        if (res.data.pricing?.length > 0) {
          setSelectedPlan({
            duration: res.data.pricing[0].duration,
            price: res.data.pricing[0].price,
          });
        } else {
          setSelectedPlan({
            duration: "Per Day",
            price: res.data.price,
          });
        }
      })
      .catch((err) => console.log(err));
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
      await axios.post("http://localhost:5000/api/cart/add", {
        userId: user._id,
        productId: product._id,
        selectedPlan, // ✅ correct plan goes to backend
      });

      alert("Added to cart ✅");
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.log(err);
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
          {[product.image, product.image, product.image].map((img, i) => (
            <img
              key={i}
              src={img}
              alt="thumb"
              onClick={() => setMainImage(img)}
              className={mainImage === img ? "active-thumb" : ""}
            />
          ))}
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
          <span>🚚 4–6 days delivery</span>
          <span>🛡 Damage Protection</span>
          <span>💯 Verified Product</span>
        </div>

        {/* PLAN SELECTION */}
        <div className="plan-section">
          <h3>Select Plan</h3>

          {(product.pricing?.length > 0
            ? product.pricing
            : [{ duration: "Per Day", price: product.price }]
          ).map((plan, i) => (
            <div
              key={i}
              className={`plan-card ${
                selectedPlan?.duration === plan.duration ? "active" : ""
              }`}
              onClick={() =>
                setSelectedPlan({
                  duration: plan.duration,
                  price: plan.price,
                })
              }
            >
              <p>{plan.duration}</p>
              <h4>₹{plan.price}</h4>
            </div>
          ))}
        </div>

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