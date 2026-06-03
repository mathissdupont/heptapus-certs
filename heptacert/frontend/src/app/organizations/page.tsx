"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Globe, Search, Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { listPublicOrganizations, type PublicOrganizationListItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function PublicOrganizationsPage() {
  const { lang } = useI18n();
  const [items, setItems] = useState<PublicOrganizationListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            title: "Topluluklar",
            subtitle: "Üniversite kulüplerini, bağımsız toplulukları ve kurumları keşfedin.",
            searchPlaceholder: "Topluluk adı veya web sitesi ara...",
            empty: "Aramanızla eşleşen topluluk bulunamadı.",
            error: "Topluluklar yüklenirken bir hata oluştu.",
            followers: "takipçi",
            events: "etkinlik",
            details: "İncele",
            noBio: "Bu topluluğun henüz bir açıklaması bulunmuyor.",
          }
        : {
            title: "Communities",
            subtitle: "Explore university clubs, independent communities, and institutions.",
            searchPlaceholder: "Search by community name or website...",
            empty: "No communities found matching your search.",
            error: "Failed to load communities.",
            followers: "followers",
            events: "events",
            details: "View",
            noBio: "This community has no description yet.",
          },
    [lang],
  );

  useEffect(() => {
    setLoading(true);
    listPublicOrganizations()
      .then((data) => setItems(data))
      .catch((err: unknown) => setError((err as { message?: string })?.message || copy.error))
      .finally(() => setLoading(false));
  }, [copy.error]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.org_name, item.bio, item.website_url].some((v) =>
        String(v || "").toLowerCase().includes(term),
      ),
    );
  }, [items, search]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-50 pb-20">
      {/* Header */}
      <section className="border-b border-surface-200 bg-white px-4 pb-8 pt-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-1.5 text-base text-surface-500">{copy.subtitle}</p>

          <div className="mt-6 max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="input-field pl-9"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-xl border border-surface-100 bg-white shadow-card animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="error-banner mx-auto max-w-md justify-center">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-surface-200 bg-surface-50">
              <Building2 className="h-5 w-5 text-surface-400" />
            </div>
            <p className="text-sm font-medium text-surface-700">{copy.empty}</p>
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((item) => (
              <motion.div key={item.public_id} variants={fadeUp}>
                <Link
                  href={`/organizations/${item.public_id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card transition-shadow hover:shadow-raised"
                >
                  <div className="flex flex-1 flex-col p-5">
                    {/* Logo + name */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-surface-200 bg-surface-50">
                        {item.brand_logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.brand_logo}
                            alt={item.org_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-base font-bold text-surface-400">
                            {item.org_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-semibold text-surface-900 transition-colors group-hover:text-surface-700">
                          {item.org_name}
                        </h2>
                        {item.website_url && (
                          <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-blue-600">
                            <Globe className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {item.website_url.replace(/^https?:\/\//, "")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-surface-500">
                      {item.bio || copy.noBio}
                    </p>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-surface-100 pt-3">
                      <div className="flex items-center gap-3 text-xs text-surface-400">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {item.follower_count} {copy.followers}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {item.event_count} {copy.events}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium text-surface-500 transition-colors group-hover:text-surface-900">
                        {copy.details}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
