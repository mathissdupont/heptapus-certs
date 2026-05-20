"use client";

import { Clock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
};

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function normalizeTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { hour: "09", minute: "00" };
  return { hour: match[1], minute: match[2] };
}

export default function TimeField({ value, onChange, label, placeholder = "Saat seçin", className = "" }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { hour, minute } = normalizeTime(value);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function setPart(nextHour: string, nextMinute: string) {
    onChange(`${nextHour}:${nextMinute}`);
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && <label className="label">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="input-field flex min-h-[3rem] items-center justify-between gap-3 text-left"
      >
        <span className={value ? "text-surface-900" : "text-surface-400"}>{value || placeholder}</span>
        <Clock className="h-4 w-4 shrink-0 text-surface-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-surface-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-surface-400">Saat</p>
              <div className="grid max-h-56 grid-cols-3 gap-1 overflow-y-auto pr-1 scrollbar-polished">
                {HOURS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPart(item, minute)}
                    className={`h-9 rounded-md text-sm font-semibold transition ${
                      item === hour ? "brand-bg text-white" : "text-surface-700 hover:bg-brand-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-8 text-lg font-bold text-surface-300">:</div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-surface-400">Dakika</p>
              <div className="grid gap-1">
                {MINUTES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPart(hour, item)}
                    className={`h-9 rounded-md text-sm font-semibold transition ${
                      item === minute ? "brand-bg text-white" : "text-surface-700 hover:bg-brand-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
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
              Temizle
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary min-h-9 px-3 py-1.5">
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
