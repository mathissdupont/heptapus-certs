import type { Metadata } from "next";
import HomeClient from "./_home-client";

export const metadata: Metadata = {
  title: "HeptaCert | Digital Certificate Platform",
  description: "Create, manage, and verify digital certificates for events, trainings, and branded certificate journeys.",
  openGraph: {
    title: "HeptaCert | Digital Certificate Platform",
    description: "Create, manage, and verify digital certificates from one operational workspace.",
    type: "website",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
