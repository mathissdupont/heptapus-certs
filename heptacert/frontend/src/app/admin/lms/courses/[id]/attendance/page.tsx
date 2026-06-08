"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Loader2, Plus, RefreshCw, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";

type AttendanceSession = {
  id: number;
  title: string;
  session_type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  required: boolean;
  record_count: number;
  present_count: number;
  late_count: number;
  excused_count: number;
  absent_count: number;
};

type AttendanceRecord = {
  record_id: number | null;
  enrollment_id: number;
  member_id: number;
  member_name: string | null;
  member_email: string | null;
  status: "present" | "late" | "excused" | "absent";
  minutes_attended: number | null;
  note: string | null;
};

const STATUS_OPTIONS = [
  { value: "present", label: "Var" },
  { value: "late", label: "Gec" },
  { value: "excused", label: "Mazeretli" },
  { value: "absent", label: "Yok" },
] as const;

export default function CourseAttendancePage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [newSession, setNewSession] = useState({
    title: "",
    session_type: "lecture",
    starts_at: new Date().toISOString().slice(0, 16),
    location: "",
  });

  async function loadSessions(selectFirst = false) {
    setLoading(true);
    const data = await apiFetch(`/admin/lms/courses/${courseId}/attendance-sessions`).then((r) => r.json());
    setSessions(Array.isArray(data) ? data : []);
    if (selectFirst && Array.isArray(data) && data.length > 0) {
      setSelectedSessionId(data[0].id);
      await loadRecords(data[0].id);
    }
    setLoading(false);
  }

  async function loadRecords(sessionId: number) {
    const data = await apiFetch(`/admin/lms/courses/${courseId}/attendance-sessions/${sessionId}/records`).then((r) => r.json());
    setRecords(data.records ?? []);
  }

  useEffect(() => { void loadSessions(true); }, [courseId]);

  async function createSession() {
    if (!newSession.title.trim()) return;
    const created = await apiFetch(`/admin/lms/courses/${courseId}/attendance-sessions`, {
      method: "POST",
      body: JSON.stringify({
        title: newSession.title.trim(),
        session_type: newSession.session_type,
        starts_at: new Date(newSession.starts_at).toISOString(),
        location: newSession.location || null,
      }),
    }).then((r) => r.json());
    setNewSession({ title: "", session_type: "lecture", starts_at: new Date().toISOString().slice(0, 16), location: "" });
    await loadSessions();
    setSelectedSessionId(created.id);
    await loadRecords(created.id);
  }

  function updateRecord(enrollmentId: number, patch: Partial<AttendanceRecord>) {
    setRecords((prev) => prev.map((r) => (r.enrollment_id === enrollmentId ? { ...r, ...patch } : r)));
  }

  async function saveRecords() {
    if (!selectedSessionId) return;
    setSaving(true);
    await apiFetch(`/admin/lms/courses/${courseId}/attendance-sessions/${selectedSessionId}/records`, {
      method: "PUT",
      body: JSON.stringify({
        records: records.map((r) => ({
          enrollment_id: r.enrollment_id,
          status: r.status,
          minutes_attended: r.minutes_attended,
          note: r.note,
        })),
      }),
    });
    setSaving(false);
    await loadSessions();
    await loadRecords(selectedSessionId);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/lms/${courseId}`} className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <CalendarCheck className="h-6 w-6 text-indigo-600" />
            Yoklama
          </h1>
          <p className="text-sm text-gray-500">Kurs #{courseId} ders oturumlari ve katilim</p>
        </div>
        <button onClick={() => loadSessions()} className="ml-auto rounded-lg p-2 hover:bg-gray-100">
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Yeni oturum</h2>
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newSession.title}
                onChange={(e) => setNewSession((s) => ({ ...s, title: e.target.value }))}
                placeholder="Hafta 1 - Ders"
              />
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newSession.starts_at}
                onChange={(e) => setNewSession((s) => ({ ...s, starts_at: e.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newSession.location}
                onChange={(e) => setNewSession((s) => ({ ...s, location: e.target.value }))}
                placeholder="Derslik / online link"
              />
              <button
                onClick={createSession}
                disabled={!newSession.title.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Oturum ekle
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">Oturumlar</div>
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={async () => {
                    setSelectedSessionId(session.id);
                    await loadRecords(session.id);
                  }}
                  className={`block w-full px-4 py-3 text-left text-sm hover:bg-gray-50 ${selectedSessionId === session.id ? "bg-indigo-50" : ""}`}
                >
                  <div className="font-medium text-gray-900">{session.title}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {new Date(session.starts_at).toLocaleString("tr-TR")} · {session.present_count + session.late_count}/{session.record_count || 0}
                  </div>
                </button>
              ))}
              {sessions.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-400">Henuz oturum yok.</div>}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Yoklama listesi</h2>
            <button
              onClick={saveRecords}
              disabled={!selectedSessionId || saving || records.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Ogrenci</th>
                <th className="px-6 py-3">Durum</th>
                <th className="px-6 py-3">Dakika</th>
                <th className="px-6 py-3">Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.enrollment_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{record.member_name || record.member_email || `#${record.member_id}`}</div>
                    <div className="text-xs text-gray-500">{record.member_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={record.status}
                      onChange={(e) => updateRecord(record.enrollment_id, { status: e.target.value as AttendanceRecord["status"] })}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min={0}
                      className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={record.minutes_attended ?? ""}
                      onChange={(e) => updateRecord(record.enrollment_id, { minutes_attended: e.target.value ? Number(e.target.value) : null })}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={record.note ?? ""}
                      onChange={(e) => updateRecord(record.enrollment_id, { note: e.target.value || null })}
                      placeholder="Opsiyonel"
                    />
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Bir oturum secin veya once ogrenci ekleyin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
