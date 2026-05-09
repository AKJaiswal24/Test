/**
 * Unit Tests for Rental Pricing Engine
 *
 * Tests cover:
 * - Input validation
 * - Pricing calculations for all durations
 * - Rounding behavior
 * - Savings percentage calculation
 * - Edge cases and error handling
 */

const {
  calculatePricing,
  getAllPricingOptions,
  getDurationOptions,
  validateMonthlyRent,
  validateDuration,
  updatePricingConfig,
  PRICING_CONFIG,
  VALIDATION_ERRORS,
} = require('../index');

describe('Rental Pricing Engine', () => {
  const BASE_MONTHLY_RENT = 10000;

  describe('validateMonthlyRent', () => {
    test('should accept valid positive monthly rent', () => {
      const result = validateMonthlyRent(10000);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('should accept monthly rent as string number', () => {
      const result = validateMonthlyRent('10000');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('should reject zero monthly rent', () => {
      const result = validateMonthlyRent(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_MONTHLY_RENT);
    });

    test('should reject negative monthly rent', () => {
      const result = validateMonthlyRent(-1000);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_MONTHLY_RENT);
    });

    test('should reject NaN', () => {
      const result = validateMonthlyRent(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_INPUT_TYPE);
    });

    test('should reject non-numeric strings', () => {
      const result = validateMonthlyRent('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_INPUT_TYPE);
    });

    test('should reject rent below minimum', () => {
      const result = validateMonthlyRent(500);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.MONTHLY_RENT_OUT_OF_RANGE);
    });

    test('should reject rent above maximum', () => {
      const result = validateMonthlyRent(20000000);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.MONTHLY_RENT_OUT_OF_RANGE);
    });
  });

  describe('validateDuration', () => {
    test('should accept valid durations', () => {
      const validDurations = Object.values(PRICING_CONFIG.DURATIONS);
      validDurations.forEach((duration) => {
        const result = validateDuration(duration);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });
    });

    test('should reject invalid duration string', () => {
      const result = validateDuration('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_DURATION);
    });

    test('should reject null duration', () => {
      const result = validateDuration(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_DURATION);
    });

    test('should reject undefined duration', () => {
      const result = validateDuration(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_DURATION);
    });
  });

  describe('calculatePricing - Daily', () => {
    test('should calculate daily price correctly', () => {
      const result = calculatePricing(BASE_MONTHLY_RENT, PRICING_CONFIG.DURATIONS.DAILY);

      // Daily = 10000 / 26 = 384.615... ≈ 385
      expect(result.totalPrice).toBe(385);
      expect(result.effectiveMonthlyPrice).toBe(BASE_MONTHLY_RENT);
      expect(result.savingsPercentage).toBe(0);
      expect(result.formattedTotal).toBe('₹385');
      expect(result.duration).toBe('daily');
    });

    test('should handle different monthly rent for daily', () => {
      const result = calculatePricing(20000, PRICING_CONFIG.DURATIONS.DAILY);
      expect(result.totalPrice).toBe(769); // 20000 / 26 = 769.23
    });
  });

  describe('calculatePricing - Weekly', () => {
    test('should calculate weekly price correctly', () => {
      const result = calculatePricing(BASE_MONTHLY_RENT, PRICING_CONFIG.DURATIONS.WEEKLY);

      // Weekly = (10000 / 26) × 6 = 2,307.69 ≈ 2308
      expect(result.totalPrice).toBe(2308);
      expect(result.effectiveMonthlyPrice).toBe(BASE_MONTHLY_RENT);
      expect(result.savingsPercentage).toBe(0);
      expect(result.formattedTotal).toBe('₹2,308');
      expect(result.duration).toBe('weekly');
    });

    test('should handle different monthly rent for weekly', () => {
      const result = calculatePricing(15000, PRICING_CONFIG.DURATIONS.WEEKLY);
      expect(result.totalPrice).toBe(3462); // (15000/26)*6 = 3461.54
    });
  });

  describe('calculatePricing - Monthly', () => {
    test('should return base monthly rent', () => {
      const result = calculatePricing(BASE_MONTHLY_RENT, PRICING_CONFIG.DURATIONS.MONTHLY);

      expect(result.totalPrice).toBe(BASE_MONTHLY_RENT);
      expect(result.effectiveMonthlyPrice).toBe(BASE_MONTHLY_RENT);
      expect(result.savingsPercentage).toBe(0);
      expect(result.formattedTotal).toBe('₹10,000');
      expect(result.duration).toBe('monthly');
    });
  });

  describe('calculatePricing - 3 Months', () => {
    test('should calculate 3-month price with discount', () => {
      const result = calculatePricing(BASE_MONTHLY_RENT, PRICING_CONFIG.DURATIONS.THREE_MONTHS);

      // 10000 × 2.8 = 28000
      expect(result.totalPrice).toBe(28000);
      // Effective monthly = 28000 / 3 = 9333.33 ≈ 9333
      expect(result.effectiveMonthlyPrice).toBe(9333);
      // Savings = ((10000 - 9333) / 10000) × 100 = 6.67%
      expect(result.savingsPercentage).toBeCloseTo(6.7, 1);
      expect(result.formattedTotal).toBe('₹28,000');
      expect(result.formattedEffectiveMonthly).toBe('₹9,333');
      expect(result.duration).toBe('3_months');
    });

    test('should handle different monthly rent for 3 months', () => {
      const result = calculatePricing(20000, PRICING_CONFIG.DURATIONS.THREE_MONTHS);
      expect(result.totalPrice).toBe(56000); // 20000 × 2.8
      expect(result.effectiveMonthlyPrice).toBe(18667); // 56000 / 3 = 18666.67
    });
  });

  describe('calculatePricing - 6 Months', () => {
    test('should calculate 6-month price with discount', () => {
      const result = calculatePricing(BASE_MONTHLY_RENT, PRICING_CONFIG.DURATIONS.SIX_MONTHS);

      // 10000 × 5.5 = 55000
      expect(result.totalPrice).toBe(55000);
      // Effective monthly = 55000 / 6 = 9166.67 ≈ 9167 (or 9166 depending on rounding)
      expect(result.effectiveMonthlyPrice).toBe(9167); // Rounded from 9166.67
      // Savings = ((10000 - 9167) / 10000) × 100 ≈ 8.33%
      expect(result.savingsPercentage).toBeCloseTo(8.3, 1);
      expect(result.formattedTotal).toBe('₹55,000');
      expect(result.duration).toBe('6_months');
    });
  });

  describe('calculatePricing - 12 Months', () => {
    test('should calculate 12-month price with discount', () => {
      const result = calculatePricing(BASE_MONTHLY_RENT, PRICING_CONFIG.DURATIONS.TWELVE_MONTHS);

      // 10000 × 11 = 110000
      expect(result.totalPrice).toBe(110000);
      // Effective monthly = 110000 / 12 = 9166.67 ≈ 9167
      expect(result.effectiveMonthlyPrice).toBe(9167);
      // Savings = ((10000 - 9167) / 10000) × 100 ≈ 8.33%
      expect(result.savingsPercentage).toBeCloseTo(8.3, 1);
      expect(result.formattedTotal).toBe('₹1,10,000');
      expect(result.duration).toBe('12_months');
    });
  });

  describe('calculatePricing - Comprehensive Example', () => {
    test('should match expected output for ₹10,000 monthly rent', () => {
      const results = getAllPricingOptions(10000);

      // Daily
      expect(results.find(r => r.duration === 'daily').totalPrice).toBe(385);

      // Weekly
      expect(results.find(r => r.duration === 'weekly').totalPrice).toBe(2308);

      // Monthly
      const monthly = results.find(r => r.duration === 'monthly');
      expect(monthly.totalPrice).toBe(10000);
      expect(monthly.savingsPercentage).toBe(0);

      // 3 Months
      const threeMonths = results.find(r => r.duration === '3_months');
      expect(threeMonths.totalPrice).toBe(28000);
      expect(threeMonths.effectiveMonthlyPrice).toBe(9333);
      expect(threeMonths.savingsPercentage).toBeCloseTo(6.7, 1);

      // 6 Months
      const sixMonths = results.find(r => r.duration === '6_months');
      expect(sixMonths.totalPrice).toBe(55000);
      expect(sixMonths.effectiveMonthlyPrice).toBe(9167);
      expect(sixMonths.savingsPercentage).toBeCloseTo(8.3, 1);

      // 12 Months
      const twelveMonths = results.find(r => r.duration === '12_months');
      expect(twelveMonths.totalPrice).toBe(110000);
      expect(twelveMonths.effectiveMonthlyPrice).toBe(9167);
      expect(twelveMonths.savingsPercentage).toBeCloseTo(8.3, 1);
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid monthly rent', () => {
      expect(() => calculatePricing(0, 'monthly')).toThrow(
        VALIDATION_ERRORS.INVALID_MONTHLY_RENT
      );
      expect(() => calculatePricing(-1000, 'monthly')).toThrow(
        VALIDATION_ERRORS.INVALID_MONTHLY_RENT
      );
    });

    test('should throw error for invalid duration', () => {
      expect(() => calculatePricing(10000, 'invalid')).toThrow(
        VALIDATION_ERRORS.INVALID_DURATION
      );
      expect(() => calculatePricing(10000, null)).toThrow(
        VALIDATION_ERRORS.INVALID_DURATION
      );
      expect(() => calculatePricing(10000, undefined)).toThrow(
        VALIDATION_ERRORS.INVALID_DURATION
      );
    });

    test('should throw error for rent below minimum', () => {
      expect(() => calculatePricing(500, 'monthly')).toThrow(
        VALIDATION_ERRORS.MONTHLY_RENT_OUT_OF_RANGE
      );
    });

    test('should throw error for rent above maximum', () => {
      expect(() => calculatePricing(20000000, 'monthly')).toThrow(
        VALIDATION_ERRORS.MONTHLY_RENT_OUT_OF_RANGE
      );
    });
  });

  describe('getAllPricingOptions', () => {
    test('should return all 6 duration options', () => {
      const options = getAllPricingOptions(10000);
      expect(options).toHaveLength(6);
      expect(options.map(o => o.duration)).toEqual([
        'daily',
        'weekly',
        'monthly',
        '3_months',
        '6_months',
        '12_months',
      ]);
    });

    test('should include all required fields in each option', () => {
      const options = getAllPricingOptions(10000);
      options.forEach(option => {
        expect(option).toHaveProperty('duration');
        expect(option).toHaveProperty('totalPrice');
        expect(option).toHaveProperty('effectiveMonthlyPrice');
        expect(option).toHaveProperty('savingsPercentage');
        expect(option).toHaveProperty('currency');
        expect(option).toHaveProperty('formattedTotal');
        expect(option).toHaveProperty('formattedEffectiveMonthly');
      });
    });
  });

  describe('getDurationOptions', () => {
    test('should return array of {value, label} objects', () => {
      const options = getDurationOptions();
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(6);

      options.forEach(opt => {
        expect(opt).toHaveProperty('value');
        expect(opt).toHaveProperty('label');
        expect(typeof opt.value).toBe('string');
        expect(typeof opt.label).toBe('string');
      });
    });

    test('should include all expected durations', () => {
      const options = getDurationOptions();
      const values = options.map(o => o.value);
      expect(values).toContain('daily');
      expect(values).toContain('weekly');
      expect(values).toContain('monthly');
      expect(values).toContain('3_months');
      expect(values).toContain('6_months');
      expect(values).toContain('12_months');
    });
  });

  describe('updatePricingConfig', () => {
    test('should update multiplier for valid duration', () => {
      const originalMultiplier = PRICING_CONFIG.MULTIPLIERS['3_months'];
      const newMultiplier = 2.5;

      updatePricingConfig('3_months', newMultiplier);

      expect(PRICING_CONFIG.MULTIPLIERS['3_months']).toBe(newMultiplier);

      // Restore original
      updatePricingConfig('3_months', originalMultiplier);
    });

    test('should update label if provided', () => {
      const originalLabel = PRICING_CONFIG.DURATION_LABELS['3_months'];
      const newLabel = 'Quarterly';

      updatePricingConfig('3_months', 2.8, newLabel);

      expect(PRICING_CONFIG.DURATION_LABELS['3_months']).toBe(newLabel);

      // Restore original
      updatePricingConfig('3_months', 2.8, originalLabel);
    });

    test('should throw error for invalid duration', () => {
      expect(() => updatePricingConfig('invalid', 2.5)).toThrow(
        "Cannot update: invalid duration 'invalid'"
      );
    });

    test('should throw error for non-positive multiplier', () => {
      expect(() => updatePricingConfig('monthly', 0)).toThrow(
        'Multiplier must be a positive number'
      );
      expect(() => updatePricingConfig('monthly', -1)).toThrow(
        'Multiplier must be a positive number'
      );
    });
  });

  describe('Rounding Behavior', () => {
    test('should round to nearest rupee (precision 0)', () => {
      // Daily rate: 10000 / 26 = 384.615...
      const result = calculatePricing(10000, 'daily');
      expect(result.totalPrice).toBe(385);
    });

    test('should maintain integer values', () => {
      const result = calculatePricing(10000, 'monthly');
      expect(Number.isInteger(result.totalPrice)).toBe(true);
      expect(Number.isInteger(result.effectiveMonthlyPrice)).toBe(true);
    });
  });

  describe('Currency Formatting', () => {
    test('should format with INR symbol', () => {
      const result = calculatePricing(10000, 'monthly');
      expect(result.currency).toBe('₹');
      expect(result.formattedTotal).toContain('₹');
    });

    test('should include thousand separators', () => {
      const result = calculatePricing(10000, '12_months');
      expect(result.formattedTotal).toBe('₹1,10,000'); // Indian numbering format
    });
  });

  describe('Edge Cases', () => {
    test('should handle very small valid rent', () => {
      const result = calculatePricing(1000, 'monthly');
      expect(result.totalPrice).toBe(1000);
    });

    test('should handle large rent amounts', () => {
      const result = calculatePricing(1000000, '12_months');
      expect(result.totalPrice).toBe(11000000);
      expect(result.formattedTotal).toBe('₹1,10,00,000');
    });

    test('should handle fractional monthly rent input (string)', () => {
      const result = calculatePricing('10000.50', 'monthly');
      expect(result.totalPrice).toBe(10001); // Rounded from 10000.5
    });
  });
});