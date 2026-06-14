"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, Loader2, Megaphone } from "lucide-react";
import { memberApiFetch } from "@/lib/api";

type Announcement = {
  id: number;
  title: string;
  body: string;
  created_at: string;
};

export default function CourseAnnouncementsPublicPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    memberApiFetch(`/public/courses/${courseId}/announcements`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setAnnouncements(Array.isArray(d) ? d : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [courseId]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Kursa Dön
      </Link>

      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-amber-600" />
        <h1 className="text-xl font-semibold text-gray-900">Duyurular</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <p className="text-sm text-gray-500 text-center py-8">Bu kursa kayıtlı olmanız gerekiyor.</p>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Henüz duyuru yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(a.created_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
