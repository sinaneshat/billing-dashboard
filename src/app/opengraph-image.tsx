/**
 * Default Open Graph Image for all pages
 * Uses Next.js ImageResponse API (no edge runtime needed)
 * Supports ISR with revalidation
 */
import { ImageResponse } from 'next/og';

import { BRAND } from '@/constants/brand';

export const runtime = 'nodejs'; // Use Node.js runtime (compatible with OpenNext)
export const revalidate = 3600; // ISR: Revalidate every hour
export const alt = BRAND.fullName;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          backgroundImage: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        }}
      >
        {/* Brand Logo/Icon Area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.05em',
            }}
          >
            {BRAND.name}
          </div>
        </div>

        {/* Main Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#fff',
            textAlign: 'center',
            maxWidth: '80%',
            lineHeight: 1.2,
            marginBottom: 20,
          }}
        >
          {BRAND.fullName}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 28,
            color: '#a1a1aa',
            textAlign: 'center',
            maxWidth: '70%',
            lineHeight: 1.4,
          }}
        >
          {BRAND.description}
        </div>

        {/* Footer Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            display: 'flex',
            alignItems: 'center',
            padding: '12px 24px',
            backgroundColor: '#18181b',
            borderRadius: 8,
            fontSize: 20,
            color: '#a1a1aa',
          }}
        >
          {BRAND.tagline}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
