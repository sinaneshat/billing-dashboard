import { Section } from '@react-email/components';
import type { ReactNode } from 'react';

type EmailSectionProps = {
  children: ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
};

const spacingStyles = {
  sm: 'mt-[16px] mb-[16px]',
  md: 'mt-[24px] mb-[24px]',
  lg: 'mt-[32px] mb-[32px]',
};

const alignStyles = {
  left: 'text-start',
  center: 'text-center',
  right: 'text-end',
};

export function EmailSection({
  children,
  className,
  spacing = 'md',
  align = 'left',
}: EmailSectionProps) {
  const baseClass = `${spacingStyles[spacing]} ${alignStyles[align]}`;
  const finalClass = className || baseClass;

  return (
    <Section className={finalClass}>
      {children}
    </Section>
  );
}

export default EmailSection;
