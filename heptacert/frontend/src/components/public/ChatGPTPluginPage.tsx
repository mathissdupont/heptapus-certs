"use client";

import { Award, CalendarDays, CheckCircle2, Mail, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const CAPABILITIES = [
  { title: "chatgpt_plugin_events_title", description: "chatgpt_plugin_events_desc", icon: CalendarDays },
  { title: "chatgpt_plugin_attendees_title", description: "chatgpt_plugin_attendees_desc", icon: Users },
  { title: "chatgpt_plugin_certificates_title", description: "chatgpt_plugin_certificates_desc", icon: Award },
  { title: "chatgpt_plugin_communications_title", description: "chatgpt_plugin_communications_desc", icon: Mail },
] as const;

export default function ChatGPTPluginPage() {
  const t = useTranslations();

  return (
    <div className="bg-canvas">
      <section className="border-b border-outline-subtle bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200">
              {t("chatgpt_plugin_badge")}
            </p>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-content-primary sm:text-5xl">
              {t("chatgpt_plugin_title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-content-secondary sm:text-lg">
              {t("chatgpt_plugin_intro")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="btn-primary min-h-11 justify-center">
                {t("chatgpt_plugin_sign_in")}
              </Link>
              <Link href="/iletisim" className="btn-secondary min-h-11 justify-center">
                {t("chatgpt_plugin_support")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-extrabold text-content-primary">{t("chatgpt_plugin_capabilities_title")}</h2>
          <p className="mt-3 text-sm leading-6 text-content-muted">{t("chatgpt_plugin_capabilities_desc")}</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {CAPABILITIES.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-outline-subtle bg-raised p-6 shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-content-primary">{t(title)}</h3>
              <p className="mt-2 text-sm leading-6 text-content-muted">{t(description)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-outline-subtle bg-sunken">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-status-success-surface text-status-success-content">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-content-primary">{t("chatgpt_plugin_safety_title")}</h2>
          </div>
          <ul className="space-y-4">
            {["chatgpt_plugin_safety_permissions", "chatgpt_plugin_safety_confirmation", "chatgpt_plugin_safety_limits"].map((key) => (
              <li key={key} className="flex gap-3 text-sm leading-6 text-content-secondary">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-success-content" aria-hidden="true" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10">
        <div className="rounded-2xl border border-outline-subtle bg-raised p-6 text-sm leading-6 text-content-secondary">
          <p>{t("chatgpt_plugin_availability")}</p>
          <p className="mt-3 font-semibold text-content-primary">{t("chatgpt_plugin_publisher")}</p>
        </div>
      </section>
    </div>
  );
}
