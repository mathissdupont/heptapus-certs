import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ClientShell } from "./_client-shell";
import { ToastProvider } from "@/components/Toast/ToastProvider";
import { ThemeInitializer } from "./_theme-initializer";
import CookieConsent from "@/components/CookieConsent/CookieConsent";

type BrandingMetadata = {
  org_name?: string | null;
  brand_logo?: string | null;
  brand_color?: string | null;
  settings?: {
    public_bio?: string | null;
    hide_heptacert_home?: boolean;
  } | null;
};

const PLATFORM_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "heptacert.com",
  "www.heptacert.com",
  "cert.heptapusgroup.com",
]);

const DEFAULT_DESCRIPTION = "Create, manage, and verify digital certificates for your events with Turkish and English support.";
const DEFAULT_TR_DESCRIPTION = "Etkinlik kayıtları, QR check-in, yoklama, sertifika üretimi ve doğrulama süreçlerini tek platformda yönetin.";

function metadataApiBase() {
  return (
    process.env.NEXT_SERVER_API_BASE ||
    process.env.INTERNAL_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:8765/api"
  ).replace(/\/$/, "");
}

async function getBrandingForHost(host: string): Promise<BrandingMetadata | null> {
  const hostname = host.split(":")[0].toLowerCase();
  if (!hostname || PLATFORM_HOSTS.has(hostname)) return null;

  try {
    const response = await fetch(`${metadataApiBase()}/branding`, {
      headers: { Host: host },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as BrandingMetadata;
    return data?.org_name ? data : null;
  } catch {
    return null;
  }
}

async function currentBranding() {
  const headerList = await headers();
  const host = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(",")[0].trim();
  return getBrandingForHost(host);
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await currentBranding();
  const brandName = branding?.org_name || "HeptaCert";
  const description = branding?.settings?.public_bio || DEFAULT_DESCRIPTION;
  const icon = branding?.brand_logo || null;

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://cert.heptapusgroup.com"),
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: brandName,
    },
    formatDetection: {
      telephone: false,
    },
    title: {
      default: brandName,
      template: `%s | ${brandName}`,
    },
    description,
    keywords: [
      "digital certificate",
      "sertifika yönetimi",
      "etkinlik yönetimi",
      "QR check-in",
      "certificate verification",
      brandName,
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
      siteName: brandName,
      type: "website",
      url: "/",
      title: brandName,
      description,
      locale: "tr_TR",
      images: icon ? [icon] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: brandName,
      description,
      images: icon ? [icon] : undefined,
    },
    icons: icon
      ? {
          icon: [{ url: icon }],
          apple: [{ url: icon }],
        }
      : {
          icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
          apple: [{ url: "/logo.png", sizes: "180x180" }],
        },
  };
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#18181B",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await currentBranding();
  const brandName = branding?.org_name || "HeptaCert";
  const brandLogo = branding?.brand_logo || null;
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://cert.heptapusgroup.com";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: brandName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    url: baseUrl,
    description: branding?.settings?.public_bio || DEFAULT_TR_DESCRIPTION,
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
        <meta name="apple-mobile-web-app-title" content={brandName} />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href={brandLogo || "/favicon.svg"} type={brandLogo ? undefined : "image/svg+xml"} />
        <link rel="apple-touch-icon" sizes="180x180" href={brandLogo || "/logo.png"} />
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
            background: "linear-gradient(90deg, #111827, #374151)",
          }}
        />
        <ClientShell>{children}</ClientShell>
        <ToastProvider />
        <CookieConsent />
      </body>
    </html>
  );
}
