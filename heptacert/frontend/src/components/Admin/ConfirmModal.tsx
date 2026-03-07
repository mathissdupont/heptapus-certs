"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "İptal",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
          />
          {/* modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-modal border border-surface-200 p-6"
          >
            <button
              onClick={onCancel}
              className="absolute right-4 top-4 rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3 mb-4">
              {danger && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-semibold text-surface-900">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm text-surface-500">{description}</p>
                )}
              </div>
            </div>

            {children && <div className="mb-4">{children}</div>}

            <div className="flex gap-2 justify-end">
              <button onClick={onCancel} className="btn-secondary text-xs px-3 py-1.5">
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={danger ? "btn-danger text-xs px-3 py-1.5" : "btn-primary text-xs px-3 py-1.5"}
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    İşleniyor...
                  </span>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
