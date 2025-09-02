import React from 'react';

type LogoProps = {
  width?: number;
  height?: number;
};

export function Logo({ width = 160, height = 40 }: LogoProps) {
  return (
    <div style={{ display: 'block' }}>
      <img
        src="/static/logo.svg"
        alt="Roundtable"
        style={{
          width,
          height,
          display: 'block',
        }}
      />
    </div>
  );
}
