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
  const { t } = useI18n();
  const router = useRouter();

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const copy = useMemo(() => ({
    heading: t("post_create_heading"),
    subtitle: t("post_create_subtitle"),
    placeholder: t("post_create_placeholder"),
    charCount: t("post_create_character_count"),
    publish: t("post_create_publish"),
    publishing: t("post_create_publishing"),
    preview: t("post_create_preview"),
    tips: t("post_create_tips"),
    tip1: t("post_create_tip_clear"),
    tip2: t("post_create_tip_value"),
    tip3: t("post_create_tip_professional"),
    tip4: t("post_create_tip_links"),
    postRequired: t("post_create_required"),
    postTooLong: t("post_create_too_long", { limit: CHARACTER_LIMIT }),
    successMessage: t("post_create_success"),
    errorMessage: t("post_create_error"),
    redirecting: t("post_create_redirecting"),
    emptyMessage: t("post_create_empty_preview"),
    cancel: t("post_create_cancel"),
  }), [t]);

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
    <div className="min-h-screen bg-canvas  pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b border-outline-subtle  bg-raised/80  backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/discover"
              className="inline-flex items-center justify-center rounded-lg p-2 text-content-muted hover:text-content-primary hover:bg-sunken  transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-content-primary  leading-tight">
                {copy.heading}
              </h1>
              <p className="text-xs text-content-muted ">
                {copy.subtitle}
              </p>
            </div>
          </div>

          {/* Desktop Publish Button */}
          <div className="hidden sm:block">
            <button
              onClick={handlePublish}
              disabled={!isPostValid || submitting || success}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-inverse-surface  text-white  text-sm font-medium shadow-sm hover:bg-inverse-surface  transition-colors disabled:opacity-50"
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
              <div className="rounded-lg border border-status-danger-border bg-status-danger-bg   px-4 py-3 text-sm text-status-danger-content  flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-status-success-border bg-status-success-bg   px-4 py-3 text-sm text-status-success-content  flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">{copy.successMessage}</p>
                  <p className="text-xs opacity-80 mt-0.5">{copy.redirecting}</p>
                </div>
              </div>
            )}

            {/* Editor Box */}
            <div className="rounded-xl border border-outline-subtle  bg-raised  shadow-sm focus-within:border-outline-strong focus-within:ring-1 focus-within:ring-outline-strong transition-all overflow-hidden flex flex-col">
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={copy.placeholder}
                disabled={submitting || success}
                rows={12}
                className="w-full flex-1 px-5 py-4 text-sm text-content-primary  placeholder:text-content-muted resize-none border-none bg-transparent focus:outline-none disabled:opacity-50"
              />

              {/* Toolbar & Character Count */}
              <div className="bg-canvas  border-t border-outline-subtle  px-5 py-3 flex items-center justify-between">
                <div className="flex-1 max-w-xs">
                  <div className="h-1.5 bg-sunken  rounded-full overflow-hidden flex">
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
                      ? "text-status-danger-content "
                      : isNearLimit
                      ? "text-status-warning-content "
                      : "text-content-muted "
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
                className="flex-1 px-4 py-2.5 rounded-lg border border-outline-subtle  bg-raised  text-content-secondary  text-sm font-medium transition-colors hover:bg-canvas disabled:opacity-50"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={!isPostValid || submitting || success}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-inverse-surface  text-white  text-sm font-medium shadow-sm hover:bg-inverse-surface disabled:opacity-50"
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
              className="rounded-xl border border-status-info-border  bg-status-info-bg/50  p-5"
            >
              <div className="flex items-center gap-2 text-status-info-content  font-semibold text-sm mb-4">
                <Lightbulb className="h-4 w-4" />
                {copy.tips}
              </div>
              <ul className="space-y-3 text-sm text-status-info-content/80 ">
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
              className="rounded-xl border border-outline-subtle  bg-raised  p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 text-content-primary  font-semibold text-sm mb-3 border-b border-outline-subtle  pb-3">
                <Eye className="h-4 w-4 text-content-muted" />
                {copy.preview}
              </div>
              <div className="text-sm text-content-secondary  whitespace-pre-wrap break-words leading-relaxed min-h-[100px]">
                {body.trim() ? (
                  body
                ) : (
                  <span className="text-content-muted  italic">
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
