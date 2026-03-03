'use client';

import { apiFetch, ApiError } from './api';
import { useToastStore } from '@/stores/toastStore';

export function useApiWithToast() {
  const addToast = useToastStore((state) => state.addToast);

  return {
    fetch: async (path: string, init?: RequestInit, options?: { showSuccess?: boolean; successMessage?: string; showError?: boolean }) => {
      try {
        const response = await apiFetch(path, init);
        if (options?.showSuccess !== false) {
          const message = options?.successMessage || 'İşlem başarılı';
          addToast({
            message,
            type: 'success',
            duration: 3000,
          });
        }
        return response;
      } catch (error: any) {
        if (options?.showError !== false) {
          const message = error instanceof ApiError ? error.message : 'Bir hata oluştu';
          addToast({
            message,
            type: 'error',
            title: 'Hata',
            duration: 5000,
          });
        }
        throw error;
      }
    },
  };
}
