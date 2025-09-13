import type { Metadata } from 'next';

import { BRAND } from '@/constants/brand';

import { getBaseUrl } from './helpers';

export type CreateMetadataProps = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  siteName?: string;
  robots?: string;
  canonicalUrl?: string;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
};

// Generate JSON-LD structured data for SEO
export function createJsonLd(props: {
  type?: 'WebApplication' | 'Organization' | 'Product';
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
}) {
  const {
    type = 'WebApplication',
    name = BRAND.fullName,
    description = BRAND.description,
    url = getBaseUrl(),
    logo = `${getBaseUrl()}/static/logo.png`,
    sameAs = [
      BRAND.social.twitter,
      BRAND.social.linkedin,
      BRAND.social.github,
    ],
  } = props;

  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    description,
    url,
    'logo': {
      '@type': 'ImageObject',
      'url': logo,
    },
    sameAs,
  };

  if (type === 'WebApplication') {
    return {
      ...baseStructuredData,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Billing and Subscription Management',
      operatingSystem: 'Any',
      permissions: 'https://billing.roundtable.now/terms',
      offers: {
        '@type': 'Offer',
        'category': 'subscription',
      },
    };
  }

  if (type === 'Organization') {
    return {
      ...baseStructuredData,
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
    };
  }

  return baseStructuredData;
}

export function createMetadata({
  title = BRAND.fullName,
  description = BRAND.description,
  image = '/static/og-image.png', // Use the new OpenGraph image
  url = '/',
  type = 'website',
  siteName = BRAND.fullName,
  robots = 'index, follow',
  canonicalUrl,
  keywords = ['billing', 'dashboard', 'AI collaboration', 'subscription management', 'roundtable'],
  author = BRAND.name,
  publishedTime,
  modifiedTime,
}: CreateMetadataProps = {}): Metadata {
  const baseUrl = getBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  const fullImage = image.startsWith('http') ? image : `${baseUrl}${image}`;

  const openGraph: Metadata['openGraph'] = {
    title,
    description,
    url: fullUrl,
    siteName,
    images: [
      {
        url: fullImage,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
    locale: 'en_US',
    type,
    ...(publishedTime && { publishedTime }),
    ...(modifiedTime && { modifiedTime }),
  };

  const twitter: Metadata['twitter'] = {
    card: 'summary_large_image',
    title,
    description,
    images: [fullImage],
    creator: '@roundtablenow',
    site: '@roundtablenow',
  };

  return {
    title,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: author }],
    openGraph,
    twitter,
    robots,
    alternates: {
      canonical: canonicalUrl || fullUrl,
    },
    other: {
      'theme-color': BRAND.colors.primary,
      'msapplication-TileColor': BRAND.colors.primary,
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'format-detection': 'telephone=no',
    },
  };
}
