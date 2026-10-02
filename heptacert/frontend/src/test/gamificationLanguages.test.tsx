import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GamificationPage from "@/app/admin/events/[id]/gamification/page";
import { I18nProvider, translate, type Lang } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "42" }) }));
vi.mock("@/components/Admin/EventAdminNav", () => ({ default: () => null }));
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const languages: Lang[] = ["tr", "en", "de", "fr", "es", "it", "pt", "nl", "ru"];
const organizerBadge = {
  type: "early_bird",
  name: "Organizer-owned badge",
  description: "",
  criteria: { min_sessions: 2 },
  color_hex: "#123456",
  icon_url: "",
};
const awardedBadge = {
  id: 1,
  event_id: 42,
  attendee_id: 77,
  badge_type: "early_bird",
  badge_name: "Organizer-owned badge",
  attendee_name: null,
  attendee_email: null,
  criteria_met: { min_sessions: { required: 2, actual: 3, passed: true } },
  awarded_by: null,
  awarded_at: "2026-10-02T09:00:00Z",
  is_automatic: true,
};

const json = (body: unknown) => ({ json: async () => body }) as Response;

function mockServer() {
  vi.mocked(apiFetch).mockImplementation(async (path: string, init?: RequestInit) => {
    if (path.endsWith("/badge-rules") && init?.method === "POST") return json({});
    if (path.endsWith("/badge-rules")) return json({ id: 1, event_id: 42, badge_definitions: [{ ...organizerBadge }], enabled: true });
    if (path.endsWith("/badges")) {
      return json({ badges: [awardedBadge], badge_summary: { by_type: { early_bird: 1 }, automatic_vs_manual: { automatic: 1, manual: 0 } } });
    }
    return json({ name: "Organizer-owned event" });
  });
}

function mount(lang: Lang) {
  localStorage.setItem("heptacert-lang", lang);
  render(<I18nProvider><GamificationPage /></I18nProvider>);
  return (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(lang, key, vars);
}

describe("admin gamification language coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    mockServer();
  });

  afterEach(cleanup);

  it.each(languages)("renders rules, stats and criteria in %s", async lang => {
    const t = mount(lang);
    expect(await screen.findByRole("heading", { level: 1, name: t("admin_gamification_title") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("admin_gamification_tab_rules") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("admin_gamification_tab_awarded") })).toBeInTheDocument();
    expect(screen.getByText(t("admin_gamification_stat_badge_types_hint", { count: 1 }))).toBeInTheDocument();
    expect(screen.getAllByText(t("admin_gamification_crit_min_sessions")).length).toBeGreaterThan(0);
    expect(screen.getByText(t("admin_gamification_unit_sessions"))).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: t("admin_gamification_remove_criterion") })).toHaveLength(1);
    expect(screen.getByDisplayValue("Organizer-owned badge")).toBeInTheDocument();
  });

  it.each(languages)("keeps early load failures translated after restoring %s", async lang => {
    vi.mocked(apiFetch).mockRejectedValue({});
    const t = mount(lang);
    expect(await screen.findByText(t("admin_gamification_load_error"))).toBeInTheDocument();
  });

  it("localizes awarded criteria labels and fallbacks without changing organizer data", async () => {
    const t = mount("de");
    fireEvent.click(await screen.findByRole("button", { name: t("admin_gamification_tab_awarded") }));
    expect(screen.getByText(t("admin_gamification_attendee_id", { id: 77 }))).toBeInTheDocument();
    expect(screen.getByText(t("admin_gamification_crit_min_sessions"))).toBeInTheDocument();
    expect(screen.getByText(t("admin_gamification_criteria_passed"))).toBeInTheDocument();
    expect(screen.getByText("Organizer-owned badge")).toBeInTheDocument();
  });

  it("shows a localized validation error and saves the original badge payload", async () => {
    const t = mount("fr");
    const addButton = await screen.findByRole("button", { name: t("admin_gamification_add_badge") });
    fireEvent.click(addButton);
    expect(screen.getByText(t("admin_gamification_add_badge_error"))).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(t("admin_gamification_badge_type_placeholder")), { target: { value: "speaker" } });
    fireEvent.change(screen.getByPlaceholderText(t("admin_gamification_badge_name_placeholder")), { target: { value: "Speaker" } });
    fireEvent.click(addButton);
    fireEvent.click(screen.getByRole("button", { name: t("admin_gamification_save_rules") }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/admin/events/42/badge-rules", expect.objectContaining({ method: "POST" })));
    const post = vi.mocked(apiFetch).mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      badge_definitions: [
        organizerBadge,
        { type: "speaker", name: "Speaker", criteria: {}, color_hex: "#4CAF50", description: "", icon_url: "" },
      ],
      enabled: true,
    });
    expect(await screen.findByText(t("admin_gamification_save_success"))).toBeInTheDocument();
  });
});
