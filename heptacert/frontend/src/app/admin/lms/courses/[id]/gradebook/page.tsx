"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, BookOpen, Loader2, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";

type GradeRow = {
  enrollment_id: number;
  member_id: number;
  status: string;
  progress_pct: number;
  weighted_avg: number | null;
  letter_grade: string | null;
  passed: boolean | null;
};

type GradeItem = {
  id: number;
  title: string;
  item_type: string;
  max_points: number;
  weight_pct: number;
  order: number;
};

const STATUS_LABELS: Record<string, string> = {
  enrolled: "Kayıtlı",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  dropped: "Ayrıldı",
};

const LETTER_COLORS: Record<string, string> = {
  AA: "text-green-600",
  BA: "text-green-500",
  BB: "text-blue-600",
  CB: "text-blue-500",
  CC: "text-yellow-600",
  FF: "text-red-600",
};

export default function GradebookPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;

  const [rows, setRows] = useState<GradeRow[]>([]);
  const [items, setItems] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ title: "", item_type: "assignment", max_points: 100, weight_pct: 0 });
  const [addingItem, setAddingItem] = useState(false);
  const [editingGrade, setEditingGrade] = useState<{ enrollmentId: number; avg: string } | null>(null);

  async function load() {
    setLoading(true);
    const [gb, gi] = await Promise.all([
      apiFetch(`/admin/lms/courses/${courseId}/gradebook`).then((r) => r.json()),
      apiFetch(`/admin/lms/courses/${courseId}/grade-items`).then((r) => r.json()),
    ]);
    setRows(Array.isArray(gb) ? gb : []);
    setItems(Array.isArray(gi) ? gi : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [courseId]);

  async function addItem() {
    if (!newItem.title.trim()) return;
    setAddingItem(true);
    await apiFetch(`/admin/lms/courses/${courseId}/grade-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newItem, weight_pct: Number(newItem.weight_pct), max_points: Number(newItem.max_points) }),
    });
    setNewItem({ title: "", item_type: "assignment", max_points: 100, weight_pct: 0 });
    setAddingItem(false);
    load();
  }

  async function deleteItem(itemId: number) {
    await apiFetch(`/admin/lms/courses/${courseId}/grade-items/${itemId}`, { method: "DELETE" });
    load();
  }

  async function saveGrade(enrollmentId: number, avg: string) {
    await apiFetch(`/admin/lms/courses/${courseId}/gradebook/${enrollmentId}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weighted_avg: Number(avg) }),
    });
    setEditingGrade(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalWeight = items.reduce((s, i) => s + i.weight_pct, 0);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/admin/lms/${courseId}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Not Defteri
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Kurs #{courseId}</p>
        </div>
        <button onClick={load} className="ml-auto p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Grade Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Notlandırma Kalemleri
          <span className="ml-2 text-sm font-normal text-gray-500">
            (Toplam ağırlık: %{totalWeight.toFixed(0)})
          </span>
        </h2>
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3">
              <div>
                <span className="font-medium text-gray-900">{item.title}</span>
                <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-600">
                  {item.item_type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{item.max_points} puan</span>
                <span>%{item.weight_pct} ağırlık</span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-gray-400 text-sm py-3">Henüz not kalemi yok.</p>
          )}
        </div>

        {/* Add item */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3 flex-wrap">
          <input
            className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Kalem adı..."
            value={newItem.title}
            onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={newItem.item_type}
            onChange={(e) => setNewItem((p) => ({ ...p, item_type: e.target.value }))}
          >
            <option value="assignment">Ödev</option>
            <option value="quiz">Sınav</option>
            <option value="participation">Katılım</option>
            <option value="custom">Özel</option>
          </select>
          <input
            type="number"
            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            placeholder="Max puan"
            value={newItem.max_points}
            onChange={(e) => setNewItem((p) => ({ ...p, max_points: Number(e.target.value) }))}
          />
          <input
            type="number"
            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            placeholder="Ağırlık %"
            value={newItem.weight_pct}
            onChange={(e) => setNewItem((p) => ({ ...p, weight_pct: Number(e.target.value) }))}
          />
          <button
            onClick={addItem}
            disabled={addingItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {addingItem ? "Ekleniyor..." : "Ekle"}
          </button>
        </div>
      </div>

      {/* Gradebook table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Kayıtlı Öğrenciler</h2>
        </div>
        {rows.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">Kayıtlı öğrenci yok.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Üye ID</th>
                <th className="px-6 py-3 text-left">Durum</th>
                <th className="px-6 py-3 text-left">İlerleme</th>
                <th className="px-6 py-3 text-left">Ort. Not</th>
                <th className="px-6 py-3 text-left">Harf</th>
                <th className="px-6 py-3 text-left">Geçti?</th>
                <th className="px-6 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.enrollment_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">#{row.member_id}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {STATUS_LABELS[row.status] ?? row.status}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${row.progress_pct}%` }}
                        />
                      </div>
                      <span className="text-gray-500">%{row.progress_pct}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-700">
                    {editingGrade?.enrollmentId === row.enrollment_id ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                        value={editingGrade.avg}
                        onChange={(e) => setEditingGrade((p) => p ? { ...p, avg: e.target.value } : null)}
                      />
                    ) : (
                      row.weighted_avg != null ? `${row.weighted_avg}` : "—"
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {row.letter_grade ? (
                      <span className={`font-bold ${LETTER_COLORS[row.letter_grade] ?? "text-gray-700"}`}>
                        {row.letter_grade}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-3">
                    {row.passed === true && <Award className="w-4 h-4 text-green-500" />}
                    {row.passed === false && <span className="text-red-400 text-xs">Geçemedi</span>}
                    {row.passed === null && "—"}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {editingGrade?.enrollmentId === row.enrollment_id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveGrade(row.enrollment_id, editingGrade.avg)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => setEditingGrade(null)}
                          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingGrade({
                          enrollmentId: row.enrollment_id,
                          avg: row.weighted_avg?.toString() ?? "0",
                        })}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Not Gir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
