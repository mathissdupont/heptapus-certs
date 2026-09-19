import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { I18nProvider, LanguageToggle, useI18n } from "@/lib/i18n";


function LanguageProbe() {
  const { lang, t } = useI18n();
  return (
    <>
      <LanguageToggle />
      <span data-testid="active-language">{lang}</span>
      <span data-testid="translated-copy">{t("nav_pricing")}</span>
    </>
  );
}

describe("authenticated language selection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("restores a third language and exposes all nine catalog options", async () => {
    localStorage.setItem("heptacert-lang", "de");
    render(<I18nProvider><LanguageProbe /></I18nProvider>);

    const select = await screen.findByRole("combobox", { name: "Sprache auswählen" });
    expect(select.querySelectorAll("option")).toHaveLength(9);
    expect(screen.getByTestId("active-language")).toHaveTextContent("de");
    expect(screen.getByTestId("translated-copy")).toHaveTextContent("Preise");
  });

  it("persists a newly selected language and uses its catalog", async () => {
    render(<I18nProvider><LanguageProbe /></I18nProvider>);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ru" } });

    await waitFor(() => expect(screen.getByTestId("active-language")).toHaveTextContent("ru"));
    expect(screen.getByTestId("translated-copy")).toHaveTextContent("Цены");
    expect(localStorage.getItem("heptacert-lang")).toBe("ru");
  });
});
