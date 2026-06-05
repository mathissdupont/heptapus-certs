"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mail, ChevronDown } from "lucide-react";
import {
  listEventEmailTemplates,
  listSystemEmailTemplates,
  type EmailTemplate,
} from "@/lib/api";

type Props = {
  eventId?: number;
  value?: number | null;
  onChange: (templateId: number | null) => void;
  label: string;
  placeholder: string;
  emptyText: string;
  helperText?: string;
  disabled?: boolean;
};

export default function EmailTemplateSelect({
  eventId,
  value,
  onChange,
  label,
  placeholder,
  emptyText,
  helperText,
  disabled = false,
}: Props) {
  const [eventTemplates, setEventTemplates] = useState<EmailTemplate[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      eventId ? listEventEmailTemplates(eventId).catch(() => []) : Promise.resolve([]),
      listSystemEmailTemplates().catch(() => []),
    ])
      .then(([eventRows, systemRows]) => {
        if (!active) return;
        setEventTemplates(eventRows);
        setSystemTemplates(systemRows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  const selected = useMemo(
    () => [...eventTemplates, ...systemTemplates].find((template) => template.id === value) || null,
    [eventTemplates, systemTemplates, value],
  );

  return (
    <div className="grid gap-1.5 w-full antialiased">
      {/* Üst Başlık */}
      <span className="block text-xs font-semibold text-surface-700 tracking-tight">
        {label}
      </span>
      
      {/* Seçim Alanı Kapsayıcısı */}
      <div className="relative flex items-center">
        {/* Sol İkon */}
        <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-surface-400 stroke-[1.8]" />
        
        {/* Native Select - Apple Çizgisinde Giydirilmiş */}
        <select
          value={value || ""}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
          className="w-full min-h-[42px] appearance-none rounded-xl border border-surface-200 bg-white pl-10 pr-10 text-xs font-medium text-surface-900 transition-all outline-none hover:border-gray-300 focus:border-surface-900 focus:ring-1 focus:ring-surface-900 disabled:bg-surface-50/50 disabled:opacity-50"
          disabled={disabled || loading}
        >
          <option value="" className="text-surface-400">
            {loading ? "Yükleniyor..." : placeholder}
          </option>
          
          {eventTemplates.length > 0 && (
            <optgroup label={eventId ? "Etkinlik Şablonları" : "Event Templates"} className="font-semibold text-surface-500 bg-white">
              {eventTemplates.map((template) => (
                <option key={template.id} value={template.id} className="text-surface-900 font-medium py-1">
                  {template.name} — {template.subject_tr || template.subject_en}
                </option>
              ))}
            </optgroup>
          )}
          
          {systemTemplates.length > 0 && (
            <optgroup label={eventId ? "Sistem Şablonları" : "System Templates"} className="font-semibold text-surface-500 bg-white">
              {systemTemplates.map((template) => (
                <option key={template.id} value={template.id} className="text-surface-900 font-medium py-1">
                  {template.name} — {template.subject_tr || template.subject_en}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        
        {/* Sağ Durum / Ok İkonu */}
        <div className="pointer-events-none absolute right-3.5 flex items-center justify-center">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-surface-400 stroke-[2.5]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-surface-400 stroke-[2]" />
          )}
        </div>
      </div>
      
      {/* Alt Bilgi & Yardımcı Metin */}
      <div className="px-0.5">
        {selected ? (
          <p className="text-11 leading-relaxed text-surface-500 tracking-normal font-medium">
            <span className="text-surface-400 font-semibold">Konu:</span> {selected.subject_tr || selected.subject_en}
          </p>
        ) : (
          <p className="text-11 leading-relaxed text-surface-400 tracking-normal">
            {helperText || emptyText}
          </p>
        )}
      </div>
    </div>
  );
}