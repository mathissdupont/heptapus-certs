"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { acceptEventTeamInvite } from "@/lib/api";

type AcceptState =
  | { status: "loading" }
  | { status: "success"; eventId: number; eventName: string; email: string }
  | { status: "error"; message: string };

function AdminTeamInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, setState] = useState<AcceptState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    if (!token) {
      setState({ status: "error", message: "Davet bağlantısı eksik." });
      return;
    }
    acceptEventTeamInvite(token)
      .then((result) => {
        if (!active) return;
        setState({
          status: "success",
          eventId: result.event_id,
          eventName: result.event_name,
          email: result.email,
        });
      })
      .catch((err) => {
        if (!active) return;
        setState({ status: "error", message: err instanceof Error ? err.message : "Davet kabul edilemedi." });
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-lg border border-surface-200 bg-white p-8 text-center shadow-card">
        {state.status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-600" />
            <h1 className="mt-5 text-2xl font-bold text-surface-900">Davet kontrol ediliyor</h1>
            <p className="mt-2 text-sm text-surface-500">Etkinlik erişiminiz hazırlanıyor.</p>
          </>
        )}
        {state.status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-5 text-2xl font-bold text-surface-900">Davet kabul edildi</h1>
            <p className="mt-2 text-sm text-surface-500">
              {state.email} adresi için <strong>{state.eventName}</strong> etkinliği artık ekip erişimine açık.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={`/admin/events/${state.eventId}`} className="btn-primary">
                <ShieldCheck className="h-4 w-4" />
                Etkinliğe git
              </Link>
              <Link href="/admin/login" className="btn-secondary">
                Giriş yap
              </Link>
            </div>
          </>
        )}
        {state.status === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-5 text-2xl font-bold text-surface-900">Davet açılamadı</h1>
            <p className="mt-2 text-sm text-surface-500">{state.message}</p>
            <Link href="/admin/login" className="btn-secondary mt-6">
              Panele dön
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

export default function AdminTeamInvitePage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-12">
        <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
      </main>
    }>
      <AdminTeamInviteContent />
    </Suspense>
  );
}
