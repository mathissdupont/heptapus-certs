"use client";

import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Mail,
  QrCode,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { getApiBase } from "@/lib/api";

type StatsData = {
  active_members?: string | number;
  hosted_events?: string | number;
  issued_certificates?: string | number;
  certs_issued?: string | number;
};

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={visible ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ProductPreview() {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const activities = [
    ["home_activity_1", "home_activity_time_1"],
    ["home_activity_2", "home_activity_time_2"],
    ["home_activity_3", "home_activity_time_3"],
  ] as const;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto min-w-0 w-full max-w-[500px]"
      aria-label={t("home_dashboard_title")}
    >
      <div className="absolute -inset-5 -z-10 rounded-full bg-accent-soft/70 blur-3xl sm:-inset-8" />
      <div className="rounded-[1.6rem] border border-outline-subtle bg-raised/90 p-2.5 shadow-modal backdrop-blur-xl sm:rounded-[2rem] sm:p-5">
        <div className="rounded-[1.15rem] border border-outline-subtle bg-canvas p-3.5 sm:rounded-[1.4rem] sm:p-6">
          <div className="mb-4 flex items-center justify-between sm:mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-content-faint">HeptaCert</p>
              <p className="mt-1 text-sm font-semibold text-content-primary">{t("home_dashboard_title")}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success-bg px-2.5 py-1 text-11 font-bold text-status-success-content sm:gap-2 sm:px-3">
              <span className="h-1.5 w-1.5 rounded-full bg-status-success-content" />
              {t("home_dashboard_live")}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {([
              ["468", "home_dashboard_registrations"],
              ["436", "home_dashboard_verified"],
              ["403", "home_dashboard_checkins"],
            ] as const).map(([value, label]) => (
              <div key={label} className="min-w-0 rounded-xl border border-outline-subtle bg-sunken px-2 py-3 sm:rounded-2xl sm:p-4">
                <p className="text-xl font-black tracking-tight text-content-primary sm:text-2xl">{value}</p>
                <p className="mt-1 truncate text-[10px] font-semibold text-content-muted sm:text-11">{t(label)}</p>
              </div>
            ))}
          </div>
          <p className="mb-2.5 mt-4 text-11 font-bold uppercase tracking-[0.18em] text-content-faint sm:mb-3 sm:mt-6">{t("home_activity_label")}</p>
          <div className="space-y-2">
            {activities.map(([activityKey, timeKey], index) => (
              <div key={activityKey} className={`items-center gap-2.5 rounded-xl border border-outline-subtle bg-raised px-3 py-2.5 sm:gap-3 sm:py-3 ${index === 2 ? "hidden sm:flex" : "flex"}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-content-secondary">{t(activityKey)}</span>
                <span className="shrink-0 text-[10px] text-content-faint sm:text-11">{t(timeKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPageClient() {
  const t = useTranslations();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${getApiBase()}/stats`, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const features = [
    [QrCode, "home_feature_qr_title", "home_feature_qr_desc"],
    [Users, "home_feature_attendee_title", "home_feature_attendee_desc"],
    [Mail, "home_feature_email_title", "home_feature_email_desc"],
    [Workflow, "home_feature_automation_title", "home_feature_automation_desc"],
    [Sparkles, "home_feature_crm_title", "home_feature_crm_desc"],
    [BarChart3, "home_feature_analytics_title", "home_feature_analytics_desc"],
  ] as const;
  const steps = [1, 2, 3] as const;
  const statItems = [
    [stats?.active_members, "landing_stat_members"],
    [stats?.hosted_events, "landing_stat_events"],
    [stats?.issued_certificates ?? stats?.certs_issued, "landing_stat_certificates"],
  ] as const;

  return (
    <div className="overflow-hidden bg-canvas text-content-primary">
      <section className="relative isolate overflow-hidden border-b border-outline-subtle lg:min-h-[calc(100svh-4rem)]">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_12%,rgb(var(--accent-soft)/0.9),transparent_35%),radial-gradient(circle_at_82%_35%,rgb(var(--bg-sunken)),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:linear-gradient(to_right,rgb(var(--border-subtle)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--border-subtle)/0.5)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
        <motion.div
          aria-hidden="true"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute -right-32 top-20 -z-10 h-96 w-96 rounded-[30%] border border-accent-border/50"
        />
        <div className="mx-auto grid min-w-0 w-full max-w-7xl items-center gap-10 px-4 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-10 lg:py-20">
          <div className="min-w-0 max-w-3xl text-center lg:text-left">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-soft px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent-strong sm:mb-7 sm:px-3.5 sm:text-11 sm:tracking-[0.16em]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("home_badge_default")}
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="text-balance text-[2rem] font-black leading-[1.04] tracking-[-0.04em] text-content-primary min-[370px]:text-[2.2rem] sm:text-6xl sm:leading-[1.02] sm:tracking-[-0.045em] lg:text-7xl"
            >
              {t("home_title_default")}
            </motion.h1>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.25 }}
              className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-6 text-content-muted sm:mt-7 sm:text-lg sm:leading-8 lg:mx-0"
            >
              {t("home_body_default")}
            </motion.p>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.35 }}
              className="mt-6 grid grid-cols-1 gap-2.5 sm:mt-9 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 lg:justify-start"
            >
              <NextLink href="/register?mode=organizer" className="btn-primary min-h-12 w-full px-6 text-sm sm:w-auto">
                {t("home_primary_cta")} <ArrowRight className="h-4 w-4" />
              </NextLink>
              <NextLink href="/pricing" className="btn-secondary min-h-12 w-full px-6 text-sm sm:w-auto">{t("home_secondary_cta")}</NextLink>
            </motion.div>
            <div className="mx-auto mt-5 grid max-w-sm gap-2 text-left text-xs font-semibold text-content-muted sm:mt-9 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-3 lg:mx-0 lg:justify-start">
              {["home_trust_email", "home_trust_qr", "home_trust_mobile"].map((key) => (
                <span key={key} className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-status-success-content" />{t(key)}</span>
              ))}
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section aria-labelledby="stats-title" className="border-b border-outline-subtle bg-raised">
        <h2 id="stats-title" className="sr-only">{t("home_stats_title")}</h2>
        <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-outline-subtle px-2 sm:px-8">
          {statItems.map(([value, key], index) => (
            <Reveal key={key} delay={index * 0.06}>
              <div className="px-1 py-6 text-center sm:py-12">
                <p className="text-xl font-black tracking-tight text-content-primary sm:text-4xl">{value ?? "—"}</p>
                <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-content-faint sm:mt-2 sm:text-11 sm:tracking-[0.16em]">{t(key)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="features" className="bg-canvas py-16 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal className="mx-auto mb-9 max-w-2xl text-center sm:mb-14">
            <p className="text-11 font-extrabold uppercase tracking-[0.18em] text-accent-strong">{t("nav_features")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-content-primary sm:mt-4 sm:text-5xl">{t("home_features_title_default")}</h2>
            <p className="mt-4 text-sm leading-6 text-content-muted sm:mt-5 sm:text-base sm:leading-7">{t("home_features_body")}</p>
          </Reveal>
          <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
            {features.map(([Icon, title, description], index) => (
              <Reveal key={title} delay={index * 0.05} className="w-[82vw] shrink-0 snap-center sm:w-auto">
                <article className="group h-full min-h-56 rounded-2xl border border-outline-subtle bg-raised p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-accent-border hover:shadow-float sm:min-h-0">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-strong"><Icon className="h-5 w-5" /></div>
                  <h3 className="text-base font-bold text-content-primary">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-content-muted">{t(description)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-outline-subtle bg-raised py-16 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal><h2 className="max-w-3xl text-3xl font-black tracking-tight text-content-primary sm:text-5xl">{t("home_steps_title")}</h2></Reveal>
          <div className="mt-9 grid gap-4 sm:mt-14 sm:gap-8 lg:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step} delay={index * 0.08}>
                <div className="rounded-2xl border border-outline-subtle bg-canvas p-5 shadow-soft sm:rounded-none sm:border-x-0 sm:border-b-0 sm:border-t sm:border-outline-strong sm:bg-transparent sm:p-0 sm:pt-6 sm:shadow-none">
                  <span className="text-xs font-black tracking-[0.2em] text-accent-strong">{t(`home_step_${step}_id`)}</span>
                  <h3 className="mt-5 text-xl font-bold text-content-primary">{t(`home_step_${step}_title`)}</h3>
                  <p className="mt-3 text-sm leading-7 text-content-muted">{t(`home_step_${step}_desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-canvas px-4 py-16 sm:px-8 sm:py-32">
        <Reveal className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-accent-border bg-accent-soft p-6 text-center shadow-float sm:rounded-[2rem] sm:p-14">
            <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_top,rgb(var(--bg-raised)),transparent_60%)]" />
            <div className="relative">
              <h2 className="text-balance text-3xl font-black tracking-tight text-content-primary sm:text-5xl">{t("home_cta_title_default")}</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-content-muted">{t("home_cta_body")}</p>
              <div className="mt-7 grid gap-2.5 sm:mt-9 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
                <NextLink href="/register?mode=organizer" className="btn-primary min-h-12 w-full px-6 text-sm sm:w-auto">{t("home_cta_primary")} <ArrowRight className="h-4 w-4" /></NextLink>
                <NextLink href="/pricing" className="btn-secondary min-h-12 w-full px-6 text-sm sm:w-auto">{t("home_cta_secondary")}</NextLink>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
      <span className="sr-only" data-locale={locale}>{locale}</span>
    </div>
  );
}
