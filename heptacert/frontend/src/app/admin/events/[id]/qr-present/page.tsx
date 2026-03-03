"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { fetchSessionQr } from "@/lib/api";
import Image from "next/image";

export default function QrPresentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = Number(params?.id);
  const sessionId = Number(searchParams.get("session"));
  const sessionName = searchParams.get("name") || "";

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !sessionId) {
      setError("Geçersiz oturum");
      setLoading(false);
      return;
    }
    
    let qrUrl: string | null = null;
    
    fetchSessionQr(eventId, sessionId)
      .then(({ blob }) => {
        qrUrl = URL.createObjectURL(blob);
        setQrUrl(qrUrl);
      })
      .catch((e) => {
        console.error("Failed to fetch QR code:", e);
        setError("QR kodu yüklenemedi");
      })
      .finally(() => setLoading(false));
    
    // Cleanup - revoke object URL on unmount or dependency change
    return () => {
      if (qrUrl) {
        URL.revokeObjectURL(qrUrl);
      }
    };
  }, [eventId, sessionId]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
      {/* Subtle accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-violet-500/6 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar with logos */}
      <div className="absolute top-8 left-0 right-0 flex items-center justify-center gap-6">
        <Image
          src="/logo.png"
          alt="HeptaCert"
          width={280}
          height={70}
          unoptimized
          className="h-16 md:h-20 w-auto opacity-80 brightness-0 invert"
        />
        <div className="w-px h-12 bg-white/15" />
        <span className="text-white/50 text-xl md:text-2xl font-semibold tracking-wider">HEPTAPUS GROUP</span>
      </div>

      {/* Main QR area */}
      <div className="relative flex flex-col items-center gap-8">
        {sessionName && (
          <div className="text-center">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.25em] mb-2">Check-in QR</p>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">{sessionName}</h1>
          </div>
        )}

        {loading ? (
          <div className="w-72 h-72 md:w-96 md:h-96 rounded-3xl bg-white/5 border border-white/10 animate-pulse flex items-center justify-center">
            <svg className="w-12 h-12 animate-spin text-white/30" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10" />
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
              className="relative w-72 h-72 md:w-96 md:h-96 rounded-2xl shadow-2xl"
            />
          </div>
        ) : null}

        <p className="text-white/25 text-sm font-medium">
          QR kodu telefonunuzla tarayarak check-in yapın
        </p>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-white/15 text-xs font-medium">
          Powered by <span className="text-white/25 font-bold">HeptaCert</span> — Güvenli Sertifika Altyapısı
        </p>
      </div>
    </div>
  );
}
