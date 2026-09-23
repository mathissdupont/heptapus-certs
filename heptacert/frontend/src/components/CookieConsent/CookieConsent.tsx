"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useT } from "@/lib/i18n";

const STORAGE_KEY = "heptacert_cookie_consent";
const CONSENT_VERSION = "1";

type ConsentState = "accepted" | "declined" | null;

type CookieNoticeCopy = {
  aria: string;
  title: string;
  description: string;
  privacyLink: string;
  dismiss: string;
};

function CookieConsentNotice({ copy }: { copy: CookieNoticeCopy }) {
  const [state, setState] = useState<ConsentState | "loading">("loading");
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed?.version === CONSENT_VERSION && (parsed.value === "accepted" || parsed.value === "declined")) {
        setState(parsed.value as ConsentState);
      } else {
        setState(null);
      }
    } catch {
      setState(null);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const banner = bannerRef.current;
    if (state !== null || !banner) {
      root.style.setProperty("--heptacert-cookie-consent-height", "0px");
      return;
    }

    const updateOffset = () => {
      root.style.setProperty("--heptacert-cookie-consent-height", `${Math.ceil(banner.getBoundingClientRect().height)}px`);
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateOffset);
    observer?.observe(banner);

    return () => {
      window.removeEventListener("resize", updateOffset);
      observer?.disconnect();
      root.style.setProperty("--heptacert-cookie-consent-height", "0px");
    };
  }, [state]);

  function save(value: "accepted" | "declined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CONSENT_VERSION, value, at: new Date().toISOString() }));
    } catch {
      // storage unavailable — proceed without persisting
    }
    setState(value);
  }

  if (state === "loading" || state === "accepted" || state === "declined") return null;

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-live="polite"
      aria-label={copy.aria}
      className="fixed bottom-0 left-0 right-0 z-[80] border-t border-outline-subtle bg-raised/95 px-4 py-4 shadow-float backdrop-blur sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-bold text-content-primary">
            {copy.title}
          </p>
          <p className="text-11 leading-relaxed text-content-muted">
            {copy.description}{" "}
            <Link href="/gizlilik" className="font-semibold text-content-secondary underline underline-offset-2 hover:text-content-primary">
              {copy.privacyLink}
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => save("accepted")}
            className="rounded-lg bg-content-primary px-4 py-1.5 text-11 font-semibold text-content-inverted transition hover:bg-content-primary-soft"
          >
            {copy.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CookieConsent() {
  const t = useT();
  return (
    <CookieConsentNotice
      copy={{
        aria: t("cookie_notice_aria"),
        title: t("cookie_notice_title"),
        description: t("cookie_notice_description"),
        privacyLink: t("cookie_notice_privacy_link"),
        dismiss: t("cookie_notice_dismiss"),
      }}
    />
  );
}

export function LocalizedCookieConsent() {
  const t = useTranslations();
  return (
    <CookieConsentNotice
      copy={{
        aria: t("cookie_notice_aria"),
        title: t("cookie_notice_title"),
        description: t("cookie_notice_description"),
        privacyLink: t("cookie_notice_privacy_link"),
        dismiss: t("cookie_notice_dismiss"),
      }}
    />
  );
}
