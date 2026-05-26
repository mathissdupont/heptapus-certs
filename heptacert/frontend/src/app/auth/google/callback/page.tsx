"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { consumeOAuthBridgeToken, setPublicMemberToken, setToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            title: "Google oturumu tamamlanıyor",
            body: "Hesabınız hazırlanıyor, birazdan yönlendirileceksiniz.",
            error: "Google oturumu tamamlanamadı.",
          }
        : {
            title: "Finishing Google sign-in",
            body: "Your account is being prepared. You will be redirected shortly.",
            error: "Google sign-in could not be completed.",
          },
    [lang],
  );

  useEffect(() => {
    let cancelled = false;
    const mode = searchParams.get("mode");
    const next = searchParams.get("next") || (mode === "admin" ? "/admin/events" : "/events");
    void consumeOAuthBridgeToken()
      .then(({ access_token: token, mode: exchangedMode }) => {
        if (cancelled) return;
        if (mode === "admin" && exchangedMode === "admin") {
          setToken(token);
        } else if (mode !== "admin" && exchangedMode === "member") {
          setPublicMemberToken(token);
        } else {
          throw new Error("OAuth mode mismatch");
        }
        router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/events");
      })
      .catch(() => {
        if (!cancelled) setError(copy.error);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.error, router, searchParams]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 text-center">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">{copy.error}</h1>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">{copy.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{copy.body}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
