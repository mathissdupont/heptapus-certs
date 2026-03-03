'use client';

import { useToastStore, ToastType } from '@/stores/toastStore';

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);

  return {
    success: (message: string, title?: string, duration?: number) =>
      addToast({ message, title, type: 'success', duration }),
    error: (message: string, title?: string, duration?: number) =>
      addToast({ message, title, type: 'error', duration }),
    info: (message: string, title?: string, duration?: number) =>
      addToast({ message, title, type: 'info', duration }),
    warning: (message: string, title?: string, duration?: number) =>
      addToast({ message, title, type: 'warning', duration }),
    custom: (
      message: string,
      type: ToastType,
      options?: { title?: string; duration?: number; action?: { label: string; onClick: () => void } }
    ) =>
      addToast({
        message,
        type,
        title: options?.title,
        duration: options?.duration,
        action: options?.action,
      }),
  };
}
