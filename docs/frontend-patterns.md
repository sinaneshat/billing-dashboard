# Frontend Patterns & Architecture Guide

**Roundtable Dashboard - Frontend Implementation Guide**

This document outlines established frontend patterns, architectural decisions, and implementation guidelines for the Roundtable dashboard. These patterns ensure consistency, maintainability, and optimal developer experience across the entire frontend codebase.

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Next.js App Router Patterns](#nextjs-app-router-patterns)
3. [Component Architecture](#component-architecture)
4. [Data Fetching & State Management](#data-fetching--state-management)
5. [API Integration & Services](#api-integration--services)
6. [Internationalization (i18n)](#internationalization-i18n)
7. [Layout & Container Patterns](#layout--container-patterns)
8. [UI Library & Design System](#ui-library--design-system)
9. [Email Template System](#email-template-system)
10. [Asset & Icon Management](#asset--icon-management)
11. [Utility Libraries & Helpers](#utility-libraries--helpers)
12. [Performance & Optimization](#performance--optimization)
13. [Development Guidelines](#development-guidelines)

---

## Overview & Architecture

### Core Technology Stack

```typescript
// Primary Frontend Stack
{
  "framework": "Next.js 15 (App Router)",
  "ui": "shadcn/ui + Radix UI",
  "styling": "Tailwind CSS v4 + CVA",
  "state": "TanStack Query v5 + Zustand",
  "api": "Hono RPC Client (Type-safe)",
  "i18n": "next-intl (RTL Support)",
  "email": "React Email v4",
  "auth": "Better Auth Integration",
  "icons": "Lucide React + Custom SVGs",
  "forms": "React Hook Form + Zod",
  "typography": "Inter + Vazirmatn (Persian)"
}
```

### Directory Structure Philosophy

```bash
src/
├── app/                    # Next.js 15 App Router (File-based routing)
│   ├── (app)/             # Route groups for layout isolation
│   │   └── dashboard/     # Protected dashboard routes
│   ├── auth/              # Authentication flow pages
│   ├── payment/           # Payment processing pages
│   ├── @modal/            # Parallel route for modals
│   └── globals.css        # Global styles and CSS variables
├── components/            # Reusable UI components
│   ├── ui/                # shadcn/ui base components
│   ├── billing/           # Domain-specific billing components
│   ├── auth/              # Authentication components
│   └── providers/         # Context providers and wrappers
├── containers/            # Page-level containers and screens
├── hooks/                 # TanStack Query hooks and custom hooks
├── services/              # API client services and utilities
├── lib/                   # Utility functions and configurations
├── i18n/                  # Internationalization setup and locales
├── emails/                # React Email templates
├── icons/                 # Custom SVG icons and icon utilities
└── styles/                # Global styles and theme utilities
```

---

## Next.js App Router Patterns

### Route Organization Strategy

**Route Groups for Layout Isolation:**
```typescript
// File: src/app/(app)/layout.tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 lg:pl-64">
        <AppHeader />
        <div className="container mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

// Pattern: (app) route group isolates dashboard layout
// src/app/(app)/dashboard/page.tsx ✓
// src/app/(app)/settings/page.tsx ✓
```

**Parallel Routes for Modal Management:**
```typescript
// File: src/app/(app)/@modal/default.tsx
export default function Default() {
  return null // Default parallel route returns null
}

// File: src/app/(app)/@modal/(.)setup/page.tsx
import { Modal } from '@/components/ui/modal'

export default function SetupModal() {
  return (
    <Modal>
      <SetupForm />
    </Modal>
  )
}

// Pattern: @modal parallel route with intercepting routes
// Enables modal navigation without losing page state
```

**Intercepting Routes for UX Enhancement:**
```typescript
// File: src/app/(app)/setup/(.)modal/page.tsx
// Intercepts /setup route when navigated from dashboard
// Shows modal instead of full page navigation

// Pattern: (.) intercepts same segment level
// (..) intercepts parent segment level
// (...) intercepts from root
```

### Page Component Patterns

**Standard Page Structure:**
```typescript
// File: src/app/(app)/dashboard/page.tsx
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { DashboardContainer } from '@/containers/dashboard-container'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard')
  return {
    title: t('meta.title'),
    description: t('meta.description')
  }
}

export default function DashboardPage() {
  return <DashboardContainer />
}

// Pattern: Pages are thin wrappers around containers
// Metadata generation uses i18n translations
// Business logic stays in containers/components
```

**Loading and Error Boundaries:**
```typescript
// File: src/app/(app)/dashboard/loading.tsx
import { DashboardSkeleton } from '@/components/skeletons'

export default function Loading() {
  return <DashboardSkeleton />
}

// File: src/app/(app)/dashboard/error.tsx
'use client'

import { ErrorBoundary } from '@/components/ui/error-boundary'

export default function Error({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundary error={error} reset={reset} />
}

// Pattern: Each route segment can have loading/error states
// Use typed error boundaries with reset functionality
```

---

## Component Architecture

### shadcn/ui Integration Patterns

**Base Component Extension:**
```typescript
// File: src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

// Pattern: All UI components use CVA for variant management
// Radix primitives for accessibility and behavior
// Forwarded refs and proper TypeScript inference
```

**Domain-Specific Component Extension:**
```typescript
// File: src/components/billing/payment-method-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'
import { PaymentMethod } from '@/lib/types'

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function PaymentMethodCard({
  paymentMethod,
  onEdit,
  onDelete
}: PaymentMethodCardProps) {
  const t = useTranslations('billing.paymentMethods')

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold">
            {paymentMethod.contractSignature.slice(-4)}
          </span>
          <Badge variant={paymentMethod.status === 'active' ? 'default' : 'secondary'}>
            {t(`status.${paymentMethod.status}`)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('created')}: {new Date(paymentMethod.createdAt).toLocaleDateString()}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(paymentMethod.id)}>
              {t('edit')}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(paymentMethod.id)}>
              {t('delete')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Pattern: Domain components build on UI primitives
// Props interface for type safety
// Internationalization for all user-facing text
// Event handlers passed down from containers
```

**Provider Pattern for Global State:**
```typescript
// File: src/components/providers/app-providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'
import { useState } from 'react'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
      },
    },
  }))

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

// Pattern: Single provider component wraps all global providers
// QueryClient configuration with sensible defaults
// Development tools conditionally included
```

---

## Data Fetching & State Management

### TanStack Query Patterns

**Query Key Factory System:**
```typescript
// File: src/hooks/query-keys.ts
export const queryKeys = {
  all: ['app'] as const,
  subscriptions: () => [...queryKeys.all, 'subscriptions'] as const,
  subscription: (id: string) => [...queryKeys.subscriptions(), id] as const,
  paymentMethods: () => [...queryKeys.all, 'paymentMethods'] as const,
  paymentMethod: (id: string) => [...queryKeys.paymentMethods(), id] as const,
  payments: () => [...queryKeys.all, 'payments'] as const,
  payment: (id: string) => [...queryKeys.payments(), id] as const,
  user: () => [...queryKeys.all, 'user'] as const,
  userProfile: () => [...queryKeys.user(), 'profile'] as const,
} as const

// Pattern: Hierarchical query keys for cache invalidation
// Const assertions for TypeScript inference
// Centralized key management prevents cache invalidation bugs
```

**Query Hook Patterns:**
```typescript
// File: src/hooks/use-subscriptions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryKeys } from './query-keys'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

export function useSubscriptions() {
  return useQuery({
    queryKey: queryKeys.subscriptions(),
    queryFn: () => api.subscriptions.$get(),
    select: (data) => data.subscriptions,
  })
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: queryKeys.subscription(id),
    queryFn: () => api.subscriptions[':id'].$get({ param: { id } }),
    enabled: !!id,
  })
}

export function useCreateSubscription() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('subscriptions.notifications')

  return useMutation({
    mutationFn: (data: CreateSubscriptionData) =>
      api.subscriptions.$post({ json: data }),
    onSuccess: (newSubscription) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions() })
      toast({
        title: t('created.title'),
        description: t('created.description'),
      })
    },
    onError: (error) => {
      toast({
        title: t('error.title'),
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Pattern: Separate hooks for queries and mutations
// Optimistic updates and cache invalidation
// Integrated error handling and user notifications
// Type-safe API calls with Hono RPC client
```

**Advanced Query Patterns:**
```typescript
// File: src/hooks/use-infinite-payments.ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryKeys } from './query-keys'

export function useInfinitePayments(filters?: PaymentFilters) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.payments(), 'infinite', filters],
    queryFn: ({ pageParam = 0 }) =>
      api.payments.$get({
        query: {
          ...filters,
          offset: pageParam * 20,
          limit: 20
        }
      }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined
    },
    initialPageParam: 0,
  })
}

// Pattern: Infinite queries for paginated data
// Parameterized queries with filters
// Type-safe pagination logic
```

### Client-Side State Management

**Zustand Store Patterns:**
```typescript
// File: src/stores/ui-store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  locale: 'en' | 'fa'
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLocale: (locale: 'en' | 'fa') => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        theme: 'system',
        locale: 'en',
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setTheme: (theme) => set({ theme }),
        setLocale: (locale) => set({ locale }),
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          locale: state.locale
        }),
      }
    ),
    { name: 'ui-store' }
  )
)

// Pattern: Zustand for client-only UI state
// Persistence for user preferences
// DevTools integration for debugging
```

---

## API Integration & Services

### Hono RPC Client Integration

**Type-Safe API Client Setup:**
```typescript
// File: src/services/api.ts
import { hc } from 'hono/client'
import type { AppType } from '@/api/routes'
import { env } from '@/lib/env'

export const api = hc<AppType>(env.NEXT_PUBLIC_API_URL, {
  headers: () => ({
    'Content-Type': 'application/json',
  }),
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: 'include', // Include cookies for session auth
    })
  },
})

// Pattern: Single API client instance with global configuration
// Type inference from backend API routes
// Automatic credential handling for authentication
```

**Service Layer Abstraction:**
```typescript
// File: src/services/subscription-service.ts
import { api } from './api'
import {
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionFilters
} from '@/lib/types'

export class SubscriptionService {
  static async getAll(filters?: SubscriptionFilters) {
    const response = await api.subscriptions.$get({ query: filters })
    if (!response.ok) {
      throw new Error('Failed to fetch subscriptions')
    }
    return response.json()
  }

  static async getById(id: string) {
    const response = await api.subscriptions[':id'].$get({ param: { id } })
    if (!response.ok) {
      throw new Error('Failed to fetch subscription')
    }
    return response.json()
  }

  static async create(data: CreateSubscriptionData) {
    const response = await api.subscriptions.$post({ json: data })
    if (!response.ok) {
      throw new Error('Failed to create subscription')
    }
    return response.json()
  }

  static async update(id: string, data: UpdateSubscriptionData) {
    const response = await api.subscriptions[':id'].$patch({
      param: { id },
      json: data
    })
    if (!response.ok) {
      throw new Error('Failed to update subscription')
    }
    return response.json()
  }

  static async delete(id: string) {
    const response = await api.subscriptions[':id'].$delete({ param: { id } })
    if (!response.ok) {
      throw new Error('Failed to delete subscription')
    }
    return response.json()
  }
}

// Pattern: Service classes encapsulate API operations
// Consistent error handling across all methods
// Type-safe parameter and response handling
```

**Request/Response Interceptors:**
```typescript
// File: src/services/api-interceptors.ts
import { api } from './api'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/hooks/use-toast'

// Add request interceptor for authentication
const originalFetch = api.$fetch
api.$fetch = async (input, init) => {
  const token = useAuthStore.getState().token

  const headers = new Headers(init?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  try {
    const response = await originalFetch(input, {
      ...init,
      headers,
    })

    // Handle authentication errors
    if (response.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/auth/login'
    }

    // Handle server errors
    if (response.status >= 500) {
      toast({
        title: 'Server Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    }

    return response
  } catch (error) {
    toast({
      title: 'Network Error',
      description: 'Please check your connection.',
      variant: 'destructive',
    })
    throw error
  }
}

// Pattern: Global request/response interceptors
// Centralized error handling and authentication
// User feedback for common error scenarios
```

---

## Internationalization (i18n)

### next-intl Configuration

**i18n Setup and Configuration:**
```typescript
// File: src/i18n/config.ts
import { defineRouting } from 'next-intl/routing'
import { createSharedPathnamesNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['en', 'fa'],
  defaultLocale: 'en',
  pathnames: {
    '/dashboard': {
      en: '/dashboard',
      fa: '/داشبورد'
    },
    '/settings': {
      en: '/settings',
      fa: '/تنظیمات'
    }
  }
})

export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation(routing)

// Pattern: Shared pathname navigation for type safety
// Localized pathnames for better UX
// Centralized routing configuration
```

**Translation Key Organization:**
```json
// File: src/i18n/locales/en.json
{
  "auth": {
    "login": {
      "title": "Sign In to Your Account",
      "subtitle": "Enter your credentials to access your dashboard",
      "form": {
        "email": "Email Address",
        "password": "Password",
        "submit": "Sign In",
        "forgotPassword": "Forgot your password?"
      },
      "validation": {
        "emailRequired": "Email is required",
        "emailInvalid": "Please enter a valid email",
        "passwordRequired": "Password is required",
        "passwordMinLength": "Password must be at least 8 characters"
      }
    }
  },
  "billing": {
    "dashboard": {
      "title": "Dashboard",
      "overview": {
        "totalRevenue": "Total Revenue",
        "activeSubscriptions": "Active Subscriptions",
        "pendingPayments": "Pending Payments"
      }
    },
    "subscriptions": {
      "title": "Subscriptions",
      "status": {
        "active": "Active",
        "paused": "Paused",
        "cancelled": "Cancelled",
        "expired": "Expired"
      },
      "actions": {
        "pause": "Pause",
        "resume": "Resume",
        "cancel": "Cancel",
        "upgrade": "Upgrade"
      }
    },
    "paymentMethods": {
      "title": "Payment Methods",
      "add": "Add Payment Method",
      "status": {
        "active": "Active",
        "pending": "Pending Signature",
        "expired": "Expired"
      }
    }
  },
  "common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "edit": "Edit",
      "create": "Create",
      "update": "Update"
    },
    "status": {
      "loading": "Loading...",
      "error": "Error occurred",
      "success": "Success",
      "noData": "No data available"
    }
  }
}

// Pattern: Hierarchical namespace organization
// Domain-specific translation groups
// Reusable common translations
// Consistent key naming conventions
```

**Persian/Farsi RTL Support:**
```json
// File: src/i18n/locales/fa.json
{
  "auth": {
    "login": {
      "title": "ورود به حساب کاربری",
      "subtitle": "اطلاعات خود را وارد کنید تا به داشبورد صورتحساب دسترسی پیدا کنید",
      "form": {
        "email": "آدرس ایمیل",
        "password": "رمز عبور",
        "submit": "ورود",
        "forgotPassword": "رمز عبور خود را فراموش کرده‌اید؟"
      }
    }
  },
  "billing": {
    "dashboard": {
      "title": "داشبورد صورتحساب",
      "overview": {
        "totalRevenue": "کل درآمد",
        "activeSubscriptions": "اشتراک‌های فعال",
        "pendingPayments": "پرداخت‌های در انتظار"
      }
    }
  }
}

// Pattern: Complete Persian translations
// Cultural adaptation for Iranian users
// Proper RTL text direction support
```

**Component Translation Patterns:**
```typescript
// File: src/components/billing/subscription-card.tsx
import { useTranslations } from 'next-intl'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Subscription } from '@/lib/types'

interface SubscriptionCardProps {
  subscription: Subscription
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const t = useTranslations('billing.subscriptions')
  const common = useTranslations('common')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{subscription.productName}</span>
          <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
            {t(`status.${subscription.status}`)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('nextBilling')}: {subscription.nextBillingDate}
          </p>
          <div className="flex gap-2">
            {subscription.status === 'active' && (
              <Button variant="outline" size="sm">
                {t('actions.pause')}
              </Button>
            )}
            {subscription.status === 'paused' && (
              <Button variant="default" size="sm">
                {t('actions.resume')}
              </Button>
            )}
            <Button variant="destructive" size="sm">
              {t('actions.cancel')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Pattern: Multiple translation namespaces in single component
// Dynamic translation keys based on data state
// No hardcoded strings - all text through translations
```

### RTL Layout Support

**Tailwind RTL Configuration:**
```css
/* File: src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* RTL support for Persian */
[dir="rtl"] {
  @apply text-right;
}

[dir="rtl"] .flex {
  @apply flex-row-reverse;
}

[dir="rtl"] .space-x-2 > :not([hidden]) ~ :not([hidden]) {
  --tw-space-x-reverse: 1;
}

/* Custom RTL utilities */
@layer utilities {
  .rtl\:rotate-180 {
    transform: rotate(180deg);
  }

  .ltr\:ml-2 {
    margin-left: 0.5rem;
  }

  .rtl\:mr-2 {
    margin-right: 0.5rem;
  }
}

// Pattern: CSS-based RTL support
// Custom utilities for directional layouts
// Automatic text alignment and spacing
```

---

## Layout & Container Patterns

### Container Architecture

**Screen Container Pattern:**
```typescript
// File: src/containers/dashboard-container.tsx
'use client'

import { useTranslations } from 'next-intl'
import { useSubscriptions } from '@/hooks/use-subscriptions'
import { usePayments } from '@/hooks/use-payments'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { OverviewCards } from '@/components/dashboard/overview-cards'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { ErrorState } from '@/components/ui/error-state'

export function DashboardContainer() {
  const t = useTranslations('billing.dashboard')

  const {
    data: subscriptions,
    isLoading: subscriptionsLoading,
    error: subscriptionsError
  } = useSubscriptions()

  const {
    data: recentPayments,
    isLoading: paymentsLoading
  } = usePayments({ limit: 5 })

  if (subscriptionsError) {
    return <ErrorState error={subscriptionsError} />
  }

  if (subscriptionsLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-8">
      <DashboardHeader title={t('title')} />

      <OverviewCards
        subscriptions={subscriptions}
        isLoading={paymentsLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentActivity
          payments={recentPayments}
          isLoading={paymentsLoading}
        />
        <QuickActions />
      </div>
    </div>
  )
}

// Pattern: Containers orchestrate data fetching and state management
// Pure presentation components receive props
// Centralized loading and error state handling
// Responsive grid layouts for different screen sizes
```

**Layout Provider Pattern:**
```typescript
// File: src/components/layout/app-layout.tsx
'use client'

import { AppSidebar } from './app-sidebar'
import { AppHeader } from './app-header'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className={cn(
        "transition-all duration-300",
        sidebarOpen ? "lg:pl-64" : "lg:pl-16"
      )}>
        <AppHeader />
        <main className="container mx-auto px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

// Pattern: Layout components manage UI state
// Responsive sidebar with collapsible behavior
// Smooth transitions for state changes
// Container-based content wrapping
```

---

## UI Library & Design System

### Tailwind CSS v4 + Design Tokens

**CSS Custom Properties Setup:**
```css
/* File: src/styles/globals.css */
@import "tailwindcss";

@layer base {
  :root {
    /* Color Palette */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;

    /* Typography */
    --font-sans: 'Inter', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;

    /* Spacing Scale */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --spacing-2xl: 3rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

/* Persian Font Support */
@layer base {
  [lang="fa"] {
    font-family: 'Vazirmatn', 'Inter', sans-serif;
    direction: rtl;
  }
}

// Pattern: CSS custom properties for theming
// Semantic color naming convention
// RTL and Persian font support
// Consistent spacing scale
```

**Component Variant Patterns:**
```typescript
// File: src/components/ui/card.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-border",
        outline: "border-2 border-border",
        ghost: "border-transparent shadow-none",
        elevated: "shadow-lg border-border/50",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, className }))}
      {...props}
    />
  )
)

// Pattern: CVA for systematic variant management
// Consistent prop interface across components
// Composable styling with Tailwind utilities
```

### Responsive Design Patterns

**Mobile-First Responsive Components:**
```typescript
// File: src/components/billing/payment-grid.tsx
import { PaymentCard } from './payment-card'
import { Payment } from '@/lib/types'

interface PaymentGridProps {
  payments: Payment[]
  isLoading?: boolean
}

export function PaymentGrid({ payments, isLoading }: PaymentGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <PaymentCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {payments.map((payment) => (
        <PaymentCard key={payment.id} payment={payment} />
      ))}
    </div>
  )
}

// Pattern: Mobile-first responsive grid systems
// Conditional rendering for loading states
// Consistent spacing scales across breakpoints
```

---

## Email Template System

### React Email v4 Integration

**Email Template Structure:**
```typescript
// File: src/emails/payment-success.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Img,
} from '@react-email/components'
import { PaymentSuccessEmailProps } from './types'

export function PaymentSuccessEmail({
  customerName,
  amount,
  paymentDate,
  subscriptionName,
  invoiceNumber,
}: PaymentSuccessEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Payment confirmation for {subscriptionName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://your-domain.com/logo.png"
            width="150"
            height="50"
            alt="Roundtable"
            style={logo}
          />

          <Heading style={h1}>Payment Confirmed</Heading>

          <Text style={text}>
            Hi {customerName},
          </Text>

          <Text style={text}>
            We've successfully processed your payment for {subscriptionName}.
          </Text>

          <Section style={detailsSection}>
            <Text style={detailLabel}>Amount Paid:</Text>
            <Text style={detailValue}>{amount} IRR</Text>

            <Text style={detailLabel}>Payment Date:</Text>
            <Text style={detailValue}>{paymentDate}</Text>

            <Text style={detailLabel}>Invoice Number:</Text>
            <Text style={detailValue}>{invoiceNumber}</Text>
          </Section>

          <Button style={button} href="https://your-domain.com/dashboard">
            View Dashboard
          </Button>

          <Text style={footer}>
            Thank you for using our service!
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// CSS-in-JS styles for email compatibility
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

// Pattern: React Email components for cross-client compatibility
// Inline styles for email client support
// Responsive design with table-based layouts
// Brand-consistent styling and typography
```

**Email Template Types:**
```typescript
// File: src/emails/types.ts
export interface PaymentSuccessEmailProps {
  customerName: string
  amount: string
  paymentDate: string
  subscriptionName: string
  invoiceNumber: string
}

export interface PaymentFailedEmailProps {
  customerName: string
  amount: string
  failureReason: string
  subscriptionName: string
  retryDate?: string
}

export interface SubscriptionExpiringEmailProps {
  customerName: string
  subscriptionName: string
  expirationDate: string
  renewalUrl: string
}

export interface WelcomeEmailProps {
  customerName: string
  subscriptionName: string
  dashboardUrl: string
}

// Pattern: Strongly typed email template props
// Consistent prop interfaces across email types
// Optional properties for conditional content
```

**Email Service Integration:**
```typescript
// File: src/services/email-service.ts
import { render } from '@react-email/render'
import { PaymentSuccessEmail } from '@/emails/payment-success'
import { PaymentFailedEmail } from '@/emails/payment-failed'
import { env } from '@/lib/env'

export class EmailService {
  static async sendPaymentSuccess(props: PaymentSuccessEmailProps) {
    const html = render(PaymentSuccessEmail(props))
    const text = render(PaymentSuccessEmail(props), { plainText: true })

    return fetch(`${env.EMAIL_API_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.EMAIL_API_TOKEN}`,
      },
      body: JSON.stringify({
        to: props.customerEmail,
        subject: `Payment Confirmation - ${props.subscriptionName}`,
        html,
        text,
      }),
    })
  }

  static async sendPaymentFailed(props: PaymentFailedEmailProps) {
    const html = render(PaymentFailedEmail(props))
    const text = render(PaymentFailedEmail(props), { plainText: true })

    return fetch(`${env.EMAIL_API_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.EMAIL_API_TOKEN}`,
      },
      body: JSON.stringify({
        to: props.customerEmail,
        subject: `Payment Failed - ${props.subscriptionName}`,
        html,
        text,
      }),
    })
  }
}

// Pattern: Service layer for email sending
// Both HTML and plain text versions
// Type-safe email template rendering
```

---

## Asset & Icon Management

### Lucide React Icon System

**Icon Component Patterns:**
```typescript
// File: src/components/ui/icon.tsx
import { LucideIcon, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconProps extends LucideProps {
  icon: LucideIcon
  className?: string
}

export function Icon({ icon: IconComponent, className, ...props }: IconProps) {
  return (
    <IconComponent
      className={cn("h-4 w-4", className)}
      {...props}
    />
  )
}

// Usage pattern for consistent icon sizing
export function IconButton({
  icon,
  children,
  ...props
}: ButtonProps & { icon: LucideIcon }) {
  return (
    <Button {...props}>
      <Icon icon={icon} className="mr-2 h-4 w-4" />
      {children}
    </Button>
  )
}

// Pattern: Wrapper component for consistent icon usage
// Default sizing with override capability
// Integration with button components
```

**Custom Icon Integration:**
```typescript
// File: src/icons/zarinpal-icon.tsx
import * as React from 'react'

interface ZarinpalIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

export function ZarinpalIcon({ className, ...props }: ZarinpalIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 17L12 22L22 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12L12 17L22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Pattern: Custom SVG icons as React components
// Props interface matching Lucide patterns
// currentColor for theme consistency
```

### Image Optimization

**Next.js Image Component Usage:**
```typescript
// File: src/components/ui/optimized-image.tsx
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  fill?: boolean
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  ...props
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      priority={priority}
      className={cn(
        "object-cover",
        fill && "absolute inset-0",
        className
      )}
      {...props}
    />
  )
}

// Pattern: Wrapper for Next.js Image optimization
// Sensible defaults for common use cases
// Fill mode for responsive containers
```

---

## Utility Libraries & Helpers

### Core Utility Functions

**Utility Library Structure:**
```typescript
// File: src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number,
  currency: 'IRR' | 'USD' = 'IRR',
  locale: 'en' | 'fa' = 'en'
) {
  const formatter = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'IRR' ? 0 : 2,
  })

  return formatter.format(amount)
}

export function formatDate(
  date: Date | string,
  locale: 'en' | 'fa' = 'en',
  options?: Intl.DateTimeFormatOptions
) {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  return new Intl.DateTimeFormat(
    locale === 'fa' ? 'fa-IR' : 'en-US',
    { ...defaultOptions, ...options }
  ).format(dateObj)
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Pattern: Centralized utility functions
// Internationalization-aware formatting
// Type-safe helper functions
```

**Validation Utilities:**
```typescript
// File: src/lib/validations.ts
import { z } from 'zod'

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const iranianPhoneSchema = z
  .string()
  .regex(/^(\+98|0)?9\d{9}$/, 'Invalid Iranian phone number')

export const subscriptionSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  billingPeriod: z.enum(['monthly', 'yearly']),
  startDate: z.date().optional(),
  autoRenew: z.boolean().default(true),
})

export const paymentMethodSchema = z.object({
  contractSignature: z.string().min(1, 'Contract signature is required'),
  bankAccount: z.string().regex(/^\d{10,16}$/, 'Invalid bank account number'),
})

// Pattern: Zod schemas for type-safe validation
// Domain-specific validation rules
// Iranian market-specific validations
```

### Authentication Helpers

**Auth Utility Functions:**
```typescript
// File: src/lib/auth.ts
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { env } from './env'

export const auth = betterAuth({
  database: prismaAdapter(db),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
})

export async function getSession() {
  try {
    const session = await auth.api.getSession()
    return session
  } catch {
    return null
  }
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    throw new Error('Authentication required')
  }
  return session
}

// Pattern: Better Auth integration
// Session management utilities
// Type-safe authentication helpers
```

---

## Performance & Optimization

### Code Splitting & Lazy Loading

**Component Lazy Loading:**
```typescript
// File: src/components/billing/subscription-management.tsx
import { lazy, Suspense } from 'react'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'

// Lazy load heavy components
const SubscriptionChart = lazy(() =>
  import('./subscription-chart').then(module => ({
    default: module.SubscriptionChart
  }))
)

const PaymentHistory = lazy(() =>
  import('./payment-history').then(module => ({
    default: module.PaymentHistory
  }))
)

export function SubscriptionManagement() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Suspense fallback={<LoadingSkeleton className="h-[400px]" />}>
          <SubscriptionChart />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton className="h-[400px]" />}>
          <PaymentHistory />
        </Suspense>
      </div>
    </div>
  )
}

// Pattern: Lazy loading for performance optimization
// Suspense boundaries with meaningful fallbacks
// Named exports for better debugging
```

**Route-Level Code Splitting:**
```typescript
// File: src/app/(app)/analytics/page.tsx
import dynamic from 'next/dynamic'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'

// Dynamic import with loading state
const AnalyticsDashboard = dynamic(
  () => import('@/containers/analytics-container'),
  {
    loading: () => <LoadingSkeleton className="min-h-[600px]" />,
    ssr: false, // Client-side only for heavy charts
  }
)

export default function AnalyticsPage() {
  return <AnalyticsDashboard />
}

// Pattern: Dynamic imports for route-level optimization
// SSR disabled for client-heavy components
// Consistent loading states
```

### Image and Asset Optimization

**Optimized Asset Loading:**
```typescript
// File: src/components/ui/avatar.tsx
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
}

export function Avatar({ src, alt, size = 'md', className }: AvatarProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-full bg-muted",
      sizeClasses[size],
      className
    )}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 32px, 48px"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <span className="text-sm font-medium text-muted-foreground">
            {alt.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}

// Pattern: Responsive image sizes
// Fallback for missing images
// Next.js Image optimization
```

---

## Development Guidelines

### Code Quality Standards

**TypeScript Best Practices:**
```typescript
// File: src/lib/types.ts
// Prefer interfaces for object shapes
export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}

// Use type for unions and primitives
export type UserRole = 'admin' | 'user' | 'billing_manager'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

// Generic utility types for API responses
export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

// Branded types for better type safety
export type UserId = string & { readonly brand: unique symbol }
export type SubscriptionId = string & { readonly brand: unique symbol }

// Pattern: Consistent type definitions
// Generic types for reusability
// Branded types for ID safety
```

**Component Testing Patterns:**
```typescript
// File: src/components/__tests__/subscription-card.test.tsx
import { render, screen } from '@testing-library/react'
import { SubscriptionCard } from '../billing/subscription-card'
import { mockSubscription } from '@/lib/test-utils'

describe('SubscriptionCard', () => {
  it('renders subscription information correctly', () => {
    const subscription = mockSubscription({
      productName: 'Premium Plan',
      status: 'active',
    })

    render(<SubscriptionCard subscription={subscription} />)

    expect(screen.getByText('Premium Plan')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows pause button for active subscriptions', () => {
    const subscription = mockSubscription({ status: 'active' })

    render(<SubscriptionCard subscription={subscription} />)

    expect(screen.getByText('Pause')).toBeInTheDocument()
  })

  it('shows resume button for paused subscriptions', () => {
    const subscription = mockSubscription({ status: 'paused' })

    render(<SubscriptionCard subscription={subscription} />)

    expect(screen.getByText('Resume')).toBeInTheDocument()
  })
})

// Pattern: Component unit testing
// Mock data utilities
// Behavior-driven test descriptions
```

### Error Handling Patterns

**Error Boundary Implementation:**
```typescript
// File: src/components/ui/error-boundary.tsx
'use client'

import React from 'react'
import { Button } from './button'
import { AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error!}
          reset={() => this.setState({ hasError: false, error: null })}
        />
      )
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {error.message}
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}

// Pattern: Class-based error boundaries
// Customizable fallback components
// Error logging and recovery
```

### Accessibility Guidelines

**ARIA and Keyboard Navigation:**
```typescript
// File: src/components/ui/dropdown-menu.tsx
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))

// Pattern: Radix UI primitives for accessibility
// ARIA attributes handled automatically
// Keyboard navigation support built-in
// Focus management and screen reader compatibility
```

---

## Conclusion

This frontend patterns guide establishes the architectural foundation for the Roundtable dashboard frontend. These patterns ensure:

- **Consistency**: Unified component architecture and styling approach
- **Performance**: Optimized loading, caching, and code splitting strategies
- **Accessibility**: WCAG-compliant components with full keyboard navigation
- **Internationalization**: Complete RTL support for Persian/Farsi localization
- **Type Safety**: End-to-end TypeScript inference from API to UI
- **Developer Experience**: Clear patterns for data fetching, state management, and error handling

### Key Implementation Principles

1. **Component Composition**: Build complex UIs from simple, reusable primitives
2. **Data Co-location**: Keep data fetching close to components that need it
3. **Progressive Enhancement**: Start with semantic HTML, enhance with JavaScript
4. **Performance Budget**: Lazy load non-critical components and routes
5. **Error Recovery**: Graceful degradation with meaningful error states
6. **Cultural Adaptation**: Design for both LTR and RTL reading patterns

### Reference Documentation

For backend integration patterns, see `docs/backend-patterns.md`
For specialized agent workflows, see `.claude/agents/README.md`
For project setup and deployment, see `CLAUDE.md`

---

**Last Updated**: January 2024
**Frontend Stack Version**: Next.js 15 + shadcn/ui + TanStack Query v5
**Target Market**: Iranian billing and subscription management platform