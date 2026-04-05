"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { publicApiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function VerifyMemberEmailPage() {
  const { lang } = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            loading: "Üye hesabınız doğrulanıyor...",
            successTitle: "Üye hesabı doğrulandı",
            errorTitle: "Doğrulama başarısız",
            signIn: "Üye Girişine Git",
            register: "Yeniden Kayıt Ol",
          }
        : {
            loading: "Verifying your member account...",
            successTitle: "Member account verified",
            errorTitle: "Verification failed",
            signIn: "Go to Member Login",
            register: "Register Again",
          },
    [lang]
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(lang === "tr" ? "Doğrulama bağlantısı eksik." : "Verification token is missing.");
      return;
    }

    publicApiFetch(`/public/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        setStatus("success");
        setMessage(data?.detail || "");
      })
      .catch((err: any) => {
        setStatus("error");
        setMessage(err?.message || (lang === "tr" ? "Doğrulama yapılamadı." : "Verification could not be completed."));
      });
  }, [lang, token]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md p-10 text-center">
        {status === "loading" ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{copy.loading}</h1>
          </>
        ) : (
          <>
            <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${status === "success" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {status === "success" ? <CheckCircle2 className="h-8 w-8" /> : <MailWarning className="h-8 w-8" />}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{status === "success" ? copy.successTitle : copy.errorTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/login?mode=member" className="btn-primary justify-center">
                {copy.signIn}
              </Link>
              <Link href="/register?mode=member" className="btn-secondary justify-center">
                {copy.register}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
