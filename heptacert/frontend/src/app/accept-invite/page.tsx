"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

type State = "loading" | "success" | "error";

function AcceptInviteContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("Davet bağlantısında token bulunamadı.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/org/staff/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setState("error");
          setError(data?.detail ?? "Davet kabul edilemedi.");
        } else {
          setRole(data.role ?? "");
          setState("success");
        }
      } catch {
        setState("error");
        setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      }
    })();
  }, [token]);

  const ROLE_LABELS: Record<string, string> = {
    instructor: "Eğitmen",
    teaching_assistant: "Asistan Eğitmen",
    content_editor: "İçerik Editörü",
    department_admin: "Departman Yöneticisi",
    viewer: "İzleyici",
  };

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-status-info-content" />
        <p className="text-content-secondary">Davetiniz işleniyor...</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-status-success-bg flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-status-success-content" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-content-primary">Davet Kabul Edildi</h2>
          {role && (
            <p className="text-content-secondary mt-2">
              Organizasyona <strong>{ROLE_LABELS[role] ?? role}</strong> olarak eklendiniz.
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/login"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
          >
            Giriş Yap
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 border border-outline-strong text-content-secondary rounded-xl text-sm font-semibold hover:bg-canvas"
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-status-danger-bg flex items-center justify-center">
        <XCircle className="w-8 h-8 text-status-danger-content" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-content-primary">Davet Geçersiz</h2>
        <p className="text-content-secondary mt-2">{error}</p>
      </div>
      <Link
        href="/"
        className="px-5 py-2.5 border border-outline-strong text-content-secondary rounded-xl text-sm font-semibold hover:bg-canvas"
      >
        Ana Sayfa
      </Link>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-raised rounded-2xl shadow-sm border border-outline-subtle p-8">
        <div className="flex justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-status-info-content" />
        </div>
        <Suspense
          fallback={
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-status-info-content" />
              <p className="text-content-secondary">Yükleniyor...</p>
            </div>
          }
        >
          <AcceptInviteContent />
        </Suspense>
      </div>
    </div>
  );
}
