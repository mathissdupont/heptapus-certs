"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Users, CheckCircle2, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type PathSummary = {
  id: number;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  published: boolean;
  step_count: number;
  created_at: string;
};

export default function AdminLearningPathsPage() {
  const [paths, setPaths] = useState<PathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    apiFetch("/admin/learning-paths")
      .then((d) => setPaths(d.paths ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const d = await apiFetch("/admin/learning-paths", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), published: false, steps: [] }),
      });
      setPaths((p) => [d, ...p]);
      setNewName("");
      setShowForm(false);
      showToast("Öğrenme yolu oluşturuldu.");
    } catch {
      showToast("Oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  }

  async function handleTogglePublish(path: PathSummary) {
    try {
      const updated = await apiFetch(`/admin/learning-paths/${path.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !path.published }),
      });
      setPaths((p) => p.map((x) => (x.id === path.id ? { ...x, published: updated.published } : x)));
    } catch {
      showToast("Güncelleme başarısız.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu öğrenme yolunu silmek istediğinizden emin misiniz?")) return;
    try {
      await apiFetch(`/admin/learning-paths/${id}`, { method: "DELETE" });
      setPaths((p) => p.filter((x) => x.id !== id));
    } catch {
      showToast("Silme başarısız.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm rounded-xl px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Öğrenme Yolları</h1>
            <p className="text-sm text-gray-500">Çok adımlı eğitim programları oluşturun</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Yeni Yol
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 space-y-3">
          <p className="text-sm font-medium text-indigo-800">Yeni öğrenme yolu</p>
          <div className="flex gap-3">
            <input
              autoFocus
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="İsim girin..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button
              disabled={creating || !newName.trim()}
              onClick={handleCreate}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-700"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Oluştur"}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(""); }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
      ) : paths.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Henüz öğrenme yolu yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paths.map((path) => (
            <div
              key={path.id}
              className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/learning-paths/${path.id}`}
                    className="font-medium text-gray-900 hover:text-indigo-600 truncate"
                  >
                    {path.name}
                  </Link>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                      path.published
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {path.published ? "Yayında" : "Taslak"}
                  </span>
                </div>
                {path.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{path.description}</p>
                )}
                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {path.step_count} adım
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/admin/learning-paths/${path.id}`}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Düzenle
                </Link>
                <button
                  onClick={() => handleTogglePublish(path)}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  title={path.published ? "Taslağa al" : "Yayınla"}
                >
                  {path.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDelete(path.id)}
                  className="rounded-lg border border-gray-200 p-1.5 text-red-400 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
