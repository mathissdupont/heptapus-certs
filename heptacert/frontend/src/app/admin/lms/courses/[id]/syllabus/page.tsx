"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function CourseSyllabusPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/admin/lms/courses/${courseId}/syllabus`)
      .then((r) => r.json())
      .then((d) => setContent(d.content_html || ""))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [courseId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const r = await apiFetch(`/api/admin/lms/courses/${courseId}/syllabus`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_html: content }),
      });
      if (!r.ok) throw new Error("Kaydetme başarısız.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.message || "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/lms/${courseId}`}
          className="text-surface-500 hover:text-surface-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <FileText className="h-5 w-5 text-indigo-600" />
        <h1 className="text-xl font-semibold text-surface-900">Ders Planı (Syllabus)</h1>
        <span className="ml-auto flex items-center gap-2">
          {saved && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              Kaydedildi
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Kaydet
          </button>
        </span>
      </div>

      <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
        <p className="text-xs text-surface-500 mb-3">
          Ders planını Markdown veya düz metin olarak yazabilirsiniz. Öğrenciler bu içeriği kurs sayfasından görebilir.
        </p>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={24}
            placeholder={`# Ders Planı\n\n## Amaç\nBu derste...\n\n## Haftalık Program\n- Hafta 1: Giriş\n- Hafta 2: ...\n\n## Değerlendirme\n- Ödev: %40\n- Sınav: %60`}
            className="w-full rounded-lg border border-surface-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        )}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>
        )}
      </div>
    </div>
  );
}
