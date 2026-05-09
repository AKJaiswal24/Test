/**
 * Rental Pricing Engine
 *
 * A flexible, configuration-driven pricing calculator for rental marketplaces.
 * Supports multiple durations, dynamic pricing updates, and validation.
 *
 * Usage:
 *   const { calculatePricing, getAllPricingOptions } = require('./pricing');
 *
 *   const pricing = calculatePricing(10000, '3_months');
 *   console.log(pricing.totalPrice); // 28000
 *   console.log(pricing.formattedTotal); // ₹28,000
 *
 * @module pricing
 */

const {
  calculatePricing,
  getAllPricingOptions,
  getDurationOptions,
  updatePricingConfig,
  validateMonthlyRent,
  validateDuration,
  PRICING_CONFIG,
  VALIDATION_ERRORS,
} = require('./calculator');

module.exports = {
  // Main calculator
  calculatePricing,
  getAllPricingOptions,
  getDurationOptions,
  updatePricingConfig,

  // Validation helpers
  validateMonthlyRent,
  validateDuration,

  // Config access
  PRICING_CONFIG,
  VALIDATION_ERRORS,

  // Duration constants for convenience
  DURATIONS: PRICING_CONFIG.DURATIONS,
  DURATION_LABELS: PRICING_CONFIG.DURATION_LABELS,
};