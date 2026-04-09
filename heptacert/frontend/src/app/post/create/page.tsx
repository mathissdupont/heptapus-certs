"use client";

import { motion } from "framer-motion";
import { Send, AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { createPublicFeedPost } from "@/lib/api";

const CHARACTER_LIMIT = 2000;
const WARNING_THRESHOLD = 0.9;

export default function CreatePostPage() {
  const { lang } = useI18n();
  const router = useRouter();

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const copy = {
    heading: lang === "tr" ? "Topluluk Gönderisi Oluştur" : "Create Community Post",
    placeholder: lang === "tr" ? "Toplulukla neler paylaşmak istersin?" : "What would you like to share with the community?",
    charCount: lang === "tr" ? "Karakter Sayısı" : "Character Count",
    publish: lang === "tr" ? "Gönder" : "Publish",
    publishing: lang === "tr" ? "Gönderiliyor..." : "Publishing...",
    preview: lang === "tr" ? "Ön İzleme" : "Preview",
    tips: lang === "tr" ? "İpuçları" : "Tips",
    tip1: lang === "tr" ? "Açık ve samimi ol" : "Be clear and genuine",
    tip2: lang === "tr" ? "Topluluka değer kat" : "Add value to the community",
    tip3: lang === "tr" ? "Profesyonel haber tut" : "Keep it professional",
    tip4: lang === "tr" ? "Bağlantılarınızla etkileş" : "Engage with connections",
    postRequired: lang === "tr" ? "Lütfen bir gönderi yazın" : "Please write a post",
    postTooLong: lang === "tr" ? "Gönderi 2000 karakteri geçemez" : "Post must be under 2000 characters",
    successMessage: lang === "tr" ? "Gönderi başarıyla yayınlandı!" : "Post published successfully!",
    errorMessage: lang === "tr" ? "Gönderi yayınlanırken hata oluştu" : "Failed to publish post",
    redirecting: lang === "tr" ? "Keşfet sayfasına yönlendiriliyorsun..." : "Redirecting to discover page...",
    emptyMessage: lang === "tr" ? "İçeriğinizi yazınız" : "Type your content here",
  };

  const charCount = body.length;
  const charPercentage = charCount / CHARACTER_LIMIT;
  const isNearLimit = charPercentage >= WARNING_THRESHOLD;
  const charColor = charPercentage >= 1 ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-slate-500";

  const isPostValid = useMemo(() => {
    return body.trim().length > 0 && body.length <= CHARACTER_LIMIT;
  }, [body]);

  const handlePublish = async () => {
    if (!isPostValid) {
      if (!body.trim()) {
        setError(copy.postRequired);
      } else if (body.length > CHARACTER_LIMIT) {
        setError(copy.postTooLong);
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createPublicFeedPost({ body: body.trim() });
      setSuccess(true);
      setBody("");

      // Redirect after 1.5 seconds
      setTimeout(() => {
        router.push("/discover");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || copy.errorMessage);
      console.error("Post creation error:", err);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{copy.heading}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {lang === "tr" ? "Toplulukla ilginç içerikler, deneyimler ve fikirlerinizi paylaşın" : "Share interesting content, experiences, and ideas with the community"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor - 2 columns on desktop */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
              {/* Textarea */}
              <div className="mb-6">
                <textarea
                  value={body}
                  onChange={(e) => {
                    if (e.target.value.length <= CHARACTER_LIMIT) {
                      setBody(e.target.value);
                    }
                  }}
                  placeholder={copy.placeholder}
                  className="w-full h-64 p-4 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Character Counter */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{copy.charCount}</span>
                  <span className={`text-sm font-bold ${charColor}`}>
                    {charCount} / {CHARACTER_LIMIT}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full transition-colors ${
                      charPercentage >= 1
                        ? "bg-red-500"
                        : isNearLimit
                          ? "bg-amber-500"
                          : "bg-gradient-to-r from-blue-500 to-purple-500"
                    }`}
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.min(charPercentage * 100, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>

              {/* Error / Success Message */}
              {error && (
                <motion.div
                  className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-800 dark:text-green-200 text-sm font-medium">{copy.successMessage}</p>
                    <p className="text-green-700 dark:text-green-300 text-xs mt-1">{copy.redirecting}</p>
                  </div>
                </motion.div>
              )}

              {/* Publish Button */}
              <button
                onClick={handlePublish}
                disabled={!isPostValid || submitting || success}
                className={`w-full py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  isPostValid && !submitting && !success
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/50 text-white cursor-pointer"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                {submitting && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {!submitting && <Send className="h-4 w-4" />}
                {submitting ? copy.publishing : copy.publish}
              </button>
            </div>
          </motion.div>

          {/* Sidebar - Tips and Preview */}
          <div className="space-y-6">
            {/* Tips Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl border border-blue-200 dark:border-blue-800 p-6"
            >
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400">💡</span>
                {copy.tips}
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{copy.tip1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{copy.tip2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{copy.tip3}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{copy.tip4}</span>
                </li>
              </ul>
            </motion.div>

            {/* Live Preview Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-lg"
            >
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-gray-400" />
                {copy.preview}
              </h3>
              {body.length > 0 ? (
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed min-h-[100px] bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  {body}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic min-h-[100px] bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center justify-center">
                  {copy.emptyMessage}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
      </div>
    </div>
  );
}
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