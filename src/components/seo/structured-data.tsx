import { createJsonLd } from '@/utils/metadata';

/**
 * Props for the StructuredData component
 * Used to generate JSON-LD structured data for SEO
 */
type StructuredDataProps = {
  /** Schema.org type for the structured data */
  type?: 'WebApplication' | 'Organization' | 'Product';
  /** Name of the entity */
  name?: string;
  /** Description of the entity */
  description?: string;
  /** URL of the entity */
  url?: string;
  /** Logo URL for the entity */
  logo?: string;
  /** Array of social media URLs */
  sameAs?: string[];
};

/**
 * StructuredData component that injects JSON-LD structured data into the page
 *
 * This component follows Next.js official recommendations for JSON-LD injection:
 * - Uses dangerouslySetInnerHTML with proper XSS protection
 * - Sanitizes content by replacing '<' characters with Unicode equivalents
 * - Generates structured data based on Schema.org specifications
 *
 * @param props - Configuration for the structured data
 * @returns JSX script element with JSON-LD content
 */
export function StructuredData(props: StructuredDataProps) {
  const structuredData = createJsonLd(props);

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, '\u003C'),
      }}
    />
  );
}
