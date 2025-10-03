/**
 * Dynamic Open Graph Image Generation API Route
 *
 * Generates OG images on-demand based on query parameters.
 * Uses Next.js ImageResponse for server-side image generation.
 *
 * Query Parameters:
 * - title: Main title text (required)
 * - description: Subtitle/description text (optional)
 * - type: Image template type - 'default', 'product', 'article', 'error' (default: 'default')
 * - price: Product price (for product type)
 * - currency: Currency code (default: 'USD')
 * - author: Author name (for article type)
 * - date: Publication date (for article type)
 * - code: Error code (for error type)
 *
 * @example
 * /api/og?title=Welcome&description=Get started
 * /api/og?type=product&title=Pro Plan&price=29&currency=USD
 * /api/og?type=article&title=New Feature&author=John Doe&date=2024-01-01
 * /api/og?type=error&code=404&title=Page Not Found
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  generateArticleOgImage,
  generateErrorOgImage,
  generateOgImage,
  generateProductOgImage,
} from '@/lib/utils/og-image';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract common parameters
    const title = searchParams.get('title');
    const type = (searchParams.get('type') || 'default') as
      | 'default'
      | 'product'
      | 'article'
      | 'error';

    if (!title) {
      return NextResponse.json(
        { error: 'Missing required parameter: title' },
        { status: 400 },
      );
    }

    // Generate image based on type
    switch (type) {
      case 'product': {
        const price = Number.parseFloat(searchParams.get('price') || '0');
        const currency = searchParams.get('currency') || 'USD';
        const features = searchParams.get('features')?.split(',') || [];

        return generateProductOgImage({
          name: title,
          price,
          currency,
          features,
        });
      }

      case 'article': {
        const author = searchParams.get('author') || undefined;
        const date = searchParams.get('date') || undefined;
        const category = searchParams.get('category') || undefined;

        return generateArticleOgImage({
          title,
          author,
          date,
          category,
        });
      }

      case 'error': {
        const code = Number.parseInt(searchParams.get('code') || '500', 10);

        return generateErrorOgImage({
          code,
          message: title,
        });
      }

      default: {
        const description = searchParams.get('description') || undefined;

        return generateOgImage({
          title,
          description,
          type: 'default',
        });
      }
    }
  } catch (error) {
    console.error('OG image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate OG image' },
      { status: 500 },
    );
  }
}
