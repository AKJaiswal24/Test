import { useState, useEffect, useCallback } from "react";
import {
  getAllPricingOptions,
  getDurationOptions,
  validateMonthlyRent,
  fetchProductPricing,
  calculatePriceViaAPI,
} from "../utils/pricing";

/**
 * Custom hook for managing product pricing calculations
 *
 * @param {number} monthlyRent - The base monthly rent amount
 * @returns {Object} - Pricing state and helpers
 *
 * @example
 * const { pricing, selectedPrice, setDuration, options, errors } = usePricing(10000);
 *
 * // Get price for specific duration
 * const price = selectedPrice('3_months'); // { totalPrice: 28000, ... }
 */
export function usePricing(monthlyRent) {
  const [selectedDuration, setSelectedDuration] = useState("monthly");
  const [currentPrice, setCurrentPrice] = useState(null);
  const [allOptions, setAllOptions] = useState([]);
  const [error, setError] = useState(null);

  // Calculate all options when monthly rent changes
  useEffect(() => {
    if (monthlyRent && monthlyRent > 0) {
      try {
        const options = getAllPricingOptions(monthlyRent);
        setAllOptions(options);
        setError(null);
      } catch (err) {
        setError(err.message);
        setAllOptions([]);
      }
    } else {
      setAllOptions([]);
    }
  }, [monthlyRent]);

  // Update current price when duration changes
  useEffect(() => {
    if (allOptions.length > 0) {
      const priceData = allOptions.find((opt) => opt.duration === selectedDuration);
      if (priceData && !priceData.error) {
        setCurrentPrice(priceData);
      }
    }
  }, [selectedDuration, allOptions]);

  // Get price for specific duration
  const getPriceForDuration = useCallback(
    (duration) => {
      return allOptions.find((opt) => opt.duration === duration);
    },
    [allOptions]
  );

  // Get best value (lowest effective monthly)
  const getBestValue = useCallback(() => {
    if (allOptions.length === 0) return null;
    // Filter out daily/weekly (no effective monthly) and find lowest
    const withEffective = allOptions.filter(
      (opt) => opt.effectiveMonthlyPrice && opt.savingsPercentage > 0
    );
    if (withEffective.length === 0) return null;
    return withEffective.reduce((best, current) =>
      current.effectiveMonthlyPrice < best.effectiveMonthlyPrice ? current : best
    );
  }, [allOptions]);

  // Get duration options for UI
  const durationOptions = getDurationOptions();

  // Validate rent amount
  const validation = validateMonthlyRent(monthlyRent);

  return {
    // State
    selectedDuration,
    setSelectedDuration,
    currentPrice,
    allOptions,
    error,

    // Computed
    durationOptions,
    validation,
    bestValue: getBestValue(),

    // Actions
    getPriceForDuration,
    recalculate: () => {
      if (monthlyRent) {
        const options = getAllPricingOptions(monthlyRent);
        setAllOptions(options);
      }
    },
  };
}

/**
 * Hook for fetching product pricing from backend API
 *
 * @param {string} productId - Product document ID
 * @param {boolean} autoCalculate - Whether to auto-calculate on mount
 * @returns {Object}
 */
export function useProductPricing(productId, autoCalculate = true) {
  const [pricingData, setPricingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId || !autoCalculate) return;

    const fetchPricing = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchProductPricing(productId);
        setPricingData(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch pricing");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricing();
  }, [productId, autoCalculate]);

  const calculateForDuration = useCallback(
    async (duration) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await calculatePriceViaAPI(productId, duration);
        setPricingData(result);
        return result;
      } catch (err) {
        const message = err.response?.data?.message || "Calculation failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [productId]
  );

  return {
    pricingData,
    isLoading,
    error,
    calculateForDuration,
    refetch: () => {
      if (productId) {
        fetchProductPricing(productId).then(setPricingData).catch(setError);
      }
    },
  };
}
