/**
 * PricingDisplay Component
 * Reusable pricing display component following shadcn/ui patterns
 * Supports USD pricing display with proper formatting
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertTriangle } from 'lucide-react'

import { cn } from "@/lib/utils"
import { Badge } from './badge'
import { Skeleton } from './skeleton'

// =============================================================================
// COMPONENT VARIANTS
// =============================================================================

const pricingDisplayVariants = cva(
  "flex items-center gap-2",
  {
    variants: {
      variant: {
        default: "text-foreground",
        primary: "text-primary font-semibold",
        secondary: "text-muted-foreground",
        success: "text-chart-3",
        warning: "text-chart-2",
        destructive: "text-destructive",
      },
      size: {
        sm: "text-sm",
        default: "text-base",
        lg: "text-lg font-medium",
        xl: "text-xl font-semibold",
        "2xl": "text-2xl font-bold",
      },
      layout: {
        inline: "flex-row",
        stacked: "flex-col items-start gap-1",
        card: "flex-col items-center text-center gap-2 p-4 rounded-lg border bg-card",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      layout: "inline",
    },
  }
)

// =============================================================================
// COMPONENT TYPES
// =============================================================================

export interface PricingDisplayProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'size'>,
    VariantProps<typeof pricingDisplayVariants> {
  /** Pre-formatted price from backend API (e.g., "$99/month") */
  formattedPrice: string
  /** Loading state while fetching price data */
  isLoading?: boolean
  /** Error state when price loading fails */
  isError?: boolean
  /** Custom error message */
  errorMessage?: string
  /** Badge to show alongside price (e.g., "Popular", "Best Value") */
  badge?: {
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  /** Additional content to show below price */
  children?: React.ReactNode
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PricingDisplay = React.forwardRef<HTMLDivElement, PricingDisplayProps>(
  ({
    className,
    variant,
    size,
    layout,
    formattedPrice,
    isLoading = false,
    isError = false,
    errorMessage,
    badge,
    children,
    ...props
  }, ref) => {

    // Loading state
    if (isLoading) {
      return (
        <div ref={ref} className={cn(pricingDisplayVariants({ variant, size, layout, className }))} {...props}>
          <Skeleton className="h-6 w-24" />
        </div>
      )
    }

    // Error state
    if (isError) {
      return (
        <div ref={ref} className={cn(pricingDisplayVariants({ variant: "destructive", size, layout, className }))} {...props}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{errorMessage || "Currency conversion failed"}</span>
          </div>
        </div>
      )
    }

    // Use pre-formatted price from backend API (already includes period if needed)

    return (
      <div ref={ref} className={cn(pricingDisplayVariants({ variant, size, layout, className }))} {...props}>
        <div className="flex items-center gap-2">
          {/* Main price display */}
          <span className="font-mono tabular-nums">
            {formattedPrice}
          </span>

          {/* Badge if provided */}
          {badge && (
            <Badge variant={badge.variant || 'default'} className="text-xs">
              {badge.text}
            </Badge>
          )}

          {/* Conversion info removed - backend handles all conversions */}
        </div>

        {/* Additional content */}
        {children}
      </div>
    )
  }
)

PricingDisplay.displayName = "PricingDisplay"

// =============================================================================
// SPECIALIZED VARIANTS
// =============================================================================

/**
 * Simple inline price display
 */
export const InlinePricing = React.forwardRef<HTMLDivElement, Omit<PricingDisplayProps, 'layout'>>(
  (props, ref) => <PricingDisplay ref={ref} layout="inline" {...props} />
)

InlinePricing.displayName = "InlinePricing"

/**
 * Card-style pricing display for plans
 */
export const PricingCard = React.forwardRef<HTMLDivElement, Omit<PricingDisplayProps, 'layout' | 'variant' | 'size'>>(
  ({ className, ...props }, ref) => (
    <PricingDisplay
      ref={ref}
      layout="card"
      variant="primary"
      size="xl"
      className={cn("min-h-[120px] justify-center", className)}
      {...props}
    />
  )
)

PricingCard.displayName = "PricingCard"

/**
 * Stacked pricing display for detailed views
 */
export const StackedPricing = React.forwardRef<HTMLDivElement, Omit<PricingDisplayProps, 'layout'>>(
  (props, ref) => <PricingDisplay ref={ref} layout="stacked" {...props} />
)

StackedPricing.displayName = "StackedPricing"

/**
 * Compact pricing for tables and lists
 */
export const CompactPricing = React.forwardRef<HTMLDivElement, Omit<PricingDisplayProps, 'size'>>(
  (props, ref) => <PricingDisplay ref={ref} size="sm" {...props} />
)

CompactPricing.displayName = "CompactPricing"

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Price comparison component showing before/after pricing
 */
export interface PriceComparisonProps {
  originalFormattedPrice: string
  newFormattedPrice: string
  className?: string
}

export const PriceComparison = React.forwardRef<HTMLDivElement, PriceComparisonProps>(
  ({ originalFormattedPrice, newFormattedPrice, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {/* Original price (crossed out) */}
        <div className="flex items-center gap-2">
          <span className="line-through text-muted-foreground text-sm">
            {originalFormattedPrice}
          </span>
          {/* Savings calculation moved to backend since we don't have numeric prices */}
        </div>

        {/* New price */}
        <PricingDisplay
          formattedPrice={newFormattedPrice}
          variant="primary"
          size="lg"
        />
      </div>
    )
  }
)

PriceComparison.displayName = "PriceComparison"

// =============================================================================
// EXPORTS
// =============================================================================

// Types are already exported as interfaces above
export { pricingDisplayVariants }