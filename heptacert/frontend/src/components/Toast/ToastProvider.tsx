'use client';

import { useToastStore } from '@/stores/toastStore';
import { Toast } from './Toast';

export function ToastProvider() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="pointer-events-none fixed right-0 top-0 flex flex-col gap-2 p-4 z-50">
      <div className="flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
}
