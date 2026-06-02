"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 antialiased">
          {/* Arka Plan Perdesi (Backdrop) - Apple Tarzı Soft Bulanıklık */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/15 backdrop-blur-md"
            onClick={loading ? undefined : onCancel}
          />

          {/* Modal Gövdesi - Tam Simetrik ve Dengeli Akış */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.08)] backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            {/* Kapatma Butonu - Sağ Üst Minimalist Çarpı */}
            {!loading && (
              <button
                onClick={onCancel}
                aria-label="Kapat"
                className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                <X className="h-4 w-4 stroke-[2]" />
              </button>
            )}

            {/* İçerik Alanı */}
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4 mb-5">
              {danger && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 shadow-sm border border-red-100/50">
                  <AlertTriangle className="h-4 w-4 stroke-[2]" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <h2 id="confirm-modal-title" className="text-sm font-semibold text-gray-950 tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p className="text-xs leading-relaxed text-gray-500 max-w-xs sm:max-w-none">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Ekstra Slot Alanı */}
            {children && (
              <div className="mb-5 max-h-[35vh] overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-xs">
                {children}
              </div>
            )}

            {/* Aksiyon Butonları - Mobil Uyumlu ve Temiz Düzen */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-1.5">
              <button
                onClick={onCancel}
                disabled={loading}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 sm:w-auto"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`w-full inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40 sm:w-auto ${
                  danger 
                    ? "bg-red-500 hover:bg-red-600 shadow-red-100" 
                    : "bg-gray-950 hover:bg-gray-900 shadow-gray-100"
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
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

export default ConfirmModal;