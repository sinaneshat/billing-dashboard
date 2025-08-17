import { Link } from '@react-email/components';
import type { ReactNode } from 'react';

type EmailLinkProps = {
  children: ReactNode;
  href: string;
  className?: string;
  target?: '_blank' | '_self';
  color?: 'primary' | 'secondary' | 'dark' | 'muted';
  style?: React.CSSProperties;
};

const colorStyles = {
  primary: 'text-brand-primary',
  secondary: 'text-brand-secondary',
  dark: 'text-brand-dark',
  muted: 'text-[#6B7280]',
};

export function EmailLink({
  children,
  href,
  className,
  target = '_blank',
  color = 'primary',
  style,
}: EmailLinkProps) {
  const baseClass = `${colorStyles[color]} underline`;
  const finalClass = className || baseClass;

  return (
    <Link
      href={href}
      className={finalClass}
      target={target}
      style={style}
    >
      {children}
    </Link>
  );
}

export default EmailLink;
