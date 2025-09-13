'use client';

import { createJsonLd } from '@/utils/metadata';

type StructuredDataProps = {
  type?: 'WebApplication' | 'Organization' | 'Product';
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
};

export function StructuredData(props: StructuredDataProps) {
  const structuredData = createJsonLd(props);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2),
      }}
    />
  );
}
