'use client';

import { useSession } from '@/lib/auth/client';
import type { EventPayloadMap, TrackingEvent } from '@/types/tracking';

/**
 * Standardized PostHog event tracking utility.
 * Always include user info if available.
 * Usage: trackEvent(TrackingEvent.USER_LOGIN_INITIATED, { ...additionalProps })
 */
export function useTrackEvent(): <E extends TrackingEvent>(
event: E,
properties: Partial<EventPayloadMap[E]>,
) => void {
  const { data: session } = useSession();

  return <E extends TrackingEvent>(
    event: E,
    properties: Partial<EventPayloadMap[E]> = {},
  ) => {
    if (typeof window === 'undefined' || !window.posthog)
      return;

    const userProps = session?.user
      ? {
          distinct_id: session.user.id,
          user_id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        }
      : {};

    window.posthog.capture(event, { ...userProps, ...properties });
  };
}
