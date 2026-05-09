/**
 * TypeScript type definitions for Rental Pricing Engine
 * These types can be used when migrating to TypeScript
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/**
 * Supported rental durations
 */
export type RentalDuration =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | '3_months'
  | '6_months'
  | '12_months';

/**
 * Complete pricing calculation result
 */
export interface PricingResult {
  /** Duration key (e.g., 'monthly', '12_months') */
  duration: RentalDuration;

  /** Total price for the entire duration (rounded to nearest rupee) */
  totalPrice: number;

  /** Effective monthly price (for multi-month periods, this shows per-month equivalent) */
  effectiveMonthlyPrice: number;

  /** Savings percentage compared to paying monthly (0-100) */
  savingsPercentage: number;

  /** Currency symbol (INR: '₹') */
  currency: string;

  /** Formatted total price with symbol and thousand separators */
  formattedTotal: string;

  /** Formatted effective monthly price */
  formattedEffectiveMonthly: string;

  /** Multiplier used in calculation (internal use) */
  multiplier: number;

  /** Original monthly rent input */
  baseMonthlyRent: number;

  /** Optional error message if calculation failed */
  error?: string;
}

/**
 * Validation result from input validation
 */
export interface ValidationResult {
  /** Whether input is valid */
  isValid: boolean;

  /** Error message if invalid, null otherwise */
  error: string | null;

  /** The validated number value (if valid) */
  value?: number;
}

/**
 * Duration option for dropdowns
 */
export interface DurationOption {
  /** Value to use in forms */
  value: RentalDuration;

  /** Human-readable label */
  label: string;

  /** Current multiplier (for transparency) */
  multiplier: number;
}

/**
 * API request for calculating specific duration
 */
export interface CalculateRequest {
  /** Duration to calculate */
  duration: RentalDuration;
}

/**
 * API response with all pricing for a product
 */
export interface ProductPricingResponse {
  productId: string;
  productName: string;
  baseMonthlyRent: number;
  pricingOptions: PricingResult[];
}

/**
 * Hook return type from usePricing
 */
export interface UsePricingReturn {
  /** Currently selected duration */
  selectedDuration: RentalDuration;

  /** Setter for selected duration */
  setSelectedDuration: (duration: RentalDuration) => void;

  /** Current price data for selected duration */
  currentPrice: PricingResult | null;

  /** All pricing options array */
  allOptions: PricingResult[];

  /** Duration dropdown options */
  durationOptions: DurationOption[];

  /** Validation result for monthly rent */
  validation: ValidationResult;

  /** Best value option (lowest effective monthly) */
  bestValue: PricingResult | null;

  /** Get price data for any duration */
  getPriceForDuration: (duration: RentalDuration) => PricingResult | undefined;

  /** Recalculate all options (force refresh) */
  recalculate: () => void;
}

/**
 * Configuration object structure
 */
export interface PricingConfig {
  DURATIONS: {
    DAILY: 'daily';
    WEEKLY: 'weekly';
    MONTHLY: 'monthly';
    THREE_MONTHS: '3_months';
    SIX_MONTHS: '6_months';
    TWELVE_MONTHS: '12_months';
  };

  DURATION_LABELS: Record<RentalDuration, string>;

  MULTIPLIERS: Record<RentalDuration, number>;

  MIN_MONTHLY_RENT: number;

  MAX_MONTHLY_RENT: number;

  CURRENCY_SYMBOL: string;

  PRECISION: number;
}

// ============================================================
// EXAMPLE USAGE IN TYPE-SAFE CODE
// ============================================================

/**
 * Example function with proper typing
 */
export function getRentalPrice(
  monthlyRent: number,
  duration: RentalDuration
): PricingResult {
  // Implementation would call pricing.calculatePricing()
  // This is just for type reference
  return {
    duration,
    totalPrice: 0,
    effectiveMonthlyPrice: 0,
    savingsPercentage: 0,
    currency: '₹',
    formattedTotal: '',
    formattedEffectiveMonthly: '',
    multiplier: 0,
    baseMonthlyRent: monthlyRent,
  };
}

/**
 * Example React component props
 */
export interface ProductPricingCardProps {
  /** Base monthly rent amount */
  monthlyRent: number;

  /** Optional product name to display */
  productName?: string;

  /** Callback when user selects a duration */
  onDurationChange?: (
    duration: RentalDuration,
    price: PricingResult
  ) => void;
}

// ============================================================
// EXPORT ALL TYPES
// ============================================================

export type {
  RentalDuration,
  PricingResult,
  ValidationResult,
  DurationOption,
  CalculateRequest,
  ProductPricingResponse,
  UsePricingReturn,
  PricingConfig,
  ProductPricingCardProps,
};