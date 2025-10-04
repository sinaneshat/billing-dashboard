# SEO & Metadata Implementation Guide

Complete guide for using the enhanced SEO and metadata utilities in the application.

## Overview

The application now includes comprehensive SEO utilities that were restored from commit `a24d1f67` and integrated with existing functionality. These utilities provide:

- **Structured Data (JSON-LD)**: WebApplication, Organization, Product, Article schemas
- **Open Graph Images**: Dynamic OG image generation
- **Next.js Metadata**: Type-safe metadata for all pages
- **Breadcrumb Navigation**: Rich results for site hierarchy
- **FAQ Rich Snippets**: Improved search visibility

## File Structure

```
src/
├── api/
│   ├── types/
│   │   └── metadata.ts                 # Zod schemas for type-safe metadata
│   └── common/
│       └── metadata-utils.ts           # Metadata factory functions
├── components/
│   └── seo/
│       ├── index.ts                    # Centralized exports
│       ├── structured-data.tsx         # Main structured data component
│       ├── breadcrumb-structured-data.tsx
│       └── faq-structured-data.tsx
├── lib/
│   └── utils/
│       ├── og-image.tsx                # Dynamic OG image generation
│       └── seo.ts                      # Additional SEO utilities
├── utils/
│   └── metadata.ts                     # Enhanced metadata helpers
└── app/
    └── api/
        └── og/
            └── route.tsx               # OG image API route
```

## 1. Page Metadata

### Basic Page Metadata

Use `createMetadata()` for standard pages:

```tsx
// src/app/my-page/page.tsx
import type { Metadata } from 'next';
import { createMetadata } from '@/utils/metadata';
import { BRAND } from '@/constants/brand';

export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    title: `Page Title - ${BRAND.fullName}`,
    description: 'Page description for SEO',
    keywords: ['keyword1', 'keyword2', 'keyword3'],
  });
}

export default function MyPage() {
  return <div>Page content</div>;
}
```

### Private Pages (No Index)

For dashboard and authenticated pages:

```tsx
export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    title: `Dashboard - ${BRAND.fullName}`,
    description: 'Manage your account and settings.',
    robots: 'noindex, nofollow', // Don't index private pages
  });
}
```

### Custom OG Image

```tsx
export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    title: 'My Page',
    description: 'Page description',
    image: '/api/og?title=My Page&description=Description',
  });
}
```

## 2. Structured Data (JSON-LD)

### WebApplication (Root Layout)

```tsx
// src/app/layout.tsx
import { StructuredData } from '@/components/seo';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <StructuredData type="WebApplication" />
        {children}
      </body>
    </html>
  );
}
```

### Product Pages

```tsx
import { StructuredData } from '@/components/seo';

export default function ProductPage() {
  return (
    <>
      <StructuredData
        type="Product"
        name="Pro Plan"
        description="Advanced features for professionals"
        price={29}
        currency="USD"
        image="https://example.com/product.png"
      />
      {/* Page content */}
    </>
  );
}
```

### Article/Blog Posts

```tsx
import { StructuredData } from '@/components/seo';

export default function BlogPost() {
  return (
    <>
      <StructuredData
        type="Article"
        name="How to Build Better Dashboards"
        description="A comprehensive guide to dashboard design"
        author="John Doe"
        datePublished="2024-01-15T10:00:00Z"
        dateModified="2024-01-20T15:30:00Z"
        image="https://example.com/article.png"
      />
      {/* Article content */}
    </>
  );
}
```

### Organization Schema

```tsx
<StructuredData
  type="Organization"
  name="Your Company Name"
  description="Company description"
  url="https://example.com"
  logo="https://example.com/logo.png"
  sameAs={[
    'https://twitter.com/yourcompany',
    'https://linkedin.com/company/yourcompany',
    'https://github.com/yourcompany',
  ]}
/>
```

## 3. Breadcrumb Navigation

Add breadcrumbs for better navigation and SEO:

```tsx
// src/app/(app)/chat/settings/page.tsx
import { BreadcrumbStructuredData } from '@/components/seo';

export default function SettingsPage() {
  return (
    <>
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: '/' },
          { name: 'Dashboard', url: '/dashboard' },
          { name: 'Settings', url: '/chat/settings' },
        ]}
      />
      {/* Page content */}
    </>
  );
}
```

## 4. FAQ Rich Snippets

For support and FAQ pages:

```tsx
import { FaqStructuredData } from '@/components/seo';

export default function FAQPage() {
  return (
    <>
      <FaqStructuredData
        faqs={[
          {
            question: 'How do I get started?',
            answer: 'Sign up for a free account and follow the onboarding guide.',
          },
          {
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards and PayPal.',
          },
          {
            question: 'Can I cancel my subscription?',
            answer: 'Yes, you can cancel anytime from your dashboard settings.',
          },
        ]}
      />
      {/* FAQ content */}
    </>
  );
}
```

## 5. Dynamic OG Image Generation

### API Route

The `/api/og` route generates OG images dynamically:

#### Default Template

```
/api/og?title=Welcome&description=Get started with our platform
```

#### Product Template

```
/api/og?type=product&title=Pro Plan&price=29&currency=USD&features=Feature 1,Feature 2,Feature 3
```

#### Article Template

```
/api/og?type=article&title=New Feature Release&author=John Doe&date=2024-01-15&category=Product Updates
```

#### Error Template

```
/api/og?type=error&code=404&title=Page Not Found
```

### Using in Metadata

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id);

  return createMetadata({
    title: product.name,
    description: product.description,
    image: `/api/og?type=product&title=${encodeURIComponent(product.name)}&price=${product.price}`,
  });
}
```

## 6. Type-Safe API Metadata

For API responses that need SEO metadata:

```ts
// Backend API route
import { createSeoMetadata } from '@/api/common/metadata-utils';

const metadata = createSeoMetadata({
  title: 'Product Name',
  description: 'Product description',
  keywords: ['keyword1', 'keyword2'],
  ogImage: 'https://example.com/image.png',
  ogType: 'product',
});

// Returns typed SeoMetadata object
```

### Converting API Metadata to Next.js Metadata

```tsx
import { apiMetadataToNextMetadata } from '@/utils/metadata';
import type { SeoMetadata } from '@/api/types/metadata';

export async function generateMetadata(): Promise<Metadata> {
  // Fetch SEO metadata from API
  const apiMetadata: SeoMetadata = await fetchSeoData();

  // Convert to Next.js Metadata format
  return apiMetadataToNextMetadata(apiMetadata);
}
```

## 7. Advanced Utilities

### Custom JSON-LD

For custom structured data needs:

```tsx
import { createJsonLd } from '@/utils/metadata';

const customStructuredData = createJsonLd({
  type: 'Product',
  name: 'Custom Product',
  description: 'Description',
  price: 99,
  currency: 'USD',
  url: 'https://example.com/product',
  image: 'https://example.com/image.png',
});

// Inject manually
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(customStructuredData).replace(/</g, '\\u003C'),
  }}
/>
```

### Breadcrumb Helper

```tsx
import { createBreadcrumbJsonLd } from '@/utils/metadata';

const breadcrumbData = createBreadcrumbJsonLd([
  { name: 'Home', url: '/' },
  { name: 'Products', url: '/products' },
  { name: 'Pro Plan', url: '/products/pro' },
]);
```

### FAQ Helper

```tsx
import { createFaqJsonLd } from '@/utils/metadata';

const faqData = createFaqJsonLd([
  { question: 'Q1', answer: 'A1' },
  { question: 'Q2', answer: 'A2' },
]);
```

## 8. Best Practices

### 1. Use Appropriate Metadata for Each Page Type

- **Public pages**: Full SEO metadata with Open Graph
- **Private pages**: Use `robots: 'noindex, nofollow'`
- **Error pages**: Include error code and message

### 2. Breadcrumbs

- Add to all nested dashboard pages
- Keep URLs absolute or relative to root
- Maximum 5-7 levels deep

### 3. Structured Data

- One WebApplication schema per site (in root layout)
- Product schema for pricing pages
- Article schema for blog posts and documentation
- FAQ schema for support pages

### 4. OG Images

- Use dynamic generation for personalized content
- Keep title under 60 characters
- Keep description under 160 characters
- Images are 1200x630px (optimal for all platforms)

### 5. Keywords

- 3-7 relevant keywords per page
- Avoid keyword stuffing
- Use long-tail keywords for better targeting

### 6. Testing

Test your SEO implementation:

```bash
# View structured data
curl http://localhost:3000/ | grep "application/ld+json"

# Test OG image generation
curl http://localhost:3000/api/og?title=Test

# Validate with Google's Rich Results Test
# https://search.google.com/test/rich-results
```

## 9. Examples from the Codebase

### Root Layout (src/app/layout.tsx)

```tsx
export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    title: BRAND.fullName,
    description: BRAND.description,
  });
}

export default async function Layout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        <StructuredData type="WebApplication" />
        {children}
      </body>
    </html>
  );
}
```

### Dashboard Layout (src/app/(app)/chat/layout.tsx)

```tsx
export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    title: `Dashboard - ${BRAND.fullName}`,
    description: 'Manage your account, subscriptions, and settings.',
    robots: 'noindex, nofollow',
  });
}

export default async function DashboardLayout({ children }) {
  return (
    <>
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: '/' },
          { name: 'Dashboard', url: '/dashboard' },
        ]}
      />
      {children}
    </>
  );
}
```

### Error Page (src/app/auth/error/page.tsx)

```tsx
export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    title: `Authentication Error - ${BRAND.fullName}`,
    description: 'There was an issue with authentication. Please try again.',
    robots: 'noindex, nofollow',
  });
}
```

## 10. Migration from Old Code

If you're migrating from the old implementation:

**Old Pattern:**
```tsx
// ❌ Old way
import { generateStructuredData } from '@/lib/utils/seo';
```

**New Pattern:**
```tsx
// ✅ New way - use components
import { StructuredData } from '@/components/seo';
```

**Utility Functions:**
```tsx
// Both still work, but prefer the component approach
import { createJsonLd } from '@/utils/metadata'; // ✅ Preferred
import { generateStructuredData } from '@/lib/utils/seo'; // ✅ Also available
```

## Summary

The SEO and metadata system is now fully integrated and working:

✅ **Enhanced Metadata Utilities** - Article support, more fields
✅ **Structured Data Components** - Easy-to-use React components
✅ **Dynamic OG Images** - API route for on-demand generation
✅ **Breadcrumb Support** - Navigation hierarchy for SEO
✅ **FAQ Rich Snippets** - Improved search visibility
✅ **Type Safety** - Zod schemas for validation
✅ **API Integration** - Convert API metadata to Next.js format

All utilities are tested, linted, and ready for production use.
