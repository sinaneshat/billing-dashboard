/**
 * Open Graph Image Generation Utilities
 *
 * Dynamic OG image generation using Next.js ImageResponse
 * Supports multiple templates for different content types
 */

import { ImageResponse } from 'next/og';

import { BRAND } from '@/constants/brand';

/**
 * OG Image configuration
 */
export const OG_IMAGE_CONFIG = {
  width: 1200,
  height: 630,
  contentType: 'image/png',
} as const;

/**
 * Base OG image template
 * Used for generic pages
 */
export async function generateOgImage(props: {
  title: string;
  description?: string;
  type?: 'default' | 'product' | 'article';
}) {
  const { title, description, type = 'default' } = props;

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
            fontSize: type === 'product' ? 56 : 64,
            fontWeight: 800,
            color: '#fff',
            textAlign: 'center',
            maxWidth: '80%',
            lineHeight: 1.2,
            marginBottom: description ? 20 : 0,
          }}
        >
          {title}
        </div>

        {/* Description (optional) */}
        {description && (
          <div
            style={{
              fontSize: 28,
              color: '#a1a1aa',
              textAlign: 'center',
              maxWidth: '70%',
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        )}

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
      ...OG_IMAGE_CONFIG,
    },
  );
}

/**
 * Product OG image template
 * Used for pricing plans and product pages
 */
export async function generateProductOgImage(props: {
  name: string;
  price: number;
  currency?: string;
  features?: string[];
}) {
  const { name, price, currency = 'USD', features = [] } = props;

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
        {/* Brand */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: '#a1a1aa',
            marginBottom: 20,
          }}
        >
          {BRAND.name}
        </div>

        {/* Product Name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#fff',
            textAlign: 'center',
            marginBottom: 30,
          }}
        >
          {name}
        </div>

        {/* Price */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#22c55e',
            marginBottom: 40,
          }}
        >
          {currency === 'USD' ? '$' : currency}
          {price.toLocaleString()}
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              maxWidth: '80%',
              justifyContent: 'center',
            }}
          >
            {features.slice(0, 3).map((feature, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#18181b',
                  borderRadius: 6,
                  fontSize: 20,
                  color: '#a1a1aa',
                }}
              >
                ✓
                {' '}
                {feature}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    {
      ...OG_IMAGE_CONFIG,
    },
  );
}

/**
 * Article/Blog OG image template
 * Used for blog posts and documentation
 */
export async function generateArticleOgImage(props: {
  title: string;
  author?: string;
  date?: string;
  category?: string;
}) {
  const { title, author, date, category } = props;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000',
          backgroundImage: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          padding: 60,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 60,
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {BRAND.name}
          </div>
          {category && (
            <div
              style={{
                padding: '8px 20px',
                backgroundColor: '#18181b',
                borderRadius: 6,
                fontSize: 20,
                color: '#22c55e',
              }}
            >
              {category}
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.2,
            marginBottom: 40,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {title}
        </div>

        {/* Footer Meta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 30,
            fontSize: 24,
            color: '#a1a1aa',
          }}
        >
          {author && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              By
              {' '}
              {author}
            </div>
          )}
          {date && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_CONFIG,
    },
  );
}

/**
 * Error/404 OG image template
 */
export async function generateErrorOgImage(props: {
  code: number;
  message: string;
}) {
  const { code, message } = props;

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
        {/* Error Code */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: '#ef4444',
            marginBottom: 20,
          }}
        >
          {code}
        </div>

        {/* Error Message */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: '#a1a1aa',
            textAlign: 'center',
            maxWidth: '70%',
          }}
        >
          {message}
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_CONFIG,
    },
  );
}
