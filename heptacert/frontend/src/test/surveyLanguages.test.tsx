import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SurveysPage from "@/app/admin/events/[id]/surveys/page";
import { I18nProvider, translate, useI18n, type Lang } from "@/lib/i18n";
import { localeTag } from "@/lib/localeTag";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "42" }) }));
vi.mock("@/components/Admin/EventAdminNav", () => ({ default: () => null }));

const languages: Lang[] = ["tr", "en", "de", "fr", "es", "it", "pt", "nl", "ru"];
const question = { id: "q1", question: "Organizer-authored question", type: "yes_no", required: true, options: [] };
const config = { is_required: true, survey_type: "builtin", builtin_questions: [question],
  external_provider: null, external_url: null, external_webhook_key: null };
const response = (data: unknown) => ({ ok: true, json: async () => data }) as Response;
function LanguageProbe() {
  const { setLang } = useI18n();
  return <button onClick={() => setLang("fr")}>Switch to French</button>;
}

describe("admin survey language coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path.endsWith("survey-config")) return response(config);
      if (path.endsWith("surveys/responses")) return response({
        response_rate: { completed: 1, pending: 3 },
        responses: [{ id: 8, attendee_id: 9, survey_type: "builtin", attendee_name: null,
          attendee_email: null, completed_at: "2026-10-01T09:00:00Z", answers: { q1: true, q2: false, q3: null } }],
      });
      return response({ public_id: "sample-event" });
    });
  });
  afterEach(cleanup);

  it.each([false, true])("uses matching semantic inverse roles with dark=%s", async dark => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("heptacert-lang", "de");
      render(<I18nProvider><SurveysPage /></I18nProvider>);
      await screen.findByRole("heading", { name: translate("de", "admin_surveys_page_title") });
      expect(screen.getByRole("button", { name: translate("de", "admin_surveys_save_settings") }))
        .toHaveClass("bg-inverse-surface", "text-inverse-content");
      expect(screen.getByText(translate("de", "admin_surveys_live_summary"))).toHaveClass("text-inverse-content/70");
    } finally {
      document.documentElement.classList.remove("dark");
    }
  });

  it.each(languages)("renders settings, question types and response controls in %s", async lang => {
    localStorage.setItem("heptacert-lang", lang);
    render(<I18nProvider><SurveysPage /></I18nProvider>);
    const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(lang, key, vars);
    await screen.findByRole("heading", { name: t("admin_surveys_page_title") });
    expect(screen.getByRole("link", { name: t("admin_surveys_back_certificates") })).toHaveAttribute("href", "/admin/events/42/certificates");
    expect(screen.getByText(question.question)).toBeInTheDocument();
    expect(screen.getByLabelText(t("admin_surveys_question_type"))).toHaveValue("text");
    for (const type of ["text", "textarea", "multiple_choice", "rating", "yes_no"] as const) {
      expect(screen.getByRole("option", { name: t(`admin_surveys_type_${type}`) })).toHaveValue(type);
    }
    const percent = new Intl.NumberFormat(localeTag(lang), { style: "percent", maximumFractionDigits: 0 }).format(0.25);
    expect(screen.getByText(t("admin_surveys_completion_rate", { rate: percent }), { normalizer: value => value.trim() })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: t("admin_surveys_tab_responses", { count: 1 }) }));
    expect(screen.getByText(t("admin_surveys_attendee_label", { id: 9 }))).toBeInTheDocument();
    for (const key of ["yes", "no", "no_answer", "no_email"]) {
      expect(screen.getByText(t(`admin_surveys_${key}` as Parameters<typeof translate>[1]))).toBeInTheDocument();
    }
    expect(screen.getByText(percent, { normalizer: value => value.trim() })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: t("admin_surveys_search_placeholder") }), { target: { value: "no match" } });
    expect(screen.getByText(t("admin_surveys_no_responses"))).toBeInTheDocument();
  });

  it.each(languages)("keeps an early load failure translated after restoring %s", async lang => {
    localStorage.setItem("heptacert-lang", lang);
    vi.mocked(apiFetch).mockRejectedValue({});
    render(<I18nProvider><SurveysPage /></I18nProvider>);
    expect(await screen.findByText(translate(lang, "admin_surveys_load_error"))).toBeInTheDocument();
  });

  it("updates validation feedback and question-type labels on DE→FR switch", async () => {
    localStorage.setItem("heptacert-lang", "de");
    render(<I18nProvider><LanguageProbe /><SurveysPage /></I18nProvider>);
    await screen.findByRole("heading", { name: translate("de", "admin_surveys_page_title") });
    fireEvent.click(screen.getByRole("button", { name: translate("de", "admin_surveys_add_question_btn") }));
    expect(screen.getByText(translate("de", "admin_surveys_error_question_required"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch to French" }));
    expect(screen.getByText(translate("fr", "admin_surveys_error_question_required"))).toBeInTheDocument();
    expect(screen.getByRole("option", { name: translate("fr", "admin_surveys_type_rating") })).toHaveValue("rating");
    expect(apiFetch).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "POST" }));
  });

  it("preserves question IDs, organizer content and POST values", async () => {
    localStorage.setItem("heptacert-lang", "ru");
    render(<I18nProvider><SurveysPage /></I18nProvider>);
    const t = (key: Parameters<typeof translate>[1]) => translate("ru", key);
    await screen.findByRole("heading", { name: t("admin_surveys_page_title") });
    fireEvent.change(screen.getByLabelText(t("admin_surveys_question_id")), { target: { value: "q_custom" } });
    fireEvent.change(screen.getByLabelText(t("admin_surveys_question_text")), { target: { value: "Custom question" } });
    fireEvent.change(screen.getByLabelText(t("admin_surveys_question_type")), { target: { value: "multiple_choice" } });
    fireEvent.change(screen.getByLabelText(t("admin_surveys_options")), { target: { value: "Custom option" } });
    fireEvent.click(screen.getByRole("button", { name: t("admin_surveys_add_option") }));
    fireEvent.click(screen.getByRole("button", { name: t("admin_surveys_add_question_btn") }));
    fireEvent.click(screen.getByRole("button", { name: t("admin_surveys_save_settings") }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/admin/events/42/survey-config", {
      method: "POST", body: JSON.stringify({ ...config, builtin_questions: [question,
        { id: "q_custom", question: "Custom question", type: "multiple_choice", required: true, options: ["Custom option"] }],
      }),
    }));
    expect(await screen.findByText(t("admin_surveys_save_success"))).toBeInTheDocument();
  });
});
