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
      className="relative mx-auto w-full max-w-[500px]"
      aria-label={t("home_dashboard_title")}
    >
      <div className="absolute -inset-8 -z-10 rounded-full bg-accent-soft/70 blur-3xl" />
      <div className="rounded-[2rem] border border-outline-subtle bg-raised/90 p-3 shadow-modal backdrop-blur-xl sm:p-5">
        <div className="rounded-[1.4rem] border border-outline-subtle bg-canvas p-4 sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-content-faint">HeptaCert</p>
              <p className="mt-1 text-sm font-semibold text-content-primary">{t("home_dashboard_title")}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-status-success-bg px-3 py-1 text-11 font-bold text-status-success-content">
              <span className="h-1.5 w-1.5 rounded-full bg-status-success-content" />
              {t("home_dashboard_live")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-outline-subtle bg-sunken p-4">
              <p className="text-2xl font-black tracking-tight text-content-primary">148</p>
              <p className="mt-1 text-11 font-semibold text-content-muted">{t("home_dashboard_pending")}</p>
            </div>
            <div className="rounded-2xl border border-outline-subtle bg-sunken p-4">
              <p className="text-2xl font-black tracking-tight text-content-primary">320</p>
              <p className="mt-1 text-11 font-semibold text-content-muted">{t("home_dashboard_certs")}</p>
            </div>
          </div>
          <p className="mb-3 mt-6 text-11 font-bold uppercase tracking-[0.18em] text-content-faint">{t("home_activity_label")}</p>
          <div className="space-y-2">
            {activities.map(([activityKey, timeKey]) => (
              <div key={activityKey} className="flex items-center gap-3 rounded-xl border border-outline-subtle bg-raised px-3 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-content-secondary">{t(activityKey)}</span>
                <span className="text-11 text-content-faint">{t(timeKey)}</span>
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
      <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden border-b border-outline-subtle">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_12%,rgb(var(--accent-soft)/0.9),transparent_35%),radial-gradient(circle_at_82%_35%,rgb(var(--bg-sunken)),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:linear-gradient(to_right,rgb(var(--border-subtle)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--border-subtle)/0.5)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
        <motion.div
          aria-hidden="true"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute -right-32 top-20 -z-10 h-96 w-96 rounded-[30%] border border-accent-border/50"
        />
        <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
          <div className="max-w-3xl text-center lg:text-left">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-soft px-3.5 py-1.5 text-11 font-extrabold uppercase tracking-[0.16em] text-accent-strong"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("home_badge_default")}
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] text-content-primary sm:text-6xl lg:text-7xl"
            >
              {t("home_title_default")}
            </motion.h1>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.25 }}
              className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-8 text-content-muted sm:text-lg lg:mx-0"
            >
              {t("home_body_default")}
            </motion.p>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.35 }}
              className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            >
              <NextLink href="/register?mode=organizer" className="btn-primary min-h-12 px-6 text-sm">
                {t("home_primary_cta")} <ArrowRight className="h-4 w-4" />
              </NextLink>
              <NextLink href="/pricing" className="btn-secondary min-h-12 px-6 text-sm">{t("home_secondary_cta")}</NextLink>
            </motion.div>
            <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-semibold text-content-muted lg:justify-start">
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
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-outline-subtle px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
          {statItems.map(([value, key], index) => (
            <Reveal key={key} delay={index * 0.06}>
              <div className="py-9 text-center sm:py-12">
                <p className="text-3xl font-black tracking-tight text-content-primary sm:text-4xl">{value ?? "—"}</p>
                <p className="mt-2 text-11 font-bold uppercase tracking-[0.16em] text-content-faint">{t(key)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="features" className="bg-canvas py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-11 font-extrabold uppercase tracking-[0.18em] text-accent-strong">{t("nav_features")}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-content-primary sm:text-5xl">{t("home_features_title_default")}</h2>
            <p className="mt-5 text-base leading-7 text-content-muted">{t("home_features_body")}</p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, title, description], index) => (
              <Reveal key={title} delay={index * 0.05}>
                <article className="group h-full rounded-2xl border border-outline-subtle bg-raised p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-accent-border hover:shadow-float">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-strong"><Icon className="h-5 w-5" /></div>
                  <h3 className="text-base font-bold text-content-primary">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-content-muted">{t(description)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-outline-subtle bg-raised py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal><h2 className="max-w-3xl text-3xl font-black tracking-tight text-content-primary sm:text-5xl">{t("home_steps_title")}</h2></Reveal>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step} delay={index * 0.08}>
                <div className="border-t border-outline-strong pt-6">
                  <span className="text-xs font-black tracking-[0.2em] text-accent-strong">{t(`home_step_${step}_id`)}</span>
                  <h3 className="mt-5 text-xl font-bold text-content-primary">{t(`home_step_${step}_title`)}</h3>
                  <p className="mt-3 text-sm leading-7 text-content-muted">{t(`home_step_${step}_desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-canvas px-5 py-24 sm:px-8 sm:py-32">
        <Reveal className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-accent-border bg-accent-soft p-8 text-center shadow-float sm:p-14">
            <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_top,rgb(var(--bg-raised)),transparent_60%)]" />
            <div className="relative">
              <h2 className="text-balance text-3xl font-black tracking-tight text-content-primary sm:text-5xl">{t("home_cta_title_default")}</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-content-muted">{t("home_cta_body")}</p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <NextLink href="/register?mode=organizer" className="btn-primary min-h-12 px-6 text-sm">{t("home_cta_primary")} <ArrowRight className="h-4 w-4" /></NextLink>
                <NextLink href="/pricing" className="btn-secondary min-h-12 px-6 text-sm">{t("home_cta_secondary")}</NextLink>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
      <span className="sr-only" data-locale={locale}>{locale}</span>
    </div>
  );
}
