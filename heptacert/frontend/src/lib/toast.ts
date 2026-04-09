// Simple toast notification system
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

let toastListeners: ((toast: Toast) => void)[] = [];

export const toast = {
  success: (message: string, duration = 3000) => {
    notify('success', message, duration);
  },
  error: (message: string, duration = 5000) => {
    notify('error', message, duration);
  },
  info: (message: string, duration = 3000) => {
    notify('info', message, duration);
  },
  warning: (message: string, duration = 4000) => {
    notify('warning', message, duration);
  },
  subscribe: (listener: (toast: Toast) => void) => {
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  },
};

function notify(type: ToastType, message: string, duration?: number) {
  const id = Math.random().toString(36).substr(2, 9);
  const toast: Toast = { id, message, type, duration };
  
  toastListeners.forEach(listener => {
    try {
      listener(toast);
    } catch (e) {
      console.error('Toast listener error:', e);
    }
  });
}
