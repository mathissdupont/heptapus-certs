"use client";

import { useEffect, useState } from "react";
import { Activity, Clock3, Loader2 } from "lucide-react";
import { listEventTeamActivity, type EventTeamActivity } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { AdminEmptyState } from "@/components/Admin/AdminState";

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
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-surface-400">
            {lang === "tr" ? "Aktivite" : "Activity"}
          </p>
          <h2 className="mt-1 text-lg font-bold text-surface-900">
            {lang === "tr" ? "Etkinlik zaman çizelgesi" : "Event timeline"}
          </h2>
        </div>
        <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
          <Activity className="h-5 w-5" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-brand-600">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{error}</div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={<Clock3 className="h-6 w-6" />}
          title={lang === "tr" ? "Henüz aktivite yok" : "No activity yet"}
          description={
            lang === "tr"
              ? "Ekip, katılımcı, çekiliş ve yönetim işlemleri burada kronolojik olarak görünür."
              : "Team, attendee, raffle, and management actions will appear here chronologically."
          }
          className="border-surface-200 bg-surface-50 py-10"
        />
      ) : (
        <div className="space-y-3">
          {items.slice(0, 8).map((item) => (
            <div key={item.id} className="relative rounded-2xl border border-surface-200 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-bold text-surface-900">{item.action_label}</h3>
                  <p className="mt-1 text-sm leading-6 text-surface-500">{item.detail}</p>
                  <p className="mt-2 text-xs font-semibold text-surface-400">{item.actor_label}</p>
                </div>
                <time className="shrink-0 rounded-full bg-surface-50 px-3 py-1 text-xs font-bold text-surface-500">
                  {new Date(item.created_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
