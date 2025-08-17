import { Heading } from '@react-email/components';
import type { ReactNode } from 'react';

type EmailHeadingProps = {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
  align?: 'left' | 'center' | 'right';
};

const headingStyles = {
  1: 'text-[30px] font-bold leading-[36px] text-black',
  2: 'text-[24px] font-bold leading-[30px] text-black',
  3: 'text-[20px] font-semibold leading-[26px] text-black',
  4: 'text-[18px] font-semibold leading-[24px] text-black',
};

const alignStyles = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function EmailHeading({
  children,
  level = 1,
  className,
  align = 'center',
}: EmailHeadingProps) {
  const baseClass = `mx-0 my-[30px] p-0 font-normal ${headingStyles[level]} ${alignStyles[align]}`;
  const finalClass = className || baseClass;

  return (
    <Heading as={`h${level}` as const} className={finalClass}>
      {children}
    </Heading>
  );
}

export default EmailHeading;
