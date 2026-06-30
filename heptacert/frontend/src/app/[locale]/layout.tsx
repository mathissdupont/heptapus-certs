import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import HtmlLangSetter from "@/components/i18n/HtmlLangSetter";

// Nested under the root layout (which owns <html>/<body> and the app providers).
// This layer only establishes the next-intl request locale + client context for
// public, locale-prefixed routes (ADR-0021). The authenticated app is unaffected.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  return (
    <NextIntlClientProvider>
      <HtmlLangSetter locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
