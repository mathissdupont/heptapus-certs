"use client";

import { motion } from "framer-motion";
import { Send, AlertCircle, CheckCircle2, Eye, Lightbulb, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { createPublicFeedPost } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const CHARACTER_LIMIT = 4000;
const WARNING_THRESHOLD = 0.9;

export default function CreatePostPage() {
  const { lang } = useI18n();
  const router = useRouter();

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const copy = useMemo(() => ({
    heading: lang === "tr" ? "Topluluk Gönderisi Oluştur" : "Create Community Post",
    subtitle: lang === "tr" ? "Toplulukla ilginç içerikler, deneyimler ve fikirlerinizi paylaşın." : "Share interesting content, experiences, and ideas with the community.",
    placeholder: lang === "tr" ? "Toplulukla neler paylaşmak istersin?" : "What would you like to share with the community?",
    charCount: lang === "tr" ? "Karakter Sayısı" : "Character Count",
    publish: lang === "tr" ? "Gönder" : "Publish",
    publishing: lang === "tr" ? "Gönderiliyor..." : "Publishing...",
    preview: lang === "tr" ? "Ön İzleme" : "Preview",
    tips: lang === "tr" ? "İpuçları" : "Tips",
    tip1: lang === "tr" ? "Açık ve samimi olun." : "Be clear and genuine.",
    tip2: lang === "tr" ? "Topluluğa değer katın." : "Add value to the community.",
    tip3: lang === "tr" ? "Profesyonel bir dil kullanın." : "Keep it professional.",
    tip4: lang === "tr" ? "Faydalı bağlantılar paylaşın." : "Share useful links.",
    postRequired: lang === "tr" ? "Lütfen bir gönderi yazın." : "Please write a post.",
    postTooLong: lang === "tr" ? `Gönderi ${CHARACTER_LIMIT} karakteri geçemez.` : `Post must be under ${CHARACTER_LIMIT} characters.`,
    successMessage: lang === "tr" ? "Gönderi başarıyla yayınlandı!" : "Post published successfully!",
    errorMessage: lang === "tr" ? "Gönderi yayınlanırken hata oluştu." : "Failed to publish post.",
    redirecting: lang === "tr" ? "Keşfet sayfasına yönlendiriliyorsunuz..." : "Redirecting to discover page...",
    emptyMessage: lang === "tr" ? "İçeriğinizin ön izlemesi burada görünecek..." : "Your post preview will appear here...",
    cancel: lang === "tr" ? "İptal" : "Cancel",
  }), [lang]);

  const charCount = body.length;
  const charPercentage = charCount / CHARACTER_LIMIT;
  const isNearLimit = charPercentage >= WARNING_THRESHOLD;
  const isOverLimit = charCount > CHARACTER_LIMIT;
  
  const isPostValid = useMemo(() => {
    return body.trim().length > 0 && !isOverLimit;
  }, [body, isOverLimit]);

  const handlePublish = async () => {
    if (!isPostValid) {
      if (!body.trim()) {
        setError(copy.postRequired);
      } else if (isOverLimit) {
        setError(copy.postTooLong);
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createPublicFeedPost(body.trim());
      setSuccess(true);
      
      // Yönlendirme
      setTimeout(() => {
        router.push("/discover");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || copy.errorMessage);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 pb-12">
      {/* Sticky Header */}
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
                {copy.heading}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {copy.subtitle}
              </p>
            </div>
          </div>

          {/* Desktop Publish Button */}
          <div className="hidden sm:block">
            <button
              onClick={handlePublish}
              disabled={!isPostValid || submitting || success}
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Messages */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}
            
            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">{copy.successMessage}</p>
                  <p className="text-xs opacity-80 mt-0.5">{copy.redirecting}</p>
                </div>
              </div>
            )}

            {/* Editor Box */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all overflow-hidden flex flex-col">
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={copy.placeholder}
                disabled={submitting || success}
                rows={12}
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
                      style={{ width: `${Math.min(charPercentage * 100, 100)}%` }}
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
                  {charCount} / {CHARACTER_LIMIT}
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
                disabled={!isPostValid || submitting || success}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? copy.publishing : copy.publish}
              </button>
            </div>
          </motion.div>

          {/* Sidebar Area (Right 1 Column) */}
          <div className="space-y-6">
            
            {/* Guidelines Card */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 p-5"
            >
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
            </motion.div>

            {/* Live Preview Card */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm mb-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <Eye className="h-4 w-4 text-gray-400" />
                {copy.preview}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed min-h-[100px]">
                {body.trim() ? (
                  body
                ) : (
                  <span className="text-gray-400 dark:text-gray-600 italic">
                    {copy.emptyMessage}
                  </span>
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
