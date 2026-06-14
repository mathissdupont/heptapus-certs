"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, Loader2, Megaphone, Pencil, Plus, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Announcement = {
  id: number;
  course_id: number;
  title: string;
  body: string;
  created_at: string;
};

export default function CourseAnnouncementsPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch(`/api/admin/lms/courses/${courseId}/announcements`);
      setAnnouncements(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [courseId]);

  function openCreate() {
    setEditId(null);
    setTitle("");
    setBody("");
    setError(null);
    setShowForm(true);
  }

  function openEdit(a: Announcement) {
    setEditId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setTitle("");
    setBody("");
    setError(null);
  }

  async function handleSave() {
    if (!title.trim() || !body.trim()) {
      setError("Başlık ve içerik zorunludur.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editId) {
        const r = await apiFetch(`/api/admin/lms/announcements/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), body: body.trim() }),
        });
        if (!r.ok) throw new Error("Güncelleme başarısız.");
      } else {
        const r = await apiFetch(`/api/admin/lms/courses/${courseId}/announcements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), body: body.trim() }),
        });
        if (!r.ok) throw new Error("Oluşturma başarısız.");
      }
      closeForm();
      await load();
    } catch (e: any) {
      setError(e?.message || "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(announcementId: number) {
    if (!confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) return;
    await apiFetch(`/api/admin/lms/announcements/${announcementId}`, { method: "DELETE" });
    await load();
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
        <Megaphone className="h-5 w-5 text-indigo-600" />
        <h1 className="text-xl font-semibold text-surface-900">Duyurular</h1>
        <span className="ml-auto">
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni Duyuru
          </button>
        </span>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-900">
              {editId ? "Duyuruyu Düzenle" : "Yeni Duyuru"}
            </h2>
            <button onClick={closeForm} className="text-surface-400 hover:text-surface-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Başlık</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Duyuru başlığı…"
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">İçerik</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Duyuru içeriği…"
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={closeForm}
              className="px-3 py-1.5 text-xs font-medium text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {editId ? "Güncelle" : "Yayımla"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-surface-200 p-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-surface-300 mb-3" />
          <p className="text-sm text-surface-500">Henüz duyuru yok.</p>
          <p className="text-xs text-surface-400 mt-1">Öğrencilerinize bildirim göndermek için duyuru oluşturun.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-surface-900">{a.title}</p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {new Date(a.created_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-surface-600 mt-2 whitespace-pre-wrap">{a.body}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    title="Düzenle"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
