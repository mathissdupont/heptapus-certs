"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Course = { id: number; title: string; course_code: string | null };
type Staff = {
  id: number;
  user_email: string;
  role: string;
  course_id: number | null;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  instructor: "Instructor",
  teaching_assistant: "Teaching Assistant",
  content_editor: "Content Editor",
  department_admin: "Department Admin",
  viewer: "Viewer",
};

export default function LmsStaffPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({ user_email: "", role: "instructor", course_id: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [staffData, courseData] = await Promise.all([
      apiFetch("/admin/lms/staff").then((r) => r.json()),
      apiFetch("/admin/lms/courses").then((r) => r.json()),
    ]);
    setStaff(staffData.staff ?? []);
    setCourses(courseData.courses ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiFetch("/admin/lms/staff", {
        method: "POST",
        body: JSON.stringify({
          user_email: form.user_email,
          role: form.role,
          course_id: form.course_id ? Number(form.course_id) : null,
        }),
      });
      setForm({ user_email: "", role: "instructor", course_id: "" });
      await load();
    } catch (err: any) {
      setError(err?.message || "LMS ekip uyesi eklenemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function removeStaff(id: number) {
    await apiFetch(`/admin/lms/staff/${id}`, { method: "DELETE" });
    setStaff((prev) => prev.filter((item) => item.id !== id));
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
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-950">
          <Users className="h-6 w-6 text-indigo-600" />
          LMS Ekip
        </h2>
        <p className="mt-1 text-sm text-slate-500">Instructor, TA, editor ve department admin rollerini LMS modulune ozel yonetin.</p>
      </div>

      <form onSubmit={addStaff} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_220px_260px_auto]">
        <input
          type="email"
          required
          value={form.user_email}
          onChange={(e) => setForm((f) => ({ ...f, user_email: e.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="egitmen@universite.edu"
        />
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={form.course_id}
          onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tum LMS</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.course_code ? `${course.course_code} - ` : ""}{course.title}
            </option>
          ))}
        </select>
        <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Ekle
        </button>
        {error && <p className="md:col-span-4 text-sm text-red-600">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3">Kisi</th>
              <th className="px-6 py-3">Rol</th>
              <th className="px-6 py-3">Kapsam</th>
              <th className="px-6 py-3 text-right">Islem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((item) => {
              const course = courses.find((c) => c.id === item.course_id);
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.user_email}</td>
                  <td className="px-6 py-4 text-slate-600">{ROLE_LABELS[item.role] ?? item.role}</td>
                  <td className="px-6 py-4 text-slate-600">{course ? `${course.course_code ? `${course.course_code} - ` : ""}${course.title}` : "Tum LMS"}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => removeStaff(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {staff.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Henuz LMS ekip uyesi yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
