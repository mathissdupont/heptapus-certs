"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { importAttendees } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useI18n, translate } from "@/lib/i18n";

interface ImportAttendeeModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  eventId: number;
}

export default function ImportAttendeeModal({ open, onClose, onImported, eventId }: ImportAttendeeModalProps) {
  const { lang } = useI18n();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const copy = { title: translate(lang, "migrated_components_admin_importattendeemodal_import_excel_csv_34b914bf"), hint: translate(lang, "migrated_components_admin_importattendeemodal_the_file_must_have_at_least_a_name_and_ema_756dc68e"), chooseFile: translate(lang, "migrated_components_admin_importattendeemodal_choose_file_7d1fc1a3"), noFile: translate(lang, "migrated_components_admin_importattendeemodal_no_file_selected_89275205"), import: translate(lang, "migrated_components_admin_importattendeemodal_import_ad883823"), importing: translate(lang, "migrated_components_admin_importattendeemodal_importing_69491f1e"), result: (a: number, s: number) => translate(lang, "migrated_components_admin_importattendeemodal_value0_added_value1_duplicates_skipped_760e96af", { value0: a, value1: s }), failed: translate(lang, "migrated_components_admin_importattendeemodal_import_failed_b1f54705"), close: translate(lang, "migrated_components_admin_importattendeemodal_close_f2b01666") };

  async function handleImport() {
    if (!file) return;
    setErr(null);
    setResult(null);
    setImporting(true);
    try {
      const res = await importAttendees(eventId, file);
      setResult(res);
      toast.success(copy.result(res.added, res.skipped));
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onImported();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || copy.failed;
      setErr(msg);
    } finally {
      setImporting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} className="relative w-full max-w-md overflow-hidden rounded-2xl border border-surface-200 bg-raised shadow-modal">
            <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-200 bg-surface-50">
                  <Upload className="h-3.5 w-3.5 text-surface-600" />
                </div>
                <h2 className="text-sm font-semibold text-surface-900">{copy.title}</h2>
              </div>
              <button onClick={onClose} aria-label={translate(lang, "migrated_components_admin_importattendeemodal_close_b5c7c2f4")} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 transition-colors"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-sm text-surface-500">{copy.hint}</p>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary text-xs shrink-0">
                  <Upload className="h-3.5 w-3.5" /> {copy.chooseFile}
                </button>
                <span className="truncate text-sm text-surface-500">{file ? file.name : copy.noFile}</span>
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>

              {result && (
                <div className="success-banner text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{copy.result(result.added, result.skipped)}</span>
                </div>
              )}

              {err && <div className="error-banner text-xs"><AlertCircle className="h-3.5 w-3.5 shrink-0" /><span>{err}</span></div>}

              <div className="border-t border-surface-100 pt-4">
                <button onClick={handleImport} disabled={!file || importing} className="btn-primary w-full justify-center">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? copy.importing : copy.import}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
