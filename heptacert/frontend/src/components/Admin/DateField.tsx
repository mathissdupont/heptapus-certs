"use client";

import { CalendarDays, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";

import { calendarLocale } from "@/lib/calendarLocale";
import { useI18n } from "@/lib/i18n";
import { localeTag } from "@/lib/localeTag";

export type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  locale?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export function parseDateValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) return null;
  return date;
}

export function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DateField({
  value,
  onChange,
  label,
  placeholder,
  locale: localeProp,
  min,
  max,
  disabled = false,
  required = false,
  className = "",
}: DateFieldProps) {
  const { lang, t } = useI18n();
  const locale = localeProp ?? localeTag(lang);
  const selectedDate = parseDateValue(value);
  const minDate = parseDateValue(min ?? "");
  const maxDate = parseDateValue(max ?? "");
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? minDate ?? new Date());
  const [position, setPosition] = useState({ left: 0, top: 0, width: 340 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const controlId = useId();
  const dialogId = `${controlId}-calendar`;

  useEffect(() => {
    if (selectedDate) setVisibleMonth(selectedDate);
  }, [value]);

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
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
      const desiredWidth = Math.min(340, window.innerWidth - 24);
      const panelHeight = popupRef.current?.offsetHeight || 430;
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

  const formattedValue = selectedDate
    ? selectedDate.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
    : "";
  const disabledMatchers = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];
  const todayValue = toDateValue(new Date());
  const todayDisabled = Boolean((min && todayValue < min) || (max && todayValue > max));

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
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border bg-raised px-3.5 text-left text-xs font-medium outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-surface-900 ring-1 ring-surface-900" : "border-surface-200 hover:border-surface-300 focus:border-surface-900"
        }`}
      >
        <span className={formattedValue ? "text-surface-900" : "text-surface-400"}>{formattedValue || placeholder || t("date_picker_placeholder")}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-surface-400" />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          id={dialogId}
          role="dialog"
          aria-label={t("date_picker_dialog_label")}
          style={{ left: position.left, top: position.top, width: position.width }}
          className="fixed z-[9999] rounded-2xl border border-surface-200/80 bg-raised/95 p-3 shadow-modal backdrop-blur-xl"
        >
          <DayPicker
            mode="single"
            className="date-picker"
            locale={calendarLocale(locale)}
            lang={lang}
            selected={selectedDate ?? undefined}
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            onSelect={(date) => {
              if (!date) return;
              onChange(toDateValue(date));
              close(true);
            }}
            disabled={disabledMatchers}
            startMonth={minDate ?? undefined}
            endMonth={maxDate ?? undefined}
            showOutsideDays
            autoFocus
            navLayout="around"
          />
          <div className="mt-2 flex items-center justify-between border-t border-surface-100 pt-3">
            <button
              type="button"
              onClick={() => { onChange(""); close(true); }}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-surface-500 transition-colors hover:bg-status-danger-bg hover:text-status-danger-content"
            >
              <X className="h-3.5 w-3.5" />
              {t("picker_clear")}
            </button>
            <button
              type="button"
              disabled={todayDisabled}
              onClick={() => { onChange(todayValue); close(true); }}
              className="min-h-10 rounded-xl border border-surface-200 bg-raised px-3 text-xs font-semibold text-surface-800 shadow-sm transition hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("picker_today")}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
