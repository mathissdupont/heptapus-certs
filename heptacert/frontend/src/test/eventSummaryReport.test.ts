import { describe, expect, it } from "vitest";
import type { EventOut } from "@/lib/api";
import { buildEventSummaryReport, plainEventDescription, type EventSummaryLabels } from "@/lib/eventSummaryReport";

const labels: EventSummaryLabels = {
  title: "EVENT REPORT",
  name: "Name",
  date: "Date",
  type: "Type",
  location: "Location",
  description: "Description",
  publicUrl: "Event URL",
  registrationUrl: "Registration URL",
  reviewNote: "Review dates, times and host before publishing.",
};

const sample: EventOut = {
  id: 43,
  public_id: "public-43",
  name: "Robotics Day",
  template_image_url: "",
  config: {},
  min_sessions_required: 0,
  event_date: "2026-10-02",
  event_description: "<p>Intro <strong>session</strong>.</p><script>alert('bad')</script>",
  event_location: "Main Hall",
  event_type: "workshop",
  visibility: "public",
  registration_enabled: true,
};

describe("event information report", () => {
  it("exports current public event details in a reusable text format", () => {
    const report = buildEventSummaryReport(sample, labels, "https://heptacert.com/", "Workshop");
    expect(report).toContain("Name: Robotics Day");
    expect(report).toContain("Date: 2026-10-02");
    expect(report).toContain("Type: Workshop");
    expect(report).toContain("Location: Main Hall");
    expect(report).toContain("Intro session.");
    expect(report).toContain("Event URL: https://heptacert.com/events/public-43");
    expect(report).toContain("Registration URL: https://heptacert.com/events/public-43/register");
    expect(report).toContain(labels.reviewNote);
    expect(report).not.toContain("<script>");
    expect(report).not.toContain("alert(");
  });

  it("does not advertise private or disabled registration links", () => {
    const privateReport = buildEventSummaryReport({ ...sample, visibility: "private" }, labels, "https://heptacert.com", "Workshop");
    expect(privateReport).not.toContain("https://heptacert.com/events/");
    const closedReport = buildEventSummaryReport({ ...sample, registration_enabled: false }, labels, "https://heptacert.com", "Workshop");
    expect(closedReport).toContain("Event URL:");
    expect(closedReport).not.toContain("Registration URL:");
    const stoppedReport = buildEventSummaryReport({ ...sample, registration_closed: true }, labels, "https://heptacert.com", "Workshop");
    expect(stoppedReport).not.toContain("Registration URL:");
  });

  it("never invents a date, time, location or event type", () => {
    const report = buildEventSummaryReport({ ...sample, event_date: null, event_location: null, event_type: undefined }, labels, "https://heptacert.com", "");
    expect(report).not.toContain("Date:");
    expect(report).not.toContain("Location:");
    expect(report).not.toContain("Type:");
    expect(report).not.toMatch(/Start time|End time/);
  });

  it("removes markup but preserves readable line breaks", () => {
    expect(plainEventDescription("<p>One<br>Two</p><p>Three</p>")).toBe("One\nTwo\nThree");
    expect(plainEventDescription('<a href="https://example.com/info">Details</a>')).toBe("Details (https://example.com/info)");
  });
});
