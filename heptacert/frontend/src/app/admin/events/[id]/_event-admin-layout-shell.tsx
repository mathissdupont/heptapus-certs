"use client";

import type { ReactNode } from "react";
import EventAdminNav, { EventAdminLayoutProvider } from "@/components/Admin/EventAdminNav";

type EventAdminLayoutShellProps = {
  eventId: string;
  children: ReactNode;
};

export function EventAdminLayoutShell({ eventId, children }: EventAdminLayoutShellProps) {
  return (
    <EventAdminLayoutProvider hideInlineNav>
      <div className="flex flex-col gap-4">
        <EventAdminNav eventId={eventId} variant="sidebar" />
        <div className="min-w-0">{children}</div>
      </div>
    </EventAdminLayoutProvider>
  );
}
