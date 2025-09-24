/**
 * Email Design Tokens
 *
 * Comprehensive design system for email templates with email-safe properties.
 * All values are converted to pixels for maximum email client compatibility.
 */

// Environment configuration
export const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://billing-dashboard-production.firstexhotic.workers.dev');

// Brand Colors - Aligned with global.css design system light mode
export const colors = {
  // Primary Brand Color - matching global.css primary
  primary: '#606060', // hsl(0 0% 37.6471%) converted to hex
  primaryForeground: '#FFFFFF', // hsl(0 0% 100%)
  primaryHover: '#525252', // Slightly darker for hover states

  // Core Colors from global.css light mode (exact matches)
  background: '#F0F0F0', // hsl(0 0% 94.1176%)
  foreground: '#333333', // hsl(0 0% 20%)
  card: '#F5F5F5', // hsl(0 0% 96.0784%)
  cardForeground: '#333333', // hsl(0 0% 20%)

  // Secondary & Muted - exact global.css matches
  secondary: '#E0E0E0', // hsl(0 0% 87.8431%)
  secondaryForeground: '#333333', // hsl(0 0% 20%)
  muted: '#D9D9D9', // hsl(0 0% 85.098%)
  mutedForeground: '#666666', // hsl(0 0% 40%)

  // Accent matching global.css
  accent: '#C0C0C0', // hsl(0 0% 75.2941%)
  accentForeground: '#333333', // hsl(0 0% 20%)

  // Border matching global.css
  border: '#D0D0D0', // hsl(0 0% 81.5686%)
  input: '#E0E0E0', // hsl(0 0% 87.8431%)
  ring: '#606060', // hsl(0 0% 37.6471%) - same as primary

  // Semantic Colors (minimal, email-safe)
  destructive: '#CC0000', // hsl(0 60% 50%) - from global.css
  destructiveForeground: '#FFFFFF',

  // Text hierarchy aligned with global system
  textPrimary: '#333333', // Main text - foreground color
  textSecondary: '#666666', // Secondary text - muted foreground
  textMuted: '#999999', // Even more muted
  textInverse: '#FFFFFF', // White text

  // Simplified backgrounds
  white: '#FFFFFF',
  backgroundPrimary: '#F5F5F5', // Card color
  backgroundSecondary: '#F0F0F0', // Background color
};

// Typography - Matching global.css font system with email-safe fallbacks
export const typography = {
  fontFamily: '"IBM Plex Sans Arabic", "Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

  fontSize: {
    'xs': '12px',
    'sm': '14px',
    'base': '16px',
    'lg': '18px',
    'xl': '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '20px',
    normal: '24px',
    relaxed: '28px',
    loose: '32px',
  },

  letterSpacing: {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
  },
};

// Spacing - Pixel-based for email compatibility
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
};

// Container sizes
export const containers = {
  email: '600px', // Standard email width
  content: '465px', // Content container (Vercel-style)
  mobile: '320px', // Mobile fallback
};

// Border radius - Matching global.css system (--radius: 0.35rem = 5.6px)
export const borderRadius = {
  none: '0px',
  sm: '2px', // --radius - 4px
  base: '4px', // --radius - 2px
  md: '6px', // --radius (0.35rem = 5.6px, rounded to 6px for email)
  lg: '10px', // --radius + 4px
  xl: '14px', // larger variant
  full: '9999px',
};

// Shadows - Email-safe
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  none: 'none',
};

// Component variants - Aligned with global.css design system
export const components = {
  button: {
    primary: {
      'backgroundColor': colors.primary,
      'color': colors.primaryForeground,
      'borderColor': colors.primary,
      'borderRadius': borderRadius.md,
      ':hover': {
        backgroundColor: colors.primaryHover,
      },
    },
    secondary: {
      'backgroundColor': colors.secondary,
      'color': colors.secondaryForeground,
      'borderColor': colors.border,
      'borderRadius': borderRadius.md,
      ':hover': {
        backgroundColor: colors.muted, // Use muted color for hover
      },
    },
    outline: {
      'backgroundColor': 'transparent',
      'color': colors.foreground,
      'borderColor': colors.border,
      'borderRadius': borderRadius.md,
      ':hover': {
        backgroundColor: colors.secondary,
      },
    },
    ghost: {
      'backgroundColor': 'transparent',
      'color': colors.foreground,
      'borderColor': 'transparent',
      'borderRadius': borderRadius.md,
      ':hover': {
        backgroundColor: colors.secondary,
      },
    },
  },

  text: {
    heading1: {
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: '36px',
      color: colors.foreground,
    },
    heading2: {
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: '30px',
      color: colors.foreground,
    },
    heading3: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: '26px',
      color: colors.foreground,
    },
    heading4: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.normal,
      color: colors.foreground,
    },
    body: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
      color: colors.foreground,
    },
    small: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.normal,
      lineHeight: '16px',
      color: colors.mutedForeground,
    },
    caption: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.normal,
      lineHeight: '16px',
      color: colors.textMuted,
    },
  },
};

// Layout presets - Using updated color system
export const layouts = {
  container: {
    maxWidth: containers.content,
    margin: '40px auto',
    padding: spacing[5],
    backgroundColor: colors.backgroundPrimary,
    borderRadius: borderRadius.md,
  },

  section: {
    margin: `${spacing[8]} 0`,
  },

  header: {
    textAlign: 'center' as const,
    margin: `${spacing[8]} 0`,
  },

  footer: {
    textAlign: 'center' as const,
    margin: `${spacing[6]} 0`,
    padding: `${spacing[4]} 0`,
    borderTop: `1px solid ${colors.border}`,
    color: colors.textSecondary,
  },
};

// Asset URLs
export const assets = {
  logo: `${baseUrl}/static/logo.svg`,
  logoBlack: `${baseUrl}/static/logo.svg`,
  logoRound: `${baseUrl}/static/logo.svg`,
  logoRoundWhite: `${baseUrl}/static/logo.svg`,
  logoRoundBlack: `${baseUrl}/static/logo.svg`,
  fallbackAvatar: `${baseUrl}/static/images/avatar-placeholder.png`,
  placeholder: `${baseUrl}/static/images/placeholder/placeholder.svg`,
};
