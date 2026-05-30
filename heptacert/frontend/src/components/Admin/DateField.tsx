"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  locale?: string;
  className?: string;
};

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDay(a: Date, b: Date | null) {
  return Boolean(b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
}

export default function DateField({ value, onChange, label, placeholder = "Select date", locale = "tr-TR", className = "" }: DateFieldProps) {
  const selectedDate = parseDate(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date());
  const [position, setPosition] = useState({ left: 0, top: 0, width: 352 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedDate) setVisibleMonth(selectedDate);
  }, [value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const desiredWidth = Math.min(352, window.innerWidth - 24);
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - desiredWidth - 12)),
        top: Math.min(rect.bottom + 8, window.innerHeight - 420),
        width: desiredWidth,
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const weeks = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const start = new Date(first);
    const mondayOffset = (first.getDay() + 6) % 7;
    start.setDate(first.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const formattedValue = selectedDate
    ? selectedDate.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
    : "";
  const monthLabel = visibleMonth.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 1 + index);
    return date.toLocaleDateString(locale, { weekday: "short" });
  });

  function moveMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && <label className="label">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="input-field flex min-h-[3rem] items-center justify-between gap-3 text-left"
      >
        <span className={formattedValue ? "text-surface-900" : "text-surface-400"}>
          {formattedValue || placeholder}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-surface-400" />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          style={{ left: position.left, top: position.top, width: position.width }}
          className="fixed z-[9999] rounded-lg border border-surface-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)]"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" onClick={() => moveMonth(-1)} className="btn-ghost h-9 w-9 p-0" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold capitalize text-surface-900">{monthLabel}</p>
            <button type="button" onClick={() => moveMonth(1)} className="btn-ghost h-9 w-9 p-0" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-surface-400">
            {weekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {weeks.map((date) => {
              const inMonth = date.getMonth() === visibleMonth.getMonth();
              const active = sameDay(date, selectedDate);
              const today = sameDay(date, new Date());
              return (
                <button
                  key={toValue(date)}
                  type="button"
                  onClick={() => {
                    onChange(toValue(date));
                    setOpen(false);
                  }}
                  className={[
                    "flex h-9 items-center justify-center rounded-md text-sm font-semibold transition",
                    inMonth ? "text-surface-700 hover:bg-brand-50" : "text-surface-300 hover:bg-surface-50",
                    today ? "ring-1 ring-surface-300" : "",
                    active ? "brand-bg text-white hover:brightness-95" : "",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-surface-100 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="btn-ghost text-surface-500"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(toValue(new Date()));
                setOpen(false);
              }}
              className="btn-secondary min-h-9 px-3 py-1.5"
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
