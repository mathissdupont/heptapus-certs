"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Globe, Search, Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { listPublicOrganizations, type PublicOrganizationListItem } from "@/lib/api";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function PublicOrganizationsPage() {
  const t = useTranslations();
  const [items, setItems] = useState<PublicOrganizationListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    title: t("public_orgs_title"),
    subtitle: t("public_orgs_subtitle"),
    searchPlaceholder: t("public_orgs_search"),
    empty: t("public_orgs_empty"),
    error: t("public_orgs_error"),
    followers: t("public_orgs_followers"),
    events: t("public_orgs_events"),
    details: t("public_orgs_details"),
    noBio: t("public_orgs_no_bio"),
  };

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
    <div className="flex min-h-screen flex-col bg-canvas pb-20">
      {/* Header */}
      <section className="border-b border-outline-subtle bg-raised px-4 pb-8 pt-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold tracking-tight text-content-primary sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-1.5 text-base text-content-muted">{copy.subtitle}</p>

          <div className="mt-6 max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-faint" />
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
              <div key={i} className="h-52 rounded-xl border border-outline-subtle bg-raised shadow-card animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="error-banner mx-auto max-w-md justify-center">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-outline-subtle bg-sunken">
              <Building2 className="h-5 w-5 text-content-faint" />
            </div>
            <p className="text-sm font-medium text-content-secondary">{copy.empty}</p>
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
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-outline-subtle bg-raised shadow-card transition-shadow hover:shadow-raised"
                >
                  <div className="flex flex-1 flex-col p-5">
                    {/* Logo + name */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-outline-subtle bg-sunken">
                        {item.brand_logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.brand_logo}
                            alt={item.org_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-base font-bold text-content-faint">
                            {item.org_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-semibold text-content-primary transition-colors group-hover:text-content-secondary">
                          {item.org_name}
                        </h2>
                        {item.website_url && (
                          <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-accent">
                            <Globe className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {item.website_url.replace(/^https?:\/\//, "")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-content-muted">
                      {item.bio || copy.noBio}
                    </p>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-outline-subtle pt-3">
                      <div className="flex items-center gap-3 text-xs text-content-faint">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {item.follower_count} {copy.followers}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {item.event_count} {copy.events}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium text-content-muted transition-colors group-hover:text-content-primary">
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
