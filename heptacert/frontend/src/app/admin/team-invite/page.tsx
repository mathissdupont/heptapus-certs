"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { acceptEventTeamInvite } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type AcceptState =
  | { status: "loading" }
  | { status: "success"; eventId: number; eventName: string; email: string }
  | { status: "error"; message: string };

function AdminTeamInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const [state, setState] = useState<AcceptState>({ status: "loading" });

  const copy = {
    missingLink:  isTr ? "Davet bağlantısı eksik." : "Invite link is missing.",
    acceptFailed: isTr ? "Davet kabul edilemedi." : "Could not accept invite.",
    checking:     isTr ? "Davet kontrol ediliyor" : "Checking invite",
    preparing:    isTr ? "Etkinlik erişiminiz hazırlanıyor." : "Your event access is being prepared.",
    accepted:     isTr ? "Davet kabul edildi" : "Invite accepted",
    accessReady:  (email: string, name: string) => isTr
      ? `${email} adresi için ${name} etkinliği artık ekip erişimine açık.`
      : `${email} now has team access to ${name}.`,
    goToEvent:    isTr ? "Etkinliğe git" : "Go to event",
    login:        isTr ? "Giriş yap" : "Sign in",
    failed:       isTr ? "Davet açılamadı" : "Invite could not be opened",
    backToPanel:  isTr ? "Panele dön" : "Back to panel",
  };

  useEffect(() => {
    let active = true;
    if (!token) {
      setState({ status: "error", message: copy.missingLink });
      return;
    }
    acceptEventTeamInvite(token)
      .then((result) => {
        if (!active) return;
        setState({ status: "success", eventId: result.event_id, eventName: result.event_name, email: result.email });
      })
      .catch((err) => {
        if (!active) return;
        setState({ status: "error", message: err instanceof Error ? err.message : copy.acceptFailed });
      });
    return () => { active = false; };
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-lg border border-surface-200 bg-white p-8 text-center shadow-card">
        {state.status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-600" />
            <h1 className="mt-5 text-2xl font-bold text-surface-900">{copy.checking}</h1>
            <p className="mt-2 text-sm text-surface-500">{copy.preparing}</p>
          </>
        )}
        {state.status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-5 text-2xl font-bold text-surface-900">{copy.accepted}</h1>
            <p className="mt-2 text-sm text-surface-500">
              {copy.accessReady(state.email, state.eventName)}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={`/admin/events/${state.eventId}`} className="btn-primary">
                <ShieldCheck className="h-4 w-4" />
                {copy.goToEvent}
              </Link>
              <Link href="/admin/login" className="btn-secondary">{copy.login}</Link>
            </div>
          </>
        )}
        {state.status === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-5 text-2xl font-bold text-surface-900">{copy.failed}</h1>
            <p className="mt-2 text-sm text-surface-500">{state.message}</p>
            <Link href="/admin/login" className="btn-secondary mt-6">{copy.backToPanel}</Link>
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
