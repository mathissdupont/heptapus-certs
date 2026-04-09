"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
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
            subtitle: "Topluluğunuzla fikirlerinizi, güncellemeleri ve sorularınızı paylaşın",
            placeholder: "Başlamak için yazın... Resimler, linkler ve emojiler desteklendi! 📸✨",
            preview: "Ön İzleme",
            noPreview: "Yazınız burada gösterilecek",
            characterCount: "Karakter",
            publish: "Yayınla",
            publishing: "Yayınlanıyor...",
            cancel: "İptal",
            success: "Gönderi başarıyla yayınlandı! 🎉",
            error: "Gönderi yayınlamada hata oluştu",
            validationEmpty: "Lütfen bir gönderi yazın",
            validationTooLong: (max: number) => `Gönderi ${max} karakteri aşamaz`,
            tips: "💡 İpuçları",
            tip1: "Kısa ve öz yazın - en iyi gönderiler bilgiye değerdir",
            tip2: "Sorular sorun - topluluk katılımı artırır",
            tip3: "Linkler ve kaynaklar paylaşın",
            tip4: "Emojiler kullanın - renk ve eğlence katın! 🚀",
          }
        : {
            title: "Create New Post",
            subtitle: "Share your ideas, updates, and questions with the community",
            placeholder: "Start typing... Images, links, and emojis supported! 📸✨",
            preview: "Preview",
            noPreview: "Your post will appear here",
            characterCount: "Characters",
            publish: "Publish",
            publishing: "Publishing...",
            cancel: "Cancel",
            success: "Post published successfully! 🎉",
            error: "Failed to publish post",
            validationEmpty: "Please write a post",
            validationTooLong: (max: number) => `Post cannot exceed ${max} characters`,
            tips: "💡 Tips",
            tip1: "Write concisely - the best posts are informative",
            tip2: "Ask questions - community engagement thrives on Q&A",
            tip3: "Share links and resources",
            tip4: "Use emojis - add color and fun! 🚀",
          },
    [lang]
  );

  const charCount = body.length;
  const isValid = body.trim().length > 0 && charCount <= MAX_LENGTH;
  const progressPercent = (charCount / MAX_LENGTH) * 100;

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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 border-b border-slate-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <Link
            href="/discover"
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{copy.title}</h1>
            <p className="text-sm text-slate-500 dark:text-gray-400">{copy.subtitle}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border-2 border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX_LENGTH))}
                placeholder={copy.placeholder}
                disabled={submitting}
                rows={12}
                className="w-full px-6 py-5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 resize-none border-none bg-transparent focus:outline-none disabled:opacity-50"
              />

              <div className="border-t border-slate-100 dark:border-gray-800 bg-gradient-to-r from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 px-6 py-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full transition-all ${
                        charCount > MAX_LENGTH * 0.9
                          ? "bg-gradient-to-r from-amber-500 to-orange-500"
                          : "bg-gradient-to-r from-blue-500 to-purple-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>
                <span
                  className={`ml-4 text-sm font-semibold whitespace-nowrap ${
                    charCount > MAX_LENGTH * 0.9
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-slate-600 dark:text-gray-400"
                  }`}
                >
                  {charCount} / {MAX_LENGTH}
                </span>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-4 py-3"
              >
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/20 px-4 py-3"
              >
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">{copy.success}</p>
              </motion.div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/discover")}
                disabled={submitting}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-semibold transition-all hover:bg-slate-50 dark:hover:bg-gray-800/50 disabled:opacity-50"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={!isValid || submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {copy.publishing}
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    {copy.publish}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl border-2 border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{copy.preview}</h3>
              {body.trim() ? (
                <p className="text-slate-700 dark:text-gray-300 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {body}
                </p>
              ) : (
                <p className="text-slate-400 dark:text-gray-600 italic">{copy.noPreview}</p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-3xl border-2 border-blue-200/50 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-950/20 p-6"
            >
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">{copy.tips}</h4>
              <ul className="space-y-2 text-xs text-blue-800 dark:text-blue-300">
                <li>• {copy.tip1}</li>
                <li>• {copy.tip2}</li>
                <li>• {copy.tip3}</li>
                <li>• {copy.tip4}</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-gray-800 dark:to-gray-900 p-6"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600 dark:text-gray-400">
                    {copy.characterCount}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{charCount}</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
