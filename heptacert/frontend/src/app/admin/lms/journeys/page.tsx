"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, ChevronRight, Globe, Loader2, Lock,
  Plus, Route, Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type JourneyOut = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  step_count: number;
  created_at: string;
};

export default function LmsJourneysPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const [journeys, setJourneys] = useState<JourneyOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/lms/journeys");
      const d = (await res.json()) as { journeys: JourneyOut[] };
      setJourneys(d.journeys ?? []);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch("/admin/lms/journeys", {
        method: "POST",
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const created = (await res.json()) as JourneyOut;
      setJourneys((j) => [created, ...j]);
      setShowCreate(false);
      setNewTitle("");
    } catch {
      // keep
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(isTr ? "Bu öğrenme yolunu silmek istediğinizden emin misiniz?" : "Delete this learning journey?")) return;
    await apiFetch(`/admin/lms/journeys/${id}`, { method: "DELETE" });
    setJourneys((j) => j.filter((x) => x.id !== id));
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Route className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {isTr ? "LMS — Öğrenme Yolları" : "LMS — Learning Journeys"}
            </h1>
            <p className="text-sm text-gray-500">
              {isTr ? "Kurs dizileri oluşturun → Tamamlayanlara sertifika verin" : "Build course sequences → Award certificates on completion"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {isTr ? "Yeni Yol" : "New Journey"}
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {isTr ? "Yeni Öğrenme Yolu Başlığı" : "New Journey Title"}
            </h2>
            <input
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={isTr ? "Başlık..." : "Title..."}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowCreate(false); setNewTitle(""); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {isTr ? "İptal" : "Cancel"}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : (isTr ? "Oluştur" : "Create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-700">
        <strong>{isTr ? "Öğrenme Yolu nedir?" : "What is a Learning Journey?"}</strong>
        {isTr
          ? " Birden fazla kursun sıralı dizisidir. Öğrenci tüm zorunlu kursları tamamladığında sertifika alır. Etkinlik sisteminden bağımsız çalışır."
          : " An ordered sequence of courses. Students receive a certificate when they complete all required courses. Works independently of the Events system."
        }
      </div>

      {/* List */}
      {journeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <Route className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {isTr ? "Henüz öğrenme yolu yok." : "No learning journeys yet."}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {isTr ? "İlk Yolu Oluştur" : "Create First Journey"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {journeys.map((j) => (
            <div
              key={j.id}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                <Route className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{j.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {j.step_count} {isTr ? "kurs" : "courses"}
                  {j.description && ` · ${j.description.slice(0, 60)}${j.description.length > 60 ? "…" : ""}`}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {j.is_published
                  ? <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"><Globe className="h-3 w-3" />{isTr ? "Yayında" : "Published"}</span>
                  : <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500"><Lock className="h-3 w-3" />{isTr ? "Taslak" : "Draft"}</span>
                }
                <button
                  onClick={() => handleDelete(j.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
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
