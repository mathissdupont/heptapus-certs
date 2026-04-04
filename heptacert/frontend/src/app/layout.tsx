import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientShell } from "./_client-shell";
import { ToastProvider } from "@/components/Toast/ToastProvider";
import { ThemeInitializer } from "./_theme-initializer";

export const metadata: Metadata = {
  title: {
    default: "HeptaCert | Digital Certificate Platform",
    template: "%s | HeptaCert",
  },
  description: "Create, manage, and verify digital certificates for your events with Turkish and English support.",
  openGraph: {
    siteName: "HeptaCert",
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
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
