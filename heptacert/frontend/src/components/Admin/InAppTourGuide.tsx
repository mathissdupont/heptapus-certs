"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, X, ChevronLeft, ChevronRight, CheckCircle2, MousePointerClick } from "lucide-react";
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

const TOUR_DISMISSED_KEY = "heptacert:tour:dismissed:v4";
const TOUR_COMPLETED_COUNT_KEY = "heptacert:tour:completed-count:v1";
const TOUR_LAST_COMPLETED_KEY = "heptacert:tour:last-completed:v1";

const TR_COPY: TourCopy = {
  launcher: "Sistem Turu",
  launcherOpenAgain: "Turu Yeniden Aç",
  title: "Sistemin Uçtan Uca İşleyişi",
  subtitle: "Platformu adım adım öğrenip tüm operasyonu tek akışta yönetin.",
  stepsLabel: "Adımlar",
  stepPrefix: "Adım",
  dontShowAgain: "Bir daha gösterme",
  back: "Geri",
  next: "İleri",
  finish: "Bitir",
  close: "Kapat",
  completed: "Tamamlandı",
  completedCount: "Tamamlanma Sayısı",
  lastCompleted: "Son Tamamlama",
  never: "Henüz yok",
  historyTitle: "Rehber Geçmişi",
  restartTour: "Turu Baştan Başlat",
  actionFallback: "Bu adıma git",
  clickTarget: "Öğeye odaklan",
  targetNotFound: "Bu ekranda hedef öğe bulunamadı.",
  targetHint: "Hedef burada",
  steps: [
    {
      title: "Dashboard ile Başla",
      description: "Önce Dashboard üzerinden genel durum, uyarılar ve hızlı aksiyon kartlarını kontrol edin.",
      route: "/admin/dashboard",
      actionLabel: "Dashboard Aç",
      targetSelector: "[data-tour-id='nav-dashboard']",
    },
    {
      title: "Etkinlikleri Kurgula",
      description: "Etkinlik oluşturup ayarlarını, görünürlüğünü ve kayıt kurallarını netleştirin.",
      route: "/admin/events",
      actionLabel: "Etkinliklere Git",
      targetSelector: "[data-tour-id='nav-events']",
    },
    {
      title: "Sertifika Akışı",
      description: "Editor ve ayarlarda sertifika tasarımını, doğrulama yolunu ve alt bilgileri düzenleyin.",
    },
    {
      title: "Katılımcı Operasyonu",
      description: "Katılımcı listesi, check-in, oturum takibi ve uygunluk koşullarını yönetin.",
    },
    {
      title: "E-posta Süreçleri",
      description: "Email Merkezi'nde şablonlar, SMTP ve otomasyon akışını test edip yayına alın.",
      route: "/admin/email-dashboard",
      actionLabel: "Email Merkezi Aç",
      targetSelector: "[data-tour-id='nav-email-dashboard']",
    },
    {
      title: "Analitik ve İyileştirme",
      description: "Açılma, tıklanma ve dönüşüm verileriyle kampanyaları düzenli optimize edin.",
      route: "/admin/email-analytics",
      actionLabel: "Analitik'e Git",
      targetSelector: "[data-tour-id='nav-email-analytics']",
    },
    {
      title: "Kurumsal ve Sosyal Kimlik",
      description: "Ayarlar > Kurumsal sekmesinde marka, sosyal bağlantılar ve topluluk görünümünü tek yerden yönetin.",
      route: "/admin/settings?tab=branding",
      actionLabel: "Kurumsal Sekmeye Git",
      targetSelector: "[data-tour-id='branding-social-shortcut']",
    },
    {
      title: "Domain ve Güvenlik",
      description: "Özel domain, API anahtarları, 2FA ve erişim politikalarıyla sistemi üretime hazır hale getirin.",
      route: "/admin/settings?tab=domain",
      actionLabel: "Domain Ayarları",
      targetSelector: "[data-tour-id='nav-settings']",
    },
    {
      title: "Entegrasyon",
      description: "Webhook ve dış entegrasyonlarla sertifika, e-posta ve rapor akışlarını otomatikleştirin.",
      route: "/admin/webhooks",
      actionLabel: "Webhook Yönetimi",
      targetSelector: "[data-tour-id='nav-webhooks']",
    },
  ],
  superadminStep: {
    title: "Super Admin Kontrolü",
    description: "Super Admin panelinden yönetici rolleri, izinler ve platform denetimini tamamlayın.",
    route: "/admin/superadmin",
    actionLabel: "Super Admin Aç",
    targetSelector: "[data-tour-id='nav-superadmin']",
  },
};

const EN_COPY: TourCopy = {
  launcher: "System Tour",
  launcherOpenAgain: "Open Tour",
  title: "End-to-End System Flow",
  subtitle: "Learn the platform step by step and manage operations in one flow.",
  stepsLabel: "Steps",
  stepPrefix: "Step",
  dontShowAgain: "Don't show again",
  back: "Back",
  next: "Next",
  finish: "Finish",
  close: "Close",
  completed: "Completed",
  completedCount: "Completion Count",
  lastCompleted: "Last Completion",
  never: "Not yet",
  historyTitle: "Tour History",
  restartTour: "Restart Tour",
  actionFallback: "Go to step",
  clickTarget: "Focus element",
  targetNotFound: "Target element not found here.",
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

function getStepsForRole(copy: TourCopy, role: string | null) {
  const base = [...copy.steps];
  return base;
}

function highlightTarget(selector: string): boolean {
  if (typeof window === "undefined") return false;
  
  document.querySelectorAll('.hepta-tour-highlight').forEach(el => {
    el.classList.remove('hepta-tour-highlight');
  });

  const node = document.querySelector(selector);
  if (!(node instanceof HTMLElement)) return false;

  node.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  node.classList.add('hepta-tour-highlight');

  window.setTimeout(() => {
    if (node) node.classList.remove('hepta-tour-highlight');
  }, 2500);

  return true;
}

function getTargetBubblePosition(selector: string): TargetBubble | null {
  if (typeof window === "undefined") return null;
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLElement)) return null;

  const rect = node.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const margin = 12;
  const bubbleWidth = 140;
  const bubbleHeight = 36;

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
  const [targetVisible, setTargetVisible] = useState(true);
  const [targetBubble, setTargetBubble] = useState<TargetBubble | null>(null);

  const rafRef = useRef<number | null>(null);

  const steps = useMemo(() => getStepsForRole(copy, role), [copy, role]);
  const currentStep = useMemo(() => steps[stepIndex], [steps, stepIndex]);

  useEffect(() => {
    setRole(getRoleFromToken());
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedDismissed = window.localStorage.getItem(TOUR_DISMISSED_KEY) === "1";
    const storedCount = Number(window.localStorage.getItem(TOUR_COMPLETED_COUNT_KEY) || "0");
    
    setCompletedCount(Number.isFinite(storedCount) ? storedCount : 0);
    setDismissed(storedDismissed);
    if (!storedDismissed) setOpen(true);
  }, []);

  useEffect(() => {
    if (!steps.length) return;
    if (stepIndex > steps.length - 1) setStepIndex(steps.length - 1);
  }, [stepIndex, steps]);

  useEffect(() => {
    if (!pathname || !steps.length) return;
    const directMatch = steps.findIndex((step) => step.route && pathname.startsWith(step.route.split("?")[0]));
    if (directMatch >= 0 && directMatch !== stepIndex) {
      setStepIndex(directMatch);
    }
  }, [pathname, steps]);

  useEffect(() => {
    if (!open || !currentStep?.targetSelector) {
      setTargetVisible(true);
      setTargetBubble(null);
      return;
    }
    const timer = setTimeout(() => {
      setTargetVisible(highlightTarget(currentStep.targetSelector || ""));
      setTargetBubble(getTargetBubblePosition(currentStep.targetSelector || ""));
    }, 150);
    return () => clearTimeout(timer);
  }, [open, currentStep]);

  const updateBubbleThrottled = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (currentStep?.targetSelector) {
        setTargetBubble(getTargetBubblePosition(currentStep.targetSelector));
      }
    });
  }, [currentStep]);

  useEffect(() => {
    if (!open || !currentStep?.targetSelector) return;
    window.addEventListener("resize", updateBubbleThrottled);
    window.addEventListener("scroll", updateBubbleThrottled, true);
    return () => {
      window.removeEventListener("resize", updateBubbleThrottled);
      window.removeEventListener("scroll", updateBubbleThrottled, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, currentStep, updateBubbleThrottled]);

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
    document.querySelectorAll('.hepta-tour-highlight').forEach(el => el.classList.remove('hepta-tour-highlight'));
  }

  function completeGuide() {
    const now = new Date().toISOString();
    const nextCount = completedCount + 1;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOUR_COMPLETED_COUNT_KEY, String(nextCount));
      window.localStorage.setItem(TOUR_LAST_COMPLETED_KEY, now);
    }
    setCompletedCount(nextCount);
    closeGuide();
  }

  function prevStep() {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }

  function nextStep() {
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }

  function restartTour() {
    if (typeof window !== "undefined") window.localStorage.removeItem(TOUR_DISMISSED_KEY);
    setDismissed(false);
    setDontShowAgain(false);
    setStepIndex(0);
    setOpen(true);
  }

  const progress = steps.length > 0 ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;

  // Kapalıysa ve Dismiss edildiyse Sağ Altta ufak Launcher
  if (dismissed && !open) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={restartTour}
          className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg transition-all hover:w-auto hover:px-4 hover:shadow-xl"
        >
          <HelpCircle className="h-5 w-5 text-slate-500 transition-colors group-hover:text-slate-900" />
          <span className="hidden whitespace-nowrap pl-2 text-sm font-medium text-slate-900 group-hover:block">
            {copy.launcherOpenAgain}
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .hepta-tour-highlight {
          position: relative !important;
          z-index: 45 !important;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.9), 0 0 0 7px rgba(15, 23, 42, 0.08) !important;
          border-radius: 6px;
          transition: box-shadow 0.3s ease !important;
        }
      `}} />

      {/* Launcher (Sağ Alt) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg transition-all hover:w-auto hover:px-4 hover:shadow-xl"
        >
          <HelpCircle className="h-5 w-5 text-slate-500 transition-colors group-hover:text-slate-900" />
          <span className="hidden whitespace-nowrap pl-2 text-sm font-medium text-slate-900 group-hover:block">
            {copy.launcher}
          </span>
          {completedCount > 0 && (
            <span 
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center bg-slate-900 text-[9px] font-bold text-white group-hover:relative group-hover:right-0 group-hover:top-0 group-hover:ml-2"
              style={{ clipPath: "polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)" }}
            >
              {completedCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <>
          {/* Spotlight Bubble */}
          {targetBubble && currentStep?.targetSelector && (
            <div
              className="pointer-events-none fixed z-[60] transition-all duration-200 ease-out"
              style={{ top: `${targetBubble.top}px`, left: `${targetBubble.left}px` }}
            >
              <div className="inline-flex animate-bounce items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xl">
                <MousePointerClick className="h-3.5 w-3.5 text-slate-400" />
                {copy.targetHint}
              </div>
            </div>
          )}

          {/* Minimalist In-App Tour Card (Sağ Alt) */}
          <div className="fixed bottom-20 right-6 z-50 w-full max-w-[340px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
            
            {/* Üst İlerleme Çubuğu */}
            <div className="h-1 w-full bg-slate-100">
              <div className="h-full bg-slate-900 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>

            {/* İçerik */}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {copy.stepPrefix} {stepIndex + 1} / {steps.length}
                </span>
                <button
                  type="button"
                  onClick={closeGuide}
                  className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h3 className="mt-2 text-lg font-semibold text-slate-900">{currentStep.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{currentStep.description}</p>

              {/* Aksiyon Butonları */}
              {(currentStep.route || currentStep.targetSelector) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {currentStep.route && (
                    <Link
                      href={currentStep.route}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      {currentStep.actionLabel || copy.actionFallback}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {currentStep.targetSelector && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        highlightTarget(currentStep.targetSelector || "");
                        setTargetVisible(highlightTarget(currentStep.targetSelector || ""));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <MousePointerClick className="h-3.5 w-3.5" />
                      {copy.clickTarget}
                    </button>
                  )}
                </div>
              )}

              {!targetVisible && currentStep.targetSelector && (
                <p className="mt-3 text-[11px] font-medium text-red-500">{copy.targetNotFound}</p>
              )}
            </div>

            {/* Footer Kontrolleri */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-500 hover:text-slate-700">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                {copy.dontShowAgain}
              </label>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={stepIndex === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {stepIndex < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex h-7 px-3 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    {copy.next}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={completeGuide}
                    className="flex h-7 px-3 items-center justify-center gap-1.5 rounded-md bg-slate-900 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    {copy.finish}
                  </button>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </>
  );
}