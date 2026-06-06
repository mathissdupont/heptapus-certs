"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, ClipboardList, Loader2, Trash2, ChevronRight,
  ExternalLink, Copy, ToggleLeft, ToggleRight,
} from "lucide-react";
import { listLeadForms, createLeadForm, deleteLeadForm, updateLeadForm, type LeadFormOut } from "@/lib/api";

export default function LeadFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<LeadFormOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    listLeadForms()
      .then(setForms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const form = await createLeadForm({ name: newName.trim(), fields: [], active: true });
      router.push(`/admin/lead-forms/${form.id}`);
    } catch {
      showMsg("Oluşturulamadı.");
      setCreating(false);
    }
  }

  async function handleToggleActive(form: LeadFormOut) {
    try {
      const updated = await updateLeadForm(form.id, {
        name: form.name,
        fields: form.fields_json,
        destination: form.destination,
        auto_tag: form.auto_tag,
        redirect_url: form.redirect_url,
        active: !form.active,
      });
      setForms((prev) => prev.map((f) => (f.id === form.id ? updated : f)));
    } catch {
      showMsg("Güncellenemedi.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu formu ve tüm gönderimlerini silmek istediğinizden emin misiniz?")) return;
    try {
      await deleteLeadForm(id);
      setForms((prev) => prev.filter((f) => f.id !== id));
    } catch {
      showMsg("Silinemedi.");
    }
  }

  function getPublicUrl(slug: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/public/forms/${slug}`;
  }

  function copyEmbedCode(slug: string) {
    const url = getPublicUrl(slug);
    const code = `<iframe src="${url}" width="100%" height="500" frameborder="0" style="border-radius:12px"></iframe>`;
    navigator.clipboard.writeText(code).then(() => showMsg("Embed kodu kopyalandı!"));
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
          <ClipboardList className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Lead Formları</h1>
            <p className="text-sm text-gray-500">Embed veya link ile lead yakalayın</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Yeni Form
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 space-y-3">
          <p className="text-sm font-medium text-indigo-800">Yeni lead formu</p>
          <div className="flex gap-3">
            <input
              autoFocus
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Form adı..."
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
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Henüz lead formu yok.</p>
          <p className="text-xs mt-1">Web sitenize embed edebileceğiniz formlar oluşturun.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <div key={form.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/lead-forms/${form.id}`}
                    className="font-medium text-gray-900 hover:text-indigo-600 truncate"
                  >
                    {form.name}
                  </Link>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium flex-shrink-0 ${
                    form.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {form.active ? "Aktif" : "Pasif"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                  <span>{form.fields_json.length} alan</span>
                  <span>{form.submission_count} gönderim</span>
                  <span className="font-mono text-gray-300">/public/forms/{form.slug}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`/public/forms/${form.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  title="Formu önizle"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => copyEmbedCode(form.slug)}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  title="Embed kodu kopyala"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(form)}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  title={form.active ? "Pasife al" : "Aktifleştir"}
                >
                  {form.active
                    ? <ToggleRight className="h-4 w-4 text-green-500" />
                    : <ToggleLeft className="h-4 w-4" />}
                </button>
                <Link
                  href={`/admin/lead-forms/${form.id}`}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Düzenle <ChevronRight className="h-3 w-3" />
                </Link>
                <button
                  onClick={() => handleDelete(form.id)}
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
