"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { memberApiFetch } from "@/lib/api";

export default function CourseSyllabusPublicPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    memberApiFetch(`/public/courses/${courseId}/syllabus`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setContent(d.content_html || ""))
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
        <FileText className="h-5 w-5 text-indigo-600" />
        <h1 className="text-xl font-semibold text-gray-900">Ders Planı</h1>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <p className="text-sm text-gray-500 text-center py-8">Bu kursa kayıtlı olmanız gerekiyor.</p>
        ) : !content ? (
          <p className="text-sm text-gray-400 text-center py-8">Ders planı henüz eklenmemiş.</p>
        ) : (
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{content}</div>
        )}
      </div>
    </div>
  );
}
