import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccreditationPage from "@/app/admin/accreditation/page";
import { I18nProvider, translate, type Lang } from "@/lib/i18n";
import {
  listAccreditationBodies, listOrgAccreditations, getOrgCpdSummary,
} from "@/lib/api";

vi.mock("@/lib/api", () => ({
  listAccreditationBodies: vi.fn(), listOrgAccreditations: vi.fn(),
  getOrgCpdSummary: vi.fn(), createOrgAccreditation: vi.fn(),
  updateOrgAccreditation: vi.fn(), deleteOrgAccreditation: vi.fn(),
}));

describe("accreditation language coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(listAccreditationBodies).mockResolvedValue([
      { id: 1, name: "Review Body", short_code: "QA", logo_url: null },
    ]);
    vi.mocked(listOrgAccreditations).mockResolvedValue([]);
    vi.mocked(getOrgCpdSummary).mockResolvedValue({
      total_logs: 1, total_members: 1, total_hours: 2,
      by_body: [],
      recent_logs: [{ id: 1, member_name: "Sample Member", event_name: "Sample Event",
        body_name: "Review Body", body_code: "QA", cpd_hours: 2, cpd_category: null,
        earned_at: "2026-10-01T09:00:00Z" }],
    });
  });
  afterEach(cleanup);

  it.each<Lang>(["tr", "en", "de", "fr", "es", "it", "pt", "nl", "ru"])(
    "renders form, empty state and CPD records in %s", async (lang) => {
      localStorage.setItem("heptacert-lang", lang);
      render(<I18nProvider><AccreditationPage /></I18nProvider>);
      const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);
      expect(await screen.findByRole("heading", { name: t("admin_accreditation_page_title") })).toBeInTheDocument();
      expect(await screen.findByText(t("admin_accreditation_empty_state"))).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: t("admin_accreditation_new_record") }));
      expect(screen.getByRole("heading", { name: t("admin_accreditation_form_title_create") })).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toHaveAccessibleName(t("admin_accreditation_label_org"));
      expect(screen.getByLabelText(t("admin_accreditation_label_accred_number"))).toBeInTheDocument();
      expect(screen.getByLabelText(t("admin_accreditation_label_notes"))).toBeInTheDocument();
      expect(screen.getByRole("button", { name: t("admin_accreditation_save") })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: t("admin_accreditation_cancel") }));
      fireEvent.click(screen.getByRole("button", { name: t("admin_accreditation_tab_cpd") }));
      const table = await screen.findByRole("table");
      for (const key of ["cpd_member", "cpd_event", "cpd_body", "cpd_hours", "cpd_date"] as const) {
        expect(within(table).getByRole("columnheader", { name: t(`admin_accreditation_${key}`) })).toBeInTheDocument();
      }
      expect(within(table).getByText("Sample Member")).toBeInTheDocument();
    },
  );
});
