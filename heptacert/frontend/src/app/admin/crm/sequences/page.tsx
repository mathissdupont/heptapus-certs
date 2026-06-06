"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Mail, Loader2, Trash2, ToggleLeft, ToggleRight,
  Users, ChevronRight, Zap,
} from "lucide-react";
import {
  listSequences, createSequence, updateSequence, deleteSequence,
  type SequenceOut,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function CrmSequencesPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const copy = lang === "tr"
    ? {
        pageTitle: "Drip Sequence'lar",
        pageSubtitle: "Otomatik e-posta kampanya serileri",
        newSequence: "Yeni Sequence",
        createFormTitle: "Yeni sequence oluştur",
        sequenceNamePlaceholder: "Sequence adı...",
        create: "Oluştur",
        cancel: "İptal",
        active: "Aktif",
        inactive: "Pasif",
        steps: "adım",
        activeEnrollments: "aktif kayıt",
        edit: "Düzenle",
        deactivateTitle: "Pasife al",
        activateTitle: "Aktifleştir",
        emptyTitle: "Henüz sequence yok.",
        emptySubtitle: "Kişilere otomatik e-posta serisi gönderin.",
        errorCreate: "Oluşturulamadı.",
        errorUpdate: "Güncellenemedi.",
        errorDelete: "Silinemedi.",
        deleteConfirm: "Bu sequence'ı silmek istediğinizden emin misiniz? Aktif kayıtlar da silinecek.",
      }
    : {
        pageTitle: "Drip Sequences",
        pageSubtitle: "Automated email campaign series",
        newSequence: "New Sequence",
        createFormTitle: "Create new sequence",
        sequenceNamePlaceholder: "Sequence name...",
        create: "Create",
        cancel: "Cancel",
        active: "Active",
        inactive: "Inactive",
        steps: "steps",
        activeEnrollments: "active enrollments",
        edit: "Edit",
        deactivateTitle: "Deactivate",
        activateTitle: "Activate",
        emptyTitle: "No sequences yet.",
        emptySubtitle: "Send automated email series to contacts.",
        errorCreate: "Could not create.",
        errorUpdate: "Could not update.",
        errorDelete: "Could not delete.",
        deleteConfirm: "Are you sure you want to delete this sequence? Active enrollments will also be deleted.",
      };

  const [sequences, setSequences] = useState<SequenceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    listSequences()
      .then(setSequences)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const seq = await createSequence({ name: newName.trim(), active: false, steps: [] });
      router.push(`/admin/crm/sequences/${seq.id}`);
    } catch {
      showMsg(copy.errorCreate);
      setCreating(false);
    }
  }

  async function handleToggleActive(seq: SequenceOut) {
    try {
      const updated = await updateSequence(seq.id, {
        name: seq.name,
        description: seq.description,
        active: !seq.active,
        steps: seq.steps.map((s) => ({
          step_order: s.step_order,
          delay_days: s.delay_days,
          email_template_id: s.email_template_id,
          subject_override: s.subject_override,
        })),
      });
      setSequences((prev) => prev.map((x) => (x.id === seq.id ? updated : x)));
    } catch {
      showMsg(copy.errorUpdate);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(copy.deleteConfirm)) return;
    try {
      await deleteSequence(id);
      setSequences((prev) => prev.filter((x) => x.id !== id));
    } catch {
      showMsg(copy.errorDelete);
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
          <Zap className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{copy.pageTitle}</h1>
            <p className="text-sm text-gray-500">{copy.pageSubtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> {copy.newSequence}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 space-y-3">
          <p className="text-sm font-medium text-indigo-800">{copy.createFormTitle}</p>
          <div className="flex gap-3">
            <input
              autoFocus
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={copy.sequenceNamePlaceholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button
              disabled={creating || !newName.trim()}
              onClick={handleCreate}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-700"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.create}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(""); }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500"
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{copy.emptyTitle}</p>
          <p className="text-xs mt-1">{copy.emptySubtitle}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/crm/sequences/${seq.id}`}
                    className="font-medium text-gray-900 hover:text-indigo-600 truncate"
                  >
                    {seq.name}
                  </Link>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 font-medium flex-shrink-0 ${
                      seq.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {seq.active ? copy.active : copy.inactive}
                  </span>
                </div>
                {seq.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{seq.description}</p>
                )}
                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {seq.steps.length} {copy.steps}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {seq.enrollment_count} {copy.activeEnrollments}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/admin/crm/sequences/${seq.id}`}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  {copy.edit} <ChevronRight className="h-3 w-3" />
                </Link>
                <button
                  onClick={() => handleToggleActive(seq)}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  title={seq.active ? copy.deactivateTitle : copy.activateTitle}
                >
                  {seq.active
                    ? <ToggleRight className="h-4 w-4 text-green-500" />
                    : <ToggleLeft className="h-4 w-4" />
                  }
                </button>
                <button
                  onClick={() => handleDelete(seq.id)}
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
