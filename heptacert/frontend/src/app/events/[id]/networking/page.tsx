"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n, useT } from "@/lib/i18n";
import {
  getPublicMemberToken,
  getPublicEventDetail,
  getMyNetworkingProfile,
  updateMyNetworkingProfile,
  listNetworkingAttendees,
  listMyMeetings,
  createMeetingRequest,
  respondMeetingRequest,
  cancelMeetingRequest,
  type NetworkingProfile,
  type NetworkingMember,
  type MeetingRequest,
} from "@/lib/api";
import { ArrowLeft, Loader2, Users, Search, Check, X, Trash2, Send, Handshake } from "lucide-react";

export default function NetworkingPage() {
  const params = useParams();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const eventId = rawId ? String(rawId) : "";
  const { lang } = useI18n();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<NetworkingProfile>({ interests: [], discoverable: true });
  const [interestsText, setInterestsText] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [directory, setDirectory] = useState<NetworkingMember[]>([]);
  const [tag, setTag] = useState("");
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);

  const [requestFor, setRequestFor] = useState<NetworkingMember | null>(null);
  const [busy, setBusy] = useState(false);

  function fmt(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
  }

  async function load() {
    const isIn = Boolean(getPublicMemberToken());
    setLoggedIn(isIn);
    try {
      const ev = await getPublicEventDetail(eventId);
      setEnabled(Boolean(ev.networking_meetings_enabled));
      if (ev.networking_meetings_enabled && isIn) {
        const [prof, dir, mine] = await Promise.all([
          getMyNetworkingProfile().catch(() => ({ interests: [], discoverable: true })),
          listNetworkingAttendees(eventId).catch(() => []),
          listMyMeetings(eventId).catch(() => []),
        ]);
        setProfile(prof);
        setInterestsText((prof.interests || []).join(", "));
        setDirectory(dir);
        setMeetings(mine);
      }
    } catch (e: any) {
      setError(e?.message || t("net_action_failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (eventId) load(); /* eslint-disable-next-line */ }, [eventId]);

  async function saveProfile() {
    setSavingProfile(true); setError(null);
    try {
      const interests = interestsText.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
      const saved = await updateMyNetworkingProfile({ interests, discoverable: profile.discoverable });
      setProfile(saved);
      setInterestsText(saved.interests.join(", "));
    } catch (e: any) { setError(e?.message || t("net_action_failed")); } finally { setSavingProfile(false); }
  }

  async function refreshMeetings() {
    setMeetings(await listMyMeetings(eventId).catch(() => []));
  }

  async function respond(rid: number, decision: "accepted" | "declined") {
    setBusy(true);
    try { await respondMeetingRequest(eventId, rid, decision); await refreshMeetings(); }
    catch (e: any) { setError(e?.message || t("net_action_failed")); } finally { setBusy(false); }
  }
  async function cancel(rid: number) {
    setBusy(true);
    try { await cancelMeetingRequest(eventId, rid); await refreshMeetings(); }
    catch (e: any) { setError(e?.message || t("net_action_failed")); } finally { setBusy(false); }
  }

  async function search() {
    setDirectory(await listNetworkingAttendees(eventId, tag).catch(() => []));
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-500">
        <Handshake className="mx-auto mb-3 h-10 w-10 opacity-40" />
        <p>{t("net_disabled")}</p>
        <Link href={`/events/${eventId}`} className="mt-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> {lang === "tr" ? "Etkinliğe dön" : "Back to event"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link href={`/events/${eventId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> {lang === "tr" ? "Etkinliğe dön" : "Back to event"}
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Handshake className="h-6 w-6 text-gray-400" /> {t("net_title")}
      </h1>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {!loggedIn ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">{t("net_login_required")}</p>
          <Link href={`/login?mode=member&next=${encodeURIComponent(`/events/${eventId}/networking`)}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            {t("net_login_cta")}
          </Link>
        </div>
      ) : (
        <>
          {/* My networking profile */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-bold text-gray-900">{t("net_my_profile")}</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">{t("net_interests")}</label>
              <input value={interestsText} onChange={(e) => setInterestsText(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <p className="mt-1 text-11 text-gray-400">{t("net_interests_hint")}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={profile.discoverable} onChange={(e) => setProfile({ ...profile, discoverable: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
              {t("net_discoverable")}
            </label>
            <div className="flex justify-end">
              <button onClick={saveProfile} disabled={savingProfile} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t("net_save_profile")}
              </button>
            </div>
          </section>

          {/* Directory */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Users className="h-5 w-5 text-gray-400" /> {t("net_directory")}</h2>
            </div>
            <div className="flex gap-2">
              <input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder={t("net_search_tag")} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <button onClick={search} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"><Search className="h-4 w-4" /></button>
            </div>
            {directory.length === 0 ? (
              <p className="text-sm text-gray-500">{t("net_no_attendees")}</p>
            ) : (
              <div className="space-y-2">
                {directory.map((mbr) => (
                  <div key={mbr.public_id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{mbr.display_name}</p>
                      {mbr.headline && <p className="text-xs text-gray-500">{mbr.headline}</p>}
                      {mbr.interests.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {mbr.interests.map((i) => <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-11 text-gray-600">{i}</span>)}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setRequestFor(mbr)} className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-900 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800">
                      <Send className="h-3.5 w-3.5" /> {t("net_request_meeting")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* My meetings */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">{t("net_my_meetings")}</h2>
            {meetings.length === 0 ? (
              <p className="text-sm text-gray-500">{t("net_no_meetings")}</p>
            ) : (
              meetings.map((mr) => (
                <div key={mr.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{mr.counterpart.display_name}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-11 font-semibold text-gray-500">{mr.is_incoming ? t("net_incoming") : t("net_outgoing")}</span>
                        <MeetingStatusBadge status={mr.status} />
                      </div>
                      {mr.proposed_start && <p className="mt-1 text-xs text-gray-500">{t("net_proposed_time")}: {fmt(mr.proposed_start)} · {mr.duration_minutes}′</p>}
                      {mr.location && <p className="text-xs text-gray-500">{mr.location}</p>}
                      {mr.message && <p className="mt-1 text-sm text-gray-600">{mr.message}</p>}
                      {mr.response_note && <p className="mt-1 text-xs italic text-gray-500">“{mr.response_note}”</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {mr.is_incoming && mr.status === "pending" && (
                        <>
                          <button onClick={() => respond(mr.id, "accepted")} disabled={busy} title={t("net_accept")} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"><Check className="h-4 w-4" /></button>
                          <button onClick={() => respond(mr.id, "declined")} disabled={busy} title={t("net_decline")} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-40"><X className="h-4 w-4" /></button>
                        </>
                      )}
                      {!mr.is_incoming && (mr.status === "pending" || mr.status === "accepted") && (
                        <button onClick={() => cancel(mr.id)} disabled={busy} title={t("net_withdraw")} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {/* Request modal */}
      {requestFor && (
        <RequestModal
          eventId={eventId}
          member={requestFor}
          onClose={() => setRequestFor(null)}
          onSent={async () => { setRequestFor(null); await refreshMeetings(); }}
          onError={(m) => setError(m)}
        />
      )}
    </div>
  );
}

function MeetingStatusBadge({ status }: { status: string }) {
  const t = useT();
  const tone: Record<string, string> = {
    pending: "bg-sky-50 text-sky-700 border-sky-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    declined: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-11 font-semibold ${tone[status] || tone.cancelled}`}>{t(`net_status_${status}` as any)}</span>;
}

function RequestModal({ eventId, member, onClose, onSent, onError }: {
  eventId: string; member: NetworkingMember; onClose: () => void; onSent: () => void; onError: (m: string) => void;
}) {
  const t = useT();
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      await createMeetingRequest(eventId, {
        target_public_id: member.public_id,
        proposed_start: start ? new Date(start).toISOString() : undefined,
        duration_minutes: duration,
        location: location.trim() || undefined,
        message: message.trim() || undefined,
      });
      onSent();
    } catch (e: any) { onError(e?.message || t("net_action_failed")); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-bold text-gray-900">{t("net_request_meeting")} · {member.display_name}</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{t("net_proposed_time")}</label>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{t("net_duration")}</label>
            <input type="number" min={5} max={480} value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{t("net_location")}</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{t("net_message")}</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">{t("net_cancel")}</button>
          <button onClick={send} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {t("net_send_request")}
          </button>
        </div>
      </div>
    </div>
  );
}
