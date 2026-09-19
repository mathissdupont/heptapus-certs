import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AddAttendeeModal from "@/components/Admin/AddAttendeeModal";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import ImportAttendeeModal from "@/components/Admin/ImportAttendeeModal";
import IssueCertificateModal from "@/components/Admin/IssueCertificateModal";
import { StatCard } from "@/components/Admin/StatCard";
import { apiFetch, getEventAccess } from "@/lib/api";
import { pickLang } from "@/lib/pickLang";

// "de" is a language the admin's legacy { tr, en } copy maps do not list. Before WP32
// Phase 2 these components indexed those maps directly and crashed on `undefined`.
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    lang: "de",
    setLang: () => {},
    t: (key: string) => key,
    supportedLangs: ["tr", "en", "de"],
    langLabels: {},
  }),
  useT: () => (key: string) => key,
}));

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
  it("AddAttendeeModal shows its English copy instead of crashing", () => {
    render(<AddAttendeeModal open onClose={() => {}} onAdded={() => {}} eventId={7} />);
    expect(screen.getAllByText("Add Attendee").length).toBeGreaterThan(0);
  });

  it("ImportAttendeeModal shows its English copy instead of crashing", () => {
    render(<ImportAttendeeModal open onClose={() => {}} onImported={() => {}} eventId={7} />);
    expect(screen.getByText("Import Excel / CSV")).toBeInTheDocument();
  });

  it("IssueCertificateModal shows its English copy instead of crashing", () => {
    render(<IssueCertificateModal open onClose={() => {}} onIssued={() => {}} eventId={7} templateReady />);
    expect(screen.getAllByText("Issue Certificate").length).toBeGreaterThan(0);
  });

  it("EventAdminNav falls back to English tab labels instead of crashing", async () => {
    // Tabs only render once the event and the user's permissions have loaded.
    vi.mocked(apiFetch).mockResolvedValueOnce({
      json: async () => ({ id: 7, name: "Demo", certificate_enabled: true, checkin_enabled: true }),
    } as unknown as Response);
    vi.mocked(getEventAccess).mockResolvedValueOnce({
      permissions: { includes: () => true },
    } as unknown as Awaited<ReturnType<typeof getEventAccess>>);

    render(<EventAdminNav eventId={7} forceVisible />);
    expect((await screen.findAllByText("Attendees")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Katılımcılar")).not.toBeInTheDocument();
  });

  it("StatCard formats numbers in the active language", () => {
    render(<StatCard label="Total" value={1234567} />);
    expect(screen.getByText("1.234.567")).toBeInTheDocument();
  });
});
