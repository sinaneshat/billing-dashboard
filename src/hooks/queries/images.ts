import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/data/query-keys';
import type { GetImagesRequest } from '@/services/api/images';
import {
  getImagesService,
  getOrganizationImagesService,
  getOrganizationLogoService,
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

export function useOrganizationImagesQuery(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.images.organization(organizationId),
    queryFn: () => getOrganizationImagesService({ organizationId }),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useOrganizationLogoQuery(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.images.organizationLogo(organizationId),
    queryFn: () => getOrganizationLogoService({ organizationId }),
    enabled: !!organizationId,
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
