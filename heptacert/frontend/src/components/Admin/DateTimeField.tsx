"use client";

import DateField from "./DateField";
import TimeField from "./TimeField";
import { toDateValue } from "./DateField";
import { useI18n } from "@/lib/i18n";
import { localeTag } from "@/lib/localeTag";

type DateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  dateLabel?: string;
  timeLabel?: string;
  disabled?: boolean;
  locale?: string;
  min?: string;
  max?: string;
  minuteStep?: number;
  required?: boolean;
  className?: string;
};

export function splitDateTime(value: string) {
  const [date = "", rawTime = ""] = value.split("T");
  return { date, time: rawTime.slice(0, 5) };
}

export function joinDateTime(date: string, time: string) {
  if (!date && !time) return "";
  return `${date || toDateValue(new Date())}T${time || "09:00"}`;
}

function clampTime(date: string, time: string, minDate: string, minTime: string, maxDate: string, maxTime: string) {
  let next = time || "09:00";
  if (date === minDate && minTime && next < minTime) next = minTime;
  if (date === maxDate && maxTime && next > maxTime) next = maxTime;
  return next;
}

export default function DateTimeField({
  value,
  onChange,
  label,
  dateLabel,
  timeLabel,
  disabled = false,
  locale: localeProp,
  min,
  max,
  minuteStep,
  required = false,
  className = "",
}: DateTimeFieldProps) {
  const { lang, t } = useI18n();
  const locale = localeProp ?? localeTag(lang);
  const { date, time } = splitDateTime(value);
  const minParts = splitDateTime(min ?? "");
  const maxParts = splitDateTime(max ?? "");
  const timeMin = date && date === minParts.date ? minParts.time : undefined;
  const timeMax = date && date === maxParts.date ? maxParts.time : undefined;
  const fallbackDate = (() => {
    let next = toDateValue(new Date());
    if (minParts.date && next < minParts.date) next = minParts.date;
    if (maxParts.date && next > maxParts.date) next = maxParts.date;
    return next;
  })();

  return (
    <fieldset 
      disabled={disabled} 
      className={`min-w-0 border-0 p-0 m-0 transition-opacity duration-200 disabled:opacity-50 antialiased ${className}`}
    >
      {label && (
        <legend className="block text-xs font-semibold text-surface-900 tracking-tight mb-2.5">
          {label}
        </legend>
      )}
      
      {/* Mobil uyumlu, esnek ve tam orantılı Apple Izgara Düzeni */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <DateField
          value={date}
          onChange={(nextDate) => {
            if (!nextDate) return onChange("");
            onChange(joinDateTime(nextDate, clampTime(nextDate, time, minParts.date, minParts.time, maxParts.date, maxParts.time)));
          }}
          label={dateLabel ?? t("date_picker_date_label")}
          placeholder={t("date_picker_placeholder")}
          locale={locale}
          min={minParts.date || undefined}
          max={maxParts.date || undefined}
          required={required}
        />
        <TimeField
          value={time}
          onChange={(nextTime) => {
            if (!nextTime) return onChange("");
            const nextDate = date || fallbackDate;
            onChange(joinDateTime(nextDate, clampTime(nextDate, nextTime, minParts.date, minParts.time, maxParts.date, maxParts.time)));
          }}
          label={timeLabel ?? t("date_picker_time_label")}
          placeholder={t("time_picker_placeholder")}
          locale={locale}
          min={timeMin}
          max={timeMax}
          minuteStep={minuteStep}
          required={required}
        />
      </div>
    </fieldset>
  );
}
