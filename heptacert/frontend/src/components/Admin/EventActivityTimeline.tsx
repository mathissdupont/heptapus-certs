"use client";

import { useEffect, useState } from "react";
import { Activity, Clock3, Loader2 } from "lucide-react";
import { listEventTeamActivity, type EventTeamActivity } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { EmptyState } from "@/components/Admin/AdminState";

export default function EventActivityTimeline({ eventId }: { eventId: number }) {
  const { lang } = useI18n();
  const [items, setItems] = useState<EventTeamActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listEventTeamActivity(eventId)
      .then((data) => {
        if (!alive) return;
        setItems(data || []);
        setError(null);
      })
      .catch((err: any) => {
        if (!alive) return;
        setError(err?.message || (lang === "tr" ? "Aktivite yüklenemedi." : "Activity could not be loaded."));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [eventId, lang]);

  return (
    <section className="w-full rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm antialiased">
      {/* Üst Bilgi Başlığı */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {lang === "tr" ? "Aktivite Akışı" : "Activity Stream"}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-gray-950">
            {lang === "tr" ? "Etkinlik zaman çizelgesi" : "Event timeline"}
          </h2>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-800 border border-gray-100 shadow-sm">
          <Activity className="h-4 w-4 stroke-[2]" />
        </div>
      </div>

      {/* Durum Yönetimleri */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin stroke-[2.5]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600">
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Clock3 className="h-5 w-5 stroke-[1.5]" />}
          title={lang === "tr" ? "Henüz aktivite yok" : "No activity yet"}
          description={
            lang === "tr"
              ? "Ekip, katılımcı, bilet ve yönetim işlemleri burada kronolojik olarak görünür."
              : "Team, attendee, ticket, and management actions will appear here chronologically."
          }
          className="border-gray-200 bg-gray-50/30 py-10"
        />
      ) : (
        /* Apple Çizgisinde Dikey Kronolojik Zaman Akışı */
        <div className="relative pl-4 sm:pl-5 before:absolute before:bottom-2 before:left-1.5 before:top-2 before:w-[1px] before:bg-gray-100">
          <div className="space-y-6">
            {items.slice(0, 8).map((item) => (
              <div key={item.id} className="relative group">
                
                {/* Sol Kronolojik Düğüm Noktası (Dot) */}
                <div className="absolute -left-[19px] sm:-left-[23px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white ring-4 ring-white border border-gray-400 group-hover:border-gray-900 transition-colors" />

                {/* Aktivite Gövde İçeriği */}
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h3 className="text-xs font-semibold text-gray-950 tracking-tight">
                      {item.action_label}
                    </h3>
                    {item.detail && (
                      <p className="text-xs leading-relaxed text-gray-500 max-w-2xl">
                        {item.detail}
                      </p>
                    )}
                    <p className="text-[10px] font-medium text-gray-400 pt-0.5">
                      {item.actor_label}
                    </p>
                  </div>

                  {/* Sağ Tarih/Saat Rozeti */}
                  <time className="shrink-0 self-start rounded-lg border border-gray-100/70 bg-gray-50 px-2 py-0.5 font-mono text-[10px] font-medium text-gray-400 shadow-sm">
                    {new Date(item.created_at).toLocaleString(
                      lang === "tr" ? "tr-TR" : "en-US", 
                      { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }
                    )}
                  </time>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}