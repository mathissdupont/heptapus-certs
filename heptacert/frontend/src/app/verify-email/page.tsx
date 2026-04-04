"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function VerifyEmailContent() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            invalid: "Doğrulama bağlantısı geçersiz veya eksik.",
            success: "E-posta başarıyla doğrulandı.",
            failed: "Doğrulama başarısız. Bağlantı süresi dolmuş olabilir.",
            verifying: "Doğrulanıyor...",
            pleaseWait: "Lütfen bekleyin.",
            successTitle: "E-posta Doğrulandı!",
            errorTitle: "Doğrulama Başarısız",
            login: "Giriş Yap",
            register: "Yeniden Kayıt Ol",
          }
        : {
            invalid: "The verification link is invalid or missing.",
            success: "Email verified successfully.",
            failed: "Verification failed. The link may have expired.",
            verifying: "Verifying...",
            pleaseWait: "Please wait.",
            successTitle: "Email Verified!",
            errorTitle: "Verification Failed",
            login: "Sign In",
            register: "Register Again",
          },
    [lang]
  );

  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(copy.invalid);
      return;
    }
    apiFetch(`/auth/verify-email?token=${encodeURIComponent(token)}`, { method: "GET" })
      .then(async (r) => {
        const d = await r.json();
        setMessage(d.detail || copy.success);
        setStatus("success");
      })
      .catch((e) => {
        setMessage(e?.message || copy.failed);
        setStatus("error");
      });
  }, [token, copy]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card max-w-md w-full p-10 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-500" />
            <h2 className="text-lg font-semibold text-gray-900">{copy.verifying}</h2>
            <p className="mt-2 text-sm text-gray-400">{copy.pleaseWait}</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">{copy.successTitle}</h2>
            <p className="mb-6 text-sm text-gray-500">{message}</p>
            <Link href="/admin/login" className="btn-primary w-full justify-center">{copy.login}</Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <XCircle className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">{copy.errorTitle}</h2>
            <p className="mb-6 text-sm text-gray-500">{message}</p>
            <Link href="/register" className="btn-secondary w-full justify-center">{copy.register}</Link>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
