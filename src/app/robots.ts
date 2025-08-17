import type { MetadataRoute } from 'next';

import { getBaseUrl } from '@/utils/helpers';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  // In development, disallow all crawling
  if (process.env.NEXT_PUBLIC_WEBAPP_ENV !== 'prod') {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  // In production, allow crawling with some restrictions
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/auth/',
          '/_next/',
          '/admin/',
          '/private/',
          '/temp/',
          '*.json',
          '*.xml',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
