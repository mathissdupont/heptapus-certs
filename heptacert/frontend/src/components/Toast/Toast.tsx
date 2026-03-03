'use client';

import { useEffect } from 'react';
import { Toast as ToastType, useToastStore } from '@/stores/toastStore';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  toast: ToastType;
}

export function Toast({ toast }: ToastProps) {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    if (toast.duration === 0) return; // Don't auto-dismiss if duration is 0

    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration ?? 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-emerald-900';
      case 'error':
        return 'text-red-900';
      case 'warning':
        return 'text-amber-900';
      case 'info':
        return 'text-blue-900';
    }
  };

  return (
    <div
      className={`animate-in fade-in slide-in-from-top-4 pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${getStyles()}`}
    >
      {getIcon()}
      <div className="flex-1">
        {toast.title && <p className={`text-sm font-semibold ${getTextColor()}`}>{toast.title}</p>}
        <p className={`text-sm ${getTextColor()}`}>{toast.message}</p>
      </div>

      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            removeToast(toast.id);
          }}
          className={`text-xs font-medium ${getTextColor()} hover:opacity-75 whitespace-nowrap`}
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={() => removeToast(toast.id)}
        className={`flex-shrink-0 ${getTextColor()} hover:opacity-75`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
