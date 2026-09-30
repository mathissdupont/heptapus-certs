"use client";

import PageHeader from "@/components/Admin/PageHeader";
import { Wand2, MessageCircle, Sparkles } from "lucide-react";
import AIAssistant from "@/components/Admin/AIAssistant";
import Link from "next/link";
import { useI18n, translate } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";

export default function NewEventPage() {
  const { lang } = useI18n();
  const toast = useToast();
  const copy = { title: translate(lang, "migrated_app_admin_events_new_create_new_event_5d9abf09"), subtitle: translate(lang, "migrated_app_admin_events_new_use_the_ai_assisted_wizard_to_scaffold_an__d25a0980"), back: translate(lang, "migrated_app_admin_events_new_back_to_events_3fcd8606") };

  return (
    <div data-theme="light" className="flex flex-col gap-6 pb-20">
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
                    if (confirm(translate(lang, "migrated_app_admin_events_new_clear_the_conversation_bfd0656a"))) {
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
              <div className="rounded-lg bg-status-success-bg p-2 text-status-success-content">
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
                      toast.success(translate(lang, "migrated_app_admin_events_new_prompt_inserted_and_copied_paste_into_the__3529d8e7"));
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
