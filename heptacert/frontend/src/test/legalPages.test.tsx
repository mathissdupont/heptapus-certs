import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PrivacyPage from "@/app/gizlilik/page";
import TermsPage from "@/app/kullanim-kosullari/page";
import KvkkPage from "@/app/kvkk/page";
import { I18nProvider, type Lang } from "@/lib/i18n";

function mount(Page: () => JSX.Element, lang: Lang) {
  localStorage.setItem("heptacert-lang", lang);
  render(<I18nProvider><Page /></I18nProvider>);
}

describe("legal pages name the operator and cover AI assistant use", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it.each([
    ["tr", "1. Veri Sorumlusu", "11. Yapay Zekâ Asistanı Entegrasyonları (ChatGPT Eklentisi ve MCP)", "17. Çocuklar"],
    ["en", "1. Data Controller", "11. AI Assistant Integrations (ChatGPT Plugin and MCP)", "17. Children"],
  ] as const)("renders the privacy policy additions in %s", async (lang, controller, ai, children) => {
    mount(PrivacyPage, lang);
    expect(await screen.findByRole("heading", { name: controller })).toBeInTheDocument();
    const aiHeading = screen.getByRole("heading", { name: ai });
    expect(aiHeading.parentElement?.querySelectorAll("li")).toHaveLength(6);
    expect(screen.getByRole("heading", { name: children })).toBeInTheDocument();
    expect(screen.getAllByText(/Samet Ünsal/).length).toBeGreaterThan(0);
  });

  it.each([
    ["tr", "11.b Yapay Zekâ Asistanları ile Kullanım"],
    ["en", "11.b Use with AI Assistants"],
  ] as const)("renders the AI use terms and operator in %s", async (lang, heading) => {
    mount(TermsPage, lang);
    const section = (await screen.findByRole("heading", { name: heading })).parentElement;
    expect(section?.querySelectorAll("li")).toHaveLength(6);
    expect(screen.getAllByText(/Samet Ünsal/).length).toBeGreaterThan(0);
  });

  it("names the operator and AI transfers in the KVKK notice", async () => {
    mount(KvkkPage, "tr");
    expect(await screen.findByRole("heading", { name: "6.a Yapay Zekâ Asistanlarına Aktarım" })).toBeInTheDocument();
    expect(screen.getAllByText(/Samet Ünsal/).length).toBeGreaterThan(0);
  });
});
