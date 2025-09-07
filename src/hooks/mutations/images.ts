import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { authClient } from '@/lib/auth/client';
import { queryKeys } from '@/lib/data/query-keys';
import type { DeleteImageRequest, UploadUserAvatarRequest } from '@/services/api/images';
import {
  deleteImageService,
  replaceUserAvatarService,
  uploadUserAvatarService,
} from '@/services/api/images';

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: UploadUserAvatarRequest) => {
      const uploadResult = await uploadUserAvatarService(args);

      // Update Better Auth profile with new image URL
      if ('data' in uploadResult && uploadResult.data && 'url' in uploadResult.data) {
        const imageUrl = uploadResult.data.url as string;
        await authClient.updateUser({ image: imageUrl });
      }

      return uploadResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.current });
    },
  });
}

export function useReplaceAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: UploadUserAvatarRequest) => replaceUserAvatarService(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.current });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.users.current });
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
