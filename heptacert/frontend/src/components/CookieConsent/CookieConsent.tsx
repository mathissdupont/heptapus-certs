"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "heptacert_cookie_consent";
const CONSENT_VERSION = "1";

type ConsentState = "accepted" | "declined" | null;

export default function CookieConsent() {
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
      aria-label="Çerez ve veri kullanım bildirimi"
      className="fixed bottom-0 left-0 right-0 z-[80] border-t border-outline-subtle bg-raised/95 px-4 py-4 shadow-float backdrop-blur sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1 pr-6">
          <p className="text-xs font-bold text-content-primary">
            Çerez ve Veri Bildirimi
          </p>
          <p className="text-11 leading-relaxed text-content-muted">
            Oturum yönetimi ve tercihlerinizi hatırlamak için tarayıcınızdaki
            localStorage'ı kullanıyoruz. Analitik veya reklam çerezi kullanmıyoruz.{" "}
            <Link href="/kvkk" className="font-semibold text-content-secondary underline underline-offset-2 hover:text-content-primary">
              KVKK Aydınlatma Metni
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => save("declined")}
            className="rounded-lg border border-outline-subtle bg-raised px-3 py-1.5 text-11 font-semibold text-content-secondary transition hover:bg-sunken"
          >
            Sadece Zorunlu
          </button>
          <button
            type="button"
            onClick={() => save("accepted")}
            className="rounded-lg bg-content-primary px-4 py-1.5 text-11 font-semibold text-content-inverted transition hover:bg-content-primary-soft"
          >
            Kabul Et
          </button>
          <button
            type="button"
            onClick={() => save("declined")}
            aria-label="Kapat"
            className="ml-1 rounded-lg p-1 text-content-faint transition hover:bg-sunken hover:text-content-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
