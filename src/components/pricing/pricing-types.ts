// Pricing table types and data structures
export type PricingPeriod = 'monthly' | 'annual';

export type PricingFeature = {
  text: string;
  included: boolean;
  description?: string;
};

export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  currencySymbol: string;
  popular: boolean;
  features: PricingFeature[];
  buttonText: string;
  buttonVariant: 'default' | 'secondary' | 'outline';
  gradientFrom: string;
  gradientTo: string;
  textColor: string;
  buttonColor?: string;
};

export type PricingTableProps = {
  plans: PricingPlan[];
  period: PricingPeriod;
  onPeriodChange: (period: PricingPeriod) => void;
  onPlanSelect: (planId: string) => void;
  className?: string;
};

export type PricingCardProps = {
  plan: PricingPlan;
  period: PricingPeriod;
  onSelect: (planId: string) => void;
  className?: string;
};

export type BillingToggleProps = {
  period: PricingPeriod;
  onPeriodChange: (period: PricingPeriod) => void;
  annualDiscountPercentage?: number;
  className?: string;
};
