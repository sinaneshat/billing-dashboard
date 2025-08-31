# 🚀 Master AI Frontend Development Prompt

## Billing Dashboard - ZarinPal Integration System

---

## 📋 FOUNDATIONAL CONTEXT

You are creating components for a **modern billing dashboard** built with the following tech stack:

### Tech Stack
- **Frontend:** Next.js 15.3.2, React 19.1.0, TypeScript 5.8.3
- **Styling:** Tailwind CSS 4.1.7, shadcn/ui components
- **State Management:** TanStack React Query 5.77.0, React Hook Form 7.62.0
- **UI Components:** Radix UI primitives, Lucide React icons
- **Authentication:** Better Auth 1.3.4 (session-based)
- **Backend:** Hono API, Drizzle ORM with SQLite/D1
- **Deployment:** Cloudflare Workers/Pages
- **Payment Gateway:** ZarinPal (Iranian payment processor)

### Database Schema Context
```typescript
// Key tables for billing features
interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number; // Iranian Rials (IRR)
  billingPeriod: 'one_time' | 'monthly';
  isActive: boolean;
}

interface Subscription {
  id: string;
  userId: string;
  productId: string;
  status: 'active' | 'canceled' | 'expired' | 'pending';
  startDate: Date;
  endDate: Date | null;
  nextBillingDate: Date | null;
  currentPrice: number;
  billingPeriod: 'one_time' | 'monthly';
  zarinpalDirectDebitToken: string | null;
}

interface Payment {
  id: string;
  userId: string;
  subscriptionId: string | null;
  productId: string;
  amount: number; // Iranian Rials
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'canceled';
  zarinpalAuthority: string | null;
  zarinpalRefId: string | null;
  paidAt: Date | null;
}
```

### Existing UI Pattern Examples
```typescript
// Button component usage (from existing codebase)
import { Button } from '@/components/ui/button';
<Button variant="default" size="lg">Subscribe</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="destructive" size="default">Delete</Button>

// Card component pattern
<div className="rounded-lg border bg-card p-6">
  <h3 className="font-semibold">Title</h3>
  <p className="mt-2 text-sm text-muted-foreground">Description</p>
</div>

// Form components (React Hook Form + shadcn/ui)
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
```

### Color Palette & Design System
- **Primary:** Blue-based theme with Iranian market considerations
- **Currency:** Display prices in Iranian Rials (IRR) with proper formatting
- **Mobile-first:** All components must work flawlessly on mobile devices
- **Accessibility:** WCAG 2.1 AA compliance required

---

## 🎯 HIGH-LEVEL GOAL

Create a **comprehensive billing dashboard component** that allows users to:
1. **Browse available products** (one-time purchases & monthly subscriptions)
2. **Manage active subscriptions** (view details, cancel, resubscribe)
3. **View payment history** with ZarinPal transaction details
4. **Handle subscription lifecycle** (pending → active → canceled/expired)

---

## 📱 DETAILED IMPLEMENTATION INSTRUCTIONS

### STEP 1: Project Structure Setup
1. Create a new directory: `src/components/billing/`
2. Inside this directory, create the following component files:
   - `ProductCard.tsx` - Individual product display
   - `ProductGrid.tsx` - Grid layout for products
   - `SubscriptionCard.tsx` - Active subscription display
   - `SubscriptionList.tsx` - User's subscriptions container
   - `PaymentHistoryTable.tsx` - Transaction history
   - `BillingDashboard.tsx` - Main container component
3. Create types file: `src/types/billing.ts` for TypeScript interfaces
4. Create API hooks: `src/hooks/useBilling.ts` for data fetching

### STEP 2: Mobile-First Component Design

#### ProductCard Component (`ProductCard.tsx`)
```typescript
// Expected props interface
interface ProductCardProps {
  product: Product;
  isSubscribed?: boolean;
  onSubscribe: (productId: string) => void;
  isLoading?: boolean;
}
```

**Mobile Layout (320px-768px):**
- Full-width card with product image placeholder
- Product name as h3, 18px font weight semibold  
- Description text, 14px, text-muted-foreground
- Price display: Large, prominent, with "IRR" suffix
- Billing period badge: "One-time" or "Monthly" 
- Action button: Full-width, "Subscribe" or "Subscribed" state
- Disabled state when user already subscribed

**Tablet/Desktop Adaptation (768px+):**
- Cards in responsive grid (2 cols on tablet, 3-4 on desktop)
- Hover effects: subtle scale and shadow
- Button width: fit-content instead of full-width

#### SubscriptionCard Component (`SubscriptionCard.tsx`)
```typescript
interface SubscriptionCardProps {
  subscription: Subscription & { product: Product };
  onCancel: (subscriptionId: string) => void;
  onResubscribe: (productId: string) => void;
  isLoading?: boolean;
}
```

**Mobile Layout:**
- Status badge at top-right: "Active", "Canceled", "Expired", "Pending"
- Product name and subscription details
- Next billing date (for active monthly subscriptions)
- Price and billing period
- Action buttons based on status:
  - Active: "Cancel Subscription" (destructive variant)
  - Canceled: "Resubscribe" (primary variant)
  - Expired: "Subscribe Again" (primary variant)
  - Pending: "View Details" (outline variant)

### STEP 3: Data Integration with TanStack Query

#### Custom Hooks (`src/hooks/useBilling.ts`)
```typescript
// Expected API endpoint patterns
GET /api/v1/products - Get all active products
GET /api/v1/subscriptions - Get user's subscriptions  
GET /api/v1/payments - Get payment history
POST /api/v1/subscriptions - Create subscription
PUT /api/v1/subscriptions/:id/cancel - Cancel subscription
POST /api/v1/payments/zarinpal - Initiate ZarinPal payment

// Required hooks to implement:
export function useProducts() {
  // Fetch all active products
}

export function useUserSubscriptions() {
  // Fetch user's subscriptions with product details
}

export function usePaymentHistory() {
  // Fetch user's payment history
}

export function useCreateSubscription() {
  // Mutation for subscribing to product
}

export function useCancelSubscription() {
  // Mutation for canceling subscription
}
```

### STEP 4: ZarinPal Payment Integration
1. Create payment initiation flow that redirects to ZarinPal gateway
2. Handle payment return URLs and status updates
3. Show loading states during payment processing
4. Display success/failure messages with appropriate actions
5. Update subscription status after successful payment

### STEP 5: Main Dashboard Layout (`BillingDashboard.tsx`)

**Mobile Layout Structure:**
```tsx
<div className="container mx-auto px-4 py-6 space-y-8">
  {/* Header Section */}
  <div className="space-y-2">
    <h1 className="text-2xl font-bold">Billing Dashboard</h1>
    <p className="text-muted-foreground">Manage your subscriptions and payments</p>
  </div>

  {/* Active Subscriptions Section */}
  <section className="space-y-4">
    <h2 className="text-xl font-semibold">Your Subscriptions</h2>
    <SubscriptionList />
  </section>

  {/* Available Products Section */}  
  <section className="space-y-4">
    <h2 className="text-xl font-semibold">Available Products</h2>
    <ProductGrid />
  </section>

  {/* Payment History Section */}
  <section className="space-y-4">
    <h2 className="text-xl font-semibold">Payment History</h2>
    <PaymentHistoryTable />
  </section>
</div>
```

### STEP 6: Iranian Market Considerations
1. **Currency Formatting:** Use Persian/Farsi number formatting for IRR amounts
2. **Date Display:** Support both Persian and Gregorian calendars
3. **RTL Support:** Ensure components work with RTL text direction
4. **ZarinPal Branding:** Include ZarinPal payment method icons where appropriate
5. **Error Messages:** Provide Persian translations for payment errors

### STEP 7: Error Handling & Loading States
1. **Network Errors:** Show retry buttons with exponential backoff
2. **Payment Failures:** Display specific ZarinPal error messages
3. **Loading States:** Skeleton components for all data-dependent sections
4. **Empty States:** Meaningful messages when user has no subscriptions/payments
5. **Optimistic Updates:** Immediate UI feedback for user actions

---

## 🔧 CODE EXAMPLES & CONSTRAINTS

### API Response Format
```typescript
// Expected API response structures
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Products API response
GET /api/v1/products → ApiResponse<Product[]>

// Subscriptions API response  
GET /api/v1/subscriptions → ApiResponse<(Subscription & { product: Product })[]>

// Payment initiation
POST /api/v1/subscriptions → { redirectUrl: string, authority: string }
```

### Required shadcn/ui Components
```typescript
// Import these existing components (DO NOT recreate them):
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
```

### Styling Constraints
```css
/* DO NOT use custom CSS classes. Only use Tailwind utility classes */
/* Example of proper Tailwind usage: */
.product-card {
  @apply rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow;
}

/* Use consistent spacing: space-y-4, space-y-6, space-y-8 */
/* Use semantic color classes: text-muted-foreground, bg-card, border */
/* Responsive breakpoints: sm:, md:, lg:, xl: */
```

### Form Validation (using Zod + React Hook Form)
```typescript
// Payment form schema example
import { z } from 'zod';

const subscriptionSchema = z.object({
  productId: z.string().min(1, 'Product selection required'),
  paymentMethod: z.literal('zarinpal'),
  acceptTerms: z.boolean().refine((val) => val === true, 'Terms acceptance required'),
});
```

---

## 🎯 STRICT SCOPE DEFINITION

### FILES YOU SHOULD CREATE:
- `src/components/billing/` directory with all billing components
- `src/types/billing.ts` for TypeScript interfaces
- `src/hooks/useBilling.ts` for API integration hooks

### FILES YOU SHOULD MODIFY:
- `src/app/(app)/dashboard/page.tsx` - Add billing dashboard integration
- Add routing for billing pages if needed

### FILES YOU MUST NOT TOUCH:
- **DO NOT modify** any existing `src/components/ui/` components
- **DO NOT change** authentication-related files in `src/app/auth/`  
- **DO NOT alter** database schema files in `src/db/`
- **DO NOT modify** API routes in `src/app/api/`
- **DO NOT change** any configuration files (package.json, etc.)

### INTEGRATION REQUIREMENTS:
1. Use existing authentication session from Better Auth
2. Integrate with existing Hono API endpoints (assume they exist)
3. Follow existing file structure and naming conventions
4. Use TypeScript interfaces that match the database schema
5. Implement proper error boundaries and loading states

### TESTING CONSIDERATIONS:
1. Components should be easily unit testable
2. Mock API responses for development/testing
3. Include proper TypeScript types for all props and data
4. Follow React best practices for state management
5. Ensure components are accessible (ARIA labels, keyboard navigation)

---

## ⚠️ IMPORTANT REMINDERS

### Iranian Market Specific:
- All prices in Iranian Rials (IRR)
- ZarinPal is the primary payment gateway
- Consider Persian calendar and number formatting
- Test with RTL text direction for Persian users

### Performance Considerations:
- Implement virtual scrolling for large payment history
- Optimize images and use Next.js Image component
- Lazy load components below the fold
- Cache API responses appropriately with React Query

### Security Requirements:
- Never store payment tokens in localStorage
- Validate all user inputs on frontend and backend
- Use secure payment redirect flows
- Implement proper session management

---

**🔴 CRITICAL NOTICE:** All AI-generated code requires careful human review, testing, and refinement before being considered production-ready. Test thoroughly with various screen sizes, network conditions, and user scenarios before deployment.

---

*This prompt is optimized for AI tools like Vercel v0, Lovable.ai, and similar frontend generation platforms. Follow the structured framework for optimal results.*