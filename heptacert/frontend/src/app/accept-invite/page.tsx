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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-gray-600">Davetiniz işleniyor...</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Davet Kabul Edildi</h2>
          {role && (
            <p className="text-gray-600 mt-2">
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
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50"
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
        <XCircle className="w-8 h-8 text-red-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Davet Geçersiz</h2>
        <p className="text-gray-600 mt-2">{error}</p>
      </div>
      <Link
        href="/"
        className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50"
      >
        Ana Sayfa
      </Link>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-indigo-600" />
        </div>
        <Suspense
          fallback={
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-gray-600">Yükleniyor...</p>
            </div>
          }
        >
          <AcceptInviteContent />
        </Suspense>
      </div>
    </div>
  );
}
