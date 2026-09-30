import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AddAttendeeModal from "@/components/Admin/AddAttendeeModal";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import ImportAttendeeModal from "@/components/Admin/ImportAttendeeModal";
import IssueCertificateModal from "@/components/Admin/IssueCertificateModal";
import { StatCard } from "@/components/Admin/StatCard";
import { apiFetch, getEventAccess } from "@/lib/api";
import { translate } from "@/lib/i18n";
import { pickLang } from "@/lib/pickLang";

// "de" is a language the admin's legacy { tr, en } copy maps do not list. Before WP32
// Phase 2 these components indexed those maps directly and crashed on `undefined`.
vi.mock("@/lib/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n")>();
  return {
    ...actual,
    useI18n: () => ({
      lang: "de",
      setLang: () => {},
      t: (key: Parameters<typeof actual.translate>[1]) => actual.translate("de", key),
      supportedLangs: ["tr", "en", "de"],
      langLabels: {},
    }),
    useT: () => (key: Parameters<typeof actual.translate>[1]) => actual.translate("de", key),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/events/7/attendees",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "7" }),
  useSearchParams: () => new URLSearchParams(),
}));

// Network calls never resolve: the tests cover the first render, not data loading.
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(() => new Promise(() => {})),
  getEventAccess: vi.fn(() => new Promise(() => {})),
  createManualAttendee: vi.fn(),
  importAttendees: vi.fn(),
}));

describe("pickLang", () => {
  const label = { tr: "Detaylar", en: "Details" };

  it("returns the active language when the map lists it", () => {
    expect(pickLang(label, "tr")).toBe("Detaylar");
  });

  it("falls back to English for a language the map does not list", () => {
    expect(pickLang(label, "de")).toBe("Details");
  });

  it("prefers a listed third language over the English fallback", () => {
    expect(pickLang({ ...label, de: "Einzelheiten" }, "de")).toBe("Einzelheiten");
  });

  it("passes a missing map through as undefined", () => {
    expect(pickLang(undefined, "de")).toBeUndefined();
  });
});

describe("admin components rendered in a third language", () => {
  it("AddAttendeeModal shows its German catalog copy", () => {
    render(<AddAttendeeModal open onClose={() => {}} onAdded={() => {}} eventId={7} />);
    expect(screen.getAllByText(translate("de", "migrated_components_admin_addattendeemodal_add_attendee_9eb0c8fb")).length).toBeGreaterThan(0);
  });

  it("ImportAttendeeModal shows its German catalog copy", () => {
    render(<ImportAttendeeModal open onClose={() => {}} onImported={() => {}} eventId={7} />);
    expect(screen.getByText(translate("de", "migrated_components_admin_importattendeemodal_import_excel_csv_34b914bf"))).toBeInTheDocument();
  });

  it("IssueCertificateModal shows its German catalog copy", () => {
    render(<IssueCertificateModal open onClose={() => {}} onIssued={() => {}} eventId={7} templateReady />);
    expect(screen.getAllByText(translate("de", "migrated_components_admin_issuecertificatemodal_issue_certificate_83c248f8")).length).toBeGreaterThan(0);
  });

  it("EventAdminNav shows German tab labels", async () => {
    // Tabs only render once the event and the user's permissions have loaded.
    vi.mocked(apiFetch).mockResolvedValueOnce({
      json: async () => ({ id: 7, name: "Demo", certificate_enabled: true, checkin_enabled: true }),
    } as unknown as Response);
    vi.mocked(getEventAccess).mockResolvedValueOnce({
      permissions: { includes: () => true },
    } as unknown as Awaited<ReturnType<typeof getEventAccess>>);

    render(<EventAdminNav eventId={7} forceVisible />);
    expect((await screen.findAllByText(translate("de", "admin_event_nav_attendees"))).length).toBeGreaterThan(0);
    expect(screen.queryByText(translate("tr", "admin_event_nav_attendees"))).not.toBeInTheDocument();
  });

  it("StatCard formats numbers in the active language", () => {
    render(<StatCard label="Total" value={1234567} />);
    expect(screen.getByText("1.234.567")).toBeInTheDocument();
  });
});
