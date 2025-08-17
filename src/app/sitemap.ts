import type { MetadataRoute } from 'next';

import { getBaseUrl } from '@/utils/helpers';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const currentDate = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: currentDate.toISOString(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  return [
    ...staticPages,
  ];
}
