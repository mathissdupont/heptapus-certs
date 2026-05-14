import type { Metadata } from "next";
import HomeClient from "./_home-client";

export const metadata: Metadata = {
  title: "HeptaCert | Digital Certificate Platform",
  description: "HeptaCert is a digital certificate and event management platform operated by Heptapus Group.",
  openGraph: {
    title: "HeptaCert | Digital Certificate Platform",
    description: "HeptaCert is a digital certificate and event management platform operated by Heptapus Group.",
    type: "website",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
