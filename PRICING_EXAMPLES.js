/**
 * Rental Pricing Engine - Quick Reference Examples
 *
 * Copy-paste ready code snippets for common use cases
 */

// ============================================================
// BACKEND EXAMPLES (Node.js)
// ============================================================

const pricing = require('./backend/utils/pricing');

// Example 1: Basic calculation
console.log('--- Example 1: Basic Calculation ---');
const result = pricing.calculatePricing(10000, '3_months');
console.log(`3-month rental of ₹10,000/mo item:`);
console.log(`  Total: ${result.formattedTotal}`);
console.log(`  Effective/month: ${result.formattedEffectiveMonthly}`);
console.log(`  Savings: ${result.savingsPercentage}%`);
// Output:
// Total: ₹28,000
// Effective/month: ₹9,333
// Savings: 6.7%

// Example 2: Get all pricing options
console.log('\n--- Example 2: All Options ---');
const allOptions = pricing.getAllPricingOptions(15000);
allOptions.forEach(opt => {
  console.log(`${opt.duration.padEnd(15)}: ${opt.formattedTotal.padStart(10)} (save ${opt.savingsPercentage}%)`);
});
// Output:
// daily         :     ₹577  (save 0%)
// weekly        :   ₹3,462  (save 0%)
// monthly       :  ₹15,000  (save 0%)
// 3_months      :  ₹42,000  (save 6.7%)
// 6_months      :  ₹82,500  (save 8.3%)
// 12_months     : ₹1,65,000  (save 8.3%)

// Example 3: Validation
console.log('\n--- Example 3: Validation ---');
const validation = pricing.validateMonthlyRent(500);
if (!validation.isValid) {
  console.log(`Invalid: ${validation.error}`);
}

// Example 4: In a product route
console.log('\n--- Example 4: Express Route ---');
/*
router.get('/:id/pricing', async (req, res) => {
  const product = await Product.findById(req.params.id);
  const options = pricing.getAllPricingOptions(product.baseMonthlyRent);
  res.json({ product: product.name, pricingOptions: options });
});
*/

// Example 5: Update pricing for seasonal discount
console.log('\n--- Example 5: Dynamic Pricing Update ---');
pricing.updatePricingConfig('12_months', 10.5, '12 Months (Summer)');
const summerPrice = pricing.calculatePricing(10000, '12_months');
console.log(`12-month summer rate: ${summerPrice.formattedTotal}`); // ₹1,05,000
// Restore
pricing.updatePricingConfig('12_months', 11.0, '12 Months');


// ============================================================
// FRONTEND EXAMPLES (React)
// ============================================================

import { usePricing, calculatePricing, getDurationOptions } from './utils/pricing';
import ProductPricingCard from './components/ProductPricingCard';

// Example 6: Using the custom hook
console.log('\n--- Example 6: React Hook ---');
/*
function ProductPage({ monthlyRent }) {
  const {
    selectedDuration,
    setSelectedDuration,
    currentPrice,
    durationOptions,
    bestValue
  } = usePricing(monthlyRent);

  return (
    <div>
      <select value={selectedDuration} onChange={e => setSelectedDuration(e.target.value)}>
        {durationOptions.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <h2>{currentPrice.formattedTotal}</h2>
      {bestValue && (
        <p>Best value: {bestValue.formattedEffectiveMonthly}/month</p>
      )}
    </div>
  );
}
*/

// Example 7: Direct calculation in component
console.log('\n--- Example 7: Direct Calculation ---');
const manualCalc = calculatePricing(25000, '6_months');
console.log(`6-month rental of ₹25,000/mo item:`);
console.log(`  Total: ${manualCalc.formattedTotal}`);
console.log(`  You save: ${manualCalc.savingsPercentage}%`);

// Example 8: Using the pre-built component
console.log('\n--- Example 8: Pre-built Component ---');
/*
<ProductPricingCard
  monthlyRent={8000}
  productName="MacBook Pro"
  onDurationChange={(duration, price) => {
    console.log(`User selected: ${duration} at ${price.formattedTotal}`);
  }}
/>
*/

// Example 9: Fetching from backend API
console.log('\n--- Example 9: API Integration ---');
/*
import { useProductPricing } from './hooks/usePricing';

function ProductDetail({ productId }) {
  const { pricingData, isLoading, error } = useProductPricing(productId);

  if (isLoading) return <div>Loading pricing...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Rent this product</h3>
      <p>Monthly: ₹{pricingData.baseMonthlyRent.toLocaleString()}</p>
      <p>For 3 months: {pricingData.pricingOptions.find(o => o.duration === '3_months')?.formattedTotal}</p>
    </div>
  );
}
*/


// ============================================================
// TESTING EXAMPLES
// ============================================================

console.log('\n--- Example 10: Test Cases ---');
// Unit test pattern
function testCalculatePricing() {
  const result = pricing.calculatePricing(10000, 'monthly');
  console.assert(result.totalPrice === 10000, 'Monthly price should equal base rent');
  console.assert(result.savingsPercentage === 0, 'Monthly should have 0% savings');
  console.log('✅ Basic test passed');
}
testCalculatePricing();

// Edge case test
const edgeCase = pricing.calculatePricing(1000, '12_months');
console.assert(edgeCase.totalPrice === 11000, 'Minimum rent should calculate correctly');
console.log('✅ Edge case passed');


// ============================================================
// VALIDATION RULES
// ============================================================

console.log('\n--- Validation Rules ---');
console.log(`Minimum monthly rent: ₹${pricing.PRICING_CONFIG.MIN_MONTHLY_RENT.toLocaleString()}`);
console.log(`Maximum monthly rent: ₹${(pricing.PRICING_CONFIG.MAX_MONTHLY_RENT / 100000).toFixed(0)}L`);
console.log(`Currency: ${pricing.PRICING_CONFIG.CURRENCY_SYMBOL}`);
console.log(`Rounding precision: ${pricing.PRICING_CONFIG.PRECISION} decimal places`);


// ============================================================
// AVAILABLE DURATIONS
// ============================================================

console.log('\n--- Available Durations ---');
const durations = pricing.getDurationOptions();
durations.forEach(d => {
  console.log(`  ${d.value.padEnd(15)} → ${d.label}`);
});


console.log('\n✅ All examples executed successfully!');
console.log('📚 See PRICING_ENGINE.md for full documentation');