import type { Metadata } from "next";
import VerifyClient from "./_verify-client";

export const metadata: Metadata = {
  title: "Sertifika Doğrulama",
  description:
    "Bir HeptaCert dijital sertifikasının gerçekliğini QR kod veya benzersiz UUID ile anında doğrulayın.",
  openGraph: {
    title: "Sertifika Doğrulama | HeptaCert",
    description:
      "Bir HeptaCert dijital sertifikasının gerçekliğini QR kod veya benzersiz UUID ile anında doğrulayın.",
    type: "website",
  },
};

export default function VerifyPage() {
  return <VerifyClient />;
}
