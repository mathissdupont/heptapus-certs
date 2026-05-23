"use client";

import PageHeader from "@/components/Admin/PageHeader";
import { Wand2, MessageCircle, Sparkles } from "lucide-react";
import AIAssistant from "@/components/Admin/AIAssistant";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";

export default function NewEventPage() {
  const { lang } = useI18n();
  const toast = useToast();
  const copy = lang === "tr" ? {
    title: "Yeni Etkinlik Oluştur",
    subtitle: "AI destekli sihirbazla hızlıca bir etkinlik hazırlayın.",
    back: "Etkinliklere Dön"
  } : {
    title: "Create New Event",
    subtitle: "Use the AI-assisted wizard to scaffold an event quickly.",
    back: "Back to Events"
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<Wand2 className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Link href="/admin/events" className="btn-secondary">
              {copy.back}
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Chat area */}
        <div className="col-span-2 flex flex-col gap-4">
          <div className="card flex h-[70vh] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-brand-50 p-2 text-brand-600">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">AI Etkinlik Asistanı</div>
                  <div className="text-xs text-surface-500">Konuşma tarzında sihirbaz — hızlı başlayın.</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    if (confirm(lang === "tr" ? "Konuşmayı temizlemek istediğine emin misin?" : "Clear the conversation?")) {
                      try {
                        window.dispatchEvent(new CustomEvent("ai-assistant-clear"));
                      } catch {
                        window.location.reload();
                      }
                    }
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex-1 p-4">
              <AIAssistant />
            </div>
          </div>
        </div>

        {/* Right: Quick prompts & tips */}
        <aside className="col-span-1">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Hızlı Komutlar</div>
                <div className="text-xs text-surface-500">Hızlı başlangıç için hazır ifadeler.</div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {[
                "3 saatlik eğitim: içerik, hedef kitle, kayıt ücreti 50₺",
                "Webinar: 45 dakika, ücretsiz, kayıt şartı e-posta",
                "Workshop: 2 günlük, katılımcı başına ücret, kontenjan 30",
                "KVKK metni ekle: kişisel veriler 6 ay saklanacak, veri sorumlusu ACME A.Ş.",
              ].map((p) => (
                <button
                  key={p}
                  className="w-full rounded border px-3 py-2 text-left text-sm hover:bg-surface-50"
                  onClick={async () => {
                    try {
                      try { window.dispatchEvent(new CustomEvent("ai-assistant-insert", { detail: p })); } catch {}
                      await navigator.clipboard.writeText(p);
                      toast.success(lang === "tr" ? "Komut eklendi ve kopyalandı — sohbet girişine yapıştırıldı." : "Prompt inserted and copied — paste into the chat input.");
                    } catch {
                      alert(p);
                    }
                  }}
                >
                  <div className="font-medium">{p.split(":")[0]}</div>
                  <div className="text-xs text-surface-500">{p}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="text-sm font-semibold">İpuçları</div>
              <ul className="mt-2 text-xs text-surface-500 list-disc pl-4">
                <li>Doğal dil ile yazın; asıl bilgileri ben çıkarırım.</li>
                <li>Yanlış yazım veya kısaltma sorun değil — ben anlamaya çalışırım.</li>
                <li>Oluşturduktan sonra ayarlarda KVKK metnini düzenleyin ve kaydedin.</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
