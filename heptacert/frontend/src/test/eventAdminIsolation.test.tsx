import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EventAdminLayoutShell } from "@/app/admin/events/[id]/_event-admin-layout-shell";
import { getEventAccess } from "@/lib/api";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/events/44/settings",
  useRouter: () => navigation,
}));

vi.mock("@/lib/api", () => ({
  getEventAccess: vi.fn(),
}));

vi.mock("@/components/Admin/EventAdminNav", () => ({
  default: () => <div data-testid="event-admin-nav">event navigation</div>,
  EventAdminLayoutProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("event admin tenant isolation", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    vi.mocked(getEventAccess).mockReset();
  });

  afterEach(cleanup);

  it("never renders event navigation or content when the event access check fails", async () => {
    vi.mocked(getEventAccess).mockRejectedValueOnce(new Error("Event not found"));

    render(
      <EventAdminLayoutShell eventId="44">
        <div>private event content</div>
      </EventAdminLayoutShell>,
    );

    expect(screen.queryByTestId("event-admin-nav")).not.toBeInTheDocument();
    expect(screen.queryByText("private event content")).not.toBeInTheDocument();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/admin/events"));
    expect(screen.queryByTestId("event-admin-nav")).not.toBeInTheDocument();
    expect(screen.queryByText("private event content")).not.toBeInTheDocument();
  });

  it("hides the previous event immediately when the URL event ID changes", async () => {
    vi.mocked(getEventAccess).mockResolvedValueOnce({ permissions: ["settings:write"] } as Awaited<ReturnType<typeof getEventAccess>>);
    vi.mocked(getEventAccess).mockImplementationOnce(() => new Promise(() => {}));

    const { rerender } = render(
      <EventAdminLayoutShell eventId="44">
        <div>event 44 content</div>
      </EventAdminLayoutShell>,
    );
    expect(await screen.findByText("event 44 content")).toBeInTheDocument();

    rerender(
      <EventAdminLayoutShell eventId="45">
        <div>event 45 content</div>
      </EventAdminLayoutShell>,
    );
    expect(screen.queryByTestId("event-admin-nav")).not.toBeInTheDocument();
    expect(screen.queryByText("event 45 content")).not.toBeInTheDocument();
  });
});
