import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import LandingPageClient from "@/components/landing/LandingPageClient";
import { routing } from "@/i18n/routing";

const SITE = (process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://heptacert.com").replace(/\/$/, "");

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const languages = Object.fromEntries(routing.locales.map((item) => [item, `${SITE}/${item}`]));
  const title = t("home_title_default");
  const description = t("home_body_default");
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE}/${locale}`,
      languages: { ...languages, "x-default": `${SITE}/${routing.defaultLocale}` },
    },
    openGraph: { type: "website", url: `${SITE}/${locale}`, title, description, locale },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function LocalizedHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LandingPageClient />;
}
