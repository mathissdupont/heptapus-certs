"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, BadgeCheck, Calendar, CheckCircle2, Clock, Copy, Download, ExternalLink, Eye, FileCheck2, Hash, ImageDown, Linkedin, Loader2, Share2, ShieldOff, User, Building2 } from "lucide-react";
import { apiUrl, normalizeApiAssetUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type CertData = {
  uuid: string;
  public_id?: string | null;
  student_name: string;
  event_name: string;
  event_date?: string | null;
  organizer_name?: string | null;
  organizer_logo?: string | null;
  organizer_public_id?: string | null;
  status: "active" | "revoked" | "expired";
  issued_at?: string | null;
  pdf_url?: string | null;
  png_url?: string | null;
  view_count?: number;
  linkedin_url?: string | null;
  branding?: { org_name?: string; brand_logo?: string | null; brand_color?: string | null } | null;
  settings?: { certificate_footer?: string; hide_heptacert_home?: boolean } | null;
};

type PageState = "loading" | "ok" | "not_found" | "error";

export default function VerifyPage({ params }: { params: { uuid: string } }) {
  const { lang } = useI18n();
  const [state, setState] = useState<PageState>("loading");
  const [cert, setCert] = useState<CertData | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = useMemo(() => lang === "tr" ? {
    back: "Ana sayfa",
    loading: "Sertifika doğrulanıyor...",
    notFoundTitle: "Sertifika bulunamadı",
    notFoundBody: "Bu kimliğe ait doğrulanabilir bir sertifika kaydı bulunamadı.",
    errorTitle: "Doğrulama sırasında hata oluştu",
    errorBody: "Sertifika bilgisi alınırken beklenmeyen bir sorun yaşandı.",
    badge: "Doğrulama sonucu",
    valid: "Geçerli",
    revoked: "İptal edildi",
    expired: "Süresi doldu",
    certificateId: "Sertifika kodu",
    issuedAt: "Verilme tarihi",
    eventDate: "Etkinlik tarihi",
    verifyCode: "Doğrulama kimliği",
    owner: "Sahip",
    event: "Etkinlik",
    organizer: "Düzenleyen",
    downloadPdf: "PDF indir",
    downloadPng: "PNG indir",
    addLinkedIn: "LinkedIn'e ekle",
    share: "Paylaş",
    copyLink: "Linki kopyala",
    copied: "Kopyalandı",
    downloadShareCard: "Paylaşım görseli",
    downloadCvSummary: "CV özeti",
    publicLink: "Paylaşılabilir doğrulama linki",
    revokedNotice: "Bu sertifika iptal edildiği için aktif belge olarak kabul edilmez.",
    expiredNotice: "Bu sertifikanın doğrulama veya barındırma süresi sona ermiş görünüyor.",
    views: "görüntüleme",
  } : {
    back: "Home",
    loading: "Verifying certificate...",
    notFoundTitle: "Certificate not found",
    notFoundBody: "We could not find a verifiable certificate for this identifier.",
    errorTitle: "Verification error",
    errorBody: "Something went wrong while loading the certificate details.",
    badge: "Verification result",
    valid: "Valid",
    revoked: "Revoked",
    expired: "Expired",
    certificateId: "Certificate code",
    issuedAt: "Issued at",
    eventDate: "Event date",
    verifyCode: "Verification ID",
    owner: "Owner",
    event: "Event",
    organizer: "Organizer",
    downloadPdf: "Download PDF",
    downloadPng: "Download PNG",
    addLinkedIn: "Add to LinkedIn",
    share: "Share",
    copyLink: "Copy link",
    copied: "Copied",
    downloadShareCard: "Share card",
    downloadCvSummary: "CV summary",
    publicLink: "Shareable verification link",
    revokedNotice: "This certificate has been revoked and should not be treated as an active credential.",
    expiredNotice: "This certificate appears to have reached the end of its validation or hosting period.",
    views: "views",
  }, [lang]);

  useEffect(() => {
    fetch(apiUrl(`/verify/${params.uuid}`), { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) {
          setState("not_found");
          return;
        }
        if (!r.ok) {
          setState("error");
          setErrMsg(`HTTP ${r.status}`);
          return;
        }
        const data = await r.json();
        setCert({
          ...data,
          organizer_logo: normalizeApiAssetUrl(data.organizer_logo),
          pdf_url: normalizeApiAssetUrl(data.pdf_url),
          png_url: normalizeApiAssetUrl(data.png_url),
          branding: data.branding
            ? { ...data.branding, brand_logo: normalizeApiAssetUrl(data.branding.brand_logo) }
            : data.branding,
        });
        setState("ok");
      })
      .catch((e) => {
        setState("error");
        setErrMsg(e?.message || "Network error");
      });
  }, [params.uuid]);

  const locale = lang === "tr" ? "tr-TR" : "en-US";
  const statusMeta = cert?.status === "active"
    ? { label: copy.valid, icon: CheckCircle2, bar: "bg-emerald-500", chip: "bg-emerald-50 border-emerald-200 text-emerald-700" }
    : cert?.status === "revoked"
      ? { label: copy.revoked, icon: ShieldOff, bar: "bg-rose-500", chip: "bg-rose-50 border-rose-200 text-rose-700" }
      : { label: copy.expired, icon: Clock, bar: "bg-amber-500", chip: "bg-amber-50 border-amber-200 text-amber-700" };

  function getPublicVerifyUrl() {
    if (typeof window === "undefined") return `/verify/${params.uuid}`;
    return `${window.location.origin}/verify/${params.uuid}`;
  }

  async function copyVerifyLink() {
    const url = getPublicVerifyUrl();
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareCertificate() {
    const url = getPublicVerifyUrl();
    const title = cert ? `${cert.student_name} - ${cert.event_name}` : copy.publicLink;
    if (navigator.share) {
      await navigator.share({ title, text: copy.publicLink, url });
      return;
    }
    await copyVerifyLink();
  }

  function downloadShareCard() {
    if (!cert || typeof document === "undefined") return;
    const width = 1200;
    const height = 630;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const brandColor = cert.branding?.brand_color || "#0f172a";
    const verifyUrl = getPublicVerifyUrl();
    const issued = cert.issued_at
      ? new Date(cert.issued_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
      : "";

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = brandColor;
    ctx.fillRect(0, 0, width, 18);

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(80, 92, width - 160, 1);
    ctx.fillRect(80, height - 112, width - 160, 1);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 42px Arial, sans-serif";
    ctx.fillText(cert.branding?.org_name || cert.organizer_name || "HeptaCert", 80, 72);

    ctx.fillStyle = brandColor;
    ctx.font = "700 30px Arial, sans-serif";
    ctx.fillText(statusMeta.label.toUpperCase(), 80, 150);

    ctx.fillStyle = "#0f172a";
    ctx.font = "800 70px Arial, sans-serif";
    wrapCanvasText(ctx, cert.student_name, 80, 245, 1040, 78, 2);

    ctx.fillStyle = "#475569";
    ctx.font = "500 38px Arial, sans-serif";
    wrapCanvasText(ctx, cert.event_name, 80, 405, 1040, 46, 2);

    ctx.fillStyle = "#64748b";
    ctx.font = "600 26px Arial, sans-serif";
    const details = [cert.public_id, issued].filter(Boolean).join("   |   ");
    if (details) ctx.fillText(details, 80, 508);

    ctx.fillStyle = "#334155";
    ctx.font = "500 24px Arial, sans-serif";
    ctx.fillText(verifyUrl, 80, 575);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `heptacert-${cert.public_id ?? cert.uuid}-share-card.png`;
    link.click();
  }

  function downloadCvSummary() {
    if (!cert || typeof document === "undefined") return;
    const verifyUrl = getPublicVerifyUrl();
    const issued = cert.issued_at
      ? new Date(cert.issued_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
      : "";
    const eventDate = cert.event_date
      ? new Date(cert.event_date).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
      : "";
    const lines = lang === "tr"
      ? [
          "Sertifika CV Özeti",
          "",
          `Sertifika sahibi: ${cert.student_name}`,
          `Sertifika / etkinlik: ${cert.event_name}`,
          cert.organizer_name ? `Düzenleyen: ${cert.organizer_name}` : "",
          issued ? `Verilme tarihi: ${issued}` : "",
          eventDate ? `Etkinlik tarihi: ${eventDate}` : "",
          `Durum: ${statusMeta.label}`,
          `Sertifika kodu: ${cert.public_id || cert.uuid}`,
          `Doğrulama linki: ${verifyUrl}`,
          "",
          "CV için kısa kullanım:",
          `${cert.event_name} - ${cert.organizer_name || cert.branding?.org_name || "HeptaCert"} (${issued || eventDate || new Date().getFullYear()})`,
          `Doğrulanabilir sertifika: ${verifyUrl}`,
        ]
      : [
          "Certificate CV Summary",
          "",
          `Credential holder: ${cert.student_name}`,
          `Certificate / event: ${cert.event_name}`,
          cert.organizer_name ? `Issuer: ${cert.organizer_name}` : "",
          issued ? `Issued: ${issued}` : "",
          eventDate ? `Event date: ${eventDate}` : "",
          `Status: ${statusMeta.label}`,
          `Certificate code: ${cert.public_id || cert.uuid}`,
          `Verification link: ${verifyUrl}`,
          "",
          "Short CV entry:",
          `${cert.event_name} - ${cert.organizer_name || cert.branding?.org_name || "HeptaCert"} (${issued || eventDate || new Date().getFullYear()})`,
          `Verifiable credential: ${verifyUrl}`,
        ];

    const blob = new Blob([lines.filter(Boolean).join("\n")], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `heptacert-${cert.public_id ?? cert.uuid}-cv-summary.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {cert?.branding?.brand_logo ? (
              <img src={cert.branding.brand_logo} alt={cert.branding.org_name || "Brand"} className="h-9 w-auto object-contain" />
            ) : (
              <img src="/favicon.svg" alt="" className="h-9 w-9 object-contain" />
            )}
            <span className="truncate text-lg font-black text-slate-950">{cert?.branding?.org_name || "HeptaCert"}</span>
          </div>
          {!cert?.settings?.hide_heptacert_home && <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <AnimatePresence mode="wait">
          {state === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-24">
              <div className="rounded-full bg-brand-50 p-5"><Loader2 className="h-10 w-10 animate-spin text-brand-600" /></div>
              <p className="text-sm font-medium text-slate-500">{copy.loading}</p>
            </motion.div>
          )}

          {state === "not_found" && (
            <motion.div key="missing" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden text-center">
              <div className="h-2 bg-slate-300" />
              <div className="p-10 sm:p-12">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100"><Hash className="h-9 w-9 text-slate-400" /></div>
                <h1 className="mt-6 text-2xl font-black text-slate-950">{copy.notFoundTitle}</h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">{copy.notFoundBody}</p>
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><code className="break-all text-xs text-slate-500">{params.uuid}</code></div>
              </div>
            </motion.div>
          )}

          {state === "error" && (
            <motion.div key="error" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden text-center">
              <div className="h-2 bg-rose-400" />
              <div className="p-10 sm:p-12">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50"><AlertCircle className="h-9 w-9 text-rose-500" /></div>
                <h1 className="mt-6 text-2xl font-black text-slate-950">{copy.errorTitle}</h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">{copy.errorBody}</p>
                {errMsg && <code className="mt-6 inline-flex rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600">{errMsg}</code>}
              </div>
            </motion.div>
          )}

          {state === "ok" && cert && (
            <motion.div key="ok" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
              <div className={`h-1.5 ${statusMeta.bar}`} style={cert.branding?.brand_color && cert.status === "active" ? { backgroundColor: cert.branding.brand_color } : {}} />
              <div className="p-6 sm:p-8 md:p-10">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{copy.badge}</p>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{cert.student_name}</h1>
                    <p className="mt-2 text-base font-medium text-slate-500">{cert.event_name}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold ${statusMeta.chip}`}><statusMeta.icon className="h-4 w-4" />{statusMeta.label}</span>
                    {typeof cert.view_count === "number" && cert.view_count > 0 && <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><Eye className="h-3.5 w-3.5" />{cert.view_count.toLocaleString(locale)} {copy.views}</span>}
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {cert.public_id && <InfoCard icon={BadgeCheck} label={copy.certificateId} value={<code className="font-mono text-xs text-slate-700">{cert.public_id}</code>} />}
                  {cert.issued_at && <InfoCard icon={Calendar} label={copy.issuedAt} value={new Date(cert.issued_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })} />}
                  {cert.event_date && <InfoCard icon={Building2} label={copy.eventDate} value={new Date(cert.event_date).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })} />}
                  <InfoCard icon={Hash} label={copy.verifyCode} value={<code className="font-mono text-xs text-slate-500 break-all">{cert.uuid}</code>} />
                  <InfoCard icon={User} label={copy.owner} value={cert.student_name} />
                  <InfoCard icon={FileCheck2} label={copy.event} value={cert.event_name} />
                  {cert.organizer_name && (
                    <InfoCard
                      icon={Building2}
                      label={copy.organizer}
                      value={
                        <span className="inline-flex min-w-0 items-center gap-2">
                          {cert.organizer_logo && <img src={cert.organizer_logo} alt="" className="h-6 w-6 rounded-md object-contain" />}
                          <span className="truncate">{cert.organizer_name}</span>
                        </span>
                      }
                    />
                  )}
                </div>

                <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
                  {cert.status === "active" && cert.pdf_url && <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer" className="btn-primary px-5 py-3"><Download className="h-4 w-4" />{copy.downloadPdf}</a>}
                  {cert.status === "active" && cert.png_url && <a href={cert.png_url} download={`certificate-${cert.public_id ?? cert.uuid}.png`} className="btn-secondary px-5 py-3"><Download className="h-4 w-4" />{copy.downloadPng}</a>}
                  {cert.status === "active" && cert.linkedin_url && <a href={cert.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#0077B5] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#005e8d]"><Linkedin className="h-4 w-4" />{copy.addLinkedIn}</a>}
                  <button type="button" onClick={() => void shareCertificate()} className="btn-secondary px-5 py-3"><Share2 className="h-4 w-4" />{copy.share}</button>
                  <button type="button" onClick={() => void copyVerifyLink()} className="btn-secondary px-5 py-3"><Copy className="h-4 w-4" />{copied ? copy.copied : copy.copyLink}</button>
                  {cert.status === "active" && <button type="button" onClick={downloadShareCard} className="btn-secondary px-5 py-3"><ImageDown className="h-4 w-4" />{copy.downloadShareCard}</button>}
                  {cert.status === "active" && <button type="button" onClick={downloadCvSummary} className="btn-secondary px-5 py-3"><FileCheck2 className="h-4 w-4" />{copy.downloadCvSummary}</button>}
                  <a href={`/verify/${cert.uuid}`} target="_blank" rel="noopener noreferrer" className="btn-secondary px-5 py-3"><ExternalLink className="h-4 w-4" />{copy.publicLink}</a>
                </div>

                {cert.status !== "active" && <div className={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${cert.status === "revoked" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{cert.status === "revoked" ? copy.revokedNotice : copy.expiredNotice}</div>}

                {cert.settings?.certificate_footer && <div className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">{cert.settings.certificate_footer}</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let lineCount = 0;
  for (let i = 0; i < words.length; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lineCount += 1;
      ctx.fillText(lineCount === maxLines ? `${line}...` : line, x, y);
      if (lineCount >= maxLines) return;
      line = words[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line && lineCount < maxLines) ctx.fillText(line, x, y);
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Icon className="h-3.5 w-3.5" />{label}</div><div className="text-sm font-semibold text-slate-900">{value}</div></div>;
}
