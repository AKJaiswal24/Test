import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/auth.css";

function SignupPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      await axios.post(
        "http://localhost:5000/api/auth/signup",
        formData
      );

      alert("Account created successfully!");

      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join Start2Rent and start renting smarter</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>

        <div className="divider">
          <span>or sign up with</span>
        </div>

        <div className="social-buttons">
          <button className="social-btn google">
            <img
              src="https://cdn-icons-png.flaticon.com/128/2991/2991148.png"
              alt="Google"
            />
            Google
          </button>

          <button className="social-btn apple">
            <img
              src="https://cdn-icons-png.flaticon.com/128/2692/2692388.png"
              alt="Apple"
            />
            Apple
          </button>
        </div>

      </div>

      <div className="auth-decoration">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>
    </div>
  );
}

export default SignupPage;