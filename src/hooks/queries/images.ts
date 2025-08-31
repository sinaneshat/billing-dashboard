import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import type { GetImagesRequest } from '@/services/api/images';
import {
  getImagesService,
  getUserAvatarsService,
} from '@/services/api/images';

export function useUserAvatarsQuery(userId?: string) {
  return useQuery({
    queryKey: queryKeys.images.avatars(userId),
    queryFn: () => getUserAvatarsService(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}

export function useCurrentUserAvatarQuery() {
  return useQuery({
    queryKey: queryKeys.images.currentAvatar(),
    queryFn: () => getUserAvatarsService(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}

export function useImagesQuery(args?: GetImagesRequest) {
  return useQuery({
    queryKey: ['images', 'filtered', args],
    queryFn: () => getImagesService(args),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to prefetch user avatars data
 * Useful for optimistic loading on profile pages
 */
export function usePrefetchUserAvatars() {
  const queryClient = useQueryClient();

  return (userId?: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.images.avatars(userId),
      queryFn: () => getUserAvatarsService(),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Hook to prefetch current user avatar data
 * Useful for dashboard and navigation prefetching
 */
export function usePrefetchCurrentUserAvatar() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.images.currentAvatar(),
      queryFn: () => getUserAvatarsService(),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Hook to prefetch images data
 * Useful for gallery and media management pages
 */
export function usePrefetchImages() {
  const queryClient = useQueryClient();

  return (args?: GetImagesRequest) => {
    queryClient.prefetchQuery({
      queryKey: ['images', 'filtered', args],
      queryFn: () => getImagesService(args),
      staleTime: 5 * 60 * 1000,
    });
  };
}
