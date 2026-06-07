"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, MessageSquare, Pin, Lock as LockIcon, Plus, Send,
} from "lucide-react";
import { memberApiFetch, publicApiFetch, getPublicMemberToken } from "@/lib/api";

type Discussion = {
  id: number;
  course_id: number;
  title: string;
  body: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  created_at: string;
};

type Reply = {
  id: number;
  author_member_id: number | null;
  body: string;
  is_instructor_reply: boolean;
  created_at: string;
  parent_reply_id: number | null;
};

type DiscussionDetail = Discussion & { replies: Reply[] };

export default function CourseDiscussionsPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selected, setSelected] = useState<DiscussionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [posting, setPosting] = useState(false);

  const isLoggedIn = !!getPublicMemberToken();

  async function loadDiscussions() {
    setLoading(true);
    const res = await publicApiFetch(`/api/public/courses/${courseId}/discussions`).then((r) => r.json());
    setDiscussions(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  async function openDiscussion(discussionId: number) {
    const res = await publicApiFetch(`/api/public/courses/${courseId}/discussions/${discussionId}`).then((r) => r.json());
    setSelected(res);
  }

  async function sendReply() {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    await memberApiFetch(`/api/public/courses/${courseId}/discussions/${selected.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyText }),
    });
    setReplyText("");
    setSending(false);
    openDiscussion(selected.id);
  }

  async function postDiscussion() {
    if (!newTitle.trim() || !newBody.trim()) return;
    setPosting(true);
    await memberApiFetch(`/api/public/courses/${courseId}/discussions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, body: newBody }),
    });
    setNewTitle("");
    setNewBody("");
    setShowNew(false);
    setPosting(false);
    loadDiscussions();
  }

  useEffect(() => { loadDiscussions(); }, [courseId]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/courses/${courseId}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Tartışmalar
        </h1>
        {isLoggedIn && (
          <button
            onClick={() => { setShowNew(true); setSelected(null); }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Yeni
          </button>
        )}
      </div>

      {/* New discussion form */}
      {showNew && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-3">
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Başlık..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            placeholder="Sorunuzu veya düşüncenizi paylaşın..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="text-sm text-gray-500 px-3 py-1.5">İptal</button>
            <button
              onClick={postDiscussion}
              disabled={posting}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {posting ? "Gönderiliyor..." : "Paylaş"}
            </button>
          </div>
        </div>
      )}

      {/* Discussion detail */}
      {selected ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          <div className="flex items-start gap-2">
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 mt-1">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">{selected.title}</h2>
              <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{selected.body}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              {selected.replies.length} yanıt
            </h3>
            {selected.replies.map((r) => (
              <div
                key={r.id}
                className={`flex gap-3 ${r.is_instructor_reply ? "bg-blue-50 rounded-xl p-3" : ""}`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-medium text-gray-600">
                  {r.is_instructor_reply ? "👨‍🏫" : "👤"}
                </div>
                <div>
                  {r.is_instructor_reply && (
                    <span className="text-xs font-medium text-blue-700">Eğitmen</span>
                  )}
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{r.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.created_at).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              </div>
            ))}

            {!selected.is_locked && isLoggedIn && (
              <div className="flex gap-2 pt-2">
                <textarea
                  rows={2}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="Yanıtınızı yazın..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
            {selected.is_locked && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <LockIcon className="w-3 h-3" /> Bu tartışma kilitli.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : discussions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Henüz tartışma yok.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {discussions.map((d) => (
                <button
                  key={d.id}
                  onClick={() => openDiscussion(d.id)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {d.is_pinned && <Pin className="w-3.5 h-3.5 text-blue-500 mt-1 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-gray-900">{d.title}</p>
                        <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{d.body}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                      {d.is_locked && <LockIcon className="w-3.5 h-3.5" />}
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{d.reply_count}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
