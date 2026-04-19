"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, X, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, MousePointerClick } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getRoleFromToken } from "@/lib/api";

type TourStep = {
  title: string;
  description: string;
  route?: string;
  actionLabel?: string;
  targetSelector?: string;
};

type TourCopy = {
  launcher: string;
  launcherOpenAgain: string;
  title: string;
  subtitle: string;
  stepsLabel: string;
  stepPrefix: string;
  dontShowAgain: string;
  back: string;
  next: string;
  finish: string;
  close: string;
  completed: string;
  completedCount: string;
  lastCompleted: string;
  never: string;
  historyTitle: string;
  restartTour: string;
  actionFallback: string;
  clickTarget: string;
  targetNotFound: string;
  targetHint: string;
  steps: TourStep[];
  superadminStep: TourStep;
};

type TargetBubble = {
  top: number;
  left: number;
};

const TOUR_DISMISSED_KEY = "heptacert:tour:dismissed:v3";
const TOUR_COMPLETED_COUNT_KEY = "heptacert:tour:completed-count:v1";
const TOUR_LAST_COMPLETED_KEY = "heptacert:tour:last-completed:v1";

const TR_COPY: TourCopy = {
  launcher: "Sistem Turu",
  launcherOpenAgain: "Turu Yeniden Ac",
  title: "Sistemin Uctan Uca Isleyisi",
  subtitle: "Platformu adim adim ogrenip tum operasyonu tek akista yonetin.",
  stepsLabel: "Adimlar",
  stepPrefix: "Adim",
  dontShowAgain: "Bir daha otomatik gosterme",
  back: "Geri",
  next: "Ileri",
  finish: "Turu Bitir",
  close: "Kapat",
  completed: "Tamamlandi",
  completedCount: "Tamamlanma Sayisi",
  lastCompleted: "Son Tamamlama",
  never: "Henuz yok",
  historyTitle: "Rehber Gecmisi",
  restartTour: "Turu Bastan Baslat",
  actionFallback: "Bu adima git",
  clickTarget: "Bu elemani tikla",
  targetNotFound: "Bu ekranda hedef eleman bulunamadi.",
  targetHint: "Hedef burada",
  steps: [
    {
      title: "Dashboard ile Basla",
      description: "Once Dashboard uzerinden genel durum, uyarilar ve hizli aksiyon kartlarini kontrol edin.",
      route: "/admin/dashboard",
      actionLabel: "Dashboard Ac",
      targetSelector: "[data-tour-id='nav-dashboard']",
    },
    {
      title: "Etkinlikleri Kurgula",
      description: "Etkinlik olusturup ayarlarini, gorunurlugunu ve kayit kurallarini netlestirin.",
      route: "/admin/events",
      actionLabel: "Etkinliklere Git",
      targetSelector: "[data-tour-id='nav-events']",
    },
    {
      title: "Sertifika Akisi",
      description: "Editor ve ayarlarda sertifika tasarimini, dogrulama yolunu ve alt bilgileri duzenleyin.",
    },
    {
      title: "Katilimci Operasyonu",
      description: "Katilimci listesi, check-in, oturum takibi ve uygunluk kosullarini yonetin.",
    },
    {
      title: "E-posta Surecleri",
      description: "Email Merkezi'nde sablonlar, SMTP ve otomasyon akisini test edip yayina alin.",
      route: "/admin/email-dashboard",
      actionLabel: "Email Merkezi Ac",
      targetSelector: "[data-tour-id='nav-email-dashboard']",
    },
    {
      title: "Analitik ve Iyilestirme",
      description: "Acilma, tiklanma ve donusum verileriyle kampanyalari duzenli optimize edin.",
      route: "/admin/email-analytics",
      actionLabel: "Analitige Git",
      targetSelector: "[data-tour-id='nav-email-analytics']",
    },
    {
      title: "Kurumsal ve Sosyal Kimlik",
      description: "Ayarlar > Kurumsal sekmesinde marka, sosyal baglantilar ve topluluk gorunumunu tek yerden yonetin.",
      route: "/admin/settings?tab=branding",
      actionLabel: "Kurumsal Sekmeye Git",
      targetSelector: "[data-tour-id='branding-social-shortcut']",
    },
    {
      title: "Domain ve Guvenlik",
      description: "Ozel domain, API anahtarlari, 2FA ve erisim politikalariyla sistemi uretime hazir hale getirin.",
      route: "/admin/settings?tab=domain",
      actionLabel: "Domain Ayarlari",
      targetSelector: "[data-tour-id='nav-settings']",
    },
    {
      title: "Entegrasyon",
      description: "Webhook ve dis entegrasyonlarla sertifika, e-posta ve rapor akislarini otomatiklestirin.",
      route: "/admin/webhooks",
      actionLabel: "Webhook Yonetimi",
      targetSelector: "[data-tour-id='nav-webhooks']",
    },
  ],
  superadminStep: {
    title: "Super Admin Kontrolu",
    description: "Super Admin panelinden yonetici rolleri, izinler ve platform denetimini tamamlayin.",
    route: "/admin/superadmin",
    actionLabel: "Super Admin Ac",
    targetSelector: "[data-tour-id='nav-superadmin']",
  },
};

const EN_COPY: TourCopy = {
  launcher: "System Tour",
  launcherOpenAgain: "Open Tour Again",
  title: "End-to-End System Flow",
  subtitle: "Learn the platform step by step and manage operations in one flow.",
  stepsLabel: "Steps",
  stepPrefix: "Step",
  dontShowAgain: "Do not show automatically again",
  back: "Back",
  next: "Next",
  finish: "Finish Tour",
  close: "Close",
  completed: "Completed",
  completedCount: "Completion Count",
  lastCompleted: "Last Completion",
  never: "Not yet",
  historyTitle: "Tour History",
  restartTour: "Restart Tour",
  actionFallback: "Go to this step",
  clickTarget: "Click this element",
  targetNotFound: "Target element is not available on this screen.",
  targetHint: "Target is here",
  steps: [
    {
      title: "Start with Dashboard",
      description: "Begin with global status, alerts, and quick action cards on the Dashboard.",
      route: "/admin/dashboard",
      actionLabel: "Open Dashboard",
      targetSelector: "[data-tour-id='nav-dashboard']",
    },
    {
      title: "Configure Events",
      description: "Create events and finalize visibility, registration rules, and operational settings.",
      route: "/admin/events",
      actionLabel: "Go to Events",
      targetSelector: "[data-tour-id='nav-events']",
    },
    {
      title: "Certificate Workflow",
      description: "Adjust certificate design, verification path, and footer details in editor/settings.",
    },
    {
      title: "Participant Operations",
      description: "Handle participant lists, check-in, session tracking, and eligibility rules.",
    },
    {
      title: "Email Processes",
      description: "Set up templates, SMTP, and automation in Email Center, then validate before launch.",
      route: "/admin/email-dashboard",
      actionLabel: "Open Email Center",
      targetSelector: "[data-tour-id='nav-email-dashboard']",
    },
    {
      title: "Analytics and Optimization",
      description: "Use open, click, and conversion metrics to improve communication performance.",
      route: "/admin/email-analytics",
      actionLabel: "Open Analytics",
      targetSelector: "[data-tour-id='nav-email-analytics']",
    },
    {
      title: "Brand and Social Identity",
      description: "Manage brand visuals, social links, and organization profile from the Branding tab.",
      route: "/admin/settings?tab=branding",
      actionLabel: "Go to Branding",
      targetSelector: "[data-tour-id='branding-social-shortcut']",
    },
    {
      title: "Domain and Security",
      description: "Prepare production setup with custom domain, API keys, 2FA, and access controls.",
      route: "/admin/settings?tab=domain",
      actionLabel: "Open Domain Settings",
      targetSelector: "[data-tour-id='nav-settings']",
    },
    {
      title: "Integrations",
      description: "Automate certificate, email, and reporting pipelines via webhooks and external services.",
      route: "/admin/webhooks",
      actionLabel: "Manage Webhooks",
      targetSelector: "[data-tour-id='nav-webhooks']",
    },
  ],
  superadminStep: {
    title: "Super Admin Controls",
    description: "Use the Super Admin panel for role governance, elevated permissions, and platform-level control.",
    route: "/admin/superadmin",
    actionLabel: "Open Super Admin",
    targetSelector: "[data-tour-id='nav-superadmin']",
  },
};

function getStepsForRole(copy: TourCopy, role: string | null): TourStep[] {
  const base = [...copy.steps];
  if (role === "superadmin") base.push(copy.superadminStep);
  return base;
}

function highlightTarget(selector: string): boolean {
  if (typeof window === "undefined") return false;
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLElement)) return false;

  node.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

  const previousOutline = node.style.outline;
  const previousBoxShadow = node.style.boxShadow;
  const previousTransition = node.style.transition;

  node.style.transition = "box-shadow 0.25s ease, outline-color 0.25s ease";
  node.style.outline = "3px solid rgba(245, 158, 11, 0.95)";
  node.style.boxShadow = "0 0 0 8px rgba(245, 158, 11, 0.25)";

  window.setTimeout(() => {
    node.style.outline = previousOutline;
    node.style.boxShadow = previousBoxShadow;
    node.style.transition = previousTransition;
  }, 2200);

  return true;
}

function getTargetBubblePosition(selector: string): TargetBubble | null {
  if (typeof window === "undefined") return null;
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLElement)) return null;

  const rect = node.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const bubbleWidth = 220;
  const bubbleHeight = 44;
  const margin = 14;

  let top = rect.top + rect.height / 2 - bubbleHeight / 2;
  let left = rect.right + margin;

  if (left + bubbleWidth > viewportWidth - 8) {
    left = Math.max(8, rect.left - bubbleWidth - margin);
  }

  if (left < 8) {
    left = Math.min(viewportWidth - bubbleWidth - 8, rect.left + rect.width / 2 - bubbleWidth / 2);
    top = rect.bottom + margin;
    if (top + bubbleHeight > viewportHeight - 8) {
      top = Math.max(8, rect.top - bubbleHeight - margin);
    }
  }

  top = Math.max(8, Math.min(top, viewportHeight - bubbleHeight - 8));
  left = Math.max(8, Math.min(left, viewportWidth - bubbleWidth - 8));

  return { top, left };
}

export default function InAppTourGuide() {
  const pathname = usePathname() || "";
  const { lang } = useI18n();
  const copy = lang === "en" ? EN_COPY : TR_COPY;
  const [role, setRole] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [targetVisible, setTargetVisible] = useState(true);
  const [targetBubble, setTargetBubble] = useState<TargetBubble | null>(null);

  const steps = useMemo(() => getStepsForRole(copy, role), [copy, role]);
  const currentStep = useMemo(() => steps[stepIndex], [steps, stepIndex]);
  const progress = steps.length > 0 ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;

  useEffect(() => {
    setRole(getRoleFromToken());
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedDismissed = window.localStorage.getItem(TOUR_DISMISSED_KEY) === "1";
    const storedCount = Number(window.localStorage.getItem(TOUR_COMPLETED_COUNT_KEY) || "0");
    const storedLast = window.localStorage.getItem(TOUR_LAST_COMPLETED_KEY);

    setDismissed(storedDismissed);
    setCompletedCount(Number.isFinite(storedCount) ? storedCount : 0);
    setLastCompletedAt(storedLast || null);
    if (!storedDismissed) setOpen(true);
  }, []);

  useEffect(() => {
    if (!steps.length) return;
    if (stepIndex > steps.length - 1) {
      setStepIndex(steps.length - 1);
    }
  }, [stepIndex, steps]);

  useEffect(() => {
    if (!pathname) return;
    if (!steps.length) return;
    const directMatch = steps.findIndex((step) => step.route && pathname.startsWith(step.route.split("?")[0]));
    if (directMatch >= 0) setStepIndex(directMatch);
  }, [pathname, steps]);

  useEffect(() => {
    if (!open || !currentStep?.targetSelector) {
      setTargetVisible(true);
      setTargetBubble(null);
      return;
    }
    setTargetVisible(highlightTarget(currentStep.targetSelector));
    setTargetBubble(getTargetBubblePosition(currentStep.targetSelector));
  }, [open, currentStep]);

  useEffect(() => {
    if (!open || !currentStep?.targetSelector) return;

    const updateBubble = () => {
      setTargetBubble(getTargetBubblePosition(currentStep.targetSelector || ""));
    };

    window.addEventListener("resize", updateBubble);
    window.addEventListener("scroll", updateBubble, true);

    return () => {
      window.removeEventListener("resize", updateBubble);
      window.removeEventListener("scroll", updateBubble, true);
    };
  }, [open, currentStep]);

  function applyDismissPreference() {
    if (typeof window === "undefined") return;
    if (dontShowAgain) {
      window.localStorage.setItem(TOUR_DISMISSED_KEY, "1");
      setDismissed(true);
    }
  }

  function closeGuide() {
    setOpen(false);
    applyDismissPreference();
  }

  function completeGuide() {
    const now = new Date().toISOString();
    const nextCount = completedCount + 1;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOUR_COMPLETED_COUNT_KEY, String(nextCount));
      window.localStorage.setItem(TOUR_LAST_COMPLETED_KEY, now);
    }
    setCompletedCount(nextCount);
    setLastCompletedAt(now);
    closeGuide();
  }

  function prevStep() {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }

  function nextStep() {
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }

  function restartTour() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOUR_DISMISSED_KEY);
    }
    setDismissed(false);
    setDontShowAgain(false);
    setStepIndex(0);
    setOpen(true);
  }

  function handleClickTarget() {
    if (!currentStep?.targetSelector) return;
    setOpen(false);
    const found = highlightTarget(currentStep.targetSelector);
    setTargetVisible(found);
  }

  const formattedLastCompleted = lastCompletedAt
    ? new Date(lastCompletedAt).toLocaleString(lang === "en" ? "en-US" : "tr-TR")
    : copy.never;

  if (dismissed) {
    return (
      <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6">
        <button
          type="button"
          onClick={restartTour}
          className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-lg hover:bg-sky-50"
        >
          <HelpCircle className="h-4 w-4" />
          {copy.launcherOpenAgain}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-lg hover:bg-sky-50"
        >
          <HelpCircle className="h-4 w-4" />
          {copy.launcher}
          {completedCount > 0 ? (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">{completedCount}</span>
          ) : null}
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          {targetBubble && currentStep?.targetSelector ? (
            <div
              className="pointer-events-none fixed z-[55]"
              style={{ top: `${targetBubble.top}px`, left: `${targetBubble.left}px` }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 shadow-lg">
                <MousePointerClick className="h-4 w-4" />
                {copy.targetHint}
              </div>
            </div>
          ) : null}

          <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">HeptaCert Guide</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">{copy.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {copy.stepPrefix} {steps.length === 0 ? 0 : stepIndex + 1} / {steps.length}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeGuide}
                  className="rounded-lg p-2 text-slate-500 hover:bg-white"
                  aria-label={copy.close}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[300px_minmax(0,1fr)_240px]">
              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.stepsLabel}</p>
                <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
                  {steps.map((step, idx) => {
                    const active = idx === stepIndex;
                    return (
                      <button
                        key={`${step.title}-${idx}`}
                        type="button"
                        onClick={() => setStepIndex(idx)}
                        className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                          active
                            ? "bg-white text-slate-900 shadow-sm ring-1 ring-sky-200"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                          {idx + 1}
                        </span>
                        {step.title}
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">
                  {copy.stepPrefix} {stepIndex + 1}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">{currentStep.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-700">{currentStep.description}</p>

                {currentStep.route ? (
                  <div className="mt-5">
                    <Link
                      href={currentStep.route}
                      className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {currentStep.actionLabel || copy.actionFallback}
                    </Link>
                  </div>
                ) : null}

                {currentStep.targetSelector ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleClickTarget}
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      {copy.clickTarget}
                    </button>
                    {!targetVisible ? <p className="mt-2 text-xs text-rose-600">{copy.targetNotFound}</p> : null}
                  </div>
                ) : null}

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(event) => setDontShowAgain(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    {copy.dontShowAgain}
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={stepIndex === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {copy.back}
                    </button>
                    {stepIndex < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                      >
                        {copy.next}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={completeGuide}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        {copy.finish}
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.historyTitle}</p>
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{copy.completedCount}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{completedCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{copy.lastCompleted}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formattedLastCompleted}</p>
                  </div>
                  <button
                    type="button"
                    onClick={restartTour}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {copy.restartTour}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
