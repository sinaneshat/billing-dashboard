import type { CSSProperties, ReactNode } from 'react';

import { colors, typography } from '@/emails/design-tokens';

type EmailHighlightProps = {
  children: ReactNode;
  color?: 'brand' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  weight?: 'medium' | 'semibold' | 'bold';
  style?: CSSProperties;
};

const colorStyles: Record<string, string> = {
  brand: colors.primary,
  accent: colors.brandAccent,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
};

export function EmailHighlight({
  children,
  color = 'brand',
  weight = 'semibold',
  style,
}: EmailHighlightProps) {
  const highlightStyle: CSSProperties = {
    color: colorStyles[color],
    fontWeight: typography.fontWeight[weight],
    ...style,
  };

  return <span style={highlightStyle}>{children}</span>;
}

export default EmailHighlight;
