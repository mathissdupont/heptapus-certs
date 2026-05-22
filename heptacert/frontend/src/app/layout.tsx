import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientShell } from "./_client-shell";
import { ToastProvider } from "@/components/Toast/ToastProvider";
import { ThemeInitializer } from "./_theme-initializer";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://cert.heptapusgroup.com"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HeptaCert",
  },
  formatDetection: {
    telephone: false,
  },
  title: {
    default: "HeptaCert",
    template: "%s | HeptaCert",
  },
  description: "Create, manage, and verify digital certificates for your events with Turkish and English support.",
  keywords: [
    "digital certificate",
    "sertifika yönetimi",
    "etkinlik yönetimi",
    "QR check-in",
    "certificate verification",
    "HeptaCert",
  ],
  alternates: {
    canonical: "/",
    languages: {
      tr: "/",
      en: "/?lang=en",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    siteName: "HeptaCert",
    type: "website",
    url: "/",
    title: "HeptaCert | Dijital Sertifika ve Etkinlik Yönetimi",
    description: "Etkinlik kayıtları, QR check-in, yoklama, sertifika üretimi ve doğrulama süreçlerini tek platformda yönetin.",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "HeptaCert | Dijital Sertifika ve Etkinlik Yönetimi",
    description: "Etkinlik kayıtları, QR check-in, yoklama, sertifika üretimi ve doğrulama süreçlerini tek platformda yönetin.",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://cert.heptapusgroup.com";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HeptaCert",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    url: baseUrl,
    description: "Etkinlik yönetimi, QR check-in, yoklama, dijital sertifika üretimi ve sertifika doğrulama platformu.",
    publisher: {
      "@type": "Organization",
      name: "Heptapus Group",
      url: "https://heptapusgroup.com",
    },
    offers: {
      "@type": "Offer",
      category: "SaaS",
      url: `${baseUrl}/pricing/business`,
    },
  };

  return (
    <html lang="tr" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="HeptaCert" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ThemeInitializer />
      </head>
      <body className="min-h-screen bg-slate-50 text-gray-900 antialiased transition-colors">
        <div
          className="fixed left-0 right-0 top-0 z-50 h-[3px]"
          style={{
            background: "linear-gradient(90deg, var(--site-brand-color, #7c3aed), rgba(124,58,237,0.8))",
          }}
        />
        <ClientShell>{children}</ClientShell>
        <ToastProvider />
      </body>
    </html>
  );
}
