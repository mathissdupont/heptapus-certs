import type { Metadata } from "next";
import "./globals.css";
import { ClientShell } from "./_client-shell";
import { ToastProvider } from "@/components/Toast/ToastProvider";
import { ThemeInitializer } from "./_theme-initializer";

export const metadata: Metadata = {
  title: {
    default: "HeptaCert — Dijital Sertifika Platformu",
    template: "%s | HeptaCert",
  },
  description: "Etkinlikleriniz için dijital sertifika oluşturun, yönetin ve doğrulayın.",
  openGraph: {
    siteName: "HeptaCert",
    type: "website",
  },
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <ThemeInitializer />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased min-h-screen transition-colors">
        {/* Top accent bar */}
        <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-gradient-to-r from-brand-500 via-brand-400 to-violet-400" />
        <ClientShell>{children}</ClientShell>
        <ToastProvider />
      </body>
    </html>
  );
}