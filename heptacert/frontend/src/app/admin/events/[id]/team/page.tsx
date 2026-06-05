"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, Mail, Plus, ShieldCheck, Trash2, UserCog, X, ChevronDown } from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import {
  addEventTeamMember,
  deleteEventTeamMember,
  listEventTeamActivity,
  listEventTeamMembers,
  updateEventTeamMember,
  type EventTeamActivity,
  type EventTeamMember,
  type EventTeamPermission,
  type EventTeamRole,
  type EventTeamStatus,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";

const ROLE_OPTIONS: Array<{ value: EventTeamRole; tr: string; en: string }> = [
  { value: "manager", tr: "Yönetici", en: "Manager" },
  { value: "checkin", tr: "Check-in görevlisi", en: "Check-in staff" },
  { value: "certificate", tr: "Sertifika görevlisi", en: "Certificate staff" },
  { value: "email", tr: "E-posta görevlisi", en: "Email staff" },
  { value: "analytics", tr: "Analitik", en: "Analytics" },
  { value: "viewer", tr: "Görüntüleyici", en: "Viewer" },
];

const ROLE_DEFAULTS: Record<EventTeamRole, EventTeamPermission[]> = {
  manager: ["event:view", "team:manage", "attendees:read", "attendees:write", "checkin:write", "certificates:write", "email:write", "analytics:read", "settings:write"],
  checkin: ["event:view", "attendees:read", "checkin:write"],
  certificate: ["event:view", "attendees:read", "certificates:write"],
  email: ["event:view", "attendees:read", "email:write"],
  analytics: ["event:view", "analytics:read"],
  viewer: ["event:view"],
};

const PERMISSIONS: Array<{ value: EventTeamPermission; tr: string; en: string }> = [
  { value: "event:view", tr: "Etkinliği görüntüleyebilir", en: "Can view the event" },
  { value: "team:manage", tr: "Ekip ve yetkileri yönetebilir", en: "Can manage team access" },
  { value: "attendees:read", tr: "Katılımcı listesini görebilir", en: "Can view attendees" },
  { value: "attendees:write", tr: "Katılımcı ekleyebilir ve silebilir", en: "Can add and remove attendees" },
  { value: "checkin:write", tr: "Check-in ve bilet kontrolü yapabilir", en: "Can handle check-in and tickets" },
  { value: "certificates:write", tr: "Sertifika işlemleri yapabilir", en: "Can manage certificates" },
  { value: "email:write", tr: "E-posta işlemleri yapabilir", en: "Can manage emails" },
  { value: "analytics:read", tr: "Analitikleri görebilir", en: "Can view analytics" },
  { value: "settings:write", tr: "Etkinlik ayarlarını değiştirebilir", en: "Can change event settings" },
];

export default function EventTeamPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const { lang } = useI18n();
  const { success, error } = useToast();
  const [members, setMembers] = useState<EventTeamMember[]>([]);
  const [activity, setActivity] = useState<EventTeamActivity[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EventTeamRole>("checkin");
  const [permissions, setPermissions] = useState<EventTeamPermission[]>(ROLE_DEFAULTS.checkin);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null);

  const copy = {
    tr: {
      title: "Etkinlik Ekibi",
      subtitle: "Bu etkinlikte görev alacak kişilere rol bazlı erişim verin.",
      email: "E-posta",
      role: "Rol",
      add: "Ekle",
      addTeamMember: "Ekip Üyesi Ekle",
      status: "Durum",
      pending: "Davet bekliyor",
      active: "Aktif",
      disabled: "Pasif",
      empty: "Henüz ekip üyesi yok.",
      activity: "Ekip Hareketleri",
      activityEmpty: "Henüz ekip hareketi görünmüyor.",
      permissions: "Erişimler",
      saved: "Ekip güncellendi.",
      removed: "Ekip üyesi kaldırıldı.",
      removeMember: "Ekipten kaldır",
      rolePermissions: "Rol Yetkileri",
      selectPermissions: "Yetkileri seçin veya rolü değiştirin",
      cancel: "İptal",
    },
    en: {
      title: "Event Team",
      subtitle: "Give role-based access to people working on this event.",
      email: "Email",
      role: "Role",
      add: "Add",
      addTeamMember: "Add Team Member",
      status: "Status",
      pending: "Invite pending",
      active: "Active",
      disabled: "Disabled",
      empty: "No team members yet.",
      activity: "Team Activity",
      activityEmpty: "No team activity yet.",
      permissions: "Access",
      saved: "Team updated.",
      removed: "Team member removed.",
      removeMember: "Remove from team",
      rolePermissions: "Role Permissions",
      selectPermissions: "Select permissions or change the role",
      cancel: "Cancel",
    },
  }[lang];

  const roleLabel = useMemo(() => {
    return new Map(ROLE_OPTIONS.map((item) => [item.value, item[lang]]));
  }, [lang]);

  async function load() {
    setLoading(true);
    try {
      const [nextMembers, nextActivity] = await Promise.all([
        listEventTeamMembers(eventId),
        listEventTeamActivity(eventId),
      ]);
      setMembers(nextMembers);
      setActivity(nextActivity);
    } catch (err) {
      error(err instanceof Error ? err.message : "Team could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(eventId)) void load();
  }, [eventId]);

  async function handleAdd() {
    if (!email.trim()) return;
    setSaving(true);
    try {
      await addEventTeamMember(eventId, { email: email.trim(), role, permissions });
      setEmail("");
      setRole("checkin");
      setPermissions(ROLE_DEFAULTS.checkin);
      await load();
      success(copy.saved);
    } catch (err) {
      error(err instanceof Error ? err.message : "Team member could not be added");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(member: EventTeamMember, data: { role?: EventTeamRole; status?: EventTeamStatus; permissions?: EventTeamPermission[] | null }) {
    try {
      const updated = await updateEventTeamMember(eventId, member.id, data);
      setMembers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      success(copy.saved);
    } catch (err) {
      error(err instanceof Error ? err.message : "Team member could not be updated");
    }
  }

  function handleRoleChange(nextRole: EventTeamRole) {
    setRole(nextRole);
    setPermissions(ROLE_DEFAULTS[nextRole]);
  }

  function togglePermission(current: EventTeamPermission[], permission: EventTeamPermission) {
    if (permission === "event:view") return current;
    const next = current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission];
    return Array.from(new Set<EventTeamPermission>(["event:view", ...next]));
  }

  async function handleMemberPermissionToggle(member: EventTeamMember, permission: EventTeamPermission) {
    const nextPermissions = togglePermission(member.effective_permissions, permission);
    await handleUpdate(member, { permissions: nextPermissions });
  }

  async function handleDelete(member: EventTeamMember) {
    try {
      await deleteEventTeamMember(eventId, member.id);
      setMembers((prev) => prev.filter((item) => item.id !== member.id));
      success(copy.removed);
    } catch (err) {
      error(err instanceof Error ? err.message : "Team member could not be removed");
    }
  }

  return (
    <div className="space-y-6">
      <EventAdminNav eventId={eventId} active="team" />
      <div className="flex items-start justify-between gap-4 sm:flex-col">
        <PageHeader title={copy.title} subtitle={copy.subtitle} icon={<UserCog className="h-6 w-6" />} />
      </div>

      {/* Add Team Member Form */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {copy.addTeamMember}
        </button>
      ) : (
        <div className="surface-panel space-y-5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-surface-900">{copy.addTeamMember}</h3>
              <p className="mt-1 text-sm text-surface-500">{copy.selectPermissions}</p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEmail("");
                setRole("checkin");
                setPermissions(ROLE_DEFAULTS.checkin);
              }}
              className="btn-ghost h-9 w-9 p-0 text-surface-500"
              aria-label={copy.cancel}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-surface-700">{copy.email}</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="input-field pl-10"
                  placeholder="name@example.com"
                  autoFocus
                />
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-surface-700">{copy.role}</span>
              <select
                value={role}
                onChange={(event) => handleRoleChange(event.target.value as EventTeamRole)}
                className="input-field"
              >
                {ROLE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item[lang]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-700">{copy.rolePermissions}</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {PERMISSIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  disabled={item.value === "event:view"}
                  onClick={() => setPermissions((current) => togglePermission(current, item.value))}
                  className={`flex min-h-12 items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition ${
                    permissions.includes(item.value)
                      ? "border-brand-300 bg-brand-50 text-surface-900"
                      : "border-surface-200 bg-white text-surface-600 hover:border-surface-300 hover:bg-surface-50"
                  } ${item.value === "event:view" ? "cursor-default opacity-80" : ""}`}
                >
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${permissions.includes(item.value) ? "text-brand-600" : "text-surface-300"}`} />
                  <span>{item[lang]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !email.trim()}
              className="btn-primary flex-1"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {copy.add}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEmail("");
                setRole("checkin");
                setPermissions(ROLE_DEFAULTS.checkin);
              }}
              className="btn-secondary flex-1"
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Team Members */}
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-surface-100 p-5">
          <h2 className="text-sm font-bold text-surface-900">
            {copy.title} ({members.length})
          </h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-10 text-surface-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="p-6 text-sm text-surface-500">{copy.empty}</p>
        ) : (
          <div className="divide-y divide-surface-100">
            {members.map((member) => (
              <div key={member.id} className="space-y-3 border-b border-surface-100 p-4 last:border-0 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-surface-900">{member.email}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-blue-600">{roleLabel.get(member.role)}</span>
                      <span className={`ml-2 rounded-full border px-2 py-0.5 text-11 font-bold ${
                        member.status === "active"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : member.status === "pending"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-surface-200 bg-surface-50 text-surface-500"
                      }`}>
                        {member.status === "active" ? copy.active : member.status === "pending" ? copy.pending : copy.disabled}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedMemberId(expandedMemberId === member.id ? null : member.id)}
                    className="text-surface-500 hover:text-surface-700"
                  >
                    <ChevronDown
                      className={`h-5 w-5 transition-transform ${
                        expandedMemberId === member.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {expandedMemberId === member.id && (
                  <div className="space-y-4 border-t border-surface-100 pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-surface-700">{copy.role}</span>
                        <select
                          value={member.role}
                          onChange={(event) => {
                            const nextRole = event.target.value as EventTeamRole;
                            void handleUpdate(member, {
                              role: nextRole,
                              permissions: ROLE_DEFAULTS[nextRole],
                            });
                            setExpandedMemberId(null);
                          }}
                          className="input-field"
                        >
                          {ROLE_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item[lang]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-surface-700">{copy.status}</span>
                        <select
                          value={member.status}
                          onChange={(event) =>
                            handleUpdate(member, {
                              status: event.target.value as EventTeamStatus,
                            })
                          }
                          className="input-field"
                        >
                          <option value="pending">{copy.pending}</option>
                          <option value="active">{copy.active}</option>
                          <option value="disabled">{copy.disabled}</option>
                        </select>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-surface-700">{copy.permissions}</p>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {PERMISSIONS.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            disabled={item.value === "event:view"}
                            onClick={() => handleMemberPermissionToggle(member, item.value)}
                            className={`flex min-h-11 items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-semibold transition ${
                              member.effective_permissions.includes(item.value)
                                ? "border-brand-300 bg-brand-50 text-surface-900"
                                : "border-surface-200 bg-white text-surface-600 hover:border-surface-300 hover:bg-surface-50"
                            } ${item.value === "event:view" ? "cursor-default opacity-80" : ""}`}
                          >
                            <CheckCircle2 className={`h-4 w-4 shrink-0 ${member.effective_permissions.includes(item.value) ? "text-brand-600" : "text-surface-300"}`} />
                            <span>{item[lang]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(member)}
                      className="btn-secondary w-full justify-center text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      {copy.removeMember}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activity Log */}
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-surface-100 p-5">
          <h2 className="text-sm font-bold text-surface-900">{copy.activity}</h2>
        </div>
        {activity.length === 0 ? (
          <p className="p-6 text-sm text-surface-500">{copy.activityEmpty}</p>
        ) : (
          <div className="divide-y divide-surface-100">
            {activity.map((item) => (
              <div key={item.id} className="grid gap-1 p-4 sm:grid-cols-[140px_1fr] sm:gap-4 sm:p-5">
                <p className="text-xs font-semibold text-surface-500">
                  {new Date(item.created_at).toLocaleString(
                    lang === "tr" ? "tr-TR" : "en-US"
                  )}
                </p>
                <div>
                  <p className="text-sm font-semibold text-surface-900">
                    {item.action_label}
                  </p>
                  <p className="mt-1 text-sm text-surface-600">
                    {item.actor_label} - {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
