"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, RefreshCw, Upload, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Enrollment = {
  id: number;
  member_id: number;
  member_email: string | null;
  member_name: string | null;
  enrolled_at: string;
  completed_at: string | null;
  progress_pct: number;
  final_grade: number | null;
  status: string;
};

type ImportResult = {
  created_members: number;
  created_enrollments: number;
  skipped: { email: string; reason: string }[];
  capacity: number | null;
};

export default function CourseStudentsPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [rawImport, setRawImport] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await apiFetch(`/admin/lms/courses/${courseId}/enrollments`).then((r) => r.json());
    setRows(data.enrollments ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [courseId]);

  const parsedStudents = useMemo(() => {
    return rawImport
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [email, display_name, student_no, department] = line.split(",").map((p) => p?.trim() ?? "");
        return { email, display_name: display_name || null, student_no: student_no || null, department: department || null };
      })
      .filter((student) => student.email);
  }, [rawImport]);

  async function importStudents() {
    if (!parsedStudents.length) return;
    setImporting(true);
    setResult(null);
    const data = await apiFetch(`/admin/lms/courses/${courseId}/enrollments/import`, {
      method: "POST",
      body: JSON.stringify({ students: parsedStudents }),
    }).then((r) => r.json());
    setResult(data);
    setImporting(false);
    setRawImport("");
    await load();
  }

  async function inviteStudents() {
    if (rows.length === 0) return;
    setInviting(true);
    const data = await apiFetch(`/admin/lms/courses/${courseId}/enrollments/invite`, {
      method: "POST",
      body: JSON.stringify({ enrollment_ids: rows.map((row) => row.id) }),
    }).then((r) => r.json());
    setInviteMessage(`${data.sent ?? 0} ogrenciye davet gonderildi.`);
    setResult(null);
    setInviting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/lms/${courseId}`} className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Users className="h-6 w-6 text-indigo-600" />
            Ogrenciler
          </h1>
          <p className="text-sm text-gray-500">Kurs #{courseId} roster ve toplu kayit</p>
        </div>
        <button
          onClick={inviteStudents}
          disabled={inviting || rows.length === 0}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Davet gonder
        </button>
        <button onClick={load} className="rounded-lg p-2 hover:bg-gray-100">
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      {inviteMessage && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{inviteMessage}</div>}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Toplu ogrenci ekle</h2>
            <p className="text-sm text-gray-500">Her satir: email, isim, ogrenci no, bolum</p>
          </div>
          <button
            onClick={importStudents}
            disabled={importing || parsedStudents.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Ice aktar
          </button>
        </div>
        <textarea
          rows={6}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={rawImport}
          onChange={(e) => setRawImport(e.target.value)}
          placeholder={"ada@example.edu, Ada Lovelace, 2026001, Computer Science\nalan@example.edu, Alan Turing, 2026002, Mathematics"}
        />
        <div className="mt-2 text-xs text-gray-500">{parsedStudents.length} satir hazir.</div>
        {result && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            {result.created_enrollments} kayit acildi, {result.created_members} yeni uye olusturuldu.
            {result.skipped.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                Atlananlar: {result.skipped.map((s) => `${s.email} (${s.reason})`).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Kayitli ogrenciler</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-6 py-3">Ogrenci</th>
              <th className="px-6 py-3">Durum</th>
              <th className="px-6 py-3">Ilerleme</th>
              <th className="px-6 py-3">Kayit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{row.member_name || row.member_email || `#${row.member_id}`}</div>
                  <div className="text-xs text-gray-500">{row.member_email}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{row.status}</td>
                <td className="px-6 py-4 text-gray-600">%{row.progress_pct}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(row.enrolled_at).toLocaleDateString("tr-TR")}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-400">Henuz ogrenci yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
