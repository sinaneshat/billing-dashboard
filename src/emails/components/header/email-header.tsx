import { Section } from '@react-email/components';
import type { ReactNode } from 'react';

import { Logo } from './logo';

type EmailHeaderProps = {
  children?: ReactNode;
  className?: string;
  showLogo?: boolean;
  logoWidth?: number;
  logoHeight?: number;
};

export function EmailHeader({
  children,
  className = 'mt-[32px]',
  showLogo = true,
  logoWidth = 240,
  logoHeight = 80,
}: EmailHeaderProps) {
  return (
    <Section className={className}>
      {showLogo && (
        <Logo
          width={logoWidth}
          height={logoHeight}
        />
      )}
      {children}
    </Section>
  );
}
