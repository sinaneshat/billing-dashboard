'use client';

import type { EventPayloadMap, TrackingEvent } from '@/types/tracking';

/**
 * Placeholder event tracking utility.
 * Replace with your preferred analytics solution.
 */
export function trackEvent(): <E extends TrackingEvent>(
event: E,
properties: Partial<EventPayloadMap[E]>,
) => void {
  return <E extends TrackingEvent>(
    _event: E,
    _properties: Partial<EventPayloadMap[E]> = {},
  ) => {
    // No-op - replace with your analytics solution
  };
}
