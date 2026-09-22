import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventSummaryExport from "@/components/Admin/EventSummaryExport";
import { en } from "@/locales/en";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/i18n", () => {
  const t = (key: keyof typeof en) => en[key];
  return { useI18n: () => ({ t }) };
});

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const event = {
  id: 43,
  public_id: "robotics-day",
  name: "Robotics Day",
  template_image_url: "",
  config: {},
  min_sessions_required: 0,
  event_date: "2026-10-02",
  event_description: "<p>Build a robot</p>",
  visibility: "public",
  registration_enabled: true,
};

describe("event information export", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiFetch).mockImplementation(async (path) => ({
      json: async () => path === "/admin/events" ? [event] : event,
    }) as Response);
  });

  it("loads the selected event again before showing its report", async () => {
    render(<EventSummaryExport />);
    const select = await screen.findByLabelText(en.report_export_select);
    await screen.findByRole("option", { name: "Robotics Day" });
    fireEvent.change(select, { target: { value: "43" } });
    await screen.findByText(/Event name: Robotics Day/);
    expect(apiFetch).toHaveBeenCalledWith("/admin/events/43");
    expect(screen.getByText(/Build a robot/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.report_export_download })).toBeEnabled();
  });

  it("clears the report when the organization context changes", async () => {
    render(<EventSummaryExport />);
    await screen.findByRole("option", { name: "Robotics Day" });
    fireEvent.change(screen.getByLabelText(en.report_export_select), { target: { value: "43" } });
    await screen.findByText(/Event name: Robotics Day/);
    window.dispatchEvent(new Event("heptacert:organization-context-change"));
    await waitFor(() => expect(screen.queryByRole("button", { name: en.report_export_download })).not.toBeInTheDocument());
    expect(screen.getByLabelText(en.report_export_select)).toHaveValue("");
  });

  it("rejects a detail response for a different event ID", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path) => ({
      json: async () => path === "/admin/events" ? [event] : { ...event, id: 44 },
    }) as Response);
    render(<EventSummaryExport />);
    await screen.findByRole("option", { name: "Robotics Day" });
    fireEvent.change(screen.getByLabelText(en.report_export_select), { target: { value: "43" } });
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: en.report_export_download })).not.toBeInTheDocument();
  });
});
