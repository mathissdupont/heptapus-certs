"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Award, BookOpen, CheckCircle2,
  Download, ExternalLink, FileText, Loader2, Play,
} from "lucide-react";
import { memberApiFetch, publicApiFetch, getPublicMemberToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type ModuleDetail = {
  id: number;
  title: string;
  description: string | null;
  order: number;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  duration_minutes: number | null;
  is_required: boolean;
};

type CourseData = {
  id: number;
  title: string;
  modules: ModuleDetail[];
  enrollment: {
    id: number;
    progress_pct: number;
    completed_at: string | null;
    completed_module_ids: number[];
    cert_pdf_url?: string | null;
  } | null;
};

function VideoEmbed({ url }: { url: string }) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ paddingTop: "56.25%" }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (vimeoMatch) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ paddingTop: "56.25%" }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  // Direct video file
  return (
    <div className="rounded-2xl overflow-hidden bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video src={url} controls className="w-full max-h-[480px]" />
    </div>
  );
}

export default function ModuleViewerPage() {
  const { id: courseId, mid: moduleId } = useParams<{ id: string; mid: string }>();
  const router = useRouter();
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const token = getPublicMemberToken();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  async function loadCourse() {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await publicApiFetch(`/public/courses/${courseId}`, { headers });
      const d = (await res.json()) as CourseData;
      setCourse(d);
    } catch {
      // not found
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCourse(); }, [courseId, token]);

  const module = course?.modules.find((m) => String(m.id) === moduleId);
  const modules = course?.modules ?? [];
  const currentIdx = modules.findIndex((m) => String(m.id) === moduleId);
  const prevModule = currentIdx > 0 ? modules[currentIdx - 1] : null;
  const nextModule = currentIdx < modules.length - 1 ? modules[currentIdx + 1] : null;

  const enr = course?.enrollment;
  const isCompleted = enr?.completed_module_ids.includes(Number(moduleId)) ?? false;

  async function handleComplete() {
    if (!token || !enr || isCompleted) return;
    setCompleting(true);
    try {
      const res = await memberApiFetch(
        `/public/courses/${courseId}/modules/${moduleId}/complete`,
        { method: "POST" }
      );
      const d = await res.json();
      setCourse((prev) => {
        if (!prev || !prev.enrollment) return prev;
        const completedIds = new Set(prev.enrollment.completed_module_ids);
        completedIds.add(Number(moduleId));
        return {
          ...prev,
          enrollment: {
            ...prev.enrollment,
            progress_pct: d.progress_pct,
            completed_at: d.completed ? new Date().toISOString() : prev.enrollment.completed_at,
            completed_module_ids: Array.from(completedIds),
          },
        };
      });
      setJustCompleted(true);
    } catch {
      // ignore
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!course || !module) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-gray-400">
        <p className="text-sm">{isTr ? "Modül bulunamadı." : "Module not found."}</p>
        <Link href={`/courses/${courseId}`} className="text-sm text-indigo-600 hover:underline">
          {isTr ? "Kursa geri dön" : "Back to course"}
        </Link>
      </div>
    );
  }

  const courseCompleted = enr?.completed_at != null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/courses/${courseId}`} className="inline-flex items-center gap-1 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">{module.title}</span>
      </div>

      {/* Module header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-0.5">
            {isTr ? {
              video: "Video",
              article: "Makale",
              quiz: "Sınav",
              file: "Dosya",
              assignment: "Ödev",
            }[module.content_type] ?? module.content_type
            : module.content_type.charAt(0).toUpperCase() + module.content_type.slice(1)}
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 rounded-full px-2.5 py-0.5">
              <CheckCircle2 className="h-3 w-3" />
              {isTr ? "Tamamlandı" : "Completed"}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{module.title}</h1>
        {module.description && <p className="text-sm text-gray-500">{module.description}</p>}
      </div>

      {/* Content area */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {module.content_type === "video" && module.content_url ? (
          <div className="p-4">
            <VideoEmbed url={module.content_url} />
          </div>
        ) : module.content_type === "article" ? (
          <div className="p-6">
            {module.content_text ? (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                {module.content_text}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FileText className="h-10 w-10 mb-3" />
                <p className="text-sm">{isTr ? "İçerik henüz eklenmemiş." : "No content yet."}</p>
              </div>
            )}
          </div>
        ) : module.content_type === "file" && module.content_url ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Download className="h-7 w-7 text-gray-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">{module.title}</p>
              <p className="text-xs text-gray-400 mt-1">{isTr ? "Dosyayı indirmek için tıklayın" : "Click to download the file"}</p>
            </div>
            <a
              href={module.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" />
              {isTr ? "İndir" : "Download"}
            </a>
          </div>
        ) : module.content_type === "quiz" ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
              <BookOpen className="h-7 w-7 text-amber-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {isTr ? "Bu modül bir sınav içeriyor." : "This module contains a quiz."}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isTr ? "Tamamlamak için sınavı geçmeniz gerekiyor." : "You need to pass the quiz to complete it."}
              </p>
            </div>
            {module.content_url && (
              <a
                href={module.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-600"
              >
                <ExternalLink className="h-4 w-4" />
                {isTr ? "Sınava Başla" : "Start Quiz"}
              </a>
            )}
          </div>
        ) : module.content_type === "assignment" ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{isTr ? "Ödev" : "Assignment"}</p>
                {module.content_text && (
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{module.content_text}</p>
                )}
              </div>
            </div>
            {module.content_url && (
              <a
                href={module.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {isTr ? "Ödev Linkini Aç" : "Open Assignment Link"}
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Play className="h-10 w-10 mb-3" />
            <p className="text-sm">{isTr ? "İçerik mevcut değil." : "No content available."}</p>
          </div>
        )}
      </div>

      {/* Completion banner */}
      {justCompleted && courseCompleted && enr?.cert_pdf_url && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center space-y-3">
          <Award className="h-10 w-10 text-green-500 mx-auto" />
          <p className="font-semibold text-green-800">
            {isTr ? "Tebrikler! Kursu tamamladınız 🎉" : "Congratulations! You completed the course 🎉"}
          </p>
          <a
            href={enr.cert_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            {isTr ? "Sertifikamı İndir" : "Download My Certificate"}
          </a>
        </div>
      )}

      {/* Actions */}
      {enr && (
        <div className="flex items-center justify-between gap-4">
          {prevModule ? (
            <Link
              href={`/courses/${courseId}/modules/${prevModule.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {isTr ? "Önceki" : "Previous"}
            </Link>
          ) : <div />}

          <div className="flex items-center gap-2">
            {!isCompleted && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {completing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />
                }
                {completing ? (isTr ? "Kaydediliyor..." : "Saving...") : (isTr ? "Tamamladım" : "Mark Complete")}
              </button>
            )}
            {nextModule ? (
              <Link
                href={`/courses/${courseId}/modules/${nextModule.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
              >
                {isTr ? "Sonraki" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={`/courses/${courseId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                {isTr ? "Kursa Dön" : "Back to Course"}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Module list sidebar (progress) */}
      <details className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <summary className="cursor-pointer px-5 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 list-none flex items-center justify-between">
          <span>{isTr ? "Tüm Modüller" : "All Modules"}</span>
          <span className="text-xs font-normal text-gray-400">
            {enr ? `${enr.progress_pct}%` : ""}
          </span>
        </summary>
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {modules.map((m, idx) => {
            const done = enr?.completed_module_ids.includes(m.id) ?? false;
            const active = String(m.id) === moduleId;
            return (
              <Link
                key={m.id}
                href={enr ? `/courses/${courseId}/modules/${m.id}` : `#`}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  active ? "bg-indigo-50" : "hover:bg-gray-50"
                } ${!enr ? "pointer-events-none opacity-50" : ""}`}
              >
                <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                  done ? "bg-green-100 text-green-700" : active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {done ? "✓" : idx + 1}
                </span>
                <span className={`truncate ${done ? "text-gray-400 line-through" : active ? "text-indigo-700 font-medium" : "text-gray-700"}`}>
                  {m.title}
                </span>
              </Link>
            );
          })}
        </div>
      </details>
    </div>
  );
}
