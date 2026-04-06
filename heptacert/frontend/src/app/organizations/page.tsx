"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Globe, Search, Users } from "lucide-react";
import { motion } from "framer-motion";
import { listPublicOrganizations, type PublicOrganizationListItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function PublicOrganizationsPage() {
  const { lang } = useI18n();
  const [items, setItems] = useState<PublicOrganizationListItem[]>([]);
  const [filtered, setFiltered] = useState<PublicOrganizationListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => lang === "tr" ? {
    eyebrow: "Topluluklar",
    title: "Kuruluşları Keşfet",
    subtitle: "IEEE öğrenci kolları, topluluklar ve kurumlar için public sayfalar oluşturun; insanlar sizi takip edip etkinliklerinizi izlesin.",
    searchPlaceholder: "Kurum adı veya website ara...",
    empty: "Henüz public topluluk bulunamadı.",
    error: "Topluluklar yüklenemedi.",
    followers: "takipçi",
    events: "public etkinlik",
    details: "Topluluğa Git",
  } : {
    eyebrow: "Communities",
    title: "Discover Organizations",
    subtitle: "Give student clubs, communities, and institutions a public home where people can follow and explore upcoming events.",
    searchPlaceholder: "Search by organization or website...",
    empty: "No public organizations found yet.",
    error: "Failed to load organizations.",
    followers: "followers",
    events: "public events",
    details: "Open Community",
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    listPublicOrganizations()
      .then((data) => {
        setItems(data);
        setFiltered(data);
      })
      .catch((err: any) => setError(err?.message || copy.error))
      .finally(() => setLoading(false));
  }, [copy.error]);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      setFiltered(items);
      return;
    }
    setFiltered(
      items.filter((item) =>
        [item.org_name, item.bio, item.website_url].some((value) =>
          String(value || "").toLowerCase().includes(term)
        )
      )
    );
  }, [items, search]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 pb-24 pt-16 sm:px-10 lg:px-8 lg:pt-24">
      <section className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 shadow-sm">
          <Building2 className="h-3.5 w-3.5" />
          {copy.eyebrow}
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{copy.title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{copy.subtitle}</p>

        <div className="mx-auto mt-8 max-w-2xl rounded-2xl bg-white p-2 shadow-lg shadow-slate-200/60">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-xl border-none bg-transparent py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-[28px] border border-slate-200 bg-white" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-center text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            {copy.empty}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <motion.article
                key={item.public_id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <Link href={`/organizations/${item.public_id}`} className="block h-full p-6">
                  <div
                    className="rounded-[24px] p-5"
                    style={{ background: `linear-gradient(145deg, ${item.brand_color}22 0%, rgba(255,255,255,0.96) 68%)` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm">
                        {item.brand_logo ? (
                          <img src={item.brand_logo} alt={item.org_name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl font-black text-slate-700">{item.org_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-black text-slate-950">{item.org_name}</h2>
                        {item.website_url ? (
                          <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Globe className="h-3.5 w-3.5" />
                            <span className="truncate">{item.website_url}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">{item.bio || item.org_name}</p>
                  </div>

                  <div className="mt-5 flex items-center gap-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      {item.follower_count} {copy.followers}
                    </span>
                    <span>{item.event_count} {copy.events}</span>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-sm font-bold text-slate-900">
                    {copy.details}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
