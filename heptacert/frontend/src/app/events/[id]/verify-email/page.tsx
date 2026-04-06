"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { verifyPublicAttendeeEmail } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function VerifyAttendeeEmailContent() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            invalid: "Doğrulama bağlantısı geçersiz veya eksik.",
            success: "E-posta doğrulandı.",
            failed: "Doğrulama başarısız.",
            verifying: "Doğrulanıyor...",
            pleaseWait: "Lütfen bekleyin.",
            successTitle: "E-posta Doğrulandı",
            openStatus: "Katılım Durumunu Aç",
            errorTitle: "Doğrulama Başarısız",
            backToRegister: "Kayıt Sayfasına Dön",
          }
        : {
            invalid: "The verification link is invalid or missing.",
            success: "Email verified.",
            failed: "Verification failed.",
            verifying: "Verifying...",
            pleaseWait: "Please wait.",
            successTitle: "Email Verified",
            openStatus: "Open Attendance Status",
            errorTitle: "Verification Failed",
            backToRegister: "Back to Registration",
          },
    [lang]
  );

  const params = useParams();
  const searchParams = useSearchParams();
  const rawEventId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const eventId = rawEventId ? String(rawEventId) : "";
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [statusUrl, setStatusUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !token) {
      setStatus("error");
      setMessage(copy.invalid);
      return;
    }

    verifyPublicAttendeeEmail(eventId, token)
      .then((data) => {
        setMessage(data.detail || copy.success);
        setStatusUrl(data.status_url || `/events/${eventId}/status`);
        setStatus("success");
      })
      .catch((e) => {
        setMessage(e?.message || copy.failed);
        setStatus("error");
      });
  }, [eventId, token, copy]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card w-full max-w-md p-10 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-500" />
            <h2 className="text-lg font-semibold text-gray-900">{copy.verifying}</h2>
            <p className="mt-2 text-sm text-gray-500">{copy.pleaseWait}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">{copy.successTitle}</h2>
            <p className="mb-6 text-sm text-gray-500">{message}</p>
            <Link href={statusUrl || `/events/${eventId}/status`} className="btn-primary w-full justify-center gap-2">
              {copy.openStatus}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <XCircle className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">{copy.errorTitle}</h2>
            <p className="mb-6 text-sm text-gray-500">{message}</p>
            <Link href={`/events/${eventId}/register`} className="btn-secondary w-full justify-center">
              {copy.backToRegister}
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyAttendeeEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>}>
      <VerifyAttendeeEmailContent />
    </Suspense>
  );
}
