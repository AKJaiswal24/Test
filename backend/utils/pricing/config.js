/**
 * Rental Pricing Configuration
 *
 * This configuration defines the multipliers and rules for calculating
 * rental prices at different durations based on a monthly base rent.
 *
 * Business Logic:
 * - Daily rate: Monthly rent divided by 26 working days (assuming 4-day weeks)
 * - Weekly rate: Daily rate × 6 days (bulk discount applied)
 * - Monthly rate: Base monthly rent (no discount)
 * - 3-month rate: Monthly × 2.8 (≈ 6.7% discount)
 * - 6-month rate: Monthly × 5.5 (≈ 8.3% discount)
 * - 12-month rate: Monthly × 11 (≈ 8.3% discount)
 *
 * The multipliers are set to provide incremental discounts for longer
 * rental periods, encouraging longer commitments while maintaining
 * profitability.
 */

const PRICING_CONFIG = {
  // Duration constants - used as keys in API and UI
  DURATIONS: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    THREE_MONTHS: '3_months',
    SIX_MONTHS: '6_months',
    TWELVE_MONTHS: '12_months',
  },

  // Display labels for UI
  DURATION_LABELS: {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    '3_months': '3 Months',
    '6_months': '6 Months',
    '12_months': '12 Months',
  },

  /**
   * Multiplier factors for each duration.
   * Formula: totalPrice = monthlyRent × multiplier
   *
   * Examples with monthlyRent = ₹10,000:
   * - daily: 10,000 / 26 = 384.61 ≈ ₹385
   * - weekly: 10,000 / 26 × 6 = 2,307.69 ≈ ₹2,310
   * - monthly: 10,000 × 1.0 = ₹10,000
   * - 3_months: 10,000 × 2.8 = ₹28,000 (effective monthly: ₹9,333)
   * - 6_months: 10,000 × 5.5 = ₹55,000 (effective monthly: ₹9,166)
   * - 12_months: 10,000 × 11 = ₹110,000 (effective monthly: ₹9,166)
   */
  MULTIPLIERS: {
    daily: 1 / 26, // ≈ 0.03846
    weekly: 6 / 26, // ≈ 0.23077
    monthly: 1.0,
    '3_months': 2.8, // ≈ 6.7% discount vs 3× monthly
    '6_months': 5.5, // ≈ 8.3% discount vs 6× monthly
    '12_months': 11.0, // ≈ 8.3% discount vs 12× monthly
  },

  /**
   * Minimum monthly rent allowed (in ₹)
   * Prevents nonsensical pricing below cost
   */
  MIN_MONTHLY_RENT: 1000,

  /**
   * Maximum monthly rent allowed (in ₹)
   * Prevents overflow and maintains reasonable bounds
   */
  MAX_MONTHLY_RENT: 10000000, // 1 Crore

  /**
   * Currency symbol for display
   */
  CURRENCY_SYMBOL: '₹',

  /**
   * Number of decimal places to round to (0 = nearest rupee)
   */
  PRECISION: 0,
};

/**
 * Validation errors enum
 */
const VALIDATION_ERRORS = {
  INVALID_MONTHLY_RENT: 'Monthly rent must be a positive number',
  MONTHLY_RENT_OUT_OF_RANGE: `Monthly rent must be between ₹${PRICING_CONFIG.MIN_MONTHLY_RENT.toLocaleString('en-IN')} and ₹${(PRICING_CONFIG.MAX_MONTHLY_RENT / 100000).toFixed(0)}L`,
  INVALID_DURATION: 'Invalid duration specified',
  INVALID_INPUT_TYPE: 'Invalid input type',
};

module.exports = {
  PRICING_CONFIG,
  VALIDATION_ERRORS,
  DURATIONS: PRICING_CONFIG.DURATIONS,
  DURATION_LABELS: PRICING_CONFIG.DURATION_LABELS,
};