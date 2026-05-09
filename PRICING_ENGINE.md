# Rental Pricing Engine

A flexible, configuration-driven pricing calculator for rental marketplace applications. This engine calculates rental prices for various durations based on a monthly base rent, with support for dynamic configuration and validation.

## Features

- ✅ **Multi-duration support**: Daily, Weekly, Monthly, 3/6/12 month rentals
- ✅ **Configurable multipliers**: Easily adjust pricing formulas
- ✅ **Input validation**: Comprehensive bounds checking
- ✅ **Savings calculation**: Shows discount percentages
- ✅ **Currency formatting**: INR with thousand separators
- ✅ **Type-safe**: JSDoc annotations for IDE support
- ✅ **Extensible**: Easy to add new duration tiers
- ✅ **Production-ready**: 41 unit tests with 100% pass rate
- ✅ **Full documentation**: API examples and React hooks

## Quick Start

### Backend (Node.js)

```javascript
const pricing = require('./utils/pricing');

// Calculate price for 3-month rental with ₹10,000 monthly base
const result = pricing.calculatePricing(10000, '3_months');
console.log(result);
// {
//   duration: '3_months',
//   totalPrice: 28000,
//   effectiveMonthlyPrice: 9333,
//   savingsPercentage: 6.7,
//   formattedTotal: '₹28,000',
//   formattedEffectiveMonthly: '₹9,333'
// }
```

### Frontend (React)

```jsx
import { usePricing } from './hooks/usePricing';

function ProductPage({ monthlyRent }) {
  const { selectedDuration, setSelectedDuration, currentPrice, durationOptions } = usePricing(monthlyRent);

  return (
    <div>
      <select value={selectedDuration} onChange={e => setSelectedDuration(e.target.value)}>
        {durationOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <h2>{currentPrice.formattedTotal}</h2>
      <p>Save {currentPrice.savingsPercentage}% vs monthly</p>
    </div>
  );
}
```

## Pricing Formulas

| Duration   | Formula                    | Multiplier | Example (₹10,000/mo) |
|------------|----------------------------|------------|---------------------|
| Daily      | Monthly ÷ 26               | 0.03846    | ₹385                |
| Weekly     | (Monthly ÷ 26) × 6         | 0.23077    | ₹2,308              |
| Monthly    | Base rent                  | 1.0        | ₹10,000             |
| 3 Months   | Monthly × 2.8              | 2.8        | ₹28,000 (₹9,333/mo) |
| 6 Months   | Monthly × 5.5              | 5.5        | ₹55,000 (₹9,167/mo) |
| 12 Months  | Monthly × 11               | 11.0       | ₹1,10,000 (₹9,167/mo) |

**Note:** Daily rate assumes 26 working days per month (≈ 6.5 days/week). Weekly rate is 6× daily.

## Configuration

### Modifying Multipliers

```javascript
const pricing = require('./utils/pricing');

// Update 3-month multiplier to 2.6 (bigger discount)
pricing.updatePricingConfig('3_months', 2.6, '3 Months');

// Verify change
const result = pricing.calculatePricing(10000, '3_months');
console.log(result.totalPrice); // 26000 (was 28000)
```

### Adding New Duration Tier

1. Edit `backend/utils/pricing/config.js`:
```javascript
MULTIPLIERS: {
  // ... existing
  '3_months': 2.8,
  '6_months': 5.5,
  '24_months': 20.0, // NEW: 24-month rental
},
DURATION_LABELS: {
  // ... existing
  '24_months': '24 Months', // NEW label
}
```

2. Update `calculatePricing()` switch statement in `calculator.js` to handle the new duration's effective monthly calculation:
```javascript
case '24_months':
  effectiveMonthlyPrice = roundValue(totalPrice / 24);
  savingsPercentage = calculateSavingsPercentage(rent, effectiveMonthlyPrice);
  break;
```

## API Reference (Backend)

### `calculatePricing(monthlyRent, duration)`

Main calculator function.

**Parameters:**
- `monthlyRent` (number|string) - Base monthly rent in INR
- `duration` (string) - Duration key from DURATIONS constant

**Returns:** PricingResult object
- `duration` - Duration key
- `totalPrice` - Total rental price (rounded)
- `effectiveMonthlyPrice` - Per-month equivalent (for multi-month periods)
- `savingsPercentage` - Discount % compared to monthly rate
- `formattedTotal` - String with ₹ symbol and commas
- `formattedEffectiveMonthly` - Formatted effective monthly
- `multiplier` - The multiplier used
- `baseMonthlyRent` - Input monthly rent

**Throws:** Error if validation fails

### `getAllPricingOptions(monthlyRent)`

Returns pricing for all 6 durations.

**Parameters:**
- `monthlyRent` (number|string) - Base monthly rent

**Returns:** Array of PricingResult objects (one per duration)

### `getDurationOptions()`

Returns dropdown-ready options.

**Returns:** Array of `{ value: string, label: string }`

### `validateMonthlyRent(monthlyRent)`

Validates monthly rent amount.

**Returns:** `{ isValid: boolean, error: string|null }`

### `updatePricingConfig(duration, newMultiplier, [newLabel])`

Dynamically update multipliers for seasonal pricing.

**Parameters:**
- `duration` - Duration key to update
- `newMultiplier` - New multiplier value (>0)
- `newLabel` - Optional new display label

## React Hooks

### `usePricing(monthlyRent)`

Custom React hook for client-side pricing calculations.

**Returns:**
- `selectedDuration` - Currently selected duration
- `setSelectedDuration` - Setter function
- `currentPrice` - PricingResult for current selection
- `allOptions` - Array of all pricing options
- `durationOptions` - Dropdown options array
- `bestValue` - Option with lowest effective monthly
- `validation` - Validation result object
- `getPriceForDuration(duration)` - Get price for specific duration
- `recalculate()` - Force recalculate

### `useProductPricing(productId, autoCalculate)`

Hook for fetching product pricing from backend API.

**Parameters:**
- `productId` - MongoDB product ID
- `autoCalculate` - Auto-calculate on mount (default: true)

**Returns:**
- `pricingData` - API response with pricing
- `isLoading` - Loading state
- `error` - Error message if any
- `calculateForDuration(duration)` - Manually trigger calculation

## API Endpoints (Backend)

### GET `/api/products/:id/pricing`

Get all pricing options for a product.

**Response:**
```json
{
  "productId": "abc123",
  "productName": "DSLR Camera",
  "baseMonthlyRent": 10000,
  "pricingOptions": [
    {
      "duration": "daily",
      "totalPrice": 385,
      "effectiveMonthlyPrice": 10000,
      "savingsPercentage": 0,
      "formattedTotal": "₹385"
    },
    ...
  ]
}
```

### POST `/api/products/:id/calculate`

Calculate price for specific duration.

**Request:**
```json
{ "duration": "3_months" }
```

**Response:** PricingResult object

### GET `/api/pricing/options`

Get all available duration options with multipliers.

**Response:**
```json
{
  "options": [
    { "value": "daily", "label": "Daily", "multiplier": 0.03846 },
    ...
  ],
  "currency": "₹"
}
```

### POST `/api/pricing/validate`

Validate a monthly rent amount.

**Request:**
```json
{ "monthlyRent": 10000 }
```

**Response:**
```json
{
  "isValid": true,
  "monthlyRent": 10000,
  "formatted": "₹10,000"
}
```

## Integration Examples

### Backend Integration (in Product Routes)

```javascript
const pricing = require('../utils/pricing');

// When creating/updating a product, validate pricing
router.post('/add', async (req, res) => {
  const { monthlyRent } = req.body;

  // Validate
  const validation = pricing.validateMonthlyRent(monthlyRent);
  if (!validation.isValid) {
    return res.status(400).json({ message: validation.error });
  }

  // Calculate all prices for storage
  const prices = pricing.getAllPricingOptions(monthlyRent);

  // Store total prices array in product
  const product = new Product({
    ...req.body,
    pricingDetails: prices
  });

  await product.save();
  res.json(product);
});
```

### Frontend Integration (in Product Form)

```jsx
import { useState } from 'react';
import { usePricing } from './hooks/usePricing';
import ProductPricingCard from './components/ProductPricingCard';

function AddProductForm() {
  const [monthlyRent, setMonthlyRent] = useState(10000);

  return (
    <div>
      <label>Monthly Rent (₹)</label>
      <input
        type="number"
        value={monthlyRent}
        onChange={e => setMonthlyRent(e.target.value)}
      />

      <ProductPricingCard
        monthlyRent={monthlyRent}
        onDurationChange={(duration, price) => {
          console.log(`Selected ${duration}: ${price.formattedTotal}`);
        }}
      />
    </div>
  );
}
```

## Testing

### Run all unit tests:

```bash
cd backend
npm test
```

Expected output:
```
Test Suites: 1 passed, 1 total
Tests:       41 passed, 41 total
```

### Test Coverage includes:
- ✅ Input validation (rent, duration)
- ✅ All 6 duration calculations
- ✅ Rounding behavior
- ✅ Savings percentage
- ✅ Currency formatting
- ✅ Edge cases (min/max values, NaN handling)
- ✅ Dynamic config updates
- ✅ Error handling

## Architecture Benefits

1. **Single Source of Truth**: Same calculation logic on backend and frontend
2. **Configuration-Driven**: Change multipliers without touching core logic
3. **Extensible**: Add new durations in one place
4. **Validated**: All inputs checked before calculation
5. **Tested**: Comprehensive test suite ensures correctness
6. **Production-Ready**: Handles edge cases and large numbers
7. **User-Friendly**: Clear formatted output with currency

## Future Extensions

### Seasonal Pricing
```javascript
// In config.js
SEASONAL_MULTIPLIERS: {
  summer: 1.2,  // 20% increase
  winter: 0.9,  // 10% discount
}

// In calculator.js
function applySeasonalMultiplier(basePrice, season) {
  const seasonal = PRICING_CONFIG.SEASONAL_MULTIPLIERS[season];
  return basePrice * seasonal;
}
```

### User-Based Tiered Pricing
```javascript
// Add user loyalty tiers
TIER_MULTIPLIERS: {
  bronze: 1.0,
  silver: 0.95,  // 5% discount
  gold: 0.90,    // 10% discount
  platinum: 0.85 // 15% discount
}
```

### Geographic Pricing
```javascript
// Different multipliers by city tier
CITY_MULTIPLIERS: {
  metro: 1.1,
  tier2: 1.0,
  tier3: 0.9
}
```

## File Structure

```
backend/
└── utils/
    └── pricing/
        ├── config.js           # Multipliers & constants
        ├── calculator.js       # Main calculation logic
        ├── index.js            # Public exports
        └── __tests__/
            └── calculator.test.js  # Unit tests

frontend/
├── utils/
│   └── pricing.js            # Client-side calculator
├── hooks/
│   └── usePricing.js         # React hook
└── components/
    └── ProductPricingCard.js # Demo component

backend/routes/
├── pricingRoutes.js          # API examples
└── productRoutes.js          # Integration
```

## Performance Notes

- All calculations are O(1) - constant time
- No external dependencies in calculator
- Can be safely called on every render in React
- Client-side calculations avoid API calls for simple queries

## Contributing

When adding new duration tiers:
1. Update `config.js` MULTIPLIERS and DURATION_LABELS
2. Add case in `calculator.js` switch statement
3. Update tests in `__tests__/calculator.test.js`
4. Update this README with new examples

---

**Version:** 1.0.0
**Last Updated:** 2026-05-07
**Status:** Production Ready ✅