"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronUp, Globe,
  GripVertical, Loader2, Lock, Plus, Save, Trash2, ClipboardList, Store,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Module = {
  id?: number;
  title: string;
  description: string;
  order: number;
  content_type: "video" | "article" | "quiz" | "file" | "assignment";
  content_url: string;
  content_text: string;
  duration_minutes: string;
  is_required: boolean;
  collapsed: boolean;
};

type CourseForm = {
  title: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  language: string;
  is_published: boolean;
  is_featured: boolean;
  price: string;
  passing_score: string;
  // Marketplace fields
  is_marketplace_listed: boolean;
  marketplace_price: string;
  marketplace_description: string;
  preview_video_url: string;
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  video: "Video",
  article: "Makale / Metin",
  quiz: "Sınav",
  file: "Dosya",
  assignment: "Ödev",
};

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Başlangıç" },
  { value: "intermediate", label: "Orta" },
  { value: "advanced", label: "İleri" },
];

const emptyModule = (order: number): Module => ({
  title: "",
  description: "",
  order,
  content_type: "article",
  content_url: "",
  content_text: "",
  duration_minutes: "",
  is_required: true,
  collapsed: false,
});

export default function LmsCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useI18n();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [form, setForm] = useState<CourseForm>({
    title: "",
    description: "",
    category: "",
    level: "beginner",
    language: "tr",
    is_published: false,
    is_featured: false,
    price: "",
    passing_score: "",
    is_marketplace_listed: false,
    marketplace_price: "",
    marketplace_description: "",
    preview_video_url: "",
  });
  const [modules, setModules] = useState<Module[]>([]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/admin/lms/courses/${courseId}`);
        const d = await res.json();
        setForm({
          title: d.title ?? "",
          description: d.description ?? "",
          category: d.category ?? "",
          level: d.level ?? "beginner",
          language: d.language ?? "tr",
          is_published: d.is_published ?? false,
          is_featured: d.is_featured ?? false,
          price: d.price != null ? String(d.price) : "",
          passing_score: d.passing_score != null ? String(d.passing_score) : "",
          is_marketplace_listed: d.is_marketplace_listed ?? false,
          marketplace_price: d.marketplace_price != null ? String(d.marketplace_price) : "",
          marketplace_description: d.marketplace_description ?? "",
          preview_video_url: d.preview_video_url ?? "",
        });
        setModules(
          (d.modules ?? []).map((m: any) => ({
            id: m.id,
            title: m.title,
            description: m.description ?? "",
            order: m.order,
            content_type: m.content_type ?? "article",
            content_url: m.content_url ?? "",
            content_text: m.content_text ?? "",
            duration_minutes: m.duration_minutes != null ? String(m.duration_minutes) : "",
            is_required: m.is_required ?? true,
            collapsed: true,
          }))
        );
      } catch {
        // not found
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  async function handleSave() {
    setSaving(true);
    try {
      // Save course settings
      await apiFetch(`/admin/lms/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title.trim() || "Kurs",
          description: form.description || null,
          category: form.category || null,
          level: form.level,
          language: form.language,
          is_published: form.is_published,
          is_featured: form.is_featured,
          price: form.price ? Number(form.price) : null,
          passing_score: form.passing_score ? Number(form.passing_score) : null,
        }),
      });

      // Save marketplace settings
      await apiFetch(`/admin/lms/courses/${courseId}/marketplace`, {
        method: "PATCH",
        body: JSON.stringify({
          is_marketplace_listed: form.is_marketplace_listed,
          marketplace_price: form.marketplace_price ? Number(form.marketplace_price) : null,
          marketplace_description: form.marketplace_description || null,
          preview_video_url: form.preview_video_url || null,
        }),
      });

      // Save modules: create new ones, update existing
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        const body = {
          title: m.title.trim() || "Modül",
          description: m.description || null,
          order: i,
          content_type: m.content_type,
          content_url: m.content_url || null,
          content_text: m.content_text || null,
          duration_minutes: m.duration_minutes ? Number(m.duration_minutes) : null,
          is_required: m.is_required,
        };
        if (m.id) {
          await apiFetch(`/admin/lms/courses/${courseId}/modules/${m.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
        } else {
          const res = await apiFetch(`/admin/lms/courses/${courseId}/modules`, {
            method: "POST",
            body: JSON.stringify(body),
          });
          const created = await res.json();
          setModules((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], id: created.id };
            return next;
          });
        }
      }

      showToast("success", "Kaydedildi.");
    } catch (err: any) {
      showToast("error", err?.message ? `Kayıt başarısız: ${err.message}` : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModule(idx: number) {
    const m = modules[idx];
    if (m.id) {
      await apiFetch(`/admin/lms/courses/${courseId}/modules/${m.id}`, { method: "DELETE" });
    }
    setModules((prev) => prev.filter((_, i) => i !== idx));
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/lms")} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-xs">{form.title || "Kurs Düzenle"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${form.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {form.is_published ? <><Globe className="h-3 w-3" /> Yayında</> : <><Lock className="h-3 w-3" /> Taslak</>}
          </span>
          <Link
            href={`/admin/lms/courses/${courseId}/gradebook`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <BookOpen className="h-4 w-4" />
            Not Defteri
          </Link>
          <Link
            href={`/admin/lms/courses/${courseId}/rubrics`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ClipboardList className="h-4 w-4" />
            Rubrics
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
        </div>
      </div>

      {/* Course settings */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Kurs Ayarları</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Başlık</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Açıklama</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Teknoloji, İş, Sağlık..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Seviye</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as any }))}
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fiyat (₺, boş = ücretsiz)</label>
            <input
              type="number" min={0} step={0.01}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="Ücretsiz"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Geçme Puanı (%, boş = yok)</label>
            <input
              type="number" min={1} max={100}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.passing_score}
              onChange={(e) => setForm((f) => ({ ...f, passing_score: e.target.value }))}
              placeholder="Yok"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                className="rounded"
              />
              Yayında
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                className="rounded"
              />
              Öne Çıkan
            </label>
          </div>
        </div>
      </div>

      {/* Marketplace */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Store className="h-4 w-4 text-indigo-500" />
          Marketplace
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_marketplace_listed}
                onChange={(e) => setForm((f) => ({ ...f, is_marketplace_listed: e.target.checked }))}
                className="rounded"
              />
              Marketplace'te listele
            </label>
          </div>
          {form.is_marketplace_listed && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Marketplace Fiyatı (₺, boş = ücretsiz)</label>
                <input
                  type="number" min={0} step={0.01}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.marketplace_price}
                  onChange={(e) => setForm((f) => ({ ...f, marketplace_price: e.target.value }))}
                  placeholder="Ücretsiz"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Önizleme Video URL</label>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.preview_video_url}
                  onChange={(e) => setForm((f) => ({ ...f, preview_video_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Marketplace Açıklaması</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.marketplace_description}
                  onChange={(e) => setForm((f) => ({ ...f, marketplace_description: e.target.value }))}
                  placeholder="Kursun marketplace'te görünecek açıklaması..."
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modules */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Modüller</h2>
          <button
            onClick={() => setModules((m) => [...m, emptyModule(m.length)])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Modül Ekle
          </button>
        </div>

        {modules.length === 0 && (
          <p className="text-center py-8 text-sm text-gray-400">
            Henüz modül yok. Modül ekleyerek içerik oluşturun.
          </p>
        )}

        {modules.map((m, idx) => (
          <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/50">
            {/* Module header */}
            <div className="flex items-center gap-2 px-4 py-3">
              <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
              <span className="text-xs text-gray-400 w-5 shrink-0">{idx + 1}.</span>
              <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                {m.title || <span className="text-gray-400 italic">Başlıksız modül</span>}
              </span>
              <span className="shrink-0 rounded-md bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-500">
                {CONTENT_TYPE_LABELS[m.content_type] ?? m.content_type}
              </span>
              {!m.is_required && (
                <span className="shrink-0 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-600">İsteğe bağlı</span>
              )}
              <button
                onClick={() => setModules((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], collapsed: !next[idx].collapsed };
                  return next;
                })}
                className="text-gray-400 hover:text-gray-600"
              >
                {m.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleDeleteModule(idx)}
                className="text-gray-300 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Module body */}
            {!m.collapsed && (
              <div className="border-t border-gray-100 px-4 py-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Başlık</label>
                    <input
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={m.title}
                      onChange={(e) => setModules((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], title: e.target.value };
                        return next;
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">İçerik Tipi</label>
                    <select
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={m.content_type}
                      onChange={(e) => setModules((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], content_type: e.target.value as any };
                        return next;
                      })}
                    >
                      {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Süre (dk, opsiyonel)</label>
                    <input
                      type="number" min={1}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={m.duration_minutes}
                      onChange={(e) => setModules((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], duration_minutes: e.target.value };
                        return next;
                      })}
                      placeholder="Belirtilmemiş"
                    />
                  </div>
                  {(m.content_type === "video" || m.content_type === "file") && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">İçerik URL</label>
                      <input
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={m.content_url}
                        onChange={(e) => setModules((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], content_url: e.target.value };
                          return next;
                        })}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                  {m.content_type === "article" && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">İçerik Metni (Markdown)</label>
                      <textarea
                        rows={5}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={m.content_text}
                        onChange={(e) => setModules((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], content_text: e.target.value };
                          return next;
                        })}
                        placeholder="# Modül içeriği..."
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.is_required}
                        onChange={(e) => setModules((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], is_required: e.target.checked };
                          return next;
                        })}
                        className="rounded"
                      />
                      Zorunlu modül (tamamlanmadan ilerleme sayılmaz)
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
