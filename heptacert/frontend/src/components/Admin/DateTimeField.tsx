"use client";

import DateField from "./DateField";
import TimeField from "./TimeField";

type DateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  dateLabel?: string;
  timeLabel?: string;
  disabled?: boolean;
  locale?: string;
  className?: string;
};

function splitDateTime(value: string) {
  const [date = "", rawTime = ""] = value.split("T");
  return { date, time: rawTime.slice(0, 5) };
}

function joinDateTime(date: string, time: string) {
  if (!date && !time) return "";
  return `${date || new Date().toISOString().slice(0, 10)}T${time || "09:00"}`;
}

export default function DateTimeField({
  value,
  onChange,
  label,
  dateLabel = "Tarih",
  timeLabel = "Saat",
  disabled = false,
  locale = "tr-TR",
  className = "",
}: DateTimeFieldProps) {
  const { date, time } = splitDateTime(value);

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
          onChange={(nextDate) => onChange(joinDateTime(nextDate, time))}
          label={dateLabel}
          placeholder={locale.startsWith("tr") ? "Tarih seçin" : "Select date"}
          locale={locale}
        />
        <TimeField
          value={time}
          onChange={(nextTime) => onChange(joinDateTime(date, nextTime))}
          label={timeLabel}
          placeholder={locale.startsWith("tr") ? "Saat seçin" : "Select time"}
        />
      </div>
    </fieldset>
  );
}