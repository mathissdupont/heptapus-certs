"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Globe, Search, Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { listPublicOrganizations, type PublicOrganizationListItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import PublicNav from "@/components/Public/PublicNav";

export default function PublicOrganizationsPage() {
  const { lang } = useI18n();
  const [items, setItems] = useState<PublicOrganizationListItem[]>([]);
  const [filtered, setFiltered] = useState<PublicOrganizationListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => lang === "tr" ? {
    eyebrow: "Topluluk Dizini",
    title: "Toplulukları Keşfet",
    subtitle: "Üniversite kulüplerini, bağımsız toplulukları ve kurumları inceleyin. Etkinliklerini kaçırmamak için takip edin.",
    searchPlaceholder: "Topluluk adı veya websitesi ile ara...",
    empty: "Aramanızla eşleşen bir topluluk bulunamadı.",
    error: "Topluluklar yüklenirken bir hata oluştu.",
    followers: "Takipçi",
    events: "Etkinlik",
    details: "İncele",
  } : {
    eyebrow: "Community Directory",
    title: "Discover Communities",
    subtitle: "Explore university clubs, independent communities, and institutions. Follow them to stay updated on their events.",
    searchPlaceholder: "Search by community name or website...",
    empty: "No communities found matching your search.",
    error: "Failed to load communities.",
    followers: "Followers",
    events: "Events",
    details: "View",
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

  // Framer Motion list animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 text-zinc-950">
      <PublicNav />
      <main className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      {/* Hero Section */}
      <section className="mx-auto max-w-3xl text-center mb-10 sm:mb-12">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shadow-sm mb-6"
        >
          <Building2 className="h-3.5 w-3.5" />
          {copy.eyebrow}
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4"
        >
          {copy.title}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
        >
          {copy.subtitle}
        </motion.p>
      </section>

      {/* Search Bar */}
      <section className="mx-auto max-w-2xl mb-12 sm:mb-16">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="relative group"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-zinc-700 transition-colors" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="block w-full rounded-2xl border border-zinc-200 bg-white py-3.5 pl-11 pr-4 text-sm text-zinc-950 shadow-sm outline-none placeholder:text-zinc-400 transition-all focus:border-zinc-400 focus:ring-4 focus:ring-zinc-950/5 sm:text-base"
          />
        </motion.div>
      </section>

      {/* Content Grid */}
      <section className="mx-auto max-w-6xl">
        {loading ? (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[240px] sm:h-[280px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 p-6 text-center text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-transparent py-16 sm:py-20 text-center px-4">
            <Building2 className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{copy.empty}</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((item) => (
              <motion.div key={item.public_id} variants={itemVariants} className="flex">
                <Link 
                  href={`/organizations/${item.public_id}`}
                  className="group flex flex-col w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all overflow-hidden relative"
                >
                  {/* Subtle Brand Color Accent Top Border */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1 opacity-80" 
                    style={{ backgroundColor: item.brand_color || '#1c1917' }}
                  />

                  {/* Mobilde biraz daha dar (p-5), masaüstünde ferah (sm:p-6) iç boşluk */}
                  <div className="p-5 sm:p-6 flex flex-col flex-grow min-w-0">
                    
                    {/* Header: Logo & Name */}
                    <div className="flex items-start gap-3 sm:gap-4 mb-4">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        {item.brand_logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={item.brand_logo} 
                            alt={item.org_name} 
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <span className="text-lg sm:text-xl font-bold text-gray-400">
                            {item.org_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {/* min-w-0 EKLEDİK: Flexbox taşma sorununun ana çözümü */}
                      <div className="min-w-0 flex-1 pt-0.5 sm:pt-1">
                        <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-zinc-700 transition-colors">
                          {item.org_name}
                        </h2>
                        
                        {item.website_url && (
                          /* URL wrapper'ına da min-w-0 eklendi ki truncate çalışsın */
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 min-w-0">
                            <Globe className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{item.website_url.replace(/^https?:\/\//, '')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio - break-words eklendi */}
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed flex-grow break-words">
                      {item.bio || "Bu topluluğun henüz bir açıklaması bulunmuyor."}
                    </p>

                    {/* Footer Stats & CTA */}
                    <div className="mt-5 sm:mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-gray-500 truncate">
                          <Users className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{item.follower_count} <span className="hidden sm:inline">{copy.followers}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-gray-500 truncate">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{item.event_count} <span className="hidden sm:inline">{copy.events}</span></span>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-gray-900 dark:text-white group-hover:text-zinc-700 transition-colors flex-shrink-0 pl-2">
                        <span className="hidden xs:inline">{copy.details}</span>
                        <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
      </main>
    </div>
  );
}
