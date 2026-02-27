"use client";

import { motion } from "framer-motion";
import {
  Download,
  AlertTriangle,
  BadgeCheck,
  User,
  Calendar,
  ShieldCheck,
  Hash,
  Clock,
  Fingerprint,
  LockKeyhole
} from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

const container = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
};
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };

type VerifyStatus = "active" | "revoked" | "expired";

type VerifyData = {
  uuid: string;
  public_id?: string | null;
  student_name: string;
  event_name: string;
  status: VerifyStatus;
  pdf_url?: string | null;
};

function statusUi(status: VerifyStatus) {
  if (status === "active") {
    return {
      label: "DOĞRULANDI",
      pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]",
      dot: "bg-emerald-500 animate-pulse",
      iconBg: "bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 text-emerald-400 border-emerald-500/30",
      reason: null as string | null,
    };
  }
  if (status === "expired") {
    return {
      label: "SÜRESİ DOLDU",
      pill: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]",
      dot: "bg-amber-400",
      iconBg: "bg-gradient-to-br from-amber-500/20 to-amber-900/20 text-amber-400 border-amber-500/30",
      reason: "Barındırma süresi dolduğu için PDF erişimi kapalıdır.",
    };
  }
  return {
    label: "İPTAL EDİLDİ",
    pill: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.2)]",
    dot: "bg-rose-500",
    iconBg: "bg-gradient-to-br from-rose-500/20 to-rose-900/20 text-rose-400 border-rose-500/30",
    reason: "Bu sertifika düzenleyici kurum tarafından iptal edilmiştir.",
  };
}

type FetchState = "loading" | "ok" | "not_found" | "error";

export default function VerifyPage({ params }: { params: { uuid: string } }) {
  const [data, setData] = useState<VerifyData | null>(null);
  const [state, setState] = useState<FetchState>("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    setData(null);

    fetch(`${API_BASE}/verify/${params.uuid}`, { cache: "no-store" })
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 404) {
          setState("not_found");
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }
        const json = (await res.json()) as VerifyData;
        setData(json);
        setState("ok");
      })
      .catch(() => {
        if (!alive) return;
        setState("error");
      });

    return () => { alive = false; };
  }, [params.uuid]);

  // Yükleme Durumu
  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-900/50 border border-slate-800 shadow-[0_0_40px_rgba(124,58,237,0.1)]">
          <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
          <Fingerprint className="h-8 w-8 text-violet-400 animate-pulse" />
        </div>
        <p className="text-sm font-bold text-slate-400 tracking-[0.2em] uppercase">Güvenli Ağda Aranıyor...</p>
      </div>
    );
  }

  // Bulunamadı Durumu
  if (state === "not_found") {
    return (
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto max-w-lg rounded-3xl border border-rose-500/20 bg-gradient-to-b from-rose-500/10 to-slate-950/80 p-12 text-center backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50" />
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Kayıt Bulunamadı</h1>
        <p className="mt-3 text-slate-400 leading-relaxed">Girdiğiniz benzersiz kimlik (UUID) Heptapus Group şifreli kayıtlarıyla eşleşmiyor. Lütfen adresi kontrol edin.</p>
        <button onClick={() => window.location.reload()} className="mt-8 rounded-full bg-slate-900 border border-slate-700 px-8 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-slate-800 hover:text-white active:scale-95">
          Yeniden Sorgula
        </button>
      </motion.div>
    );
  }

  // Hata Durumu
  if (state === "error" || !data) {
    return (
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto max-w-lg rounded-3xl border border-slate-700 bg-gradient-to-b from-slate-800/40 to-slate-950/80 p-12 text-center backdrop-blur-xl shadow-2xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/60 text-slate-300 border border-slate-700">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Bağlantı Hatası</h1>
        <p className="mt-3 text-slate-400 leading-relaxed">Güvenli sunuculara erişilirken geçici bir kesinti yaşandı. Lütfen ağ bağlantınızı kontrol edin.</p>
        <button onClick={() => window.location.reload()} className="mt-8 rounded-full bg-violet-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-violet-500 active:scale-95 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
          Tekrar Dene
        </button>
      </motion.div>
    );
  }

  // BURASI DÜZELTİLDİ: useMemo kaldırıldı, direkt atama yapıldı.
  // Çünkü normal değişken atamaları "early return"lerden sonra güvenle yapılabilir.
  const ui = statusUi(data.status);
  const canDownload = data.status === "active" && !!data.pdf_url;

  // Başarılı Durum (Ana Kart)
  return (
    <motion.div
      variants={container} initial="hidden" animate="show"
      className="relative overflow-hidden rounded-[2.5rem] border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
    >
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-30" />
      
      <div className="bg-gradient-to-b from-slate-900/60 to-slate-950/90 p-8 md:p-14">
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <motion.div variants={item} className="flex gap-5">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${ui.iconBg}`}>
              <BadgeCheck className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Doğrulanmış Kayıt</h1>
              
              <div className="mt-4 flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg bg-slate-950/80 px-3 py-1.5 border border-slate-800/80 text-xs font-mono text-slate-300 w-fit">
                  <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-slate-500 font-sans uppercase tracking-wider text-[10px] font-bold">Ağ Kimliği:</span> 
                  {data.uuid}
                </div>

                {data.public_id && (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-slate-950/80 px-3 py-1.5 border border-slate-800/80 text-xs font-mono text-slate-300 w-fit">
                    <Hash className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-slate-500 font-sans uppercase tracking-wider text-[10px] font-bold">Sertifika No:</span> 
                    {data.public_id}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="shrink-0 pt-2">
            <span className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold tracking-widest border backdrop-blur-md ${ui.pill}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${ui.dot}`} />
              {ui.label}
            </span>
          </motion.div>
        </div>

        <hr className="my-10 border-slate-800/60" />

        <div className="grid gap-4 md:grid-cols-2">
          <motion.div variants={item} className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-violet-500/30 hover:bg-slate-900/80">
            <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <User className="h-32 w-32 text-violet-400" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <User className="h-4 w-4 text-violet-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Sertifika Sahibi</span>
              </div>
              <div className="text-2xl font-bold text-slate-100 group-hover:text-white transition-colors">
                {data.student_name}
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-amber-500/30 hover:bg-slate-900/80">
            <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Calendar className="h-32 w-32 text-amber-400" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Calendar className="h-4 w-4 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Etkinlik / Program</span>
              </div>
              <div className="text-xl font-bold text-slate-100 group-hover:text-white transition-colors leading-tight">
                {data.event_name}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div variants={item} className="mt-10">
          {canDownload ? (
            <a
              href={data.pdf_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-5 text-sm font-black text-slate-950 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(245,158,11,0.2)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <Download className="h-5 w-5 relative z-10" />
              <span className="relative z-10 tracking-wider">ORİJİNAL PDF İNDİR</span>
            </a>
          ) : (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-6 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500/50" />
              <div className="flex items-start gap-4 text-slate-300">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <LockKeyhole className="h-6 w-6 text-slate-500" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Kriptografik Belge Kilitli</div>
                  <div className="mt-1 text-sm text-slate-500 leading-relaxed">{ui.reason || "Sistem politikaları gereği PDF bağlantısı koruma altındadır."}</div>
                </div>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
            <ShieldCheck className="h-3 w-3" />
            Heptapus Secure Infrastructure
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}