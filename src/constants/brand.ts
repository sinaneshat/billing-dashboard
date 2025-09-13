export const BRAND = {
  name: 'Roundtable',
  fullName: 'Roundtable Billing Dashboard',
  tagline: 'Multiple AI Models Brainstorm Together',
  description: 'Advanced billing solutions for AI collaboration platforms. Where multiple minds meet.',
  venture: 'Roundtable',

  // URLs
  website: 'https://roundtable.now/',
  parentWebsite: 'https://roundtable.now/',
  support: 'hello@roundtable.now',

  // Colors (Professional AI/tech brand colors)
  colors: {
    primary: '#2563eb', // Modern blue
    secondary: '#64748b', // Slate gray
    dark: '#0f172a', // Dark slate
    light: '#f8fafc', // Light slate
    accent: '#3b82f6', // Bright blue
    background: '#ffffff', // White background
    foreground: '#1e293b', // Dark text
  },

  // Logo paths - Proper transparent logos for different use cases
  logos: {
    light: '/static/logo.png', // Transparent background for light themes
    dark: '/static/logo.png', // Transparent background for dark themes
    iconLight: '/static/logo.png', // Use transparent logo for icons too
    iconDark: '/static/logo.png', // Use transparent logo for icons too
    round: '/static/logo.png', // Main transparent logo for full variant
    roundWhite: '/static/logo.png', // Transparent logo works on all backgrounds
    roundBlack: '/apple-touch-icon.png', // Keep apple-touch-icon for PWA/mobile only
    animation: '/static/logo.png',
    main: '/static/logo.png',
    mainBlack: '/static/logo.png',
  },

  // Typography (Modern tech fonts)
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
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
    twitter: 'https://twitter.com/roundtablenow',
    linkedin: 'https://linkedin.com/company/roundtable',
    github: 'https://github.com/roundtable',
  },

  // Legal
  legal: {
    terms: '/terms',
    privacy: '/privacy',
    copyright: `© ${new Date().getFullYear()} Roundtable. All rights reserved.`,
  },
};

// Export type for TypeScript
export type Brand = typeof BRAND;

// API-specific brand constants
export const API_BRAND = {
  // API-specific branding
  apiName: `${BRAND.name} Billing API`,
  apiDescription: `${BRAND.description} - Billing & Payment API`,
  apiVersion: '1.0.0',

  // Support information
  supportEmail: BRAND.support,
  docsUrl: `${BRAND.website}docs`,

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

  // Roundtable specific messaging
  messaging: {
    rateLimitMessage: 'Processing capacity exceeded. Multiple models need time to think.',
    unauthorizedMessage: 'Access denied. Please join the roundtable with proper credentials.',
    serverErrorMessage: 'System processing error. The AI collaboration network is experiencing issues.',
  },
};

// Export type for TypeScript
export type ApiBrand = typeof API_BRAND;
