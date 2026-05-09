#!/usr/bin/env node
/**
 * Rental Pricing Engine - Interactive Demo
 *
 * Run: node demo-pricing-engine.js
 *
 * This demonstrates all features of the pricing engine with realistic examples.
 */

const pricing = require('./backend/utils/pricing');

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║          RENTAL PRICING ENGINE - INTERACTIVE DEMO                 ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

// Example products
const products = [
  { name: 'DSLR Camera (Entry-level)', monthlyRent: 10000 },
  { name: 'MacBook Pro 16"', monthlyRent: 25000 },
  { name: 'Construction Excavator', monthlyRent: 75000 },
  { name: 'Luxury Car (SUV)', monthlyRent: 150000 },
  { name: 'Studio Apartment (1BHK)', monthlyRent: 45000 },
];

// ============================================================
// DEMO 1: Product Pricing Table
// ============================================================
console.log('━'.repeat(70));
console.log('📊 DEMO 1: Complete Pricing Table for Sample Products');
console.log('━'.repeat(70));

products.forEach(product => {
  console.log(`\n📦 ${product.name}`);
  console.log(`   Base Monthly Rent: ${pricing.PRICING_CONFIG.CURRENCY_SYMBOL}${product.monthlyRent.toLocaleString('en-IN')}`);

  const options = pricing.getAllPricingOptions(product.monthlyRent);
  console.log(`   ┌─────────────────┬─────────────┬──────────────────┬──────────┐`);
  console.log(`   │ Duration        │ Total Price │ Effective/Month  │ Savings  │`);
  console.log(`   ├─────────────────┼─────────────┼──────────────────┼──────────┤`);

  options.forEach(opt => {
    const durationLabel = opt.duration.padEnd(15);
    const total = opt.formattedTotal.padStart(11);
    const effective = opt.formattedEffectiveMonthly.padStart(16);
    const savings = opt.savingsPercentage > 0
      ? `${opt.savingsPercentage}%`.padStart(7)
      : '---'.padStart(7);

    console.log(`   │ ${durationLabel}│ ${total} │ ${effective} │ ${savings} │`);
  });

  console.log(`   └─────────────────┴─────────────┴──────────────────┴──────────┘`);
});

// ============================================================
// DEMO 2: Validation Examples
// ============================================================
console.log('\n\n' + '━'.repeat(70));
console.log('🔒 DEMO 2: Input Validation');
console.log('━'.repeat(70));

const testCases = [
  { rent: 500, expected: 'FAIL - Below minimum' },
  { rent: 0, expected: 'FAIL - Zero not allowed' },
  { rent: -1000, expected: 'FAIL - Negative' },
  { rent: 1000, expected: 'PASS - Minimum valid' },
  { rent: 10000, expected: 'PASS - Standard' },
  { rent: 5000000, expected: 'PASS - High value' },
  { rent: 15000000, expected: 'FAIL - Exceeds maximum' },
];

testCases.forEach(tc => {
  const result = pricing.validateMonthlyRent(tc.rent);
  const status = result.isValid ? '✅' : '❌';
  console.log(`   ${status} ₹${tc.rent.toLocaleString()} → ${tc.expected}`);
  if (!result.isValid) {
    console.log(`      Error: ${result.error}`);
  }
});

// ============================================================
// DEMO 3: Savings Calculation
// ============================================================
console.log('\n\n' + '━'.repeat(70));
console.log('💰 DEMO 3: Savings Analysis (Monthly Rent = ₹50,000)');
console.log('━'.repeat(70));

const monthlyRent = 50000;
const options = pricing.getAllPricingOptions(monthlyRent);

console.log('\nCompare paying monthly vs longer commitments:\n');
console.log(`   Monthly base: ₹${monthlyRent.toLocaleString('en-IN')}/month`);

options
  .filter(opt => opt.savingsPercentage > 0)
  .sort((a, b) => b.savingsPercentage - a.savingsPercentage)
  .forEach(opt => {
    const savingsAmount = monthlyRent * opt.savingsPercentage / 100;
    console.log(`   ${opt.duration.padEnd(15)}: ${opt.formattedTotal} total`);
    console.log(`      → ${opt.formattedEffectiveMonthly}/month`);
    console.log(`      → Save ${opt.savingsPercentage}% (₹${Math.round(savingsAmount).toLocaleString()}/${opt.duration.includes('month') ? 'year' : 'term'})`);
  });

// ============================================================
// DEMO 4: Dynamic Configuration (Seasonal Pricing)
// ============================================================
console.log('\n\n' + '━'.repeat(70));
console.log('🔄 DEMO 4: Dynamic Pricing Update (Summer Discount)');
console.log('━'.repeat(70));

console.log('\nBefore: 12-month rate for ₹20,000/month item');
let before = pricing.calculatePricing(20000, '12_months');
console.log(`   Total: ${before.formattedTotal}`);
console.log(`   Effective: ${before.formattedEffectiveMonthly}/month`);

// Apply 15% summer discount on 12-month rentals
const originalMultiplier = pricing.PRICING_CONFIG.MULTIPLIERS['12_months'];
const summerMultiplier = 11 * 0.85; // 15% off
pricing.updatePricingConfig('12_months', summerMultiplier, '12 Months (Summer)');

console.log('\nAfter 15% summer discount:');
let after = pricing.calculatePricing(20000, '12_months');
console.log(`   Total: ${after.formattedTotal}`);
console.log(`   Effective: ${after.formattedEffectiveMonthly}/month`);
console.log(`   You save: ₹${before.totalPrice - after.totalPrice} on total`);

// Restore
pricing.updatePricingConfig('12_months', originalMultiplier, '12 Months');
console.log('\n✅ Restored original pricing');

// ============================================================
// DEMO 5: Edge Cases
// ============================================================
console.log('\n\n' + '━'.repeat(70));
console.log('⚠️  DEMO 5: Edge Cases & Error Handling');
console.log('━'.repeat(70));

console.log('\n1. Very small rent (₹1,000):');
const small = pricing.getAllPricingOptions(1000);
small.forEach(opt => {
  if (opt.duration === 'monthly' || opt.duration === '12_months') {
    console.log(`   ${opt.duration}: ${opt.formattedTotal}`);
  }
});

console.log('\n2. Very large rent (₹50 Lakh):');
const large = pricing.getAllPricingOptions(5000000);
console.log(`   12-month total: ${large.find(o => o.duration === '12_months').formattedTotal}`);

console.log('\n3. Fractional rent (₹1234.56):');
const fractional = pricing.calculatePricing(1234.56, 'monthly');
console.log(`   Rounded to: ${fractional.totalPrice}`);

console.log('\n4. String input handling:');
const stringInput = pricing.calculatePricing('9999', '3_months');
console.log(`   "9999" as string: ${stringInput.formattedTotal}`);

// ============================================================
// DEMO 6: Rounding Behavior
// ============================================================
console.log('\n\n' + '━'.repeat(70));
console.log('🔢 DEMO 6: Rounding Precision (₹10,000 monthly)');
console.log('━'.repeat(70));

console.log('\nDaily rate calculation:');
console.log(`   10000 ÷ 26 = ${(10000/26).toFixed(4)}`);
console.log(`   Rounded to nearest rupee: ₹385`);

console.log('\nWeekly rate calculation:');
console.log(`   (10000 ÷ 26) × 6 = ${((10000/26)*6).toFixed(4)}`);
console.log(`   Rounded to nearest rupee: ₹2,308`);

console.log('\n3-month effective monthly:');
console.log(`   28000 ÷ 3 = ${(28000/3).toFixed(4)}`);
console.log(`   Rounded: ₹9333`);

// ============================================================
// Summary
// ============================================================
console.log('\n\n' + '═'.repeat(70));
console.log('✅ DEMO COMPLETE');
console.log('═'.repeat(70));
console.log('\nKey Takeaways:');
console.log('  • All durations calculated from single base monthly rent');
console.log('  • Rounding to nearest rupee ensures clean pricing');
console.log('  • Longer durations show better effective monthly rates');
console.log('  • Configuration can be updated for seasonal/dynamic pricing');
console.log('  • Validation prevents invalid inputs');
console.log('  • Consistent formatting for currency display');
console.log('\n📚 For full documentation: See PRICING_ENGINE.md');
console.log('🧪 For tests: npm test (backend)');
console.log('🔧 To customize: Edit backend/utils/pricing/config.js\n');