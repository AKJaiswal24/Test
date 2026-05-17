import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import "../styles/lender.css";

function BecomeLender() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const isLender = user?.isLender === true;

  // Move ALL hooks to top level to avoid conditional calls
  const [form, setForm] = useState({
    aadhaarCard: null,
    aadhaarCardUrl: "",
    businessName: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLender) {
      navigate("/my-listings", { replace: true });
    }
  }, [isLender, navigate]);

  if (!user) {
    return (
      <div className="lender-page">
        <h2>Please login first</h2>
        <button onClick={() => navigate("/login")}>Go to Login</button>
      </div>
    );
  }

  if (isLender) {
    return (
      <div className="lender-page">
        <h2>Redirecting...</h2>
      </div>
    );
  }

  const handleAadhaarChange = (e) => {
    if (e.target.files[0]) {
      setForm(prev => ({
        ...prev,
        aadhaarCard: e.target.files[0],
        aadhaarCardUrl: URL.createObjectURL(e.target.files[0])
      }));
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.aadhaarCard) {
      alert("Please upload your Aadhaar card");
      return;
    }

    if (!form.businessName || !form.phone || !form.address) {
      alert("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // First upload the Aadhaar card
      const formData = new FormData();
      formData.append("aadhaarCard", form.aadhaarCard);
      
      const uploadResponse = await api.post("/api/lender/upload-aadhaar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      const aadhaarCardUrl = uploadResponse.data.url;
      
      // Then register as lender
      await api.post("/api/lender/register", {
        userId: user._id,
        businessName: form.businessName,
        phone: form.phone,
        address: form.address,
        city: form.city,
        pincode: form.pincode,
        aadhaarCardUrl: aadhaarCardUrl,
      });

      // Update user object with isLender flag
      const updatedUser = { ...user, isLender: true };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      alert("You're now a lender!");
      navigate("/add-product");
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to register as lender";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
<div className="lender-page">
       <button className="btn-home" onClick={() => navigate("/")}>← Back to Home</button>
       <h1>Become a Lender</h1>
      <p>Register to start renting out your products</p>
      
      <form onSubmit={handleSubmit} className="lender-form">
        <div className="form-group">
          <label>Aadhaar Card Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleAadhaarChange}
            required
          />
          {form.aadhaarCardUrl && (
            <img src={form.aadhaarCardUrl} alt="Aadhaar Card Preview" className="preview-img" />
          )}
        </div>
        
        <div className="form-group">
          <label>Business Name</label>
          <input
            type="text"
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            placeholder="Enter your business name"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Enter your phone number"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Address</label>
          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Enter your address"
            required
          />
        </div>
        
        <div className="form-group">
          <label>City</label>
          <input
            type="text"
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="Enter your city"
          />
        </div>
        
        <div className="form-group">
          <label>Pincode</label>
          <input
            type="text"
            name="pincode"
            value={form.pincode}
            onChange={handleChange}
            placeholder="Enter your pincode"
          />
        </div>
        
        <button type="submit" disabled={isSubmitting} className="submit-btn">
          {isSubmitting ? "Registering..." : "Register as Lender"}
        </button>
      </form>
    </div>
  );
}

export default BecomeLender;
