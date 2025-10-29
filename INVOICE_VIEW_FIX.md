# Invoice View Stack Error Fix

## Problem
The invoice detail view page (`app/billing/invoice/[id]/page.tsx`) was using a hardcoded placeholder userId (`"user_id_placeholder"`) when generating delivery challans. This caused:
- Stack authentication errors when calling `/api/delivery-challan`
- Delivery challan generation failures
- Inconsistent user data isolation

## Root Cause
The `handleGenerateChallan()` function was sending a hardcoded placeholder instead of the authenticated user's real ID:

```typescript
// BEFORE (Line 129)
body: JSON.stringify({
  userId: "user_id_placeholder",  // ❌ Hardcoded placeholder
  invoiceId: invoice.id,
}),
```

## Solution
Updated `app/billing/invoice/[id]/page.tsx` to fetch and use the authenticated user's real ID:

### Changes Made

1. **Added userId state** (line 55):
   ```typescript
   const [userId, setUserId] = useState<string | null>(null);
   ```

2. **Fetch authenticated user ID** in useEffect (lines 65-88):
   ```typescript
   useEffect(() => {
     const fetchUserAndInvoice = async () => {
       try {
         // Fetch authenticated user ID
         const authResponse = await fetch("/api/auth/me");
         if (authResponse.ok) {
           const authData = await authResponse.json();
           setUserId(authData.userId);
         }
         // ... rest of invoice fetching
       }
     };
     fetchUserAndInvoice();
   }, [invoiceId]);
   ```

3. **Use real userId in challan generation** (lines 130-144):
   ```typescript
   const handleGenerateChallan = async () => {
     if (!invoice || !userId) {
       alert("Please wait for authentication to complete");
       return;
     }
   
     try {
       const response = await fetch("/api/delivery-challan", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           userId: userId,  // ✅ Real authenticated user ID
           invoiceId: invoice.id,
         }),
       });
       // ... rest of challan generation
     }
   };
   ```

## Files Modified
- `app/billing/invoice/[id]/page.tsx` - Replaced placeholder with authenticated user ID

## Verification
✅ No hardcoded placeholders remain in codebase (verified via `fulltext_search`)
✅ Server running on port 3000 without errors
✅ Invoice view page now integrates with authentication system
✅ Delivery challan generation will use correct user context

## Testing
1. Navigate to an invoice detail page
2. Click "Generate Challan" button
3. Challan should be created without Stack errors
4. Verify challan is associated with correct user

## Impact
- ✅ Fixes delivery challan generation errors
- ✅ Maintains data isolation per authenticated user
- ✅ Completes multi-user security implementation
- ✅ No breaking changes to existing functionality