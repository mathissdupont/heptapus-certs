import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import sitemap from "@/app/sitemap";
import LandingPageClient from "@/components/landing/LandingPageClient";
import { locales } from "@/i18n/routing";
import { de } from "@/locales/de";
import { en } from "@/locales/en";
import { es } from "@/locales/es";
import { fr } from "@/locales/fr";
import { it as italian } from "@/locales/it";
import { nl } from "@/locales/nl";
import { pt } from "@/locales/pt";
import { ru } from "@/locales/ru";
import { tr } from "@/locales/tr";

const messages = { tr, en, de, fr, es, it: italian, pt, nl, ru };

describe("localized landing", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ active_members: 12, hosted_events: 8, issued_certificates: 40 }) }));
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders native landing copy for all nine advertised locales", () => {
    for (const locale of locales) {
      const view = render(
        <NextIntlClientProvider locale={locale} messages={messages[locale]}>
          <LandingPageClient />
        </NextIntlClientProvider>,
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages[locale].home_title_default);
      expect(view.container.querySelector(`[data-locale="${locale}"]`)).toBeInTheDocument();
      view.unmount();
    }
  });

  it("keeps transactional and not-yet-migrated routes unprefixed", () => {
    render(
      <NextIntlClientProvider locale="de" messages={de}>
        <LandingPageClient />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByRole("link", { name: de.home_primary_cta })[0]).toHaveAttribute("href", "/register?mode=organizer");
    expect(screen.getAllByRole("link", { name: de.home_secondary_cta })[0]).toHaveAttribute("href", "/pricing");
  });

  it("publishes a canonical sitemap entry and every language alternate for each locale", async () => {
    const entries = await sitemap();
    const landingEntries = entries.filter((entry) => locales.some((locale) => entry.url.endsWith(`/${locale}`)));

    expect(landingEntries).toHaveLength(locales.length);
    for (const locale of locales) {
      const entry = landingEntries.find((candidate) => candidate.url.endsWith(`/${locale}`));
      expect(entry?.alternates?.languages).toEqual(
        expect.objectContaining({
          [locale]: `https://heptacert.com/${locale}`,
          "x-default": "https://heptacert.com/tr",
        }),
      );
      expect(Object.keys(entry?.alternates?.languages ?? {})).toHaveLength(locales.length + 1);
    }
  });
});
