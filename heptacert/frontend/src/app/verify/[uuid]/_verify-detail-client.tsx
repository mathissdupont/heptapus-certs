"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ShieldOff,
  Clock,
  AlertCircle,
  Loader2,
  Download,
  ExternalLink,
  Award,
  Calendar,
  Hash,
  User,
  Building2,
  ArrowLeft,
  BadgeCheck,
  Linkedin,
  Eye,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { API_BASE } from "@/lib/api";

type CertData = {
  uuid: string;
  public_id?: string | null;
  student_name: string;
  event_name: string;
  event_date?: string | null;
  status: "active" | "revoked" | "expired";
  issued_at?: string | null;
  pdf_url?: string | null;
  hosting_ends_at?: string | null;
  view_count?: number;
  linkedin_url?: string | null;
  branding?: { org_name?: string; brand_logo?: string | null; brand_color?: string | null } | null;
};

type PageState = "loading" | "ok" | "not_found" | "error";

function StatusBadge({ status }: { status: CertData["status"] }) {
  if (status === "active") return (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-sm font-bold text-emerald-700">
      <CheckCircle2 className="h-4 w-4" /> Geçerli
    </span>
  );
  if (status === "revoked") return (
    <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-4 py-1.5 text-sm font-bold text-rose-700">
      <ShieldOff className="h-4 w-4" /> İptal Edildi
    </span>
  );
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-sm font-bold text-amber-700">
      <Clock className="h-4 w-4" /> Süresi Doldu
    </span>
  );
}

function statusTopColor(status: CertData["status"]) {
  if (status === "active") return "bg-emerald-500";
  if (status === "revoked") return "bg-rose-500";
  return "bg-amber-500";
}

export default function VerifyPage({ params }: { params: { uuid: string } }) {
  const { uuid } = params;
  const t = useT();

  const [state, setState] = useState<PageState>("loading");
  const [cert, setCert] = useState<CertData | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/verify/${uuid}`)
      .then(async r => {
        if (r.status === 404) { setState("not_found"); return; }
        if (!r.ok) { setState("error"); setErrMsg(`HTTP ${r.status}`); return; }
        const data = await r.json();
        setCert(data);
        setState("ok");
      })
      .catch(e => {
        setState("error");
        setErrMsg(e?.message || "Ağ hatası.");
      });
  }, [uuid]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Minimal header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-black text-gray-800">
            <Award className="h-5 w-5 text-brand-600" /> HeptaCert
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium">
            <ArrowLeft className="h-4 w-4" /> {t("verify_home")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <AnimatePresence mode="wait">

          {/* LOADING */}
          {state === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 py-20">
              <div className="p-5 rounded-full bg-brand-50">
                <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
              </div>
              <p className="text-gray-500 font-medium">{t("verify_loading")}</p>
            </motion.div>
          )}

          {/* NOT FOUND */}
          {state === "not_found" && (
            <motion.div key="not_found" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card overflow-hidden text-center">
              <div className="h-2 bg-gray-300" />
              <div className="p-12 flex flex-col items-center gap-4">
                <div className="p-5 rounded-full bg-gray-50">
                  <Hash className="h-10 w-10 text-gray-300" />
                </div>
                <h1 className="text-2xl font-black text-gray-800">{t("verify_not_found_title")}</h1>
                <p className="text-gray-500 text-sm max-w-sm">{t("verify_not_found_desc")}</p>
                <div className="mt-2 rounded-xl bg-gray-50 border border-gray-100 px-5 py-3">
                  <code className="text-xs font-mono text-gray-400 break-all">{uuid}</code>
                </div>
              </div>
            </motion.div>
          )}

          {/* ERROR */}
          {state === "error" && (
            <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card overflow-hidden text-center">
              <div className="h-2 bg-rose-400" />
              <div className="p-12 flex flex-col items-center gap-4">
                <div className="p-5 rounded-full bg-rose-50">
                  <AlertCircle className="h-10 w-10 text-rose-400" />
                </div>
                <h1 className="text-2xl font-black text-gray-800">{t("verify_error_title")}</h1>
                <p className="text-gray-500 text-sm">{t("verify_error_desc")}</p>
                {errMsg && <code className="text-xs text-rose-400 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{errMsg}</code>}
              </div>
            </motion.div>
          )}

          {/* OK */}
          {state === "ok" && cert && (
            <motion.div key="ok" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card overflow-hidden">

              {/* Status color bar — use brand color if available */}
              <div className={`h-1.5 ${statusTopColor(cert.status)}`}
                style={cert.branding?.brand_color && cert.status === "active" ? { backgroundColor: cert.branding.brand_color } : {}} />

              <div className="p-8 md:p-10">

                {/* Branding header (white-label) */}
                {cert.branding && (
                  <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
                    {cert.branding.brand_logo
                      ? <img src={cert.branding.brand_logo} alt={cert.branding.org_name || ""} className="h-8 w-auto object-contain" />
                      : <Award className="h-6 w-6" style={cert.branding.brand_color ? { color: cert.branding.brand_color } : {}} />}
                    {cert.branding.org_name && <span className="font-bold text-gray-800">{cert.branding.org_name}</span>}
                  </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-2">
                      <BadgeCheck className="h-3.5 w-3.5 text-brand-400" />
                      {t("verify_title")}
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-1">{cert.student_name}</h1>
                    <p className="text-gray-500 font-medium">{cert.event_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={cert.status} />
                    {cert.view_count !== undefined && cert.view_count > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                        <Eye className="h-3.5 w-3.5" /> {cert.view_count.toLocaleString()} görüntüleme
                      </span>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {cert.public_id && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        <Hash className="h-3 w-3" /> {t("verify_cert_id")}
                      </div>
                      <code className="text-sm font-mono font-bold text-gray-700">{cert.public_id}</code>
                    </div>
                  )}
                  {cert.issued_at && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        <Calendar className="h-3 w-3" /> {t("verify_issued_at")}
                      </div>
                      <span className="text-sm font-bold text-gray-700">
                        {new Date(cert.issued_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  )}
                  {cert.event_date && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        <Building2 className="h-3 w-3" /> {t("verify_event_date")}
                      </div>
                      <span className="text-sm font-bold text-gray-700">
                        {new Date(cert.event_date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  )}
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                      <User className="h-3 w-3" /> UUID
                    </div>
                    <code className="text-[11px] font-mono text-gray-400 break-all">{cert.uuid}</code>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                  {cert.status === "active" && cert.pdf_url && (
                    <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="btn-primary flex items-center gap-2 px-6 py-3">
                      <Download className="h-4 w-4" /> {t("verify_download")}
                    </a>
                  )}
                  {cert.status === "active" && cert.linkedin_url && (
                    <a href={cert.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-[#0077B5] bg-[#0077B5] px-5 py-3 text-sm font-bold text-white hover:bg-[#005885] shadow-sm transition-colors">
                      <Linkedin className="h-4 w-4" /> LinkedIn&apos;e Ekle
                    </a>
                  )}
                  <a href={`/verify/${cert.uuid}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
                    <ExternalLink className="h-4 w-4" /> {t("verify_link")}
                  </a>
                </div>

                {cert.status !== "active" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`mt-4 rounded-xl p-4 flex items-start gap-3 border ${cert.status === "revoked" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}>
                    <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${cert.status === "revoked" ? "text-rose-500" : "text-amber-500"}`} />
                    <p className={`text-sm font-medium ${cert.status === "revoked" ? "text-rose-700" : "text-amber-700"}`}>
                      {cert.status === "revoked" ? t("verify_revoked_notice") : t("verify_expired_notice")}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
