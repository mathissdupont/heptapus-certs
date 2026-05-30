"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LanguageToggle, useI18n } from "@/lib/i18n";

const links = {
  tr: [
    { href: "/events", label: "Etkinlikler" },
    { href: "/organizations", label: "Topluluklar" },
    { href: "/pricing/business", label: "Fiyatlandırma" },
    { href: "/verify", label: "Doğrula" },
  ],
  en: [
    { href: "/events", label: "Events" },
    { href: "/organizations", label: "Communities" },
    { href: "/pricing/business", label: "Pricing" },
    { href: "/verify", label: "Verify" },
  ],
};

export default function PublicNav() {
  const pathname = usePathname() || "";
  const { lang } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/86 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Image src="/logo.svg" alt="HeptaCert" width={160} height={42} className="h-8 w-auto" priority />
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {links[lang].map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  active ? "bg-zinc-100 text-zinc-950" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-2">
          <LanguageToggle className="hidden rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 shadow-sm hover:bg-zinc-50 sm:inline-flex" />
          <Link href="/login" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50">
            {lang === "tr" ? "Giriş" : "Login"}
          </Link>
          <Link href="/register?mode=organizer" className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800">
            {lang === "tr" ? "Başla" : "Start"}
          </Link>
        </div>
      </div>
    </header>
  );
}
