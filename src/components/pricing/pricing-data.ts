import type { PricingPlan } from './pricing-types';

// Translation function type for pricing data
type TranslationFunction = (key: string) => string;

// Get translated pricing plans - call this from components with useTranslations()
export function getPricingPlans(t: TranslationFunction): PricingPlan[] {
  return [
    {
      id: 'free',
      name: t('pricing.free.name'),
      description: t('pricing.free.description'),
      monthlyPrice: 0,
      annualPrice: 0,
      currency: 'USD',
      currencySymbol: '$',
      popular: false,
      buttonText: t('pricing.free.buttonText'),
      buttonVariant: 'outline',
      gradientFrom: 'from-muted',
      gradientTo: 'to-muted',
      textColor: 'text-muted-foreground',
      features: [
        { text: t('pricing.features.requestsPerDay100'), included: true },
        { text: t('pricing.features.basicAccess'), included: true },
        { text: t('pricing.features.communitySupport'), included: true },
        { text: t('pricing.features.limitedApiAccess'), included: true },
        { text: t('pricing.features.prioritySupport'), included: false },
        { text: t('pricing.features.advancedAnalytics'), included: false },
      ],
    },
    {
      id: 'starter',
      name: t('pricing.starter.name'),
      description: t('pricing.starter.description'),
      monthlyPrice: 4.99,
      annualPrice: 4.00,
      currency: 'USD',
      currencySymbol: '$',
      popular: false,
      buttonText: t('pricing.starter.buttonText'),
      buttonVariant: 'outline',
      gradientFrom: 'from-secondary',
      gradientTo: 'to-secondary',
      textColor: 'text-secondary-foreground',
      features: [
        { text: t('pricing.features.requestsPerDay1000'), included: true },
        { text: t('pricing.features.standardAccess'), included: true },
        { text: t('pricing.features.emailSupport'), included: true },
        { text: t('pricing.features.apiAccess'), included: true },
        { text: t('pricing.features.basicAnalytics'), included: true },
        { text: t('pricing.features.customIntegrations'), included: false },
      ],
    },
    {
      id: 'premium',
      name: t('pricing.premium.name'),
      description: t('pricing.premium.description'),
      monthlyPrice: 9.99,
      annualPrice: 8.00, // 20% discount
      currency: 'USD',
      currencySymbol: '$',
      popular: true,
      buttonText: t('pricing.premium.buttonText'),
      buttonVariant: 'default',
      gradientFrom: 'from-primary',
      gradientTo: 'to-primary',
      textColor: 'text-primary-foreground',
      features: [
        { text: t('pricing.features.unlimitedGeneration'), included: true },
        { text: t('pricing.features.fullAccess'), included: true },
        { text: t('pricing.features.prioritySupport'), included: true },
        { text: t('pricing.features.advancedAnalytics'), included: true },
        { text: t('pricing.features.fullApiAccess'), included: true },
        { text: t('pricing.features.basicIntegrations'), included: true },
      ],
    },
    {
      id: 'enterprise',
      name: t('pricing.enterprise.name'),
      description: t('pricing.enterprise.description'),
      monthlyPrice: 0, // Custom pricing
      annualPrice: 0, // Custom pricing
      currency: 'USD',
      currencySymbol: '$',
      popular: false,
      buttonText: t('pricing.enterprise.buttonText'),
      buttonVariant: 'outline',
      gradientFrom: 'from-muted',
      gradientTo: 'to-muted',
      textColor: 'text-muted-foreground',
      features: [
        { text: t('pricing.features.customDeployment'), included: true },
        { text: t('pricing.features.comprehensiveAnalytics'), included: true },
        { text: t('pricing.features.specializedTraining'), included: true },
        { text: t('pricing.features.dedicatedSupport'), included: true },
        { text: t('pricing.features.customIntegrationsIncluded'), included: true },
        { text: t('pricing.features.slaGuarantees'), included: true },
      ],
    },
  ];
}

// Legacy export for backward compatibility - uses English fallbacks
export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For personal exploration and getting started.',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'USD',
    currencySymbol: '$',
    popular: false,
    buttonText: 'Get started',
    buttonVariant: 'outline',
    gradientFrom: 'from-muted',
    gradientTo: 'to-muted',
    textColor: 'text-muted-foreground',
    features: [
      { text: '100 requests per day', included: true },
      { text: 'Basic features access', included: true },
      { text: 'Community support', included: true },
      { text: 'Limited API access', included: true },
      { text: 'Priority support', included: false },
      { text: 'Advanced analytics', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small projects and individual developers.',
    monthlyPrice: 4.99,
    annualPrice: 4.00,
    currency: 'USD',
    currencySymbol: '$',
    popular: false,
    buttonText: 'Choose plan',
    buttonVariant: 'outline',
    gradientFrom: 'from-secondary',
    gradientTo: 'to-secondary',
    textColor: 'text-secondary-foreground',
    features: [
      { text: '1,000 requests per day', included: true },
      { text: 'Standard features access', included: true },
      { text: 'Email support', included: true },
      { text: 'API access', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Custom integrations', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Perfect for professionals and growing businesses.',
    monthlyPrice: 9.99,
    annualPrice: 8.00, // 20% discount
    currency: 'USD',
    currencySymbol: '$',
    popular: true,
    buttonText: 'Most popular',
    buttonVariant: 'default',
    gradientFrom: 'from-primary',
    gradientTo: 'to-primary',
    textColor: 'text-primary-foreground',
    features: [
      { text: 'Unlimited AI generation', included: true },
      { text: 'Full features access', included: true },
      { text: 'Priority support', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Full API access', included: true },
      { text: 'Basic integrations', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations requiring specialized support.',
    monthlyPrice: 0, // Custom pricing
    annualPrice: 0, // Custom pricing
    currency: 'USD',
    currencySymbol: '$',
    popular: false,
    buttonText: 'Contact sales',
    buttonVariant: 'outline',
    gradientFrom: 'from-muted',
    gradientTo: 'to-muted',
    textColor: 'text-muted-foreground',
    features: [
      { text: 'Custom deployment', included: true },
      { text: 'Comprehensive analytics', included: true },
      { text: 'Specialized model training', included: true },
      { text: '24/7 dedicated support', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'SLA guarantees', included: true },
    ],
  },
];

// Helper function to get plan by ID from translated plans
export function getPlanByIdTranslated(plans: PricingPlan[], id: string): PricingPlan | undefined {
  return plans.find(plan => plan.id === id);
}

// Helper function to get plan by ID (legacy)
export function getPlanById(id: string): PricingPlan | undefined {
  return pricingPlans.find(plan => plan.id === id);
}

// Helper function to calculate savings
export function calculateAnnualSavings(plan: PricingPlan): number {
  const monthlyTotal = plan.monthlyPrice * 12;
  const annualTotal = plan.annualPrice * 12;
  return monthlyTotal - annualTotal;
}

// Helper function to calculate savings percentage
export function calculateSavingsPercentage(plan: PricingPlan): number {
  const monthlyTotal = plan.monthlyPrice * 12;
  const savings = calculateAnnualSavings(plan);
  return monthlyTotal > 0 ? Math.round((savings / monthlyTotal) * 100) : 0;
}
