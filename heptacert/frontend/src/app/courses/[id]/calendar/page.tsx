"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, ExternalLink, Loader2, Video } from "lucide-react";
import { publicApiFetch } from "@/lib/api";

type CalendarEvent = {
  id: number;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  module_id: number | null;
  conference_url: string | null;
  description: string | null;
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
  other: "bg-gray-50 border-gray-200 text-gray-700",
};

function groupByMonth(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  return events.reduce((acc, ev) => {
    const key = new Date(ev.starts_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);
}

export default function CourseCalendarPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await publicApiFetch(`/api/public/courses/${courseId}/calendar`).then((r) => r.json());
      setEvents(Array.isArray(res) ? res : []);
      setLoading(false);
    })();
  }, [courseId]);

  const grouped = groupByMonth(events);
  const months = Object.keys(grouped);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/courses/${courseId}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Kurs Takvimi
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Takvim etkinliği eklenmemiş.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {months.map((month) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{month}</h2>
              <div className="space-y-3">
                {grouped[month].map((ev) => {
                  const colorClass = TYPE_COLORS[ev.event_type] ?? TYPE_COLORS.other;
                  const date = new Date(ev.starts_at);
                  const isPast = date < new Date();
                  return (
                    <div
                      key={ev.id}
                      className={`flex gap-4 p-4 rounded-xl border ${colorClass} ${isPast ? "opacity-60" : ""}`}
                    >
                      {/* Date column */}
                      <div className="flex-shrink-0 text-center w-12">
                        <p className="text-2xl font-bold leading-none">{date.getDate()}</p>
                        <p className="text-xs mt-0.5">
                          {date.toLocaleDateString("tr-TR", { weekday: "short" })}
                        </p>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{ev.title}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 flex-shrink-0">
                            {TYPE_LABELS[ev.event_type] ?? ev.event_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs opacity-80">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                            {ev.ends_at && (
                              <> — {new Date(ev.ends_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</>
                            )}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-xs mt-1.5 opacity-80">{ev.description}</p>
                        )}
                        {ev.conference_url && (
                          <a
                            href={ev.conference_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Toplantıya katıl
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
