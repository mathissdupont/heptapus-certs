"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Lightbulb, CheckCircle2, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createPublicFeedPost } from "@/lib/api";

const MAX_LENGTH = 2000;

export default function CreatePostPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            title: "Yeni Gönderi Oluştur",
            subtitle: "Topluluğunuzla fikirlerinizi, güncellemeleri ve sorularınızı paylaşın.",
            placeholder: "Bugün ne paylaşmak istiyorsunuz? (Linkler otomatik olarak algılanır)",
            preview: "Ön İzleme",
            noPreview: "Yazınız burada ön izlenecek...",
            publish: "Yayınla",
            publishing: "Yayınlanıyor...",
            cancel: "İptal",
            success: "Gönderi başarıyla yayınlandı! Yönlendiriliyorsunuz...",
            error: "Gönderi yayınlamada hata oluştu.",
            validationEmpty: "Lütfen boş bir gönderi yayınlamayın.",
            validationTooLong: (max: number) => `Gönderi en fazla ${max} karakter olabilir.`,
            tips: "Yayınlama İpuçları",
            tip1: "Açık ve net olun; bilgi odaklı gönderiler daha çok etkileşim alır.",
            tip2: "Soru sormaktan çekinmeyin, topluluk tartışmayı sever.",
            tip3: "Faydalı bulduğunuz kaynakları ve bağlantıları ekleyin.",
            tip4: "Paragraflar arasında boşluk bırakarak okunabilirliği artırın.",
          }
        : {
            title: "Create New Post",
            subtitle: "Share your ideas, updates, and questions with the community.",
            placeholder: "What do you want to share today? (Links are automatically parsed)",
            preview: "Preview",
            noPreview: "Your post preview will appear here...",
            publish: "Publish",
            publishing: "Publishing...",
            cancel: "Cancel",
            success: "Post published successfully! Redirecting...",
            error: "Failed to publish post.",
            validationEmpty: "Please write a post before publishing.",
            validationTooLong: (max: number) => `Post cannot exceed ${max} characters.`,
            tips: "Posting Guidelines",
            tip1: "Be concise and clear; informative posts get more engagement.",
            tip2: "Don't hesitate to ask questions; communities love discussions.",
            tip3: "Include resources and links that you find helpful.",
            tip4: "Use line breaks to make your post easier to read.",
          },
    [lang]
  );

  const charCount = body.length;
  const isNearLimit = charCount > MAX_LENGTH * 0.9;
  const isOverLimit = charCount > MAX_LENGTH;
  const isValid = body.trim().length > 0 && !isOverLimit;
  const progressPercent = Math.min((charCount / MAX_LENGTH) * 100, 100);

  async function handlePublish() {
    if (!body.trim()) {
      setError(copy.validationEmpty);
      return;
    }
    if (charCount > MAX_LENGTH) {
      setError(copy.validationTooLong(MAX_LENGTH));
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await createPublicFeedPost(body.trim());
      setSuccess(true);
      setTimeout(() => {
        router.push("/discover");
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || copy.error;
      setError(msg);
      setSubmitting(false); // Sadece hata olursa butonu tekrar aktifleştir
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 pb-12">
      {/* Sticky Clean Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/discover"
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {copy.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {copy.subtitle}
              </p>
            </div>
          </div>
          
          {/* Header Action (Optional Desktop Button) */}
          <div className="hidden sm:block">
            <button
              type="button"
              onClick={handlePublish}
              disabled={!isValid || submitting || success}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium shadow-sm hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? copy.publishing : copy.publish}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Editor Area (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Messages */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-start gap-3">
                <div className="mt-0.5 font-semibold">Uyarı:</div>
                <div>{error}</div>
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                {copy.success}
              </div>
            )}

            {/* Editor Box */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all overflow-hidden flex flex-col">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={copy.placeholder}
                disabled={submitting || success}
                rows={10}
                className="w-full flex-1 px-5 py-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none border-none bg-transparent focus:outline-none disabled:opacity-50"
              />

              {/* Toolbar & Character Count */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center justify-between">
                <div className="flex-1 max-w-xs">
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOverLimit
                          ? "bg-red-500"
                          : isNearLimit
                          ? "bg-amber-500"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div
                  className={`text-xs font-medium ml-4 ${
                    isOverLimit
                      ? "text-red-600 dark:text-red-400"
                      : isNearLimit
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {charCount} / {MAX_LENGTH}
                </div>
              </div>
            </div>

            {/* Mobile Actions (Hidden on Desktop) */}
            <div className="flex sm:hidden gap-3">
              <button
                type="button"
                onClick={() => router.push("/discover")}
                disabled={submitting || success}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={!isValid || submitting || success}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? copy.publishing : copy.publish}
              </button>
            </div>
          </div>

          {/* Sidebar Area (Right 1 Column) */}
          <div className="space-y-6">
            
            {/* Guidelines Card */}
            <div className="rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 p-5">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400 font-semibold text-sm mb-4">
                <Lightbulb className="h-4 w-4" />
                {copy.tips}
              </div>
              <ul className="space-y-3 text-sm text-blue-900/80 dark:text-blue-300/80">
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span>{copy.tip1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span>{copy.tip2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span>{copy.tip3}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span>{copy.tip4}</span>
                </li>
              </ul>
            </div>

            {/* Live Preview Card */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm mb-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <Eye className="h-4 w-4 text-gray-400" />
                {copy.preview}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed min-h-[100px]">
                {body.trim() ? (
                  body
                ) : (
                  <span className="text-gray-400 dark:text-gray-600 italic">
                    {copy.noPreview}
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}