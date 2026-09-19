"use client";

import { useEffect } from "react";

// The root layout owns <html> (and renders lang="tr") because it also serves the
// non-localized authenticated app. On locale-routed public pages we correct the
// document language to the active locale. SSR hreflang/canonical remain the primary
// SEO signals; a fully SSR <html lang> is a Faz C refinement.
export default function HtmlLangSetter({ locale }: { locale: string }) {
  useEffect(() => {
    if (locale) document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
