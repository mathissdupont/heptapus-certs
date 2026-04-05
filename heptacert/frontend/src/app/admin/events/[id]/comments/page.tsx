"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, MessageSquare, ShieldAlert } from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import { getPublicEventInfo, listAdminEventComments, updateAdminEventComment, type PublicEventComment } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATUS_STYLES: Record<string, string> = {
  visible: "border-emerald-200 bg-emerald-50 text-emerald-700",
  hidden: "border-slate-200 bg-slate-100 text-slate-700",
  reported: "border-amber-200 bg-amber-50 text-amber-700",
};

export default function EventCommentsAdminPage() {
  const params = useParams();
  const eventId = String(params.id);
  const { lang } = useI18n();
  const [comments, setComments] = useState<PublicEventComment[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            title: "Yorum Moderasyonu",
            subtitle: "Public etkinlik sayfas?ndaki yorumlar? tek yerden g?r?n, raporlananlar? inceleyin ve g?r?n?rl??? y?netin.",
            empty: "Bu etkinlik i?in hen?z yorum yok.",
            reported: "Rapor",
            hide: "Gizle",
            publish: "Yay?na Al",
            member: "?ye",
            updated: "G?ncellendi",
            fallback: "Yorumlar y?klenemedi.",
          }
        : {
            title: "Comment Moderation",
            subtitle: "Review public event comments, inspect reports, and control visibility from one place.",
            empty: "There are no comments for this event yet.",
            reported: "Reports",
            hide: "Hide",
            publish: "Publish",
            member: "Member",
            updated: "Updated",
            fallback: "Failed to load comments.",
          },
    [lang],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      listAdminEventComments(Number(eventId)),
      getPublicEventInfo(Number(eventId)).catch(() => null),
    ])
      .then(([commentData, eventInfo]) => {
        if (!active) return;
        setComments(commentData);
        setEventName(eventInfo?.name || "");
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || copy.fallback);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [copy.fallback, eventId]);

  async function handleStatusChange(commentId: number, status: "visible" | "hidden" | "reported") {
    setSavingId(commentId);
    setError(null);
    try {
      const updated = await updateAdminEventComment(Number(eventId), commentId, status);
      setComments((current) => current.map((comment) => (comment.id === commentId ? updated : comment)));
    } catch (err: any) {
      setError(err?.message || copy.fallback);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <EventAdminNav eventId={eventId} eventName={eventName} active="comments" className="mb-2 flex flex-col gap-2" />

      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<MessageSquare className="h-5 w-5" />}
      />

      {error && (
        <div className="error-banner">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
        </div>
      ) : comments.length === 0 ? (
        <div className="card p-10 text-center text-sm text-surface-500">{copy.empty}</div>
      ) : (
        <div className="grid gap-4">
          {comments.map((comment) => {
            const statusStyle = STATUS_STYLES[comment.status] || STATUS_STYLES.hidden;
            return (
              <article key={comment.id} className="card p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-surface-900">{comment.member_name}</span>
                      <span className="text-xs text-surface-400">{comment.member_email}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle}`}>
                        {comment.status}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-surface-700">{comment.body}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-surface-400">
                      <span>{copy.member}: #{comment.member_id}</span>
                      <span>{copy.reported}: {comment.report_count}</span>
                      <span>{copy.updated}: {new Date(comment.updated_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleStatusChange(comment.id, "visible")}
                      disabled={savingId === comment.id || comment.status === "visible"}
                      className="btn-secondary disabled:opacity-50"
                    >
                      {savingId === comment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {copy.publish}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleStatusChange(comment.id, "hidden")}
                      disabled={savingId === comment.id || comment.status === "hidden"}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      {savingId === comment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {copy.hide}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
