"use client";

import { Clock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [position, setPosition] = useState({ left: 0, top: 0, width: 300 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const { hour, minute } = normalizeTime(value);

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
      const desiredWidth = Math.min(300, window.innerWidth - 24);
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - desiredWidth - 12)),
        top: Math.min(rect.bottom + 6, window.innerHeight - 340),
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

  function setPart(nextHour: string, nextMinute: string) {
    onChange(`${nextHour}:${nextMinute}`);
  }

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 tracking-tight mb-1.5">
          {label}
        </label>
      )}
      
      {/* Ana Tetikleyici İnput Butonu */}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full min-h-[42px] items-center justify-between gap-3 rounded-xl border px-3.5 text-xs font-medium transition-all outline-none bg-white text-left ${
          open 
            ? "border-gray-900 ring-1 ring-gray-950" 
            : "border-gray-200 hover:border-gray-300 focus:border-gray-900"
        }`}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <Clock className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {/* Portal Saat Seçim Paneli */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          style={{ left: position.left, top: position.top, width: position.width }}
          className="fixed z-[9999] rounded-2xl border border-gray-200/80 bg-white/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.06)] backdrop-blur-xl animate-in fade-in zoom-in-98 duration-100"
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2.5">
            {/* Saat Sütunu */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Saat</p>
              <div className="grid max-h-48 grid-cols-3 gap-1 overflow-y-auto pr-0.5 scrollbar-none">
                {HOURS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPart(item, minute)}
                    className={`flex h-8 items-center justify-center rounded-lg text-xs font-semibold tracking-tight transition-all ${
                      item === hour 
                        ? "bg-gray-950 text-white shadow-sm" 
                        : "text-gray-800 hover:bg-gray-50 hover:text-gray-950"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* İki Nokta Ayıracı */}
            <div className="pt-7 text-sm font-bold text-gray-300 select-none">:</div>

            {/* Dakika Sütunu */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Dakika</p>
              <div className="grid gap-1">
                {MINUTES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPart(hour, item)}
                    className={`flex h-8 items-center justify-center rounded-lg text-xs font-semibold tracking-tight transition-all ${
                      item === minute 
                        ? "bg-gray-950 text-white shadow-sm" 
                        : "text-gray-800 hover:bg-gray-50 hover:text-gray-950"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Alt Kontrol Butonları */}
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
              Temizle
            </button>
            <button 
              type="button" 
              onClick={() => setOpen(false)} 
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 hover:text-gray-950 active:scale-95"
            >
              Tamam
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}