"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { fetchSessionQr, apiFetch } from "@/lib/api";
import Image from "next/image";
import { ShieldCheck, QrCode } from "lucide-react";

type BrandingData = {
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
  settings?: {
    hide_heptacert_home?: boolean;
  } | null;
};

export default function QrPresentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = Number(params?.id);
  const sessionId = Number(searchParams.get("session"));
  const sessionName = searchParams.get("name") || "";

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [branding, setBranding] = useState<BrandingData | null>(null);

  useEffect(() => {
    fetch("/api/branding", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding(data);

        if (data.brand_color) {
          document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!eventId || !sessionId) {
      setError("Geçersiz oturum");
      setLoading(false);
      return;
    }

    let localQrUrl: string | null = null;

    fetchSessionQr(eventId, sessionId)
      .then(({ blob }) => {
        localQrUrl = URL.createObjectURL(blob);
        setQrUrl(localQrUrl);
      })
      .catch((e) => {
        console.error("Failed to fetch QR code:", e);
        setError("QR kodu yüklenemedi");
      })
      .finally(() => setLoading(false));

    return () => {
      if (localQrUrl) {
        URL.revokeObjectURL(localQrUrl);
      }
    };
  }, [eventId, sessionId]);

  const brandName = branding?.org_name || "HeptaCert";
  const brandColor = branding?.brand_color || "#6366f1";

  const pageBg = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${brandColor}10, ${brandColor}08 35%, #020617 100%)`,
    }),
    [brandColor]
  );

  const glowTop = useMemo(
    () => ({
      backgroundColor: `${brandColor}22`,
    }),
    [brandColor]
  );

  const glowBottom = useMemo(
    () => ({
      backgroundColor: `${brandColor}18`,
    }),
    [brandColor]
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={pageBg}
    >
      {/* Subtle accent glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl pointer-events-none"
        style={glowTop}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full blur-3xl pointer-events-none"
        style={glowBottom}
      />

      {/* Top bar with branding */}
      <div className="absolute top-8 left-0 right-0 flex items-center justify-center gap-6 px-4">
        {branding?.brand_logo ? (
          <img
            src={branding.brand_logo}
            alt={brandName}
            className="h-14 md:h-20 w-auto object-contain"
          />
        ) : (
          <Image
            src="/logo.png"
            alt="HeptaCert"
            width={280}
            height={70}
            unoptimized
            className="h-16 md:h-20 w-auto opacity-80 brightness-0 invert"
          />
        )}

        <div className="w-px h-12 bg-white/15" />

        <span className="text-white/60 text-lg md:text-2xl font-semibold tracking-wider text-center">
          {brandName}
        </span>
      </div>

      {/* Main QR area */}
      <div className="relative flex flex-col items-center gap-8 px-4">
        {sessionName && (
          <div className="text-center">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.25em] mb-2">
              Check-in QR
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              {sessionName}
            </h1>
          </div>
        )}

        {loading ? (
          <div className="w-72 h-72 md:w-96 md:h-96 rounded-3xl bg-white/5 border border-white/10 animate-pulse flex items-center justify-center">
            <svg className="w-12 h-12 animate-spin text-white/30" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="31.4"
                strokeDashoffset="10"
              />
            </svg>
          </div>
        ) : error ? (
          <div className="w-72 h-72 md:w-96 md:h-96 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <p className="text-red-400 font-semibold text-lg">{error}</p>
          </div>
        ) : qrUrl ? (
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm" />
            <img
              src={qrUrl}
              alt="Check-in QR"
              className="relative w-72 h-72 md:w-96 md:h-96 rounded-2xl shadow-2xl bg-white"
            />
          </div>
        ) : null}

        <p className="text-white/25 text-sm font-medium flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          QR kodu telefonunuzla tarayarak check-in yapın
        </p>
      </div>

      {/* Bottom trust bar */}
      <div className="absolute bottom-6 left-0 right-0 text-center px-4">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-white/40">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: brandColor }} />
          HeptaCert altyapısıyla güvence altındadır.
        </div>
        <p className="mt-2 text-[11px] text-white/20">
          Bu QR check-in ekranı kurumsal olarak özelleştirilmiş olsa da yönlendirme ve doğrulama güvenliği HeptaCert tarafından sağlanır.
        </p>
      </div>
    </div>
  );
}