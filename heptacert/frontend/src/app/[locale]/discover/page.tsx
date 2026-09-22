import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import DiscoveryPage from "@/components/public/DiscoveryPage";
import { routing } from "@/i18n/routing";

const SITE = (process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://heptacert.com").replace(/\/$/, "");

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const title = t("public_hub_title");
  const description = t("public_hub_subtitle");
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE}/${locale}/discover`,
      languages: {
        ...Object.fromEntries(routing.locales.map((item) => [item, `${SITE}/${item}/discover`])),
        "x-default": `${SITE}/${routing.defaultLocale}/discover`,
      },
    },
  };
}

export default async function LocalizedDiscoverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DiscoveryPage />;
}
