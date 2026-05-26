import type { ReactNode } from "react";
import { EventAdminLayoutShell } from "./_event-admin-layout-shell";

type EventLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { id } = await params;
  return <EventAdminLayoutShell eventId={id}>{children}</EventAdminLayoutShell>;
}
