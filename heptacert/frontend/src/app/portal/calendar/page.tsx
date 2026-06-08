"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Clock, Loader2, Video } from "lucide-react";
import { memberApiFetch } from "@/lib/api";

type CalendarEvent = {
  id: number;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  module_id: number | null;
  conference_url: string | null;
  description: string | null;
  course_id: number;
  course_title: string;
};

const TYPE_LABELS: Record<string, string> = {
  due_date: "Vade Tarihi",
  lecture: "Ders",
  exam: "Sınav",
  office_hours: "Ofis Saatleri",
  other: "Diğer",
};

const TYPE_COLORS: Record<string, string> = {
  due_date: "bg-red-50 border-red-200 text-red-700",
  lecture: "bg-blue-50 border-blue-200 text-blue-700",
  exam: "bg-orange-50 border-orange-200 text-orange-700",
  office_hours: "bg-green-50 border-green-200 text-green-700",
  other: "bg-slate-50 border-slate-200 text-slate-600",
};

type CourseStub = { id: number; title: string };

export default function PortalCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const coursesData = await memberApiFetch("/public/my-courses").then((r) => r.json());
        const courses: CourseStub[] = (coursesData.courses || []).map((c: any) => ({
          id: c.id,
          title: c.title,
        }));

        const now = new Date().toISOString();
        const results = await Promise.allSettled(
          courses.map((c) =>
            memberApiFetch(`/public/courses/${c.id}/calendar?from=${now}`)
              .then((r) => r.json())
              .then((d: any) =>
                (d.events || []).map((ev: any) => ({
                  ...ev,
                  course_id: c.id,
                  course_title: c.title,
                }))
              )
          )
        );

        const allEvents: CalendarEvent[] = results
          .filter((r): r is PromiseFulfilledResult<CalendarEvent[]> => r.status === "fulfilled")
          .flatMap((r) => r.value)
          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

        setEvents(allEvents);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const grouped = groupByDate(events);
  const dateKeys = Object.keys(grouped);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Takvim</h1>
        <p className="mt-1 text-sm text-slate-500">Tüm kurslarınızdan yaklaşan etkinlikler</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : dateKeys.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">Yaklaşan etkinlik yok.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateKeys.map((dateKey) => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{dateKey}</p>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="space-y-2">
                {grouped[dateKey].map((ev) => (
                  <EventRow key={`${ev.course_id}-${ev.id}`} event={ev} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const colorClass = TYPE_COLORS[event.event_type] || TYPE_COLORS.other;
  const label = TYPE_LABELS[event.event_type] || event.event_type;
  const time = new Date(event.starts_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <CalendarDays className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-slate-900 truncate">{event.title}</p>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${colorClass}`}>{label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {time}
          </span>
          <Link
            href={`/courses/${event.course_id}`}
            className="flex items-center gap-1 hover:text-indigo-600 transition"
          >
            <BookOpen className="h-3 w-3" />
            {event.course_title}
          </Link>
        </div>
        {event.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{event.description}</p>
        )}
      </div>
      {event.conference_url && (
        <a
          href={event.conference_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
        >
          <Video className="h-3.5 w-3.5" />
          Katıl
        </a>
      )}
    </div>
  );
}

function groupByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  return events.reduce(
    (acc, ev) => {
      const key = new Date(ev.starts_at).toLocaleDateString("tr-TR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!acc[key]) acc[key] = [];
      acc[key].push(ev);
      return acc;
    },
    {} as Record<string, CalendarEvent[]>
  );
}
