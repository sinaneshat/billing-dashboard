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
};

export function createMetadata({
  title = BRAND.fullName,
  description = BRAND.description,
  image = '/static/images/logos/logo.svg',
  url = '/',
  type = 'website',
  siteName = BRAND.fullName,
  robots = 'index, follow',
  canonicalUrl,
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
  };

  const twitter: Metadata['twitter'] = {
    card: 'summary_large_image',
    title,
    description,
    images: [fullImage],
    creator: '@yourcompany',
  };

  return {
    title,
    description,
    openGraph,
    twitter,
    robots,
    alternates: {
      canonical: canonicalUrl || fullUrl,
    },
  };
}
