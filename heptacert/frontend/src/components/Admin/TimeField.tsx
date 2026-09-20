"use client";

import { Clock, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useI18n } from "@/lib/i18n";
import { localeTag } from "@/lib/localeTag";

export type TimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  locale?: string;
  min?: string;
  max?: string;
  minuteStep?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));

export function isTimeValue(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
}

function normalizeTime(value: string) {
  if (!isTimeValue(value)) return { hour: "09", minute: "00" };
  return { hour: value.slice(0, 2), minute: value.slice(3, 5) };
}

export function parseTypedTime(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(".", ":");
  const match = /^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/.exec(normalized);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = match[3];
  if (minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === "am") hour = hour === 12 ? 0 : hour;
    if (period === "pm") hour = hour === 12 ? 12 : hour + 12;
  } else if (hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function withinBounds(value: string, min?: string, max?: string) {
  if (!isTimeValue(value)) return false;
  return (!min || !isTimeValue(min) || value >= min) && (!max || !isTimeValue(max) || value <= max);
}

function displayTime(value: string, locale: string) {
  if (!isTimeValue(value)) return "";
  const date = new Date(2024, 0, 1, Number(value.slice(0, 2)), Number(value.slice(3, 5)));
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
}

export default function TimeField({
  value,
  onChange,
  label,
  placeholder,
  locale: localeProp,
  min,
  max,
  minuteStep = 5,
  disabled = false,
  required = false,
  className = "",
}: TimeFieldProps) {
  const { lang, t } = useI18n();
  const locale = localeProp ?? localeTag(lang);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [invalidDraft, setInvalidDraft] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 320 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const controlId = useId();
  const dialogId = `${controlId}-time`;
  const { hour, minute } = normalizeTime(value);
  const safeStep = Number.isInteger(minuteStep) && minuteStep > 0 && minuteStep <= 60 ? minuteStep : 5;
  const minutes = useMemo(() => Array.from({ length: Math.ceil(60 / safeStep) }, (_, index) => String(index * safeStep).padStart(2, "0")), [safeStep]);

  useEffect(() => setDraft(value), [value]);

  const close = (restoreFocus = false) => {
    setOpen(false);
    setInvalidDraft(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openPicker = () => {
    setDraft(value);
    setOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const desiredWidth = Math.min(320, window.innerWidth - 24);
      const panelHeight = popupRef.current?.offsetHeight || 390;
      const fitsBelow = window.innerHeight - rect.bottom >= panelHeight + 12;
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - desiredWidth - 12)),
        top: fitsBelow ? rect.bottom + 6 : Math.max(12, rect.top - panelHeight - 6),
        width: desiredWidth,
      });
    }
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  function setPart(nextHour: string, nextMinute: string) {
    const next = `${nextHour}:${nextMinute}`;
    if (!withinBounds(next, min, max)) return;
    onChange(next);
    setDraft(next);
    setInvalidDraft(false);
  }

  function commitDraft() {
    const parsed = parseTypedTime(draft);
    if (!parsed || !withinBounds(parsed, min, max)) {
      setInvalidDraft(true);
      return false;
    }
    onChange(parsed);
    setDraft(parsed);
    setInvalidDraft(false);
    return true;
  }

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      {label && <label htmlFor={controlId} className="mb-1.5 block text-xs font-semibold tracking-tight text-surface-700">{label}</label>}
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? dialogId : undefined}
        aria-required={required || undefined}
        onClick={() => open ? close() : openPicker()}
        className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border bg-raised px-3.5 text-left text-xs font-medium outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-surface-900 ring-1 ring-surface-900" : "border-surface-200 hover:border-surface-300 focus:border-surface-900"
        }`}
      >
        <span className={value ? "text-surface-900" : "text-surface-400"}>{displayTime(value, locale) || placeholder || t("time_picker_placeholder")}</span>
        <Clock className="h-4 w-4 shrink-0 text-surface-400" />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          id={dialogId}
          role="dialog"
          aria-label={t("time_picker_dialog_label")}
          style={{ left: position.left, top: position.top, width: position.width }}
          className="fixed z-[9999] rounded-2xl border border-surface-200/80 bg-raised/95 p-4 shadow-modal backdrop-blur-xl"
        >
          <label className="mb-3 block">
            <span className="mb-1 block text-11 font-bold uppercase tracking-wider text-surface-500">{t("time_picker_type_label")}</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setInvalidDraft(false); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && commitDraft()) close(true);
              }}
              placeholder="09:00"
              aria-invalid={invalidDraft}
              className={`input ${invalidDraft ? "border-status-danger-border" : ""}`}
            />
            {invalidDraft && <span className="mt-1 block text-11 text-status-danger-content">{t("time_picker_invalid")}</span>}
          </label>

          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2.5">
            <div>
              <p className="mb-2 text-11 font-bold uppercase tracking-wider text-surface-400">{t("picker_hour")}</p>
              <div className="scrollbar-polished grid max-h-48 grid-cols-2 gap-1 overflow-y-auto pr-0.5">
                {HOURS.map((item) => {
                  const candidate = `${item}:${minute}`;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={!withinBounds(candidate, min, max)}
                      onClick={() => setPart(item, minute)}
                      className={`flex min-h-10 items-center justify-center rounded-lg px-1 text-xs font-semibold tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                        item === hour ? "bg-surface-900 text-content-inverted shadow-sm" : "text-surface-800 hover:bg-surface-50 hover:text-surface-900"
                      }`}
                    >
                      {displayTime(`${item}:00`, locale).replace(/:00(?=\s|$)/, "")}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="select-none pt-8 text-sm font-bold text-surface-300">:</div>
            <div>
              <p className="mb-2 text-11 font-bold uppercase tracking-wider text-surface-400">{t("picker_minute")}</p>
              <div className="scrollbar-polished grid max-h-48 grid-cols-2 gap-1 overflow-y-auto pr-0.5">
                {minutes.map((item) => {
                  const candidate = `${hour}:${item}`;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={!withinBounds(candidate, min, max)}
                      onClick={() => setPart(hour, item)}
                      className={`flex min-h-10 items-center justify-center rounded-lg text-xs font-semibold tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                        item === minute ? "bg-surface-900 text-content-inverted shadow-sm" : "text-surface-800 hover:bg-surface-50 hover:text-surface-900"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-surface-100 pt-3">
            <button
              type="button"
              onClick={() => { onChange(""); setDraft(""); close(true); }}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-surface-500 transition-colors hover:bg-status-danger-bg hover:text-status-danger-content"
            >
              <X className="h-3.5 w-3.5" />
              {t("picker_clear")}
            </button>
            <button
              type="button"
              onClick={() => { if (draft === "" || commitDraft()) close(true); }}
              className="min-h-10 rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold text-surface-800 shadow-sm transition hover:bg-surface-50"
            >
              {t("picker_done")}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
