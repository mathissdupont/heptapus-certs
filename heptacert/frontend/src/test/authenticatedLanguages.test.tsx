import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { I18nProvider, LanguageToggle, translate, useI18n } from "@/lib/i18n";


function LanguageProbe() {
  const { lang, t } = useI18n();
  return (
    <>
      <LanguageToggle />
      <span data-testid="active-language">{lang}</span>
      <span data-testid="translated-copy">{t("nav_pricing")}</span>
      <span data-testid="translated-admin-copy">{t("admin_nav_settings")}</span>
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

  it("translates outside React and replaces named placeholders", () => {
    expect(translate("en", "admin_assistant_response_error", { error: "Offline" }))
      .toBe("I could not prepare a response right now: Offline.");
  });

  it("restores a third language and exposes all nine catalog options", async () => {
    localStorage.setItem("heptacert-lang", "de");
    render(<I18nProvider><LanguageProbe /></I18nProvider>);

    const trigger = await screen.findByRole("button", { name: "Sprache auswählen: Deutsch" });
    fireEvent.click(trigger);
    const listbox = screen.getByRole("listbox", { name: "Sprache auswählen" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(9);
    expect(within(listbox).getByRole("option", { selected: true })).toHaveTextContent("Deutsch");
    expect(screen.getByTestId("active-language")).toHaveTextContent("de");
    expect(screen.getByTestId("translated-copy")).toHaveTextContent("Preise");
    expect(screen.getByTestId("translated-admin-copy")).toHaveTextContent("Einstellungen");
  });

  it("supports keyboard selection and closes on Escape", async () => {
    render(<I18nProvider><LanguageProbe /></I18nProvider>);

    const trigger = screen.getByRole("button", { expanded: false });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(listbox, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "End" });
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("active-language")).toHaveTextContent("ru"));
  });

  it("persists a newly selected language and uses its catalog", async () => {
    render(<I18nProvider><LanguageProbe /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("option", { name: /Русский/ }));

    await waitFor(() => expect(screen.getByTestId("active-language")).toHaveTextContent("ru"));
    expect(screen.getByTestId("translated-copy")).toHaveTextContent("Цены");
    expect(localStorage.getItem("heptacert-lang")).toBe("ru");
  });
});
