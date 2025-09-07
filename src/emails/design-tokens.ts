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

// Brand Colors - Aligned with design system light mode
export const colors = {
  // Primary Brand Color
  primary: '#22D3EE', // New primary color
  primaryForeground: '#FFFFFF', // White text on primary
  primaryHover: '#0FBCDB', // Slightly darker for hover states

  // Core Colors from global.css light mode
  background: '#FAFAFA', // hsl(0 0% 98%)
  foreground: '#0C0C0D', // hsl(222.8571 84% 4.902%)
  card: '#FFFFFF', // hsl(0 0% 100%)
  cardForeground: '#0C0C0D', // hsl(222.8571 84% 4.902%)

  // Secondary & Muted
  secondary: '#F5F5F6', // hsl(210 40% 96.0784%)
  secondaryForeground: '#1D1C20', // hsl(222.2222 47.3684% 11.1765%)
  muted: '#F5F5F6', // hsl(210 40% 96.0784%)
  mutedForeground: '#767679', // hsl(215.3846 16.318% 46.8627%)

  // Border
  border: '#E6E6E6', // hsl(0 0% 90%)
  input: '#E4E9F1', // hsl(214.2857 31.8182% 91.3725%)

  // Semantic Colors (used sparingly)
  destructive: '#EF4444', // hsl(0 84.2365% 60.1961%)
  destructiveForeground: '#FFFFFF',
  success: '#22C55E', // hsl(142.1277 76.2162% 36.2745%)
  warning: '#F8C110', // hsl(45.3982 93.3884% 47.451%)
  error: '#EF4444', // Same as destructive for consistency
  info: '#3B82F6', // Blue for informational messages
  brandAccent: '#14B8A6', // Secondary brand color - teal

  // Text hierarchy
  textPrimary: '#0C0C0D', // Main text - foreground color
  textSecondary: '#767679', // Secondary text - muted foreground
  textMuted: '#A1A1AA', // Even more muted
  textInverse: '#FFFFFF', // White text

  // Simplified backgrounds
  white: '#FFFFFF',
  backgroundPrimary: '#FFFFFF',
  backgroundSecondary: '#FAFAFA',
};

// Typography - Email-safe font stack
export const typography = {
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

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

// Border radius
export const borderRadius = {
  none: '0px',
  sm: '4px',
  base: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
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

// Component variants
export const components = {
  button: {
    primary: {
      'backgroundColor': colors.primary,
      'color': colors.primaryForeground,
      'borderColor': colors.primary,
      ':hover': {
        backgroundColor: colors.primaryHover,
      },
    },
    secondary: {
      'backgroundColor': colors.secondary,
      'color': colors.secondaryForeground,
      'borderColor': colors.border,
      ':hover': {
        backgroundColor: '#EBEBEC', // Slightly darker than secondary
      },
    },
    outline: {
      'backgroundColor': 'transparent',
      'color': colors.foreground,
      'borderColor': colors.border,
      ':hover': {
        backgroundColor: colors.secondary,
      },
    },
    ghost: {
      'backgroundColor': 'transparent',
      'color': colors.foreground,
      'borderColor': 'transparent',
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

// Layout presets
export const layouts = {
  container: {
    maxWidth: containers.content,
    margin: '40px auto',
    padding: spacing[5],
    backgroundColor: colors.white,
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
