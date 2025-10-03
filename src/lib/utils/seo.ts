/**
 * SEO Utilities
 *
 * Comprehensive SEO helpers for metadata, Open Graph, and structured data
 * Integrates with Next.js metadata API and API metadata types
 */

import type { Metadata } from 'next';

import type { SeoMetadata } from '@/api/types/metadata';
import { BRAND } from '@/constants/brand';
import { getBaseUrl } from '@/utils/helpers';

/**
 * Generate structured data (JSON-LD) for SEO
 * Supports multiple schema.org types
 */
export function generateStructuredData(props: {
  type: 'WebApplication' | 'Organization' | 'Product' | 'Article';
  name: string;
  description: string;
  url?: string;
  image?: string;
  author?: string;
  datePublished?: string;
  dateModified?: string;
  price?: number;
  currency?: string;
}) {
  const {
    type,
    name,
    description,
    url = getBaseUrl(),
    image = `${getBaseUrl()}/static/og-image.png`,
    author,
    datePublished,
    dateModified,
    price,
    currency = 'USD',
  } = props;

  const baseData = {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    description,
    url,
    'image': {
      '@type': 'ImageObject',
      'url': image,
    },
  };

  // WebApplication schema
  if (type === 'WebApplication') {
    return {
      ...baseData,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'AI Collaboration Platform',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      permissions: `${url}/terms`,
      offers: {
        '@type': 'Offer',
        'category': 'subscription',
      },
    };
  }

  // Organization schema
  if (type === 'Organization') {
    return {
      ...baseData,
      '@type': 'Organization',
      'founder': {
        '@type': 'Person',
        'name': BRAND.venture,
      },
      'contactPoint': {
        '@type': 'ContactPoint',
        'email': BRAND.support,
        'contactType': 'customer service',
      },
      'sameAs': [
        BRAND.social.twitter,
        BRAND.social.linkedin,
        BRAND.social.github,
      ],
    };
  }

  // Product schema (for pricing plans)
  if (type === 'Product') {
    return {
      ...baseData,
      '@type': 'Product',
      ...(price && {
        offers: {
          '@type': 'Offer',
          price,
          'priceCurrency': currency,
          'availability': 'https://schema.org/InStock',
        },
      }),
    };
  }

  // Article schema (for blog posts, documentation)
  if (type === 'Article') {
    return {
      ...baseData,
      '@type': 'Article',
      'headline': name,
      ...(author && {
        author: {
          '@type': 'Person',
          'name': author,
        },
      }),
      ...(datePublished && { datePublished }),
      ...(dateModified && { dateModified }),
      'publisher': {
        '@type': 'Organization',
        'name': BRAND.fullName,
        'logo': {
          '@type': 'ImageObject',
          'url': `${getBaseUrl()}/static/logo.png`,
        },
      },
    };
  }

  return baseData;
}

/**
 * Convert API SEO metadata to Next.js Metadata
 * Enables reuse of metadata across API and frontend
 */
export function apiMetadataToNextMetadata(seoData: SeoMetadata): Metadata {
  const baseUrl = getBaseUrl();
  const fullUrl = seoData.canonicalUrl || baseUrl;
  const fullImage = seoData.ogImage.startsWith('http')
    ? seoData.ogImage
    : `${baseUrl}${seoData.ogImage}`;

  return {
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords.join(', '),
    ...(seoData.author && {
      authors: [{ name: seoData.author }],
    }),
    openGraph: {
      title: seoData.title,
      description: seoData.description,
      url: fullUrl,
      siteName: BRAND.fullName,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: seoData.title,
        },
      ],
      locale: 'en_US',
      type: seoData.ogType === 'product' ? 'website' : seoData.ogType,
      ...(seoData.publishedTime && { publishedTime: seoData.publishedTime }),
      ...(seoData.modifiedTime && { modifiedTime: seoData.modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title: seoData.title,
      description: seoData.description,
      images: [fullImage],
      creator: '@roundtablenow',
      site: '@roundtablenow',
    },
    robots: seoData.noindex ? 'noindex, nofollow' : 'index, follow',
    alternates: {
      canonical: seoData.canonicalUrl || fullUrl,
    },
  };
}

/**
 * Generate breadcrumb structured data
 * Useful for navigation and SEO
 */
export function generateBreadcrumbStructuredData(items: Array<{
  name: string;
  url: string;
}>) {
  const baseUrl = getBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Generate FAQ structured data
 * Improves search result appearance
 */
export function generateFaqStructuredData(faqs: Array<{
  question: string;
  answer: string;
}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer,
      },
    })),
  };
}

/**
 * Serialize structured data to JSON-LD script string
 * Use in layout or page components with dangerouslySetInnerHTML
 *
 * @example
 * ```tsx
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }}
 * />
 * ```
 */
export function serializeStructuredData(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}
