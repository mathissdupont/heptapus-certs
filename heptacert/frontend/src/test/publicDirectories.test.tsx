import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import sitemap from "@/app/sitemap";
import PublicEventsPage from "@/components/public/PublicEventsPage";
import PublicOrganizationsPage from "@/components/public/PublicOrganizationsPage";
import DiscoveryPage from "@/components/public/DiscoveryPage";
import { locales } from "@/i18n/routing";
import { tr } from "@/locales/tr";
import { en } from "@/locales/en";
import { de } from "@/locales/de";
import { fr } from "@/locales/fr";
import { es } from "@/locales/es";
import { it as italian } from "@/locales/it";
import { pt } from "@/locales/pt";
import { nl } from "@/locales/nl";
import { ru } from "@/locales/ru";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/lib/whiteLabel", () => ({
  fetchCurrentBranding: () => Promise.resolve(null),
  isWhiteLabelBranding: () => false,
}));
vi.mock("@/lib/api", () => ({
  listPublicEvents: () => Promise.resolve([]),
  listPublicOrganizations: () => Promise.resolve([]),
  listPublicFeed: () => Promise.resolve([]),
  getPublicMemberToken: () => null,
  getPublicMemberMe: () => Promise.resolve(null),
  likeCommunityPost: () => Promise.resolve(),
  unlikeCommunityPost: () => Promise.resolve(),
}));

const messages = { tr, en, de, fr, es, it: italian, pt, nl, ru };

afterEach(() => {
  cleanup();
});

describe("localized public directories", () => {
  it("renders events, communities and hub titles in every advertised language", () => {
    const pages = [
      [PublicEventsPage, "public_events_title"],
      [PublicOrganizationsPage, "public_orgs_title"],
      [DiscoveryPage, "public_hub_title"],
    ] as const;

    for (const locale of locales) {
      for (const [Page, key] of pages) {
        const view = render(
          <NextIntlClientProvider locale={locale} messages={messages[locale]}>
            <Page />
          </NextIntlClientProvider>,
        );
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages[locale][key]);
        view.unmount();
      }
    }
  });

  it("publishes all localized directory URLs and hreflang alternates", async () => {
    const entries = await sitemap();
    for (const path of ["events", "organizations", "discover"]) {
      expect(entries.filter((entry) => new RegExp(`/(tr|en|de|fr|es|it|pt|nl|ru)/${path}$`).test(entry.url))).toHaveLength(locales.length);
      const german = entries.find((entry) => entry.url.endsWith(`/de/${path}`));
      expect(german?.alternates?.languages).toEqual(expect.objectContaining({
        de: `https://heptacert.com/de/${path}`,
        "x-default": `https://heptacert.com/tr/${path}`,
      }));
    }
  });
});
