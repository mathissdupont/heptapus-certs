import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import tailwindConfig from "../../tailwind.config";
import { createThemeInitializerScript } from "@/app/_theme-initializer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { I18nProvider } from "@/lib/i18n";
import {
  applyTheme,
  getEffectiveTheme,
  getStoredTheme,
  initializeTheme,
  setStoredTheme,
  watchSystemTheme,
} from "@/lib/theme";

type MediaListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(matches: boolean) {
  let listener: MediaListener | undefined;
  const media = {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: vi.fn((_event: string, nextListener: MediaListener) => {
      listener = nextListener;
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: vi.fn(() => media) });
  return { media, emit: (nextMatches: boolean) => listener?.({ matches: nextMatches } as MediaQueryListEvent) };
}

function cssBlock(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`))?.[1] ?? "";
}

describe("semantic theme roles", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
  const root = cssBlock(css, ":root");
  const dark = cssBlock(css, ".dark");
  const roles = [
    "--bg-canvas",
    "--bg-raised",
    "--bg-sunken",
    "--content-primary",
    "--content-muted",
    "--border-subtle",
    "--border-strong",
    "--accent",
    "--status-success-bg",
    "--status-warning-bg",
    "--status-danger-bg",
  ];

  it("defines every core role in light and redefines it under .dark", () => {
    for (const role of roles) {
      const lightValue = root.match(new RegExp(`${role}:\\s*([^;]+)`))?.[1];
      const darkValue = dark.match(new RegExp(`${role}:\\s*([^;]+)`))?.[1];
      expect(lightValue, `${role} light value`).toBeTruthy();
      expect(darkValue, `${role} dark value`).toBeTruthy();
      expect(darkValue).not.toBe(lightValue);
    }
  });

  it("maps the surface scale to opacity-aware semantic variables", () => {
    const colors = tailwindConfig.theme.extend.colors as Record<string, unknown>;
    const surface = colors.surface as Record<string, string>;
    expect(surface["50"]).toBe("rgb(var(--bg-canvas) / <alpha-value>)");
    expect(surface["200"]).toBe("rgb(var(--border-subtle) / <alpha-value>)");
    expect(surface["900"]).toBe("rgb(var(--content-primary) / <alpha-value>)");
  });

  it("keeps the white-label brand variable as the accent source", () => {
    expect(root).toContain("--site-brand-color: rgb(var(--accent))");
    expect(root).toContain("var(--site-brand-color) 6%");
    expect(dark).not.toContain("--site-brand-color:");
  });
});

describe("theme preference", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    installMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("honors a stored dark preference before paint", () => {
    localStorage.setItem("heptacert-theme", "dark");
    window.eval(createThemeInitializerScript(true));
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("uses the operating-system preference when no explicit theme is stored", () => {
    installMatchMedia(true);
    window.eval(createThemeInitializerScript(true));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("heptacert-theme")).toBeNull();
  });

  it("keeps the shipped UI light while the rollout flag is disabled", () => {
    localStorage.setItem("heptacert-theme", "dark");
    window.eval(createThemeInitializerScript(false));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem("heptacert-theme")).toBe("dark");
  });

  it("persists, resolves and watches theme choices", () => {
    const media = installMatchMedia(true);
    expect(getEffectiveTheme("system")).toBe("dark");
    setStoredTheme("light");
    expect(getStoredTheme()).toBe("light");
    expect(initializeTheme()).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");

    const onSystemChange = vi.fn();
    const stop = watchSystemTheme(onSystemChange);
    media.emit(false);
    expect(onSystemChange).toHaveBeenCalledWith("light");
    stop();

    applyTheme("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("keeps the working control hidden until the rollout flag is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_THEME_TOGGLE_ENABLED", "false");
    const hidden = render(<I18nProvider><ThemeToggle /></I18nProvider>);
    expect(hidden.container).toBeEmptyDOMElement();
    hidden.unmount();

    vi.stubEnv("NEXT_PUBLIC_THEME_TOGGLE_ENABLED", "true");
    localStorage.setItem("heptacert-lang", "en");
    render(<I18nProvider><ThemeToggle /></I18nProvider>);
    const button = await screen.findByRole("button", { name: "Select theme: System" });
    fireEvent.click(button);
    await waitFor(() => expect(localStorage.getItem("heptacert-theme")).toBe("light"));
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
