import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import { usePricing } from "../hooks/usePricing";

const DEFAULT_CATEGORIES = [
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
  "Audio Visual",
  "Medical Equipment",
  "Sports & Fitness",
  "Garden & Outdoor",
  "Party Supplies",
  "Baby & Kids",
  "Office Equipment",
  "Tools & Hardware",
  "Photography",
  "Musical Instruments"
];

function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();

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

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    deposit: "",
    monthlyRent: "",
  });

  const [images, setImages] = useState(["", "", ""]);
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

   // Use pricing hook for calculated prices
   const { 
     validation, 
     allOptions, 
     durationOptions, 
     bestValue 
   } = usePricing(Number(form.monthlyRent) || 0);

   useEffect(() => {
     if (!isLender) navigate("/become-lender");
     if (!userId) navigate("/login");
     
     // Fetch product data for editing
     const fetchProduct = async () => {
       if (!id || !userId || !isLender) return;
       setIsLoading(true);
       try {
         const response = await api.get(`/api/products/${id}`);
         const product = response.data;
         
         // Check if product belongs to current user
         if (product.userId !== userId) {
           navigate("/my-listings");
           return;
         }
         
         // Populate form with product data
         setForm({
           name: product.name || "",
           description: product.description || "",
           category: product.category || "",
           deposit: product.deposit || "",
           monthlyRent: product.monthlyRent || product.pricing?.monthly || "",
         });
         
         // Ensure we have at least 3 image fields
         const productImages = product.images || [];
         const imagesArray = [...productImages];
         while (imagesArray.length < 3) {
           imagesArray.push("");
         }
         setImages(imagesArray.slice(0, 3));
       } catch (error) {
         console.error("Error fetching product:", error);
         setError("Failed to load product. Please try again.");
         setTimeout(() => navigate("/my-listings"), 2000);
       } finally {
         setIsLoading(false);
       }
     };
     
     fetchProduct();
   }, [isLender, navigate, userId, id]);

// Fetch categories on component mount
    useEffect(() => {
      const fetchCategories = async () => {
        setIsLoadingCategories(true);
        try {
          const response = await api.get("/api/products/categories");
          const apiCategories = response.data.categories || [];
          // Merge backend categories with defaults to ensure all are shown
          const allCategories = [...new Set([...DEFAULT_CATEGORIES.slice(1), ...apiCategories])];
          setCategories(allCategories);
        } catch (err) {
          console.error("Error fetching categories:", err);
          // Fallback to default categories if API fails
          setCategories([
            "Cleaning",
            "Power Tools",
            "Kitchen Machines",
            "Construction",
            "Electronics",
            "Vehicles",
            "Lighting",
            "Machinery",
            "Equipment",
            "Audio Visual",
            "Medical Equipment",
            "Sports & Fitness",
            "Garden & Outdoor",
            "Party Supplies",
            "Baby & Kids",
            "Office Equipment",
            "Tools & Hardware",
            "Photography",
            "Musical Instruments"
          ]);
        } finally {
          setIsLoadingCategories(false);
        }
      };

     fetchCategories();
   }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (index, value) => {
    setImages((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId) {
      setError("Please login first");
      navigate("/login");
      return;
    }

    // Validation
    const trimmedImages = images.map((img) => img.trim());
    const validImages = trimmedImages.filter((img) => img !== "");

    if (!form.name?.trim()) {
      setError("Product name is required");
      return;
    }

    if (!form.category?.trim()) {
      setError("Category is required");
      return;
    }

    if (!form.monthlyRent || Number(form.monthlyRent) <= 0) {
      setError("Please enter a valid monthly rent");
      return;
    }

    if (validImages.length < 3) {
      setError("Please provide at least 3 image URLs");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await api.put(`/api/products/${id}`, {
        name: form.name,
        description: form.description,
        category: form.category,
        deposit: form.deposit ? Number(form.deposit) : 0,
        monthlyRent: Number(form.monthlyRent),
        images: validImages,
        userId,
      });

      setSuccess("Product updated successfully! Redirecting...");
      setTimeout(() => {
        navigate("/my-listings");
      }, 1500);
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update product";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="edit-product-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-product-container">
      <div className="edit-product-card">
        {/* Header */}
        <div className="card-header">
          <div className="header-content">
            <h1>
              <span className="icon">✏️</span>
              Edit Product
            </h1>
            <p className="subtitle">Update your product information</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/my-listings")}
            className="back-link"
          >
            ← Back to Listings
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="product-form">

          {/* Basic Info Section */}
          <section className="form-section">
            <h2 className="section-title">Basic Information</h2>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">
                  Product Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="What are you renting?"
                  required
                  autoFocus
                />
              </div>

               <div className="form-group">
                 <label htmlFor="category">
                   Category <span className="required">*</span>
                 </label>
                 <select
                   id="category"
                   name="category"
                   value={form.category}
                   onChange={handleChange}
                   required
                   className={isLoadingCategories ? "loading" : ""}
                 >
                   {!isLoadingCategories && categories.length > 0 ? (
                     <>
                       <option value="">Select a category</option>
                       {categories.map((cat) => (
                         <option key={cat} value={cat}>
                           {cat}
                         </option>
                       ))}
                     </>
                   ) : (
                     <>
                       <option value="">Loading categories...</option>
                       {/* Fallback options while loading */}
                       <option value="Cleaning">Cleaning</option>
                       <option value="Power Tools">Power Tools</option>
                       <option value="Kitchen Machines">Kitchen Machines</option>
                       <option value="Construction">Construction</option>
                       <option value="Electronics">Electronics</option>
                       <option value="Vehicles">Vehicles</option>
                       <option value="Lighting">Lighting</option>
                       <option value="Machinery">Machinery</option>
                       <option value="Equipment">Equipment</option>
                     </>
                   )}
                 </select>
                 {isLoadingCategories && (
                   <span className="helper-text">Loading categories...</span>
                 )}
               </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe your product, condition, features, specifications..."
                  rows="4"
                />
              </div>

              {/* Monthly Rent - replaces old deposit + pricing */}
              <div className="form-group">
                <label htmlFor="monthlyRent">
                  Base Monthly Rent (₹) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="monthlyRent"
                  name="monthlyRent"
                  value={form.monthlyRent}
                  onChange={handleChange}
                  placeholder="10000"
                  min="1000"
                  step="100"
                  required
                  className={validation.isValid ? "" : "invalid"}
                />
                {!validation.isValid && validation.error && (
                  <span className="error-text">{validation.error}</span>
                )}
                <small className="helper-text">
                  All durations auto-calculate from this amount
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="deposit">
                  Security Deposit (₹) <span className="optional">(optional)</span>
                </label>
                <input
                  type="number"
                  id="deposit"
                  name="deposit"
                  value={form.deposit}
                  onChange={handleChange}
                  placeholder="0 (refundable)"
                  min="0"
                  step="100"
                />
                <small className="helper-text">
                  Fully refundable security deposit
                </small>
              </div>
            </div>
          </section>

          {/* Live Pricing Preview */}
          {form.monthlyRent && Number(form.monthlyRent) > 0 && allOptions.length > 0 && (
            <section className="form-section pricing-preview">
              <h2 className="section-title">📊 Calculated Prices</h2>
              <div className="pricing-grid">
                {allOptions.map((opt) => (
                  <div key={opt.duration} className="price-item">
                    <span className="duration-label">
                      {durationOptions.find(d => d.value === opt.duration)?.label}
                    </span>
                    <span className="price-value">{opt.formattedTotal}</span>
                    {opt.savingsPercentage > 0 && (
                      <span className="savings-badge-small">
                        -{opt.savingsPercentage}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {bestValue && bestValue.savingsPercentage > 0 && (
                <div className="best-value-alert">
                  💡 Best value: {durationOptions.find(d => d.value === bestValue.duration)?.label} 
                  at {bestValue.formattedEffectiveMonthly}/month
                </div>
              )}
            </section>
          )}

          {/* Images Section */}
          <section className="form-section">
            <h2 className="section-title">Product Images</h2>
            <p className="section-description">
              Update image URLs. At least 3 images required.
            </p>

            <div className="images-grid">
              {images.map((img, index) => (
                <div key={index} className="image-input-group">
                  <label>Image {index + 1}</label>
                  <input
                    type="url"
                    value={img}
                    onChange={(e) => handleImageChange(index, e.target.value)}
                    placeholder={`https://example.com/image${index + 1}.jpg`}
                    className={img ? "has-value" : ""}
                  />
                  {img && (
                    <div className="image-preview">
                      <img
                        src={img}
                        alt={`Preview ${index + 1}`}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                        onLoad={(e) => {
                          e.target.style.display = "block";
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate("/my-listings")}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-small"></span>
                  Updating...
                </>
              ) : (
                <>
                  <span>✓</span>
                  Update Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProduct;