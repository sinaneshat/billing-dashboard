import { Container } from '@react-email/components';
import type { ReactNode } from 'react';

type EmailContainerProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: number;
};

export function EmailContainer({
  children,
  className = 'mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]',
  maxWidth = 465,
}: EmailContainerProps) {
  const containerClass = className || `mx-auto my-[40px] max-w-[${maxWidth}px] rounded border border-[#eaeaea] border-solid p-[20px]`;

  return (
    <Container className={containerClass}>
      {children}
    </Container>
  );
}
