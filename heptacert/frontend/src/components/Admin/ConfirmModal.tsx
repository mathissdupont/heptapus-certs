"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  processingLabel?: string;
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
  confirmLabel,
  cancelLabel,
  processingLabel,
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const resolvedConfirm  = confirmLabel   ?? (isTr ? "Onayla"       : "Confirm");
  const resolvedCancel   = cancelLabel    ?? (isTr ? "İptal"         : "Cancel");
  const resolvedProcess  = processingLabel ?? (isTr ? "İşleniyor..."  : "Processing...");

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 antialiased sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            onClick={loading ? undefined : onCancel}
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full overflow-hidden rounded-t-2xl border border-surface-200 bg-white shadow-modal sm:max-w-md sm:rounded-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <div className="flex items-start gap-3.5 border-b border-surface-100 px-5 py-4">
              {danger && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500">
                  <AlertTriangle className="h-4 w-4 stroke-[2]" />
                </div>
              )}
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id="confirm-modal-title" className="text-sm font-semibold text-surface-900">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm leading-relaxed text-surface-500">{description}</p>
                )}
              </div>
              {!loading && (
                <button
                  onClick={onCancel}
                  aria-label={resolvedCancel}
                  className="shrink-0 rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {children && (
              <div className="mx-5 my-4 max-h-[35vh] overflow-y-auto rounded-lg border border-surface-150 bg-surface-50 p-3 text-sm">
                {children}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:gap-2">
              <button onClick={onCancel} disabled={loading} className="btn-secondary w-full sm:w-auto">
                {resolvedCancel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40 sm:w-auto ${
                  danger ? "bg-red-600 hover:bg-red-700" : "bg-surface-900 hover:bg-surface-800"
                }`}
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />{resolvedProcess}</>
                ) : resolvedConfirm}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmModal;
