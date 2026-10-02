import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminIntegrationsPage from "@/app/admin/integrations/page";
import { I18nProvider, translate, type Lang } from "@/lib/i18n";
import {
  apiFetch,
  getEnterpriseIntegrations,
  getGoogleSheetsConnectionStatus,
  getIntegrationCatalog,
  getMicrosoftExcelConnectionStatus,
  getNotificationIntegrations,
  getReservationGoogleCalendarStatus,
  updateNotificationIntegrations,
} from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  getGoogleSheetsConnectionStatus: vi.fn(),
  getEnterpriseIntegrations: vi.fn(),
  getIntegrationCatalog: vi.fn(),
  getMicrosoftExcelConnectionStatus: vi.fn(),
  getNotificationIntegrations: vi.fn(),
  getReservationGoogleCalendarStatus: vi.fn(),
  removeNotificationChannel: vi.fn(),
  startGoogleSheetsOAuth: vi.fn(),
  startMicrosoftExcelOAuth: vi.fn(),
  startReservationGoogleCalendarOAuth: vi.fn(),
  syncReservationGoogleCalendar: vi.fn(),
  testNotificationChannel: vi.fn(),
  testProviderConfig: vi.fn(),
  updateEnterpriseIntegrations: vi.fn(),
  updateNotificationIntegrations: vi.fn(),
}));

const languages: Lang[] = ["tr", "en", "de", "fr", "es", "it", "pt", "nl", "ru"];
const catalogItem = {
  key: "google_sheets",
  name: "Google Sheets",
  category: "Data sync",
  status: "available",
  description: "Server-owned English description",
  connect_type: "oauth",
  priority: 10,
  configured: true,
  connected: false,
  docs_url: "https://developers.google.com/sheets/api",
  settings_href: "/admin/events",
  setup_url: "https://example.test/setup",
};

function mount(lang: Lang) {
  localStorage.setItem("heptacert-lang", lang);
  render(<I18nProvider><AdminIntegrationsPage /></I18nProvider>);
  return (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(lang, key, vars);
}

describe("admin integrations language coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    vi.mocked(apiFetch).mockResolvedValue({ json: async () => [{ client_id: "assistant-1", name: "Organizer assistant", logo_url: null, scopes: ["events:read"], connected_at: "2026-10-02" }] } as Response);
    vi.mocked(getGoogleSheetsConnectionStatus).mockResolvedValue({ configured: true, connected: false } as any);
    vi.mocked(getMicrosoftExcelConnectionStatus).mockResolvedValue({ configured: true, connected: false } as any);
    vi.mocked(getReservationGoogleCalendarStatus).mockResolvedValue({ configured: true, connected: false } as any);
    vi.mocked(getIntegrationCatalog).mockResolvedValue({ items: [catalogItem], supported_events: [] } as any);
    vi.mocked(getNotificationIntegrations).mockResolvedValue(null as any);
    vi.mocked(getEnterpriseIntegrations).mockResolvedValue(null as any);
    vi.mocked(updateNotificationIntegrations).mockResolvedValue(undefined as any);
  });

  afterEach(cleanup);

  it.each(languages)("renders navigation, controls and server catalog metadata in %s", async lang => {
    const t = mount(lang);
    expect(await screen.findByRole("heading", { name: t("admin_integrations_title") })).toBeInTheDocument();
    expect(screen.getByText(t("admin_integrations_credential_security"))).toBeInTheDocument();
    expect(await screen.findByText(t("admin_integrations_connected_assistants"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("admin_integrations_disconnect_named", { name: "Organizer assistant" }) })).toBeInTheDocument();
    expect(screen.getByText(t("admin_integrations_catalog_title"))).toBeInTheDocument();
    expect(screen.getAllByText(t("admin_integrations_category_data_sync"))).toHaveLength(2);
    expect(screen.getByText(t("admin_integrations_catalog_desc_google_sheets"))).toBeInTheDocument();
    expect(screen.getByText(t("admin_integrations_connect_oauth"))).toBeInTheDocument();
    expect(screen.queryByText(catalogItem.description)).not.toBeInTheDocument();
  });

  it("keeps webhook payload values unchanged and translates local validation", async () => {
    const t = mount("de");
    await screen.findByRole("heading", { name: t("admin_integrations_title") });
    const webhookInput = screen.getByRole("textbox", { name: t("admin_integrations_webhook_url") });
    const panel = webhookInput.closest(".card") as HTMLElement;
    fireEvent.click(within(panel).getByRole("button", { name: t("admin_integrations_save") }));
    expect(await screen.findByText(t("admin_integrations_webhook_required"))).toBeInTheDocument();
    fireEvent.change(webhookInput, { target: { value: "https://hooks.example.test/notify" } });
    fireEvent.click(within(panel).getByRole("button", { name: t("admin_integrations_save") }));
    await waitFor(() => expect(updateNotificationIntegrations).toHaveBeenCalledWith({
      slack: {
        url: "https://hooks.example.test/notify",
        events: ["attendee.registered", "cert.issued"],
        enabled: true,
        secret: null,
      },
    }));
  });

  it("keeps the assistant disconnect endpoint unchanged", async () => {
    const t = mount("fr");
    const disconnect = await screen.findByRole("button", { name: t("admin_integrations_disconnect_named", { name: "Organizer assistant" }) });
    fireEvent.click(disconnect);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/oauth/disconnect/assistant-1", { method: "DELETE" }));
  });
});
