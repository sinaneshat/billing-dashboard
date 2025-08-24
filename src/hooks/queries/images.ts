import { useQuery } from '@tanstack/react-query';

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
  });
}

export function useCurrentUserAvatarQuery() {
  return useQuery({
    queryKey: queryKeys.images.currentAvatar(),
    queryFn: () => getUserAvatarsService(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useImagesQuery(args?: GetImagesRequest) {
  return useQuery({
    queryKey: queryKeys.images.filtered(args?.query, args),
    queryFn: () => getImagesService(args),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
