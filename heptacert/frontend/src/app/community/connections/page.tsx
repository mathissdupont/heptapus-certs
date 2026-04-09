import { Metadata } from "next";
import { ConnectionsClient } from "./_client";

export const metadata: Metadata = {
  title: "Connections | Heptacert Community",
  description: "View and manage your community connections and followers",
};

export default function ConnectionsPage() {
  return <ConnectionsClient />;
}
