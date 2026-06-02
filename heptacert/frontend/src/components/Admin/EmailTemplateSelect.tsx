"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail } from "lucide-react";
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
    <label className="grid gap-1.5">
      <span className="text-xs font-bold text-surface-600">{label}</span>
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <select
          value={value || ""}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
          className="input-field pl-9"
          disabled={disabled || loading}
        >
          <option value="">{loading ? "Loading..." : placeholder}</option>
          {eventTemplates.length > 0 && (
            <optgroup label="Event templates">
              {eventTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.subject_tr || template.subject_en}
                </option>
              ))}
            </optgroup>
          )}
          {systemTemplates.length > 0 && (
            <optgroup label="System templates">
              {systemTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.subject_tr || template.subject_en}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-surface-400" />}
      </div>
      {selected ? (
        <p className="text-[11px] leading-4 text-surface-500">
          {selected.subject_tr || selected.subject_en}
        </p>
      ) : (
        <p className="text-[11px] leading-4 text-surface-500">{helperText || emptyText}</p>
      )}
    </label>
  );
}
