/**
 * Frontend Pricing Utility
 *
 * This module provides both client-side calculation and API integration
 * for rental pricing. It mirrors the backend pricing engine logic for
 * consistency and can optionally fetch pricing from the backend API.
 */

import api from "../api/client";

// Duration constants
export const DURATIONS = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  THREE_MONTHS: "3_months",
  SIX_MONTHS: "6_months",
  TWELVE_MONTHS: "12_months",
};

// Display labels
export const DURATION_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  "3_months": "3 Months",
  "6_months": "6 Months",
  "12_months": "12 Months",
};

/**
 * Client-side pricing calculator
 * Mirrors the backend logic for immediate UI updates
 *
 * Formula references:
 * - Daily = Monthly / 26
 * - Weekly = Daily × 6
 * - Monthly = Base
 * - 3M = Monthly × 2.8
 * - 6M = Monthly × 5.5
 * - 12M = Monthly × 11
 */
export const calculatePricing = (monthlyRent, duration) => {
  if (!monthlyRent || monthlyRent <= 0) {
    throw new Error("Monthly rent must be a positive number");
  }

  const validDurations = Object.values(DURATIONS);
  if (!validDurations.includes(duration)) {
    throw new Error(`Invalid duration. Must be one of: ${validDurations.join(", ")}`);
  }

  // Multipliers (same as backend)
  const multipliers = {
    daily: 1 / 26,
    weekly: 6 / 26,
    monthly: 1.0,
    "3_months": 2.8,
    "6_months": 5.5,
    "12_months": 11.0,
  };

  const multiplier = multipliers[duration];

  // Calculate total price
  const totalPrice = Math.round(monthlyRent * multiplier);

  // Calculate effective monthly and savings
  let effectiveMonthlyPrice = totalPrice;
  let savingsPercentage = 0;

  const monthsMap = {
    daily: 0, // No savings concept for daily
    weekly: 0, // No savings concept for weekly
    monthly: 1,
    "3_months": 3,
    "6_months": 6,
    "12_months": 12,
  };

  const months = monthsMap[duration];

  if (months > 1) {
    effectiveMonthlyPrice = Math.round(totalPrice / months);
    const savings = monthlyRent - effectiveMonthlyPrice;
    savingsPercentage = Math.round((savings / monthlyRent) * 100 * 10) / 10; // 1 decimal place
  }

  // Format price with INR
  const formatPrice = (price) => `₹${price.toLocaleString("en-IN")}`;

  return {
    duration,
    totalPrice,
    effectiveMonthlyPrice,
    savingsPercentage,
    formattedTotal: formatPrice(totalPrice),
    formattedEffectiveMonthly: formatPrice(effectiveMonthlyPrice),
    multiplier,
    baseMonthlyRent: monthlyRent,
  };
};

/**
 * Get all pricing options for a given monthly rent
 */
export const getAllPricingOptions = (monthlyRent) => {
  return Object.values(DURATIONS).map((duration) => {
    try {
      return calculatePricing(monthlyRent, duration);
    } catch (error) {
      return {
        duration,
        error: error.message,
        totalPrice: 0,
        effectiveMonthlyPrice: 0,
        savingsPercentage: 0,
      };
    }
  });
};

/**
 * Get duration options for dropdown (value/label pairs)
 */
export const getDurationOptions = () => {
  return Object.entries(DURATION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
};

/**
 * Validate monthly rent
 */
export const validateMonthlyRent = (monthlyRent) => {
  const num = Number(monthlyRent);
  const MIN_RENT = 1000;
  const MAX_RENT = 10000000;

  if (isNaN(num) || !isFinite(num) || num <= 0) {
    return { isValid: false, error: "Monthly rent must be a positive number" };
  }

  if (num < MIN_RENT) {
    return {
      isValid: false,
      error: `Monthly rent must be at least ₹${MIN_RENT.toLocaleString("en-IN")}`,
    };
  }

  if (num > MAX_RENT) {
    return {
      isValid: false,
      error: `Monthly rent cannot exceed ₹${(MAX_RENT / 100000).toFixed(0)}L`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Fetch pricing from backend API (for server-side validation)
 * Use this when you need authoritative pricing from the server
 */
export const fetchProductPricing = async (productId) => {
  try {
    const response = await api.get(`/api/products/${productId}/pricing`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch pricing from API:", error);
    throw error;
  }
};

/**
 * Calculate price for specific duration via backend API
 */
export const calculatePriceViaAPI = async (productId, duration) => {
  try {
    const response = await api.post(`/api/products/${productId}/calculate`, {
      duration,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to calculate price:", error);
    throw error;
  }
};