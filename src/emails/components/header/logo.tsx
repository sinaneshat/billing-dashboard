import { Img } from '@react-email/components';
import React from 'react';

type LogoProps = {
  width?: number;
  height?: number;
};

export function Logo({ width = 120, height = 40 }: LogoProps) {
  return (
    <Img
      src="https://example.com/logo.png"
      width={width}
      height={height}
      alt="Logo"
      style={{ display: 'block' }}
    />
  );
}
