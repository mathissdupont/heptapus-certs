"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/lib/i18n";

interface IssueCertificateModalProps {
  open: boolean;
  onClose: () => void;
  onIssued: () => void;
  eventId: number;
  templateReady: boolean | null;
  /** Sample cost units from existing certs, used for estimate */
  sampleMonthlyCost?: number | null;
  sampleYearlyCost?: number | null;
}

export default function IssueCertificateModal({
  open,
  onClose,
  onIssued,
  eventId,
  templateReady,
  sampleMonthlyCost,
  sampleYearlyCost,
}: IssueCertificateModalProps) {
  const { lang } = useI18n();
  const toast = useToast();

  const [name, setName] = useState("");
  const [term, setTerm] = useState<"monthly" | "yearly">("yearly");
  const [issuing, setIssuing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const copy = {
    tr: {
      title: "Sertifika Oluştur",
      nameLabel: "Alıcı Adı",
      namePlaceholder: "Örn. Ayşe Yılmaz",
      termLabel: "Barındırma Süresi",
      monthly: "Aylık",
      yearly: "Yıllık (12 Ay)",
      estimatedCost: "Tahmini maliyet",
      issue: "Basım",
      hosting: "Barındırma",
      costUnknown: "Dosya boyutuna göre hesaplanır",
      create: "Sertifika Oluştur",
      creating: "Oluşturuluyor...",
      nameRequired: "Lütfen geçerli bir isim girin.",
      templateNotReady: "Sertifika şablonu hazır değil",
      templateNotReadyBody: "Basım yapmadan önce sertifika görselini ve alan konumlarını editörde tamamlayın.",
      openEditor: "Editörü Aç",
      created: (n: string) => `"${n}" için sertifika oluşturuldu.`,
      failed: "Sertifika basım işlemi başarısız.",
    },
    en: {
      title: "Issue Certificate",
      nameLabel: "Recipient Name",
      namePlaceholder: "e.g. Alex Morgan",
      termLabel: "Hosting Term",
      monthly: "Monthly",
      yearly: "Yearly (12 months)",
      estimatedCost: "Estimated cost",
      issue: "Issue",
      hosting: "Hosting",
      costUnknown: "Calculated from file size",
      create: "Create Certificate",
      creating: "Creating...",
      nameRequired: "Please enter a valid name.",
      templateNotReady: "Certificate template is not ready",
      templateNotReadyBody: "Upload the certificate image and complete field positioning in the editor before issuing.",
      openEditor: "Open Editor",
      created: (n: string) => `Certificate for "${n}" created.`,
      failed: "Certificate issue failed.",
    },
  }[lang];

  function formatHc(units?: number | null) {
    if (typeof units !== "number") return "—";
    return `${(units / 10).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 1 })} HC`;
  }

  const hostingCost = term === "monthly" ? sampleMonthlyCost : sampleYearlyCost;
  const issueEstimate = typeof hostingCost === "number" ? { issue: 10, hosting: hostingCost, total: 10 + hostingCost } : null;

  async function handleCreate() {
    if (!name.trim()) { setErr(copy.nameRequired); return; }
    if (templateReady === false) { setErr(copy.templateNotReadyBody); return; }
    setErr(null);
    setIssuing(true);
    try {
      await apiFetch(`/admin/events/${eventId}/certificates`, {
        method: "POST",
        body: JSON.stringify({ student_name: name.trim(), hosting_term: term }),
      });
      toast.success(copy.created(name.trim()));
      setName("");
      onIssued();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || copy.failed;
      setErr(msg);
      toast.error(msg);
    } finally {
      setIssuing(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-200 bg-surface-50">
                  <Zap className="h-3.5 w-3.5 text-surface-600" />
                </div>
                <h2 className="text-sm font-semibold text-surface-900">{copy.title}</h2>
              </div>
              <button onClick={onClose} aria-label={lang === "tr" ? "Kapat" : "Close"} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              {templateReady === false && (
                <div className="warning-banner">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold">{copy.templateNotReady}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">{copy.templateNotReadyBody}</p>
                    <Link href={`/admin/events/${eventId}/editor`} onClick={onClose} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold underline">
                      <ExternalLink className="h-3 w-3" /> {copy.openEditor}
                    </Link>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="label">{copy.nameLabel}</label>
                <input
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder={copy.namePlaceholder}
                  autoFocus
                  disabled={templateReady === false}
                />
              </div>

              <div className="space-y-1.5">
                <label className="label">{copy.termLabel}</label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value as "monthly" | "yearly")}
                  className="input-field"
                  disabled={templateReady === false}
                >
                  <option value="monthly">{copy.monthly}</option>
                  <option value="yearly">{copy.yearly}</option>
                </select>
              </div>

              {/* Cost estimate */}
              <div className="flex items-center justify-between rounded-lg border border-surface-150 bg-surface-50 px-3.5 py-2.5 text-sm">
                <span className="text-surface-500">{copy.estimatedCost}</span>
                <span className="font-medium text-surface-900">
                  {issueEstimate ? formatHc(issueEstimate.total) : copy.costUnknown}
                </span>
              </div>
              {issueEstimate && (
                <p className="text-xs text-surface-400">
                  {copy.issue}: {formatHc(issueEstimate.issue)} · {copy.hosting}: {formatHc(issueEstimate.hosting)}
                </p>
              )}

              {err && (
                <div className="error-banner text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{err}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-surface-100 px-5 py-4">
              <button
                onClick={handleCreate}
                disabled={issuing || !name.trim() || templateReady === false}
                className="btn-primary w-full justify-center"
              >
                {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {issuing ? copy.creating : copy.create}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
