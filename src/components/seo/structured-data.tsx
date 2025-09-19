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

  // Create safe JSON-LD content using proper text content
  const jsonLdContent = JSON.stringify(structuredData, null, 2);

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
    >
      {jsonLdContent}
    </script>
  );
}
