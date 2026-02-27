"use client";

import { useState } from "react";
import { apiFetch, setToken, clearToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck, Fingerprint } from "lucide-react";

type MeOut = {
  id: number;
  email: string;
  role: "admin" | "superadmin";
  heptacoin_balance: number;
};

export default function AdminLogin() {
  const [email, setEmail] = useState("admin1@heptapusgroup.com");
  const [password, setPassword] = useState("StrongAdminPass123!");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      const token = data?.access_token as string | undefined;
      if (!token) throw new Error("Token alınamadı.");

      setToken(token);

      // Role-based redirect
      const meRes = await apiFetch("/me", { method: "GET" });
      const me = (await meRes.json()) as MeOut;

      if (me.role === "superadmin") router.push("/admin/superadmin");
      else router.push("/admin/events");
    } catch (e: any) {
      clearToken();
      setErr(e?.message || "Giriş başarısız oldu. Bilgilerinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative"
      >
        {/* Arka Plan Işıması (Glow) */}
        <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-br from-violet-500/30 via-transparent to-amber-500/20 blur-2xl opacity-50" />

        <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-800/80 bg-slate-950/80 p-[1px] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          {/* Üst İnce Çizgi Vurgusu */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />

          <div className="bg-gradient-to-b from-slate-900/60 to-slate-950/90 p-10 md:p-12">
            
            {/* Header Kısımı */}
            <div className="mb-10 text-center relative">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-900/20 text-violet-400 border border-violet-500/30 shadow-[0_0_30px_rgba(124,58,237,0.2)] relative group">
                <div className="absolute inset-0 rounded-2xl bg-violet-400/20 blur-md group-hover:bg-violet-400/30 transition-colors" />
                <ShieldCheck className="h-8 w-8 relative z-10" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">Sisteme Giriş</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">HeptaCert Kurumsal Yönetim Ağı</p>
            </div>

            <form onSubmit={onSubmit} className="grid gap-6">
              
              {/* Email Input */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  E-Posta Adresi
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600 group-focus-within:text-violet-400 transition-colors" />
                  <input
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 py-4 pl-12 pr-4 text-sm font-medium text-slate-200 outline-none ring-violet-500/20 transition-all focus:border-violet-500/50 focus:bg-slate-900/80 focus:ring-4 placeholder:text-slate-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@heptapusgroup.com"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Şifre Input */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Güvenlik Anahtarı
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 py-4 pl-12 pr-4 text-sm font-medium text-slate-200 outline-none ring-amber-500/20 transition-all focus:border-amber-500/50 focus:bg-slate-900/80 focus:ring-4 placeholder:text-slate-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Hata Mesajı */}
              <AnimatePresence mode="wait">
                {err && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 p-4 text-sm font-medium text-rose-400 border border-rose-500/20">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-500 animate-pulse" />
                      <span className="leading-tight">{err}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Butonu */}
              <button
                disabled={loading}
                className="group relative mt-4 flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 py-4 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] disabled:opacity-70 disabled:hover:scale-100 active:scale-[0.98]"
              >
                {/* Buton içi parlama efekti */}
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                
                {loading ? (
                  <div className="flex items-center gap-2 relative z-10">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Kimlik Doğrulanıyor...
                  </div>
                ) : (
                  <div className="flex items-center gap-2 relative z-10">
                    Sisteme Giriş Yap
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="mt-8 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Fingerprint className="h-5 w-5 opacity-50" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
            Uçtan Uca Şifreli Bağlantı
          </p>
        </div>
      </motion.div>
    </div>
  );
}