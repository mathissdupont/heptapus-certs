import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://heptacert.com").replace(/\/$/, "");

// Per-locale SEO metadata + hreflang alternates — the mechanism that makes each
// language independently indexable (ADR-0021). Strings come from the shared flat
// catalog (src/locales/<locale>.ts), the same source the rest of the app uses.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const path = "/i18n-pilot";
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE}/${l}${path}`]),
  );
  return {
    title: t("home_title_default"),
    description: t("home_body_default"),
    alternates: {
      canonical: `${SITE}/${locale}${path}`,
      languages: { ...languages, "x-default": `${SITE}/${routing.defaultLocale}${path}` },
    },
  };
}

export default async function I18nPilotPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{locale}</p>
      <h1 className="mb-4 text-3xl font-extrabold text-slate-900">{t("home_features_title_default")}</h1>
      <p className="mb-8 text-slate-600">{t("home_features_body")}</p>
      <a
        href={`/${locale}/pricing`}
        className="inline-flex rounded-lg bg-slate-900 px-5 py-2.5 font-bold text-white"
      >
        {t("home_primary_cta")}
      </a>
    </main>
  );
}
