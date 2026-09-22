import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PublicOrganizationsPage from "@/components/public/PublicOrganizationsPage";
import { routing } from "@/i18n/routing";

const SITE = (process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://heptacert.com").replace(/\/$/, "");

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const title = t("public_orgs_title");
  const description = t("public_orgs_subtitle");
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE}/${locale}/organizations`,
      languages: {
        ...Object.fromEntries(routing.locales.map((item) => [item, `${SITE}/${item}/organizations`])),
        "x-default": `${SITE}/${routing.defaultLocale}/organizations`,
      },
    },
  };
}

export default async function LocalizedOrganizationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PublicOrganizationsPage />;
}
