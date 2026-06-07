"use client";

import { useEffect, useState } from "react";
import {
  BookOpen, Loader2, Plus, Trash2, UserCheck, Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type StaffMember = {
  id: number;
  user_id: number;
  user_email: string;
  role: string;
  course_id: number | null;
  created_at: string;
};

type CourseOption = {
  id: number;
  title: string;
};

const ROLE_LABELS: Record<string, { tr: string; en: string; color: string }> = {
  instructor: { tr: "Eğitmen", en: "Instructor", color: "bg-indigo-100 text-indigo-700" },
  teaching_assistant: { tr: "Asistan", en: "Teaching Assistant", color: "bg-blue-100 text-blue-700" },
  content_editor: { tr: "İçerik Editörü", en: "Content Editor", color: "bg-purple-100 text-purple-700" },
  department_admin: { tr: "Bölüm Yöneticisi", en: "Department Admin", color: "bg-orange-100 text-orange-700" },
  viewer: { tr: "Görüntüleyici", en: "Viewer", color: "bg-gray-100 text-gray-600" },
};

export default function LmsStaffPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // add form
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("instructor");
  const [newCourseId, setNewCourseId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        apiFetch("/admin/lms/staff"),
        apiFetch("/admin/lms/courses"),
      ]);
      const sData = (await sRes.json()) as { staff: StaffMember[] };
      const cData = (await cRes.json()) as { courses: CourseOption[] };
      setStaff(sData.staff ?? []);
      setCourses(cData.courses ?? []);
    } catch {
      // keep
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleAdd() {
    if (!newEmail.trim()) return;
    setAdding(true);
    setAddErr(null);
    try {
      // First resolve user_id by email via existing admin users search or just pass email
      // We'll use a simple approach: post with email and let backend resolve it
      // For now use user_id directly — we show email field and backend search
      const res = await apiFetch("/admin/lms/staff", {
        method: "POST",
        body: JSON.stringify({
          user_email: newEmail.trim().toLowerCase(),
          role: newRole,
          course_id: newCourseId ? parseInt(newCourseId) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAddErr((err as { detail?: string }).detail ?? (isTr ? "Hata oluştu." : "An error occurred."));
        return;
      }
      const created = (await res.json()) as StaffMember;
      setStaff((s) => [{ ...created, user_email: newEmail.trim() }, ...s]);
      setShowAdd(false);
      setNewEmail("");
      setNewRole("instructor");
      setNewCourseId("");
    } catch {
      setAddErr(isTr ? "Hata oluştu." : "An error occurred.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: number) {
    if (!confirm(isTr ? "Bu personeli kaldırmak istediğinizden emin misiniz?" : "Remove this staff member?")) return;
    await apiFetch(`/admin/lms/staff/${id}`, { method: "DELETE" });
    setStaff((s) => s.filter((x) => x.id !== id));
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.title]));

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {isTr ? "LMS Personeli" : "LMS Staff"}
            </h1>
            <p className="text-sm text-gray-500">
              {isTr ? "Eğitmen, asistan ve editör rollerini yönetin" : "Manage instructor, assistant, and editor roles"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {isTr ? "Personel Ekle" : "Add Staff"}
        </button>
      </div>

      {/* Role guide */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {isTr ? "Rol Açıklamaları" : "Role Descriptions"}
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Object.entries(ROLE_LABELS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${val.color}`}>
                {isTr ? val.tr : val.en}
              </span>
              <span className="text-xs text-gray-500">
                {isTr ? {
                  instructor: "Kurs içeriği oluşturabilir, öğrenci notlayabilir",
                  teaching_assistant: "Öğrenci sorularına yanıt verebilir, ödevi notlayabilir",
                  content_editor: "Modül içeriği düzenleyebilir",
                  department_admin: "Departman kurslarını yönetebilir",
                  viewer: "Sadece görüntüleyebilir",
                }[key] : {
                  instructor: "Create course content, grade students",
                  teaching_assistant: "Reply to students, grade assignments",
                  content_editor: "Edit module content",
                  department_admin: "Manage department courses",
                  viewer: "View only",
                }[key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Staff list */}
      {staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <UserCheck className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {isTr ? "Henüz LMS personeli eklenmemiş." : "No LMS staff added yet."}
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {isTr ? "İlk Personeli Ekle" : "Add First Staff Member"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {isTr ? "Kullanıcı" : "User"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {isTr ? "Rol" : "Role"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {isTr ? "Kurs" : "Course"}
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map((s) => {
                const roleInfo = ROLE_LABELS[s.role];
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.user_email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleInfo?.color ?? "bg-gray-100 text-gray-600"}`}>
                        {isTr ? roleInfo?.tr : roleInfo?.en}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.course_id
                        ? <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{courseMap[s.course_id] ?? `#${s.course_id}`}</span>
                        : <span className="text-xs text-gray-400">{isTr ? "Tüm kurslar" : "All courses"}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemove(s.id)}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              {isTr ? "LMS Personeli Ekle" : "Add LMS Staff Member"}
            </h2>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {isTr ? "E-posta Adresi" : "Email Address"}
              </label>
              <input
                autoFocus
                type="email"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {isTr ? "Rol" : "Role"}
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{isTr ? v.tr : v.en}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {isTr ? "Kurs (opsiyonel — boş bırakırsan tüm kurslar)" : "Course (optional — blank means all courses)"}
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={newCourseId}
                onChange={(e) => setNewCourseId(e.target.value)}
              >
                <option value="">{isTr ? "Tüm kurslar" : "All courses"}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {addErr && <p className="text-xs text-red-600">{addErr}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setShowAdd(false); setAddErr(null); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {isTr ? "İptal" : "Cancel"}
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !newEmail.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : (isTr ? "Ekle" : "Add")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
