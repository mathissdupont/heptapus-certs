import { de, enUS, es, fr, it, nl, pt, ru, tr } from "react-day-picker/locale";

import type { Lang } from "@/lib/i18n";

const CALENDAR_LOCALES = { tr, en: enUS, de, fr, es, it, pt, nl, ru } as const;

export function calendarLocale(locale: Lang | string) {
  const primary = locale.toLowerCase().replace("_", "-").split("-", 1)[0] as Lang;
  return CALENDAR_LOCALES[primary] ?? enUS;
}
