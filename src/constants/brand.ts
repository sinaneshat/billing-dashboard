export const BRAND = {
  name: 'Auth',
  fullName: 'Authentication Boilerplate',
  tagline: 'Secure Authentication',
  description: 'A modern authentication boilerplate with secure user management.',
  venture: 'Your Company',

  // URLs
  website: 'https://example.com',
  parentWebsite: 'https://example.com',
  support: 'support@example.com',

  // Colors (matching the design system)
  colors: {
    primary: '#22D3EE', // Cyan blue (matches email primary)
    secondary: '#14B8A6', // Teal
    dark: '#1F2937', // Deep gray
    light: '#F9FAFB', // Off-white
  },

  // Logo paths
  logos: {
    light: '/static/images/logos/logo.svg',
    dark: '/static/images/logos/logo.svg',
    iconLight: '/static/images/logos/logo.svg',
    iconDark: '/static/images/logos/logo.svg',
    round: '/static/images/logos/logo.svg',
    roundWhite: '/static/images/logos/logo.svg',
    roundBlack: '/static/images/logos/logo.svg',
    animation: '/static/images/logos/logo.svg',
    main: '/static/images/logos/logo.svg',
    mainBlack: '/static/images/logos/logo.svg',
  },

  // Typography
  typography: {
    fontFamily: 'Noto Sans',
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  // Social links
  social: {
    twitter: 'https://twitter.com/example',
    linkedin: 'https://linkedin.com/company/example',
    github: 'https://github.com/example',
  },

  // Legal
  legal: {
    terms: '/terms',
    privacy: '/privacy',
    copyright: `© ${new Date().getFullYear()} Your Company. All rights reserved.`,
  },
};

// Export type for TypeScript
export type Brand = typeof BRAND;

// API-specific brand constants
export const API_BRAND = {
  // API-specific branding
  apiName: `${BRAND.name} API`,
  apiDescription: `${BRAND.description} - Developer API`,
  apiVersion: '1.0.0',

  // Support information
  supportEmail: BRAND.support,
  docsUrl: `${BRAND.website}/docs`,

  // Rate limiting display names
  rateLimitInfo: {
    name: BRAND.name,
    website: BRAND.website,
  },

  // Error response branding
  errorBranding: {
    company: BRAND.name,
    support: BRAND.support,
    website: BRAND.website,
  },
};

// Export type for TypeScript
export type ApiBrand = typeof API_BRAND;
