import type { Metadata } from "next";
import VerifyClient from "./_verify-client";

export const metadata: Metadata = {
  title: "Certificate Verification",
  description: "Verify a digital certificate instantly with UUID, QR, or image-based validation.",
  openGraph: {
    title: "Certificate Verification | HeptaCert",
    description: "Verify a digital certificate instantly with UUID, QR, or image-based validation.",
    type: "website",
  },
};

export default function VerifyPage() {
  return <VerifyClient />;
}
