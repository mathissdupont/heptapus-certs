import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClientShell } from "@/app/_client-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/events",
}));

describe("public client shell localization", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("heptacert-lang", "de");
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    })));
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders navigation and menu controls in German instead of English fallbacks", async () => {
    render(<ClientShell><main>Inhalt</main></ClientShell>);

    expect(await screen.findByRole("link", { name: "Veranstaltungen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Organisationen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entdecken" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preise" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menü öffnen" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Events" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Organizations" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Hub" })).not.toBeInTheDocument();
  });
});
