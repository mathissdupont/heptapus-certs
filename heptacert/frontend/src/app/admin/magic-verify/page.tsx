"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch, setToken, clearToken } from "@/lib/api";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";

function MagicVerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrMsg("Geçersiz bağlantı: token bulunamadı.");
      return;
    }

    (async () => {
      try {
        clearToken();
        const r = await apiFetch(`/auth/magic-link/verify?token=${encodeURIComponent(token)}`);
        const data = await r.json();
        const jwt = data?.access_token as string | undefined;
        if (!jwt) throw new Error("Token alınamadı.");
        setToken(jwt);
        setStatus("success");
        // Redirect after a brief success flash
        setTimeout(() => router.push("/admin/events"), 1200);
      } catch (e: any) {
        setStatus("error");
        setErrMsg(e?.message || "Magic link geçersiz veya süresi dolmuş.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-sm p-10 text-center"
      >
        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
              <Sparkles className="h-7 w-7 text-amber-500 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-surface-900 mb-2">Magic Link Doğrulanıyor</h1>
            <p className="text-sm text-surface-500 mb-6">Lütfen bekleyin...</p>
            <Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" />
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-surface-900 mb-2">Giriş Başarılı!</h1>
            <p className="text-sm text-surface-500">Yönlendiriliyorsunuz...</p>
            <Loader2 className="h-5 w-5 animate-spin text-brand-500 mx-auto mt-4" />
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
              <AlertCircle className="h-7 w-7 text-rose-500" />
            </div>
            <h1 className="text-xl font-bold text-surface-900 mb-2">Doğrulama Başarısız</h1>
            <p className="text-sm text-surface-500 mb-6">{errMsg}</p>
            <Link href="/admin/login" className="btn-primary inline-flex justify-center gap-2 w-full py-3">
              Giriş Sayfasına Dön
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function MagicVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    }>
      <MagicVerifyInner />
    </Suspense>
  );
}
