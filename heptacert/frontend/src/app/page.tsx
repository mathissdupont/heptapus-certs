import type { Metadata } from "next";
import HomeClient from "./_home-client";

export const metadata: Metadata = {
  title: "HeptaCert — Uçtan Uca Etkinlik Yönetim Platformu",
  description:
    "Kayıt formlarından QR check-in'e, otomatik sertifikadan e-posta kampanyasına — etkinlik organizatörlerinin ihtiyaç duyduğu her şey tek platformda. Ücretsiz başlayın.",
  openGraph: {
    title: "HeptaCert — Uçtan Uca Etkinlik Yönetim Platformu",
    description:
      "Kayıt, QR yoklama, sertifika, e-posta otomasyonu, CRM ve analitik. Etkinliklerinizi baştan sona yönetin.",
  },
  twitter: {
    title: "HeptaCert — Uçtan Uca Etkinlik Yönetim Platformu",
    description:
      "Kayıt, QR yoklama, sertifika, e-posta otomasyonu, CRM ve analitik. Etkinliklerinizi baştan sona yönetin.",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
