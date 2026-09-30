'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  footer?: ReactNode;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  footer,
}: AccessibleModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    // Trap focus within modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        <div
          className={`bg-raised  rounded-lg shadow-xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-outline-subtle ">
            <h2 id="modal-title" className="text-xl font-semibold text-content-primary ">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-content-muted hover:text-content-secondary   focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-lg p-1"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-outline-subtle ">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function useModalFocus(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    // Find the first focusable element in the modal
    const focusableElements = document.querySelectorAll(
 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }
  }, [isOpen]);
}
