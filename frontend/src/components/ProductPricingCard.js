import React, { useState, useEffect } from "react";
import { usePricing } from "../hooks/usePricing";
import { getDurationOptions } from "../utils/pricing";
import "../styles/PricingCard.css";

/**
 * ProductPricingCard Component
 *
 * Displays dynamic pricing for a product rental with duration selector.
 *
 * @param {Object} props
 * @param {number} props.monthlyRent - The base monthly rent amount
 * @param {string} [props.productName] - Optional product name
 * @param {Function} [props.onDurationChange] - Callback when duration changes
 *
 * @example
 * <ProductPricingCard monthlyRent={10000} productName="DSLR Camera" />
 */
function ProductPricingCard({ monthlyRent, productName, onDurationChange }) {
  const [rent, setRent] = useState(monthlyRent);

  useEffect(() => {
    setRent(monthlyRent);
  }, [monthlyRent]);

  const {
    selectedDuration,
    setSelectedDuration,
    currentPrice,
    allOptions,
    durationOptions,
    validation,
    bestValue,
  } = usePricing(rent);

  // Notify parent of duration change
  useEffect(() => {
    if (onDurationChange) {
      onDurationChange(selectedDuration, currentPrice);
    }
  }, [selectedDuration, currentPrice, onDurationChange]);

  const handleDurationChange = (e) => {
    setSelectedDuration(e.target.value);
  };

  const handleRentChange = (e) => {
    const value = Number(e.target.value);
    setRent(value);
  };

  return (
    <div className="pricing-card">
      {/* Header */}
      <div className="pricing-header">
        <h3>Rental Pricing</h3>
        {productName && <p className="product-name">{productName}</p>}
      </div>

      {/* Monthly Rent Input (for demo/adjustment) */}
      <div className="rent-adjuster">
        <label htmlFor="monthlyRent">Base Monthly Rent (₹)</label>
        <input
          type="number"
          id="monthlyRent"
          value={rent}
          onChange={handleRentChange}
          min="1000"
          step="100"
          className={validation.isValid ? "" : "invalid"}
        />
        {!validation.isValid && validation.error && (
          <span className="error-text">{validation.error}</span>
        )}
      </div>

      {/* Duration Selector */}
      <div className="duration-selector">
        <label htmlFor="duration">Select Duration</label>
        <select
          id="duration"
          value={selectedDuration}
          onChange={handleDurationChange}
          className="duration-dropdown"
        >
          {durationOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Price Display */}
      {currentPrice && (
        <div className="price-display">
          <div className="total-price-section">
            <span className="label">Total Price</span>
            <span className="total-price">{currentPrice.formattedTotal}</span>
          </div>

          {currentPrice.savingsPercentage > 0 && (
            <div className="savings-badge">
              Save {currentPrice.savingsPercentage}% vs monthly
            </div>
          )}

          {/* Effective Monthly (for multi-month periods) */}
          {(selectedDuration === "3_months" ||
            selectedDuration === "6_months" ||
            selectedDuration === "12_months") && (
            <div className="effective-monthly">
              <span className="label">Effective per month</span>
              <span className="price">{currentPrice.formattedEffectiveMonthly}</span>
            </div>
          )}
        </div>
      )}

      {/* Best Value Recommendation */}
      {bestValue && bestValue.duration !== selectedDuration && (
        <div className="best-value-tip">
          <span className="tip-icon">💡</span>
          <span>
            Best value: {getDurationOptions().find(
              (o) => o.value === bestValue.duration
            )?.label} at {bestValue.formattedEffectiveMonthly}/month
          </span>
        </div>
      )}

      {/* All Options Overview (collapsible) */}
      <details className="options-overview">
        <summary>View all pricing options</summary>
        <div className="options-list">
          {allOptions.map((opt) => (
            <div
              key={opt.duration}
              className={`option-item ${opt.duration === selectedDuration ? "selected" : ""} ${opt.error ? "error" : ""}`}
              onClick={() => !opt.error && setSelectedDuration(opt.duration)}
            >
              <span className="opt-duration">
                {getDurationOptions().find((o) => o.value === opt.duration)?.label}
              </span>
              <span className="opt-price">{opt.formattedTotal}</span>
              {opt.savingsPercentage > 0 && (
                <span className="opt-savings">-{opt.savingsPercentage}%</span>
              )}
            </div>
          ))}
        </div>
      </details>

      {/* Validation Warning */}
      {!validation.isValid && (
        <div className="validation-warning">
         Please enter a valid monthly rent amount.
        </div>
      )}
    </div>
  );
}

export default ProductPricingCard;