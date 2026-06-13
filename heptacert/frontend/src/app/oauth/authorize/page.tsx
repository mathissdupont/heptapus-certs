import type { Metadata } from "next";
import OAuthConsentClient from "./_client";

export const metadata: Metadata = {
  title: "Yetkilendirme | HeptaCert",
  robots: { index: false, follow: false },
};

export default function OAuthAuthorizePage() {
  return <OAuthConsentClient />;
}
