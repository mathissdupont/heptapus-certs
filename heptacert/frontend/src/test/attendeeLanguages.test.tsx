import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AttendeesPage from "@/app/admin/events/[id]/attendees/page";
import { I18nProvider, translate, useI18n, type Lang, type TranslationKey } from "@/lib/i18n";
import { apiFetch, listAttendees, getAttendanceMatrix, deleteAttendee, bulkCertifyQueue,
  getBulkGenerateJob, getAdminAttendeeSurveyLink, exportAttendanceFile } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(), listAttendees: vi.fn(), getAttendanceMatrix: vi.fn(), deleteAttendee: vi.fn(),
  bulkCertifyQueue: vi.fn(), getBulkGenerateJob: vi.fn(), getAdminAttendeeSurveyLink: vi.fn(),
  exportAttendanceFile: vi.fn(), exportRegistrationDocumentsZip: vi.fn(), downloadRegistrationDocument: vi.fn(),
  importAttendees: vi.fn(), createManualAttendee: vi.fn(), consumeOAuthBridgeToken: vi.fn(), setToken: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "42" }) }));
vi.mock("@/components/Admin/EventAdminNav", () => ({ default: () => null }));
vi.mock("@/components/Admin/AddAttendeeModal", () => ({ default: () => null }));
vi.mock("@/components/Admin/ImportAttendeeModal", () => ({ default: () => null }));
vi.mock("@/lib/useSubscription", () => ({
  isPlanGateError: (message: string) => message === "plan_required",
  PlanGateCard: ({ feature, featureKey }: { feature: string; featureKey: string }) => <div data-testid="plan-gate" data-feature={featureKey}>{feature}</div>,
}));

const languages: Lang[] = ["tr", "en", "de", "fr", "es", "it", "pt", "nl", "ru"];
const attendee = {
  id: 9, name: "Organizer-owned name", email: "participant@example.test", source: "self_register",
  sessions_attended: 1, has_certificate: false, registered_at: "2026-10-02T09:00:00Z",
  public_member_name: "Organizer-owned member", public_member_email: "member@example.test",
  registration_answers: { q1: false, q2: null, q3: null, uploads: null, __documents: [{ field_id: "uploads", path: "documents/sample.pdf" }], __kvkk: { accepted: true } },
};
const fields = [
  { id: "q1", label: "Organizer-owned question", type: "text" },
  { id: "q2", label: "Organizer-owned yes question", type: "text" },
  { id: "q3", label: "Organizer-owned unanswered question", type: "text" },
  { id: "uploads", label: "Organizer-owned file question", type: "file" },
];
const response = (data: unknown) => ({ ok: true, json: async () => data }) as Response;
function SwitchLanguage() {
  const { setLang } = useI18n();
  return <button onClick={() => setLang("fr")}>Switch to French</button>;
}
function mount(lang: Lang, probe = false) {
  localStorage.setItem("heptacert-lang", lang);
  render(<I18nProvider>{probe && <SwitchLanguage />}<AttendeesPage /></I18nProvider>);
  return (key: TranslationKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

describe("admin attendee language coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    vi.mocked(apiFetch).mockImplementation(async path => {
      if (path.endsWith("/sheets")) return response({ google_configured: true, google_connected: false });
      if (path.endsWith("/microsoft-excel")) return response({ ms365_configured: true, ms365_connected: false });
      return response({ name: "Organizer-owned event", min_sessions_required: 1, config: { registration_fields: fields } });
    });
    vi.mocked(listAttendees).mockResolvedValue({ items: [attendee], total: 51 } as any);
    vi.mocked(getAttendanceMatrix).mockResolvedValue({ sessions: [{ id: 3, name: "SessionX" }],
      rows: [{ attendee_id: 9, name: attendee.name, meets_threshold: true, has_certificate: false,
        sessions_attended: 1, checkins: { "3": true } }] } as any);
    vi.mocked(deleteAttendee).mockResolvedValue(undefined as any);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.documentElement.classList.remove("dark");
  });

  it.each(languages)("renders list, integrations, answers, profile and matrix in %s", async lang => {
    const t = mount(lang);
    await screen.findByText(t("admin_attendees_total_attendees", { count: 51 }));
    expect(screen.getByText(t("admin_attendees_google_sheets_title"))).toBeInTheDocument();
    expect(screen.getByText(t("admin_attendees_microsoft_excel_title"))).toBeInTheDocument();
    expect(screen.getByText(t("admin_attendees_member", { name: attendee.public_member_name }))).toBeInTheDocument();
    expect(screen.getByText(t("admin_attendees_file_count", { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText(t("admin_attendees_accepted"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: t("admin_attendees_next_page") }));
    await waitFor(() => expect(listAttendees).toHaveBeenCalledWith(42, { page: 2, limit: 50, search: "" }));
    fireEvent.click(screen.getByRole("button", { name: t("admin_attendees_tab_answers") }));
    await screen.findByText(t("admin_attendees_answers_distribution", { count: 1 }));
    expect(screen.getAllByText(t("admin_common_no")).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: fields[0].label })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: attendee.name }));
    expect(screen.getByText(t("admin_attendees_drawer_profile_label"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "📁 " + t("admin_attendees_attachment", { count: 1 }) })).toBeInTheDocument();
    expect(screen.getAllByText(t("admin_common_no")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: t("admin_attendees_close_profile") }));
    fireEvent.click(screen.getByRole("button", { name: t("admin_attendees_tab_matrix") }));
    await screen.findByText(t("admin_attendees_matrix_eligible_notice", { count: 1 }));
    expect(screen.getByRole("columnheader", { name: t("admin_attendees_matrix_th_total") })).toBeInTheDocument();
    expect(screen.getByText("SessionX")).toBeInTheDocument();
  });

  it.each(languages)("keeps early load errors translated after restoring %s", async lang => {
    vi.mocked(listAttendees).mockRejectedValue({});
    const t = mount(lang);
    expect(await screen.findByText(t("admin_attendees_load_error"))).toBeInTheDocument();
  });

  it("updates export errors and previews on a live DE→FR switch", async () => {
    vi.mocked(exportAttendanceFile).mockRejectedValue({});
    const t = mount("de", true);
    await screen.findByText(attendee.name);
    fireEvent.click(screen.getByRole("button", { name: t("admin_attendees_download_excel") }));
    await screen.findByText(t("admin_attendees_err_export"));
    fireEvent.click(screen.getByRole("button", { name: "Switch to French" }));
    expect(screen.getByText(translate("fr", "admin_attendees_err_export"))).toBeInTheDocument();
    expect(screen.getByText(translate("fr", "admin_attendees_file_count", { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText(translate("fr", "admin_attendees_accepted"))).toBeInTheDocument();
    expect(exportAttendanceFile).toHaveBeenCalledWith(42, "xlsx");
  });

  it("retains delete confirmation and original attendee IDs", async () => {
    const t = mount("nl");
    await screen.findByText(attendee.name);
    fireEvent.click(screen.getByRole("button", { name: t("admin_attendees_delete_label", { name: attendee.name }) }));
    expect(deleteAttendee).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog", { name: t("admin_attendees_confirm_delete_title") });
    expect(within(dialog).getByText(t("admin_attendees_confirm_delete_desc"))).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: t("common_confirm") }));
    await waitFor(() => expect(deleteAttendee).toHaveBeenCalledWith(42, 9));
  });

  it.each(["completed", "cancelled", "failed"])("translates a %s certificate job and preserves confirmation", async status => {
    vi.mocked(bulkCertifyQueue).mockResolvedValue({ id: 17 } as any);
    vi.mocked(getBulkGenerateJob).mockResolvedValue({ status, total_count: 1, current_index: 1,
      created_count: 1, already_exists_count: 0, spent_heptacoin: 2 } as any);
    const timer = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler, delay?: number, ...args: any[]) =>
      timer(callback, delay === 2000 ? 0 : delay, ...args)) as typeof setTimeout);
    const t = mount("de", true);
    await screen.findByText(attendee.name);
    fireEvent.click(screen.getByRole("button", { name: t("admin_attendees_generate_certificate") }));
    expect(bulkCertifyQueue).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: t("common_confirm") }));
    const key = status === "completed" ? "admin_attendees_job_completed" : status === "cancelled" ? "admin_attendees_job_cancelled" : "admin_attendees_err_bulk_certificate";
    const vars = status === "completed" ? { created: 1, existing: 0, spent: 2 } : undefined;
    await screen.findByText(t(key, vars));
    fireEvent.click(screen.getByRole("button", { name: "Switch to French" }));
    expect(screen.getByText(translate("fr", key, vars))).toBeInTheDocument();
    expect(bulkCertifyQueue).toHaveBeenCalledWith(42);
    expect(getBulkGenerateJob).toHaveBeenCalledWith(42, 17);
  });

  it("keeps the check-in plan gate and server feedback", async () => {
    vi.mocked(listAttendees).mockRejectedValue({ status: 403, message: "plan_required" });
    const t = mount("es");
    const gate = await screen.findByTestId("plan-gate");
    expect(gate).toHaveAttribute("data-feature", "checkin");
    expect(gate).toHaveTextContent(t("admin_attendees_plan_gate_feature"));
    expect(screen.queryByRole("button", { name: t("admin_attendees_generate_certificate") })).not.toBeInTheDocument();
  });

  it.each([false, true])("pairs inverse theme roles with dark=%s", async dark => {
    document.documentElement.classList.toggle("dark", dark);
    const t = mount("it");
    await screen.findByText(attendee.name);
    for (const key of ["admin_attendees_search_button", "admin_attendees_google_connect_btn", "admin_attendees_microsoft_connect_btn"] as const) {
      expect(screen.getByRole("button", { name: t(key) })).toHaveClass("bg-inverse-surface", "text-inverse-content");
    }
  });
});
