import type { Metadata } from "next";
import RegisterClient from "./_register-client";

export const metadata: Metadata = {
  title: "Hesap Oluştur",
  description:
    "HeptaCert'e ücretsiz kaydolun. 100 HC hediye bakiyesiyle dijital sertifika oluşturmaya hemen başlayın.",
  openGraph: {
    title: "Hesap Oluştur | HeptaCert",
    description:
      "HeptaCert'e ücretsiz kaydolun. 100 HC hediye bakiyesiyle dijital sertifika oluşturmaya hemen başlayın.",
    type: "website",
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
