import { Text } from '@react-email/components';
import type { ReactNode } from 'react';

type EmailTextProps = {
  children: ReactNode;
  size?: 'sm' | 'base' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'white' | 'error' | 'warning';
  className?: string;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
};

const sizeStyles = {
  sm: 'text-[12px] leading-[16px]',
  base: 'text-[14px] leading-[24px]',
  lg: 'text-[16px] leading-[26px]',
};

const weightStyles = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const colorStyles = {
  primary: 'text-foreground',
  secondary: 'text-muted-foreground',
  muted: 'text-muted-foreground/70',
  white: 'text-white',
  error: 'text-destructive',
  warning: 'text-yellow-600',
};

const alignStyles = {
  left: 'text-start',
  center: 'text-center',
  right: 'text-end',
};

export function EmailText({
  children,
  size = 'base',
  weight = 'normal',
  color = 'primary',
  className,
  align = 'left',
  style,
}: EmailTextProps) {
  const baseClass = `${sizeStyles[size]} ${weightStyles[weight]} ${colorStyles[color]} ${alignStyles[align]}`;
  const finalClass = className || baseClass;

  return (
    <Text className={finalClass} style={style}>
      {children}
    </Text>
  );
}

export default EmailText;
