import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { authClient } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import type { DeleteImageRequest, UploadCompanyImageRequest, UploadUserAvatarRequest } from '@/services/api/images';
import {
  deleteImageService,
  replaceCompanyLogoService,
  replaceUserAvatarService,
  uploadCompanyImageService,
  uploadUserAvatarService,
} from '@/services/api/images';

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: UploadUserAvatarRequest) => {
      const uploadResult = await uploadUserAvatarService(args);

      // Update Better Auth profile with new image URL
      if ('data' in uploadResult && uploadResult.data) {
        const imageUrl = uploadResult.data.url;
        await authClient.updateUser({ image: imageUrl });
      }

      return uploadResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.current() });
    },
  });
}

export function useReplaceAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: UploadUserAvatarRequest) => replaceUserAvatarService(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.current() });
    },
  });
}

export function useUploadCompanyLogoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: UploadCompanyImageRequest & { organizationId?: string }) => {
      const uploadResult = await uploadCompanyImageService(args);

      // Update Better Auth organization with new logo URL
      if ('data' in uploadResult && uploadResult.data) {
        const logoUrl = uploadResult.data.url;
        const orgId = args.organizationId || uploadResult.data.organizationId;

        if (orgId) {
          await authClient.organization.update({
            organizationId: orgId,
            data: { logo: logoUrl },
          });
        }
      }

      return uploadResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });

      if ('data' in data && data.data?.organizationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.detail(data.data.organizationId),
        });
      }
    },
  });
}

export function useUploadCompanyBannerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: UploadCompanyImageRequest) => uploadCompanyImageService(args),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });

      if (data.data?.organizationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.detail(data.data.organizationId),
        });
      }
    },
  });
}

export function useReplaceCompanyLogoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: UploadCompanyImageRequest) => replaceCompanyLogoService(args),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });

      if (data.data?.organizationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.detail(data.data.organizationId),
        });
      }
    },
  });
}

export function useDeleteImageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: DeleteImageRequest) => deleteImageService(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useUploadMultipleAvatarsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (argsList: UploadUserAvatarRequest[]) => {
      return Promise.all(argsList.map(args => uploadUserAvatarService(args)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.current() });
    },
  });
}

export function useImageUploadWithPreview() {
  const uploadMutation = useUploadAvatarMutation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((file: File | null) => {
    // Clean up previous preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    // Create new preview
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  }, [previewUrl]);

  const uploadAndUpdateProfile = useCallback(async () => {
    if (!selectedFile) {
      throw new Error('No file selected');
    }

    return uploadMutation.mutateAsync({ form: { file: selectedFile } });
  }, [selectedFile, uploadMutation]);

  const cleanup = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
  }, [previewUrl]);

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    uploadMutation,
    previewUrl,
    selectedFile,
    handleFileSelect,
    uploadAndUpdateProfile,
    cleanup,
  };
}
