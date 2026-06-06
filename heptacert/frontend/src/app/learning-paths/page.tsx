"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Loader2, Lock } from "lucide-react";
import { apiFetch, getPublicMemberToken } from "@/lib/api";

type PathCard = {
  id: number;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  step_count: number;
  my_enrollment: { progress_pct: number; completed_at: string | null } | null;
};

export default function LearningPathsPage() {
  const [paths, setPaths] = useState<PathCard[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getPublicMemberToken();

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    apiFetch("/public/learning-paths", { headers })
      .then((d) => setPaths(d.paths ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Öğrenme Yolları</h1>
          <p className="text-sm text-gray-500 mt-0.5">Adım adım ilerleyerek sertifika kazanın</p>
        </div>
      </div>

      {paths.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Henüz öğrenme yolu mevcut değil.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((path) => {
            const pct = path.my_enrollment?.progress_pct ?? 0;
            const done = path.my_enrollment?.completed_at != null;
            return (
              <Link
                key={path.id}
                href={`/learning-paths/${path.id}`}
                className="group rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition overflow-hidden"
              >
                {/* Thumbnail or gradient */}
                {path.thumbnail_url ? (
                  <img src={path.thumbnail_url} alt="" className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-indigo-300" />
                  </div>
                )}

                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition line-clamp-2">
                      {path.name}
                    </h2>
                    {done && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                  </div>
                  {path.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{path.description}</p>
                  )}
                  <div className="text-xs text-gray-400">{path.step_count} adım</div>

                  {/* Progress bar */}
                  {path.my_enrollment ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{done ? "Tamamlandı" : "Devam ediyor"}</span>
                        <span>%{pct}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-indigo-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-indigo-600 font-medium">
                      {token ? "Başla →" : "Üye girişi gerekli"}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
