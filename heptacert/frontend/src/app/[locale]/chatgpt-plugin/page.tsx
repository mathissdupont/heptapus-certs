import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import ChatGPTPluginPage from "@/components/public/ChatGPTPluginPage";
import { routing } from "@/i18n/routing";

const SITE = (process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://heptacert.com").replace(/\/$/, "");

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const title = t("chatgpt_plugin_meta_title");
  const description = t("chatgpt_plugin_meta_desc");
  const languages = Object.fromEntries(
    routing.locales.map((item) => [item, `${SITE}/${item}/chatgpt-plugin`]),
  );

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE}/${locale}/chatgpt-plugin`,
      languages: { ...languages, "x-default": `${SITE}/${routing.defaultLocale}/chatgpt-plugin` },
    },
    openGraph: { type: "website", url: `${SITE}/${locale}/chatgpt-plugin`, title, description, locale },
    twitter: { card: "summary", title, description },
  };
}

export default async function LocalizedChatGPTPluginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ChatGPTPluginPage />;
}
