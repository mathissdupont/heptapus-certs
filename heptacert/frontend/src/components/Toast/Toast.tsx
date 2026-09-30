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
        return <CheckCircle2 className="h-5 w-5 text-status-success-content" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-status-danger-content" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-status-warning-content" />;
      case 'info':
        return <Info className="h-5 w-5 text-status-info-content" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-status-success-bg border-status-success-border';
      case 'error':
        return 'bg-status-danger-bg border-status-danger-border';
      case 'warning':
        return 'bg-status-warning-bg border-status-warning-border';
      case 'info':
        return 'bg-status-info-bg border-status-info-border';
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-status-success-content';
      case 'error':
        return 'text-status-danger-content';
      case 'warning':
        return 'text-status-warning-content';
      case 'info':
        return 'text-status-info-content';
    }
  };

  return (
    <div
      className={`animate-in fade-in slide-in-from-top-4 pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border px-4 py-3 shadow-modal ${getStyles()}`}
      role={toast.type === "error" ? "alert" : "status"}
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
        className={`flex-shrink-0 rounded-lg p-1 transition hover:bg-raised/50 ${getTextColor()} hover:opacity-75`}
        aria-label="Bildirimi kapat"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
