import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import CookieConsent from "@/components/CookieConsent/CookieConsent";
import { I18nProvider } from "@/lib/i18n";
import {
  announceFloatingWidgetOpen,
  onFloatingWidgetOpen,
} from "@/lib/floatingWidgets";

afterEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty("--heptacert-cookie-consent-height");
  vi.restoreAllMocks();
});

describe("admin floating overlay layout", () => {
  it("publishes and clears the live cookie-banner height", async () => {
    localStorage.setItem("heptacert-lang", "tr");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 1000,
      height: 132.2,
      top: 0,
      right: 1000,
      bottom: 132.2,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    render(<I18nProvider><CookieConsent /></I18nProvider>);
    await screen.findByRole("dialog");
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--heptacert-cookie-consent-height")).toBe("133px");
    });

    expect(screen.getByText(/Reklam veya ziyaretçi takibi yapmıyoruz/)).toBeInTheDocument();
    expect(screen.queryByText(/localStorage/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tamam" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.documentElement.style.getPropertyValue("--heptacert-cookie-consent-height")).toBe("0px");
    });
  });

  it("renders the notice in the selected application language", async () => {
    localStorage.setItem("heptacert-lang", "de");
    render(<I18nProvider><CookieConsent /></I18nProvider>);
    expect(await screen.findByRole("dialog", { name: "Hinweis zur erforderlichen Datennutzung" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verstanden" })).toBeInTheDocument();
  });

  it("broadcasts which mutually exclusive floating widget opened", () => {
    const listener = vi.fn();
    const unsubscribe = onFloatingWidgetOpen(listener);
    announceFloatingWidgetOpen("assistant");
    announceFloatingWidgetOpen("tour");
    unsubscribe();
    announceFloatingWidgetOpen("assistant");
    expect(listener.mock.calls).toEqual([["assistant"], ["tour"]]);
  });

  it("keeps the mobile nav, launchers and panels on the shared cookie safe area", () => {
    const cssPath = resolve(process.cwd(), "src/app/globals.css");
    const css = readFileSync(cssPath, "utf8");
    const assistant = readFileSync(resolve(process.cwd(), "src/components/Admin/AIAssistant.tsx"), "utf8");
    const tour = readFileSync(resolve(process.cwd(), "src/components/Admin/InAppTourGuide.tsx"), "utf8");
    expect(css).toContain("--heptacert-cookie-consent-height: 0px");
    expect(css).toContain("bottom: calc(var(--heptacert-cookie-consent-height) + 0.75rem)");
    expect(css).toContain(".admin-floating-assistant-launcher { right: 1.25rem; }");
    expect(css).toContain(".admin-floating-tour-launcher { right: 5.25rem; }");
    expect(css).toContain(".admin-floating-tour-panel");
    expect(assistant).toContain("admin-floating-assistant-launcher");
    expect(assistant).toContain('announceFloatingWidgetOpen("assistant")');
    expect(tour).toContain("admin-floating-tour-launcher");
    expect(tour).toContain('announceFloatingWidgetOpen("tour")');
  });
});
