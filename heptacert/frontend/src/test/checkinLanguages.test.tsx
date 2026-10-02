import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminCheckinPage from "@/app/admin/events/[id]/checkin/page";
import { I18nProvider, translate, type Lang } from "@/lib/i18n";
import { adminManualCheckin, apiFetch, getCheckinMetrics, listSessions } from "@/lib/api";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "42" }) }));
vi.mock("@/components/Admin/EventAdminNav", () => ({ default: () => null }));
vi.mock("@/lib/useSubscription", () => ({
  isPlanGateError: (message: string) => message === "plan_required",
  PlanGateCard: ({ feature, featureKey }: { feature: string; featureKey: string }) => <div data-testid="plan-gate" data-feature={featureKey}>{feature}</div>,
}));
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  adminManualCheckin: vi.fn(),
  checkInEventTicket: vi.fn(),
  getApiBase: vi.fn(() => "https://api.example.test"),
  getCheckinMetrics: vi.fn(),
  getToken: vi.fn(() => null),
  listSessions: vi.fn(),
}));

const languages: Lang[] = ["tr", "en", "de", "fr", "es", "it", "pt", "nl", "ru"];
const session = { id: 7, name: "Organizer-owned session", is_active: true, attendance_count: 3, session_date: null, session_start: null };

function mount(lang: Lang) {
  localStorage.setItem("heptacert-lang", lang);
  render(<I18nProvider><AdminCheckinPage /></I18nProvider>);
  return (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(lang, key, vars);
}

describe("admin check-in language coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    vi.mocked(listSessions).mockResolvedValue([session] as any);
    vi.mocked(apiFetch).mockResolvedValue({ json: async () => ({ name: "Organizer-owned event" }) } as Response);
    vi.mocked(getCheckinMetrics).mockResolvedValue(null as any);
    vi.mocked(adminManualCheckin).mockResolvedValue({ ok: true, message: "Server-owned success" } as any);
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it.each(languages)("renders the gate, session and offline controls in %s", async lang => {
    const t = mount(lang);
    expect(await screen.findByRole("heading", { name: t("admin_checkin_gateway") })).toBeInTheDocument();
    expect(screen.getByText(t("admin_checkin_mobile_ops"))).toBeInTheDocument();
    expect(screen.getByText(t("admin_checkin_active_session"))).toBeInTheDocument();
    expect(screen.getAllByText("Organizer-owned session")).toHaveLength(2);
    expect(screen.getByText(t("admin_checkin_gate_header"))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(t("admin_checkin_email_placeholder"))).toBeInTheDocument();
    expect(screen.getByText(t("admin_checkin_offline_panel"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("admin_checkin_clear_queue") })).toBeDisabled();
  });

  it.each(languages)("keeps early load failures translated after restoring %s", async lang => {
    vi.mocked(listSessions).mockRejectedValue({});
    const t = mount(lang);
    expect(await screen.findByText(t("admin_checkin_load_error"))).toBeInTheDocument();
  });

  it("preserves event, session and email values in manual check-in", async () => {
    const t = mount("fr");
    const input = await screen.findByPlaceholderText(t("admin_checkin_email_placeholder"));
    fireEvent.change(input, { target: { value: "participant@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: t("admin_checkin_admit_button") }));
    await waitFor(() => expect(adminManualCheckin).toHaveBeenCalledWith(42, 7, "participant@example.test"));
    expect(await screen.findByText("Server-owned success")).toBeInTheDocument();
  });

  it("queues the original check-in payload while offline", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const t = mount("de");
    const input = await screen.findByPlaceholderText(t("admin_checkin_email_placeholder"));
    await screen.findByText(t("admin_checkin_offline"));
    fireEvent.change(input, { target: { value: "offline@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: t("admin_checkin_admit_button") }));
    expect(await screen.findByText((_, element) => element?.tagName === "P" && element.textContent?.includes(t("admin_checkin_offline_queued")) === true)).toBeInTheDocument();
    expect(adminManualCheckin).not.toHaveBeenCalled();
    const queue = JSON.parse(localStorage.getItem("heptacert:offline-checkin:42") || "[]");
    expect(queue[0]).toMatchObject({ eventId: 42, sessionId: 7, type: "manual", value: "offline@example.test", attempts: 0 });
  });

  it("uses the localized plan feature without bypassing the check-in gate", async () => {
    vi.mocked(listSessions).mockRejectedValue({ status: 403, message: "plan_required" });
    const t = mount("nl");
    const gate = await screen.findByTestId("plan-gate");
    expect(gate).toHaveAttribute("data-feature", "checkin");
    expect(gate).toHaveTextContent(t("admin_checkin_plan_feature"));
    expect(screen.queryByRole("button", { name: t("admin_checkin_admit_button") })).not.toBeInTheDocument();
  });

  it("uses inverse theme roles for the primary admission action", async () => {
    const t = mount("en");
    const button = await screen.findByRole("button", { name: t("admin_checkin_admit_button") });
    expect(button).toHaveClass("bg-inverse-surface", "text-inverse-content");
    expect(button).not.toHaveClass("bg-surface-900", "text-white");
  });
});
