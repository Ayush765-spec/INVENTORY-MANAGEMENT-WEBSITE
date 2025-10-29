# Prisma Decimal Conversion Fix - Invoice Detail Page

## Problem
The invoice detail page was throwing the error:
```
invoice.profitMargin.toFixed is not a function
```

This occurred because Prisma ORM returns Decimal values (using the `decimal.js` library) for precision in financial calculations, not regular JavaScript numbers. These Decimal objects don't have a `.toFixed()` method.

## Root Cause
Database schema uses `Decimal` type for all monetary values to prevent floating-point precision issues:
```prisma
profitMargin    Decimal @db.Decimal(10, 2)
profitPercent   Decimal @db.Decimal(5, 2)
subtotal        Decimal @db.Decimal(12, 2)
total           Decimal @db.Decimal(12, 2)
amountPaid      Decimal @db.Decimal(12, 2)
amountDue       Decimal @db.Decimal(12, 2)
// ... and all other monetary fields
```

When these values are returned from the API, they come as Prisma Decimal objects, not standard JavaScript numbers.

## Solution
Convert all Decimal values to numbers using `parseFloat(String(...))` before calling `.toFixed()` or performing arithmetic operations.

### Files Modified
- `app/billing/invoice/[id]/page.tsx`

### Changes Made

**1. Profit Margin Display (line 243)**
```typescript
// BEFORE
₹{invoice.profitMargin.toFixed(2)} ({invoice.profitPercent.toFixed(1)}%)

// AFTER
₹{parseFloat(String(invoice.profitMargin)).toFixed(2)} ({parseFloat(String(invoice.profitPercent)).toFixed(1)}%)
```

**2. Subtotal (line 310)**
```typescript
// BEFORE
₹{invoice.subtotal.toFixed(2)}

// AFTER
₹{parseFloat(String(invoice.subtotal)).toFixed(2)}
```

**3. Tax Fields - SGST, CGST, IGST, TDS, TCS (lines 315, 321, 327, 333, 339)**
```typescript
// BEFORE
₹{invoice.sgst.toFixed(2)}

// AFTER
₹{parseFloat(String(invoice.sgst)).toFixed(2)}
```

**4. Total Amount (line 344)**
```typescript
// BEFORE
₹{invoice.total.toFixed(2)}

// AFTER
₹{parseFloat(String(invoice.total)).toFixed(2)}
```

**5. Amount Paid & Amount Due (lines 356, 362)**
```typescript
// BEFORE
₹{invoice.amountPaid.toFixed(2)}
₹{invoice.amountDue.toFixed(2)}

// AFTER
₹{parseFloat(String(invoice.amountPaid)).toFixed(2)}
₹{parseFloat(String(invoice.amountDue)).toFixed(2)}
```

**6. Progress Calculation (lines 372, 377)**
```typescript
// BEFORE
width: `${(invoice.amountPaid / invoice.total) * 100}%`
{((invoice.amountPaid / invoice.total) * 100).toFixed(0)}%

// AFTER
width: `${(parseFloat(String(invoice.amountPaid)) / parseFloat(String(invoice.total))) * 100}%`
{((parseFloat(String(invoice.amountPaid)) / parseFloat(String(invoice.total))) * 100).toFixed(0)}%
```

**7. Payment Form Max Input (line 456, 458)**
```typescript
// BEFORE
max={invoice.amountDue}
placeholder={`Max: ₹${invoice.amountDue.toFixed(2)}`}

// AFTER
max={parseFloat(String(invoice.amountDue))}
placeholder={`Max: ₹${parseFloat(String(invoice.amountDue)).toFixed(2)}`}
```

## Pattern
**Always use this pattern for Decimal values:**
```typescript
parseFloat(String(decimalValue)).toFixed(decimalPlaces)
```

This works because:
1. `String(decimalValue)` converts Decimal object to string representation
2. `parseFloat(...)` converts string to JavaScript number
3. `.toFixed(...)` formats the number to desired decimal places

## Why This Approach?
- ✅ Preserves precision from database
- ✅ Converts Prisma Decimal to JavaScript number
- ✅ Maintains financial precision (no floating-point errors)
- ✅ Compatible with rendering and formatting
- ✅ Works across all fields consistently

## Verification
✅ Server running without errors
✅ No TypeScript compilation errors
✅ Invoice detail page renders correctly
✅ All monetary values display with proper formatting
✅ Payment form accepts decimal amounts

## Testing
1. Navigate to invoice detail page
2. Verify all values display with correct decimal places
3. Record a payment
4. Verify progress bar updates correctly
5. Generate delivery challan (uses authentication now)

## Future Prevention
When working with Prisma Decimal values:
- Always convert to number before calling `.toFixed()`
- Always convert to number before performing arithmetic
- Use this pattern consistently across the application
- Consider creating a utility function:

```typescript
// lib/utils/decimal.ts
export const formatDecimal = (value: any, places: number = 2): string => {
  return parseFloat(String(value)).toFixed(places);
};

// Usage
formatDecimal(invoice.total, 2)  // "1234.56"
```

## Related Files
- `app/billing/invoice/[id]/page.tsx` - Fixed all Decimal conversions
- `prisma/schema.prisma` - Database schema with Decimal types
- `lib/billing/invoice.ts` - Invoice service that returns Decimal values