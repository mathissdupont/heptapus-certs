import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiKeysPage from "@/app/admin/api-keys/page";
import { DataTable } from "@/components/DataTable/DataTable";
import { I18nProvider, translate, useI18n, type Lang } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

const notifications = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/hooks/useToast", () => ({ useToast: () => notifications }));

const sampleKey = { id: 7, name: "Review Integration", key_prefix: "hc_review_prefix",
  is_active: true, last_used_at: null, expires_at: null, created_at: "2026-10-01T09:00:00Z",
  scopes: ["events:read", "attendees:read", "certificates:read"] };
const response = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

function LanguageProbe() {
  const { setLang } = useI18n();
  return <button onClick={() => setLang("fr")}>Switch to French</button>;
}

describe("API keys and shared table language coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(response([sampleKey]));
  });
  afterEach(cleanup);

  it.each<Lang>(["tr", "en", "de", "fr", "es", "it", "pt", "nl", "ru"])(
    "renders API table, shared controls and creation form in %s", async (lang) => {
      localStorage.setItem("heptacert-lang", lang);
      render(<I18nProvider><ApiKeysPage /></I18nProvider>);
      const t = (key: Parameters<typeof translate>[1], vars?: Record<string, number>) => translate(lang, key, vars);
      expect(await screen.findByRole("heading", { name: t("admin_api_keys_page_title") })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: t("admin_api_keys_col_name") })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: t("admin_api_keys_col_scopes") })).toBeInTheDocument();
      expect(screen.getByText(t("admin_api_keys_col_scopes_count", { count: 3 }))).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: t("data_table_search") })).toHaveAttribute("placeholder", t("admin_api_keys_search_placeholder"));
      expect(screen.getByRole("button", { name: t("data_table_export_page") })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: t("data_table_first_page") })).toBeDisabled();
      expect(screen.getByRole("region", { name: t("data_table_pagination") })).toHaveTextContent(t("data_table_rows_range", { start: 1, end: 1, total: 1 }));
      fireEvent.click(screen.getByRole("button", { name: t("admin_api_keys_btn_new_key") }));
      expect(screen.getByRole("heading", { name: t("admin_api_keys_modal_create_title") })).toBeInTheDocument();
      expect(screen.getByLabelText(t("admin_api_keys_label_key_name"))).toHaveAttribute("placeholder", t("admin_api_keys_placeholder_key_name"));
      expect(screen.getByLabelText(t("admin_api_keys_label_expiry"))).toBeInTheDocument();
      expect(screen.getByRole("button", { name: t("admin_api_keys_btn_generate") })).toBeDisabled();
    },
  );

  it("refreshes memoized column headers when switching between third languages", async () => {
    localStorage.setItem("heptacert-lang", "de");
    render(<I18nProvider><LanguageProbe /><ApiKeysPage /></I18nProvider>);
    await screen.findByRole("columnheader", { name: translate("de", "admin_api_keys_col_scopes") });
    fireEvent.click(screen.getByRole("button", { name: "Switch to French" }));
    expect(await screen.findByRole("columnheader", { name: translate("fr", "admin_api_keys_col_scopes") })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: translate("de", "admin_api_keys_col_scopes") })).not.toBeInTheDocument();
  });

  it("keeps create-request values and localizes the one-time-key state", async () => {
    localStorage.setItem("heptacert-lang", "ru");
    vi.mocked(apiFetch).mockImplementation(async (_path, options) => options?.method === "POST"
      ? response({ full_key: "hc_review_not_a_secret" }) : response([sampleKey]));
    render(<I18nProvider><ApiKeysPage /></I18nProvider>);
    await screen.findByRole("heading", { name: translate("ru", "admin_api_keys_page_title") });
    fireEvent.click(screen.getByRole("button", { name: translate("ru", "admin_api_keys_btn_new_key") }));
    fireEvent.change(screen.getByLabelText(translate("ru", "admin_api_keys_label_key_name")), { target: { value: "Review Bot" } });
    fireEvent.change(screen.getByLabelText(translate("ru", "admin_api_keys_label_expiry")), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: translate("ru", "admin_api_keys_btn_generate") }));
    expect(await screen.findByRole("heading", { name: translate("ru", "admin_api_keys_modal_key_ready_title") })).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/admin/api-keys", { method: "POST", body: JSON.stringify({ name: "Review Bot", expires_days: 30 }) });
    expect(screen.getByText("hc_review_not_a_secret")).toBeInTheDocument();
    await waitFor(() => expect(notifications.success).toHaveBeenCalledWith(translate("ru", "admin_api_keys_toast_key_created")));
    fireEvent.click(screen.getByRole("button", { name: translate("ru", "admin_api_keys_btn_copied_close") }));
    await waitFor(() => expect(screen.queryByText("hc_review_not_a_secret")).not.toBeInTheDocument());
  });

  it.each<Lang>(["tr", "en", "de", "fr", "es", "it", "pt", "nl", "ru"])("localizes API-load failures after restoring %s", async (lang) => {
    localStorage.setItem("heptacert-lang", lang);
    vi.mocked(apiFetch).mockResolvedValue(response({}, false));
    render(<I18nProvider><ApiKeysPage /></I18nProvider>);
    expect(await screen.findByText(translate(lang, "admin_api_keys_load_error"))).toBeInTheDocument();
  });

  it("uses the active page size in translated row ranges and empty search results", async () => {
    localStorage.setItem("heptacert-lang", "nl");
    render(<I18nProvider><DataTable columns={[{ accessorKey: "name", header: "Sample" }]}
      data={Array.from({ length: 6 }, (_, index) => ({ name: `Row ${index}` }))} /></I18nProvider>);
    const pagination = await screen.findByRole("region", { name: translate("nl", "data_table_pagination") });
    fireEvent.change(screen.getByRole("combobox", { name: translate("nl", "data_table_page_size") }), { target: { value: "5" } });
    expect(pagination).toHaveTextContent(translate("nl", "data_table_rows_range", { start: 1, end: 5, total: 6 }));
    fireEvent.click(screen.getByRole("button", { name: translate("nl", "data_table_next_page") }));
    expect(pagination).toHaveTextContent(translate("nl", "data_table_rows_range", { start: 6, end: 6, total: 6 }));
    fireEvent.change(screen.getByRole("textbox", { name: translate("nl", "data_table_search") }), { target: { value: "absent" } });
    expect(await screen.findByText(translate("nl", "data_table_no_results"))).toBeInTheDocument();
    expect(pagination).toHaveTextContent(translate("nl", "data_table_no_records"));
  });
});
