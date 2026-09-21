"use client";

import { ArrowLeft, ArrowRight, Building2, CalendarDays, Check, CheckCircle2, Loader2, Rocket, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import DateField from "@/components/Admin/DateField";
import { buildEventSetupItems, firstPendingEventSetupItem } from "@/components/Admin/EventSetupChecklist";
import { apiFetch, normalizeApiAssetUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { localeTag } from "@/lib/localeTag";
import {
  eventDatePatch,
  loadOrganizerOnboardingState,
  type OnboardingStep,
  type OrganizerOnboardingState,
} from "@/lib/onboarding";
import type { TranslationKey } from "@/locales/tr";

type EventType =
  | "certificate_event"
  | "seminar"
  | "workshop"
  | "conference"
  | "concert"
  | "training"
  | "club_event"
  | "online_event"
  | "custom";

const EVENT_TYPES: Array<{ value: EventType; label: TranslationKey }> = [
  { value: "certificate_event", label: "onboarding_event_type_certificate" },
  { value: "seminar", label: "onboarding_event_type_seminar" },
  { value: "workshop", label: "onboarding_event_type_workshop" },
  { value: "conference", label: "onboarding_event_type_conference" },
  { value: "concert", label: "onboarding_event_type_concert" },
  { value: "training", label: "onboarding_event_type_training" },
  { value: "club_event", label: "onboarding_event_type_club" },
  { value: "online_event", label: "onboarding_event_type_online" },
  { value: "custom", label: "onboarding_event_type_custom" },
];

export default function OrganizerOnboardingPage() {
  const { lang, t } = useI18n();
  const [state, setState] = useState<OrganizerOnboardingState | null>(null);
  const [activeStep, setActiveStep] = useState<OnboardingStep>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState<EventType>("certificate_event");
  const [eventDate, setEventDate] = useState("");
  const [presetMap, setPresetMap] = useState<Record<string, Record<string, boolean>>>({});

  async function refreshState() {
    const next = await loadOrganizerOnboardingState({ includeHealth: true });
    setState(next);
    setOrgName(next.organization.org_name || "");
    setBrandColor(next.organization.brand_color || "");
    setActiveStep(next.requiredStep);
    return next;
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadOrganizerOnboardingState({ includeHealth: true }),
      apiFetch("/admin/event-feature-presets").then((response) => response.json()),
    ])
      .then(([next, presets]) => {
        if (cancelled) return;
        setState(next);
        setOrgName(next.organization.org_name || "");
        setBrandColor(next.organization.brand_color || "");
        setActiveStep(next.requiredStep);
        setPresetMap(presets?.presets || {});
      })
      .catch((cause: { message?: string }) => {
        if (!cancelled) setError(cause?.message || t("onboarding_load_error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const selectedPresetCount = useMemo(
    () => Object.values(presetMap[eventType] || {}).filter(Boolean).length,
    [eventType, presetMap],
  );
  const setupItems = state?.firstEvent ? buildEventSetupItems(state.firstEvent, state.overview, t) : [];
  const nextAction = firstPendingEventSetupItem(setupItems);
  const launchComplete = setupItems.length > 0 && !nextAction;

  const steps = [
    { key: "profile" as const, title: t("onboarding_step_profile"), description: t("onboarding_step_profile_desc"), icon: Building2, done: state?.hasOrganizationProfile || false },
    { key: "event" as const, title: t("onboarding_step_event"), description: t("onboarding_step_event_desc"), icon: CalendarDays, done: state?.hasEvent || false },
    { key: "launch" as const, title: t("onboarding_step_launch"), description: t("onboarding_step_launch_desc"), icon: Rocket, done: launchComplete },
  ];

  function canOpenStep(step: OnboardingStep) {
    if (step === "profile") return true;
    if (step === "event") return Boolean(state?.hasOrganizationProfile);
    return Boolean(state?.hasEvent);
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!orgName.trim() || !brandColor) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/admin/organization/settings", {
        method: "PATCH",
        body: JSON.stringify({ org_name: orgName.trim(), brand_color: brandColor }),
      });
      if (logoFile) {
        const form = new FormData();
        form.append("file", logoFile);
        await apiFetch("/admin/organization/logo", { method: "POST", body: form });
      }
      setLogoFile(null);
      await refreshState();
    } catch (cause: unknown) {
      setError((cause as { message?: string })?.message || t("onboarding_profile_error"));
    } finally {
      setSaving(false);
    }
  }

  async function createFirstEvent(event: React.FormEvent) {
    event.preventDefault();
    if (!eventName.trim()) {
      setError(t("onboarding_event_name_required"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch("/admin/events", {
        method: "POST",
        body: JSON.stringify({
          name: eventName.trim(),
          template_image_url: "placeholder",
          config: { visibility: "unlisted" },
          event_type: eventType,
        }),
      });
      const created = await response.json();
      if (eventDate) {
        await apiFetch(`/admin/events/${created.id}`, {
          method: "PATCH",
          body: JSON.stringify(eventDatePatch(created, eventName, eventDate)),
        });
      }
      await refreshState();
    } catch (cause: unknown) {
      setError((cause as { message?: string })?.message || t("onboarding_event_error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center text-content-muted">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" /> {t("onboarding_loading")}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-status-danger-border bg-status-danger-bg p-6 text-status-danger-content">
        <p className="font-semibold">{error || t("onboarding_load_error")}</p>
        <button type="button" onClick={() => window.location.reload()} className="btn-secondary mt-4">{t("onboarding_retry")}</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <header className="flex flex-col gap-5 border-b border-outline-subtle pb-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-11 font-extrabold uppercase tracking-[0.18em] text-accent-strong">HeptaCert</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-content-primary sm:text-4xl">{t("onboarding_title")}</h1>
          <p className="mt-3 text-sm leading-7 text-content-muted">{t("onboarding_subtitle")}</p>
        </div>
        <Link href="/admin/dashboard" className="btn-ghost shrink-0">{t("onboarding_skip")}</Link>
      </header>

      <div className="mt-8 grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label={t("onboarding_progress_label")} className="space-y-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const active = activeStep === step.key;
            const enabled = canOpenStep(step.key);
            return (
              <button
                key={step.key}
                type="button"
                disabled={!enabled}
                onClick={() => enabled && setActiveStep(step.key)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-accent-border bg-accent-soft" : "border-outline-subtle bg-raised hover:bg-sunken"} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${step.done ? "bg-status-success-bg text-status-success-content" : active ? "bg-accent-strong text-content-inverted" : "bg-sunken text-content-faint"}`}>
                  {step.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-11 font-bold uppercase tracking-wider text-content-faint">{index + 1}/3</span>
                  <span className="mt-1 block text-sm font-bold text-content-primary">{step.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-content-muted">{step.description}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <section className="rounded-3xl border border-outline-subtle bg-raised p-6 shadow-soft sm:p-8">
          {activeStep === "profile" && (
            <form onSubmit={saveProfile} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-content-primary">{t("onboarding_profile_title")}</h2>
                <p className="mt-2 text-sm leading-6 text-content-muted">{t("onboarding_profile_body")}</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-[1fr_150px]">
                <label className="space-y-2">
                  <span className="label">{t("onboarding_org_name")}</span>
                  <input className="input-field" value={orgName} onChange={(event) => setOrgName(event.target.value)} placeholder={t("onboarding_org_placeholder")} required autoFocus />
                </label>
                <label className="space-y-2">
                  <span className="label">{t("onboarding_brand_color")}</span>
                  <input className="h-11 w-full cursor-pointer rounded-xl border border-outline-subtle bg-canvas p-1" type="color" value={brandColor} onChange={(event) => setBrandColor(event.target.value)} required />
                </label>
              </div>
              <div className="rounded-2xl border border-outline-subtle bg-sunken p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {state.organization.brand_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={normalizeApiAssetUrl(state.organization.brand_logo) || state.organization.brand_logo} alt="" className="h-12 w-20 rounded-lg bg-raised object-contain p-1" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft font-black text-accent-strong">{(orgName || "H").charAt(0).toUpperCase()}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-content-primary">{t("onboarding_logo")}</p>
                    <p className="mt-1 text-xs text-content-muted">{t("onboarding_logo_hint")}</p>
                  </div>
                  <label className="btn-secondary cursor-pointer">
                    <Upload className="h-4 w-4" />
                    {logoFile?.name || t("onboarding_choose_logo")}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={saving || !orgName.trim() || !brandColor} className="btn-primary min-h-11 px-5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {saving ? t("onboarding_saving") : t("onboarding_profile_continue")}
                </button>
              </div>
            </form>
          )}

          {activeStep === "event" && (
            <form onSubmit={createFirstEvent} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-content-primary">{t("onboarding_event_title")}</h2>
                <p className="mt-2 text-sm leading-6 text-content-muted">{t("onboarding_event_body")}</p>
              </div>
              <label className="block space-y-2">
                <span className="label">{t("onboarding_event_name")}</span>
                <input className="input-field" value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder={t("onboarding_event_placeholder")} required autoFocus />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="label">{t("onboarding_event_type")}</span>
                  <select className="input-field" value={eventType} onChange={(event) => setEventType(event.target.value as EventType)}>
                    {EVENT_TYPES.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
                  </select>
                </label>
                <DateField value={eventDate} onChange={setEventDate} label={t("onboarding_event_date")} placeholder={t("onboarding_event_date_optional")} locale={localeTag(lang)} />
              </div>
              <div className="rounded-2xl border border-accent-border bg-accent-soft p-4 text-sm text-content-secondary">
                <p className="font-bold text-content-primary">{t("onboarding_preset_title")}</p>
                <p className="mt-1 leading-6">{t("onboarding_preset_body", { count: selectedPresetCount })}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setActiveStep("profile")} className="btn-secondary"><ArrowLeft className="h-4 w-4" />{t("onboarding_back")}</button>
                <button type="submit" disabled={saving || !eventName.trim()} className="btn-primary min-h-11 px-5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                  {saving ? t("onboarding_creating_event") : t("onboarding_create_event")}
                </button>
              </div>
            </form>
          )}

          {activeStep === "launch" && state.firstEvent && (
            <div className="space-y-7">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-status-success-bg text-status-success-content">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-content-primary">{launchComplete ? t("onboarding_complete_title") : t("onboarding_launch_title")}</h2>
                <p className="mt-2 text-sm leading-7 text-content-muted">{launchComplete ? t("onboarding_complete_body") : t("onboarding_launch_body", { event: state.firstEvent.name })}</p>
              </div>
              {nextAction && (
                <div className="rounded-2xl border border-outline-subtle bg-sunken p-5">
                  <p className="text-11 font-bold uppercase tracking-wider text-content-faint">{t("onboarding_next_action")}</p>
                  <p className="mt-2 font-bold text-content-primary">{nextAction.label}</p>
                  <Link href={nextAction.href} className="btn-primary mt-4 inline-flex min-h-11 px-5">{t("onboarding_open_action")}<ArrowRight className="h-4 w-4" /></Link>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Link href={`/admin/events/${state.firstEvent.id}`} className="btn-secondary">{t("onboarding_view_event")}</Link>
                <Link href="/admin/dashboard" className="btn-primary">{t("onboarding_go_dashboard")}<ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          )}

          {error && <div className="mt-6 rounded-xl border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-content">{error}</div>}
        </section>
      </div>
    </div>
  );
}
