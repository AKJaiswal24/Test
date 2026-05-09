/**
 * Pricing Calculator Service
 *
 * A flexible, configuration-driven pricing engine for rental marketplace.
 * Calculates rental prices for different durations based on monthly base rent.
 *
 * Features:
 * - Extensible multiplier configuration
 * - Input validation
 * - Rounding to nearest rupee
 * - Savings calculation
 * - Support for future discount tiers and seasonal pricing
 *
 * @author Start2Rent Team
 * @version 1.0.0
 */

const { PRICING_CONFIG, VALIDATION_ERRORS } = require('./config');

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {string|null} error
 */

/**
 * Pricing result structure
 * @typedef {Object} PricingResult
 * @property {string} duration - Duration key (e.g., 'monthly', '12_months')
 * @property {number} totalPrice - Total price for the duration (rounded)
 * @property {number} effectiveMonthlyPrice - Effective monthly price (rounded)
 * @property {number} savingsPercentage - Savings % compared to monthly (0-100)
 * @property {string} currency - Currency symbol (INR)
 * @property {string} formattedTotal - Formatted total price with currency
 * @property {string} formattedEffectiveMonthly - Formatted effective monthly with currency
 */

/**
 * Validates the monthly rent input
 * @param {number|string} monthlyRent - The base monthly rent amount
 * @returns {ValidationResult}
 */
function validateMonthlyRent(monthlyRent) {
  const num = Number(monthlyRent);

  if (isNaN(num) || !isFinite(num)) {
    return {
      isValid: false,
      error: VALIDATION_ERRORS.INVALID_INPUT_TYPE,
    };
  }

  if (num <= 0) {
    return {
      isValid: false,
      error: VALIDATION_ERRORS.INVALID_MONTHLY_RENT,
    };
  }

  if (num < PRICING_CONFIG.MIN_MONTHLY_RENT) {
    return {
      isValid: false,
      error: VALIDATION_ERRORS.MONTHLY_RENT_OUT_OF_RANGE,
    };
  }

  if (num > PRICING_CONFIG.MAX_MONTHLY_RENT) {
    return {
      isValid: false,
      error: VALIDATION_ERRORS.MONTHLY_RENT_OUT_OF_RANGE,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validates the duration input
 * @param {string} duration - Duration key to validate
 * @returns {ValidationResult}
 */
function validateDuration(duration) {
  const validDurations = Object.values(PRICING_CONFIG.DURATIONS);

  if (!duration || typeof duration !== 'string') {
    return {
      isValid: false,
      error: VALIDATION_ERRORS.INVALID_DURATION,
    };
  }

  if (!validDurations.includes(duration)) {
    return {
      isValid: false,
      error: VALIDATION_ERRORS.INVALID_DURATION,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Rounds a number to the specified precision (default: 0 = nearest rupee)
 * @param {number} value - Value to round
 * @param {number} [precision=0] - Decimal places
 * @returns {number}
 */
function roundValue(value, precision = PRICING_CONFIG.PRECISION) {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Calculates savings percentage between two prices
 * @param {number} originalPrice - Original price (monthly)
 * @param {number} discountedPrice - Discounted price (effective monthly)
 * @returns {number} - Savings percentage (0-100)
 */
function calculateSavingsPercentage(originalPrice, discountedPrice) {
  if (originalPrice <= 0) return 0;
  if (discountedPrice >= originalPrice) return 0;

  const savings = originalPrice - discountedPrice;
  return roundValue((savings / originalPrice) * 100, 1);
}

/**
 * Formats a price with currency symbol
 * @param {number} price - Price to format
 * @returns {string} - Formatted price with currency
 */
function formatPrice(price) {
  return `${PRICING_CONFIG.CURRENCY_SYMBOL}${price.toLocaleString('en-IN')}`;
}

/**
 * Main pricing calculator function
 *
 * Calculates rental price for a given duration based on monthly rent.
 * Uses configurable multipliers for extensibility.
 *
 * Business Logic:
 * 1. Validate inputs (monthly rent > 0, valid duration)
 * 2. Get multiplier from configuration for the duration
 * 3. Calculate total price = monthlyRent × multiplier
 * 4. Calculate effective monthly price = totalPrice / duration_in_months
 * 5. Calculate savings compared to paying monthly (1-month rate)
 * 6. Round all values to nearest rupee
 *
 * @param {number} monthlyRent - Base monthly rent amount in INR
 * @param {string} duration - Duration key from PRICING_CONFIG.DURATIONS
 * @returns {PricingResult} - Calculated pricing information
 *
 * @example
 * const result = calculatePricing(10000, '3_months');
 * // Returns:
 * // {
 * //   duration: '3_months',
 * //   totalPrice: 28000,
 * //   effectiveMonthlyPrice: 9333,
 * //   savingsPercentage: 6.7,
 * //   currency: '₹',
 * //   formattedTotal: '₹28,000',
 * //   formattedEffectiveMonthly: '₹9,333'
 * // }
 */
function calculatePricing(monthlyRent, duration) {
  // Step 1: Validate inputs
  const rentValidation = validateMonthlyRent(monthlyRent);
  if (!rentValidation.isValid) {
    throw new Error(rentValidation.error);
  }

  const durationValidation = validateDuration(duration);
  if (!durationValidation.isValid) {
    throw new Error(durationValidation.error);
  }

  const rent = Number(monthlyRent);
  const multiplier = PRICING_CONFIG.MULTIPLIERS[duration];

  // Step 2: Calculate total price
  const rawTotalPrice = rent * multiplier;
  const totalPrice = roundValue(rawTotalPrice);

  // Step 3: Calculate effective monthly price
  // This shows what the monthly cost effectively becomes with the discount
  let effectiveMonthlyPrice = totalPrice;
  let savingsPercentage = 0;

  switch (duration) {
    case PRICING_CONFIG.DURATIONS.DAILY:
      // Daily has no savings vs monthly (it's the base rate)
      effectiveMonthlyPrice = rent;
      savingsPercentage = 0;
      break;

    case PRICING_CONFIG.DURATIONS.WEEKLY:
      // Weekly has no savings vs monthly (6-day rate)
      effectiveMonthlyPrice = rent;
      savingsPercentage = 0;
      break;

    case PRICING_CONFIG.DURATIONS.MONTHLY:
      // Monthly is the base rate
      effectiveMonthlyPrice = rent;
      savingsPercentage = 0;
      break;

    case PRICING_CONFIG.DURATIONS.THREE_MONTHS:
      // 3 months: total / 3
      effectiveMonthlyPrice = roundValue(totalPrice / 3);
      savingsPercentage = calculateSavingsPercentage(rent, effectiveMonthlyPrice);
      break;

    case PRICING_CONFIG.DURATIONS.SIX_MONTHS:
      // 6 months: total / 6
      effectiveMonthlyPrice = roundValue(totalPrice / 6);
      savingsPercentage = calculateSavingsPercentage(rent, effectiveMonthlyPrice);
      break;

    case PRICING_CONFIG.DURATIONS.TWELVE_MONTHS:
      // 12 months: total / 12
      effectiveMonthlyPrice = roundValue(totalPrice / 12);
      savingsPercentage = calculateSavingsPercentage(rent, effectiveMonthlyPrice);
      break;

    default:
      // Should never reach here due to validation
      throw new Error(`Unhandled duration: ${duration}`);
  }

  // Step 4: Build result object
  return {
    duration,
    totalPrice,
    effectiveMonthlyPrice,
    savingsPercentage,
    currency: PRICING_CONFIG.CURRENCY_SYMBOL,
    formattedTotal: formatPrice(totalPrice),
    formattedEffectiveMonthly: formatPrice(effectiveMonthlyPrice),
    // Additional metadata for extensibility
    multiplier,
    baseMonthlyRent: rent,
  };
}

/**
 * Get all pricing options for a given monthly rent
 * Useful for displaying all duration options in UI
 *
 * @param {number} monthlyRent - Base monthly rent amount
 * @returns {PricingResult[]} - Array of pricing for all durations
 */
function getAllPricingOptions(monthlyRent) {
  const durations = Object.values(PRICING_CONFIG.DURATIONS);
  return durations.map((duration) => {
    try {
      return calculatePricing(monthlyRent, duration);
    } catch (error) {
      // Return error state for invalid duration (shouldn't happen with valid durations)
      return {
        duration,
        error: error.message,
        totalPrice: 0,
        effectiveMonthlyPrice: 0,
        savingsPercentage: 0,
      };
    }
  });
}

/**
 * Get only valid durations (useful for dropdown options)
 * @returns {Array<{value: string, label: string}>}
 */
function getDurationOptions() {
  return Object.entries(PRICING_CONFIG.DURATION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
}

/**
 * Updates pricing configuration dynamically
 * Allows for future seasonal pricing or custom multipliers
 *
 * @param {string} duration - Duration key to update
 * @param {number} newMultiplier - New multiplier value
 * @param {string} [newLabel] - Optional new display label
 */
function updatePricingConfig(duration, newMultiplier, newLabel) {
  if (!PRICING_CONFIG.MULTIPLIERS.hasOwnProperty(duration)) {
    throw new Error(`Cannot update: invalid duration '${duration}'`);
  }

  if (typeof newMultiplier !== 'number' || newMultiplier <= 0) {
    throw new Error('Multiplier must be a positive number');
  }

  PRICING_CONFIG.MULTIPLIERS[duration] = newMultiplier;

  if (newLabel) {
    PRICING_CONFIG.DURATION_LABELS[duration] = newLabel;
  }

  console.log(`Pricing updated for ${duration}: multiplier=${newMultiplier}`);
}

module.exports = {
  calculatePricing,
  getAllPricingOptions,
  getDurationOptions,
  updatePricingConfig,
  validateMonthlyRent,
  validateDuration,
  // Export config for direct access if needed
  PRICING_CONFIG,
  VALIDATION_ERRORS,
};