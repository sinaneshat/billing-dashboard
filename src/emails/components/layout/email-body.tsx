import { Body } from '@react-email/components';
import type { ReactNode } from 'react';

type EmailBodyProps = {
  children: ReactNode;
  className?: string;
};

export function EmailBody({
  children,
  className = 'mx-auto my-auto bg-white px-2 font-system',
}: EmailBodyProps) {
  return (
    <Body className={className}>
      {children}
    </Body>
  );
}
