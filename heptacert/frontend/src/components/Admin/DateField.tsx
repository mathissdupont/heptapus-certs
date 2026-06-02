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

export default function DateField({ value, onChange, label, placeholder = "Tarih seçin", locale = "tr-TR", className = "" }: DateFieldProps) {
  const selectedDate = parseDate(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date());
  const [position, setPosition] = useState({ left: 0, top: 0, width: 340 });
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
      const desiredWidth = Math.min(340, window.innerWidth - 24);
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - desiredWidth - 12)),
        top: Math.min(rect.bottom + 6, window.innerHeight - 390),
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
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 tracking-tight mb-1.5">
          {label}
        </label>
      )}
      
      {/* Tetikleyici İnput Butonu */}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full min-h-[42px] items-center justify-between gap-3 rounded-xl border px-3.5 text-xs font-medium transition-all outline-none bg-white text-left ${
          open 
            ? "border-gray-900 ring-1 ring-gray-950" 
            : "border-gray-200 hover:border-gray-300 focus:border-gray-900"
        }`}
      >
        <span className={formattedValue ? "text-gray-900" : "text-gray-400"}>
          {formattedValue || placeholder}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {/* Takvim Açılır Penceresi (Portal) */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          style={{ left: position.left, top: position.top, width: position.width }}
          className="fixed z-[9999] rounded-2xl border border-gray-200/80 bg-white/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.06)] backdrop-blur-xl animate-in fade-in zoom-in-98 duration-100"
        >
          {/* Ay & Yıl Navigasyonu */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <button 
              type="button" 
              onClick={() => moveMonth(-1)} 
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-xs font-bold capitalize text-gray-900 tracking-tight">{monthLabel}</p>
            <button 
              type="button" 
              onClick={() => moveMonth(1)} 
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Gün Başlıkları */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-gray-400 tracking-wider">
            {weekdayLabels.map((weekday) => (
              <span key={weekday} className="w-full block">{weekday}</span>
            ))}
          </div>

          {/* Gün Matrisi */}
          <div className="mt-2 grid grid-cols-7 gap-1">
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
                  className={`flex h-8 w-8 mx-auto items-center justify-center rounded-full text-xs font-semibold tracking-tight transition-all ${
                    active
                      ? "bg-gray-950 text-white shadow-sm"
                      : today
                        ? "bg-gray-100 text-gray-900 ring-1 ring-gray-200/60"
                        : inMonth
                          ? "text-gray-800 hover:bg-gray-50 hover:text-gray-950"
                          : "text-gray-300 hover:bg-gray-50/50"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Alt Hızlı Butonlar */}
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              {locale.startsWith("tr") ? "Temizle" : "Clear"}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(toValue(new Date()));
                setOpen(false);
              }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 hover:text-gray-950 active:scale-95"
            >
              {locale.startsWith("tr") ? "Bugün" : "Today"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}