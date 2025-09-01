# Persian/RTL Text Handling Implementation Guide

## Overview

This implementation provides automatic RTL (Right-to-Left) text detection and rendering for Persian/Farsi content in your Next.js billing dashboard. The system automatically detects when text is Persian and applies appropriate RTL styling and layout.

## Key Features

- ✅ **Automatic Text Direction Detection**: Detects Persian vs English text automatically
- ✅ **Smart Input Fields**: Input fields that adapt direction based on content
- ✅ **Persian Number Formatting**: Converts numbers to Persian digits when appropriate
- ✅ **Bidirectional Text Support**: Handles mixed Persian/English content
- ✅ **Performance Optimized**: Cached detection with debouncing
- ✅ **Accessibility Compliant**: Proper ARIA attributes and screen reader support
- ✅ **CSS Logical Properties**: Modern RTL CSS using logical properties

## Quick Start

### 1. Basic Usage

```tsx
import { BidiText, PersianText } from '@/components/rtl';

// Automatically detects direction and applies RTL
<BidiText>سلام، این متن فارسی است</BidiText>

// Forces RTL with Persian formatting
<PersianText persianNumbers={true}>قیمت: 1234 تومان</PersianText>
```

### 2. Smart Input Fields

```tsx
import { SmartInput } from '@/components/rtl';

<SmartInput 
  placeholder="Type in English or Persian..."
  autoDirection={true}
  persianNumbers={true}
  onDirectionChange={(direction) => console.log(direction)}
/>
```

### 3. Using the RTL Provider

```tsx
import { RTLProvider } from '@/components/rtl';

<RTLProvider defaultLanguage="fa" defaultDirection="rtl">
  <YourApp />
</RTLProvider>
```

## Components Reference

### `BidiText`

Automatically detects text direction and applies appropriate styling.

**Props:**
- `children: string` - The text content
- `forceDirection?: 'rtl' | 'ltr' | 'auto'` - Override detection
- `isolate?: boolean` - Use CSS isolation for mixed content
- `insertMarks?: boolean` - Insert Unicode directional marks
- `detectThreshold?: number` - Detection sensitivity (default: 0.3)

**Example:**
```tsx
<BidiText forceDirection="auto" isolate={true}>
  Mixed content: سلام Hello مخلوط
</BidiText>
```

### `PersianText`

Specialized component for Persian text with optimized rendering.

**Props:**
- `children: string` - Persian text content
- `persianNumbers?: boolean` - Convert numbers to Persian digits

**Example:**
```tsx
<PersianText persianNumbers={true}>
  قیمت محصول: 12500 تومان
</PersianText>
```

### `SmartInput`

Input field with automatic direction detection.

**Props:**
- `autoDirection?: boolean` - Enable auto-detection
- `persianNumbers?: boolean` - Format numbers as Persian
- `forcedDirection?: 'rtl' | 'ltr' | 'auto'` - Override direction
- `onDirectionChange?: (direction) => void` - Direction change callback

**Example:**
```tsx
<SmartInput
  placeholder="نام خود را وارد کنید"
  autoDirection={true}
  persianNumbers={true}
  onDirectionChange={(dir) => setCurrentDirection(dir)}
/>
```

### `RTLProvider`

Context provider for managing RTL state throughout the app.

**Props:**
- `defaultLanguage?: string` - Initial language
- `defaultDirection?: 'rtl' | 'ltr'` - Initial direction
- `autoDetectFromLanguage?: boolean` - Auto-detect from language

## Utilities Reference

### Text Direction Detection

```tsx
import { detectTextDirection } from '@/utils/text-direction';

const direction = detectTextDirection('سلام دنیا', {
  threshold: 0.3,
  useCaching: true,
  includeNumbers: false
});
// Returns: 'rtl'
```

### Hooks

```tsx
import { useTextDirection, useInputDirection, useRTL } from '@/components/rtl';

// Hook for text direction detection
const { direction, isRTL, isDetecting } = useTextDirection(text);

// Hook for input fields
const { value, setValue, direction, isRTL } = useInputDirection();

// Hook for RTL context
const { direction, language, setLanguage, isRTL } = useRTL();
```

## CSS Classes

The implementation provides utility classes for RTL styling:

### Logical Properties
```css
.ms-4 { margin-inline-start: 1rem; }
.me-4 { margin-inline-end: 1rem; }
.ps-4 { padding-inline-start: 1rem; }
.pe-4 { padding-inline-end: 1rem; }
.text-start { text-align: start; }
.text-end { text-align: end; }
```

### Persian Text
```css
.persian-text { /* Persian font and RTL styling */ }
.persian-numbers { /* Persian number formatting */ }
.persian-currency { /* Currency display */ }
```

### Containers
```css
.rtl-container { direction: rtl; }
.ltr-container { direction: ltr; }
.mixed-content { unicode-bidi: plaintext; }
```

## Integration Examples

### Billing Component Update

```tsx
// Before
<span>{subscription.status === 'active' && 'فعال'}</span>

// After
<PersianText>
  {subscription.status === 'active' ? 'فعال' : 
   subscription.status === 'canceled' ? 'لغو شده' : ''}
</PersianText>
```

### Currency Display

```tsx
// Before
<span>{formatTomanCurrency(amount)}</span>

// After
<BidiText className="persian-currency">
  {formatTomanCurrency(amount)}
</BidiText>
```

### Form Fields

```tsx
// Before
<input placeholder="نام مشتری" />

// After
<SmartInput 
  placeholder="نام مشتری" 
  autoDirection={true}
  persianNumbers={false}
/>
```

## Configuration

### i18n Settings

Update your i18n configuration to include Persian:

```typescript
// src/i18n/settings.ts
export enum SupportedLanguages {
  EN = 'en',
  FA = 'fa', // Persian support
}

export const rtlLanguages = [SupportedLanguages.FA];
export const isRTL = (locale: string): boolean => 
  rtlLanguages.includes(locale as SupportedLanguages);
```

### Layout Integration

```tsx
// src/app/layout.tsx
import './globals-rtl.css';
import { isRTL } from '@/i18n/settings';

export default async function Layout({ children }) {
  const locale = await getLocale();
  const direction = isRTL(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={direction}>
      <body>{children}</body>
    </html>
  );
}
```

## Best Practices

### 1. Use Logical Properties

```css
/* ✅ Good - Uses logical properties */
.sidebar {
  margin-inline-start: 1rem;
  padding-inline-end: 0.5rem;
  border-inline-start: 1px solid;
}

/* ❌ Bad - Uses physical properties */
.sidebar {
  margin-left: 1rem;
  padding-right: 0.5rem;
  border-left: 1px solid;
}
```

### 2. Automatic Direction Detection

```tsx
/* ✅ Good - Automatic detection */
<BidiText>{userText}</BidiText>

/* ❌ Bad - Hard-coded direction */
<div dir="rtl">{userText}</div>
```

### 3. Persian Number Handling

```tsx
/* ✅ Good - Contextual formatting */
<PersianText persianNumbers={isRTL}>
  {formatTomanCurrency(amount)}
</PersianText>

/* ❌ Bad - Always Persian numbers */
<span>{toPersianDigits(amount)}</span>
```

### 4. Mixed Content

```tsx
/* ✅ Good - Proper isolation */
<BidiText isolate={true}>
  Customer: آقای احمدی (ID: 12345)
</BidiText>

/* ❌ Bad - No isolation */
<span>Customer: آقای احمدی (ID: 12345)</span>
```

## Performance Considerations

### Caching
- Text direction detection results are cached automatically
- Cache size is limited to prevent memory leaks
- Use `clearDirectionCache()` if needed

### Debouncing
- Input field detection is debounced (300ms default)
- Adjust `debounceMs` for different responsiveness
- Use `detectImmediately()` for instant detection

### Optimization
```tsx
// Use Web Worker for heavy processing
const { direction } = useTextDirection(text, {
  enableWorker: true, // For complex text analysis
  cacheSize: 500,     // Adjust cache size
  debounceMs: 200,    // Faster response
});
```

## Accessibility

### Screen Reader Support
```tsx
<BidiText 
  announceDirection={true}
  aria-label="Persian text content"
  lang="fa"
>
  محتوای فارسی
</BidiText>
```

### WCAG Compliance
- Proper `lang` attributes are set automatically
- Direction changes are announced to screen readers
- Keyboard navigation respects text direction
- High contrast support in dark mode

## Testing

### Text Direction Detection
```typescript
import { detectTextDirection } from '@/utils/text-direction';

describe('Text Direction Detection', () => {
  it('detects Persian text', () => {
    expect(detectTextDirection('سلام دنیا')).toBe('rtl');
  });

  it('detects English text', () => {
    expect(detectTextDirection('Hello World')).toBe('ltr');
  });

  it('handles mixed content', () => {
    expect(detectTextDirection('Hello سلام')).toBe('neutral');
  });
});
```

### Component Testing
```tsx
import { render, screen } from '@testing-library/react';
import { BidiText } from '@/components/rtl';

test('renders Persian text with RTL direction', () => {
  render(<BidiText>سلام دنیا</BidiText>);
  const element = screen.getByText('سلام دنیا');
  expect(element).toHaveAttribute('dir', 'rtl');
});
```

## Migration Guide

### Updating Existing Components

1. **Replace hard-coded Persian text**:
```tsx
// Before
<span>فعال</span>

// After
<PersianText>فعال</PersianText>
```

2. **Update input fields**:
```tsx
// Before
<input type="text" />

// After
<SmartInput autoDirection={true} />
```

3. **Add RTL CSS classes**:
```tsx
// Before
<div className="ml-4">

// After
<div className="ms-4">
```

### Gradual Adoption

1. Start with new components
2. Update high-traffic pages first
3. Use the demo component to test
4. Monitor performance impact
5. Gradually migrate existing components

## Troubleshooting

### Common Issues

**Text not detecting as RTL**
- Check the detection threshold (default: 0.3)
- Verify Persian Unicode ranges
- Use `detectTextDirection()` utility directly

**Mixed content rendering incorrectly**
- Use `isolate={true}` prop
- Consider `insertMarks={true}` for complex cases
- Check Unicode bidirectional marks

**Performance issues**
- Reduce cache size
- Increase debounce time
- Use Web Worker for heavy processing

**Styling not applied**
- Ensure `globals-rtl.css` is imported
- Check CSS class specificity
- Verify logical property support

## Support

For issues or questions:
1. Check the demo component (`/components/examples/rtl-demo.tsx`)
2. Review the test files for usage examples
3. Check browser console for detection logs
4. Use the direction indicator for debugging

## Future Enhancements

- [ ] Jalali calendar integration
- [ ] Advanced Persian typography features
- [ ] Voice input direction detection
- [ ] Machine learning-based detection
- [ ] Performance analytics dashboard
- [ ] Additional language support (Arabic, Hebrew)

---

This implementation provides a robust foundation for Persian/RTL text handling in your billing dashboard, with automatic detection, performance optimization, and comprehensive accessibility support.