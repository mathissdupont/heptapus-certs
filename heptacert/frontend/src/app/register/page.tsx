import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterHub from "./_register-hub";

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
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center" />}>
      <RegisterHub />
    </Suspense>
  );
}
