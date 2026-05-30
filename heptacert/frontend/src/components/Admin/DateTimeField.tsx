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
    <fieldset disabled={disabled} className={`min-w-0 disabled:opacity-60 ${className}`}>
      {label && <legend className="label mb-1.5">{label}</legend>}
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <DateField
          value={date}
          onChange={(nextDate) => onChange(joinDateTime(nextDate, time))}
          label={dateLabel}
          placeholder="Tarih seçin"
          locale={locale}
        />
        <TimeField
          value={time}
          onChange={(nextTime) => onChange(joinDateTime(date, nextTime))}
          label={timeLabel}
          placeholder="Saat seçin"
        />
      </div>
    </fieldset>
  );
}
