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
  primary: 'text-black',
  secondary: 'text-[#6B7280]',
  muted: 'text-[#9CA3AF]',
  white: 'text-white',
  error: 'text-[#EF4444]',
  warning: 'text-[#F8C110]',
};

const alignStyles = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
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
