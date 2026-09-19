import { describe, expect, it } from "vitest";

import { routing } from "@/i18n/routing";
import { localeTag } from "@/lib/localeTag";

describe("localeTag", () => {
  it("maps every routed locale to a regional formatting tag", () => {
    for (const locale of routing.locales) {
      const tag = localeTag(locale);
      expect(tag, `add a tag for "${locale}" in src/lib/localeTag.ts`).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(Intl.DateTimeFormat.supportedLocalesOf([tag])).toEqual([tag]);
    }
  });

  it("keeps the two original mappings", () => {
    expect(localeTag("tr")).toBe("tr-TR");
    expect(localeTag("en")).toBe("en-US");
  });

  it("falls back to Turkish when no language is known", () => {
    expect(localeTag(undefined)).toBe("tr-TR");
    expect(localeTag("")).toBe("tr-TR");
  });

  it("passes region tags and unknown codes through to Intl", () => {
    expect(localeTag("en-GB")).toBe("en-GB");
    expect(localeTag("sv")).toBe("sv");
  });

  it("formats dates in the active language rather than a fixed one", () => {
    const date = new Date(Date.UTC(2026, 8, 19, 12));
    const german = date.toLocaleDateString(localeTag("de"), { month: "long", timeZone: "UTC" });
    const russian = date.toLocaleDateString(localeTag("ru"), { month: "long", timeZone: "UTC" });
    expect(german).toBe("September");
    expect(russian).toBe("сентябрь");
  });
});
