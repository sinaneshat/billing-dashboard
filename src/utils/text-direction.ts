/**
 * Persian/Farsi Text Direction Detection Utility
 * Advanced text direction detection optimized for Persian content
 */

export type TextDirectionConfig = {
  threshold?: number;
  useCaching?: boolean;
  includeNumbers?: boolean;
};

// Cache for performance optimization
const directionCache = new Map<string, 'rtl' | 'ltr' | 'neutral'>();

/**
 * Advanced text direction detection for Persian/Farsi text
 * Uses character count analysis rather than first-character detection
 */
export function detectTextDirection(
  text: string,
  config: TextDirectionConfig = {},
): 'rtl' | 'ltr' | 'neutral' {
  const { threshold = 0.3, useCaching = true, includeNumbers = false } = config;

  if (!text.trim()) {
    return 'neutral';
  }

  // Check cache first
  if (useCaching && directionCache.has(text)) {
    const cached = directionCache.get(text);
    if (cached) {
      return cached;
    }
  }

  // Persian/Farsi Unicode ranges (more comprehensive)
  const persianRanges = [
    [0x0600, 0x06FF], // Arabic/Persian main block
    [0x08A0, 0x08FF], // Arabic Extended-A (includes Persian letters)
    [0xFB50, 0xFDFF], // Arabic Presentation Forms-A
    [0xFE70, 0xFEFF], // Arabic Presentation Forms-B
    [0x200F, 0x200F], // Right-to-Left Mark
    [0x202B, 0x202B], // Right-to-Left Embedding
    [0x202E, 0x202E], // Right-to-Left Override
  ];

  let rtlCount = 0;
  let ltrCount = 0;
  let totalChars = 0;

  for (const char of text) {
    const code = char.charCodeAt(0);

    // Skip whitespace and punctuation unless includeNumbers is true
    if (/\s/.test(char) || (!includeNumbers && /[^\p{L}\p{N}]/u.test(char))) {
      continue;
    }

    totalChars++;

    // Check for RTL characters (Persian/Arabic/Hebrew)
    const isRtl = persianRanges.some(([start, end]) => start !== undefined && end !== undefined && code >= start && code <= end)
      || (code >= 0x05D0 && code <= 0x05EA) // Hebrew
      || (code >= 0x05F0 && code <= 0x05F4); // Hebrew final letters

    // Check for LTR characters (Latin, Cyrillic, etc.)
    const isLtr = (code >= 0x0041 && code <= 0x005A) // A-Z
      || (code >= 0x0061 && code <= 0x007A) // a-z
      || (code >= 0x0400 && code <= 0x04FF) // Cyrillic
      || (code >= 0x0100 && code <= 0x017F); // Latin Extended-A

    if (isRtl) {
      rtlCount++;
    }
    if (isLtr) {
      ltrCount++;
    }
  }

  if (totalChars === 0) {
    return 'neutral';
  }

  const rtlRatio = rtlCount / totalChars;
  const ltrRatio = ltrCount / totalChars;

  let result: 'rtl' | 'ltr' | 'neutral';

  if (rtlRatio >= threshold) {
    result = 'rtl';
  } else if (ltrRatio >= threshold) {
    result = 'ltr';
  } else {
    result = 'neutral';
  }

  // Cache the result
  if (useCaching && directionCache.size < 1000) { // Prevent memory leaks
    directionCache.set(text, result);
  }

  return result;
}

/**
 * Check if text contains Persian/Farsi characters
 */
export function containsPersianText(text: string): boolean {
  const persianRegex = /[\u0600-\u06FF\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return persianRegex.test(text);
}

/**
 * Extract Persian text segments from mixed content
 */
export function extractPersianSegments(text: string): Array<{
  text: string;
  start: number;
  end: number;
  direction: 'rtl' | 'ltr' | 'neutral';
}> {
  const segments = [];
  const words = text.split(/\s+/);
  let currentPosition = 0;

  for (const word of words) {
    const direction = detectTextDirection(word);
    const start = text.indexOf(word, currentPosition);
    const end = start + word.length;

    segments.push({
      text: word,
      start,
      end,
      direction,
    });

    currentPosition = end;
  }

  return segments;
}

/**
 * Insert Unicode directional marks for proper bidi rendering
 */
export function insertDirectionalMarks(text: string): string {
  const LTR_MARK = '\u200E'; // Left-to-Right Mark
  const RTL_MARK = '\u200F'; // Right-to-Left Mark
  const segments = extractPersianSegments(text);

  if (segments.length <= 1) {
    return text;
  }

  return segments.map((segment) => {
    if (segment.direction === 'rtl') {
      return RTL_MARK + segment.text + RTL_MARK;
    } else if (segment.direction === 'ltr') {
      return LTR_MARK + segment.text + LTR_MARK;
    }
    return segment.text;
  }).join(' ');
}

/**
 * Clean up direction cache (useful for memory management)
 */
export function clearDirectionCache(): void {
  directionCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getDirectionCacheStats() {
  return {
    size: directionCache.size,
    entries: Array.from(directionCache.entries()).slice(0, 10), // First 10 entries
  };
}
