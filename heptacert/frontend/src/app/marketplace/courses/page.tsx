"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Loader2, Play, Search } from "lucide-react";
import { publicApiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type MarketplaceCourse = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  category: string | null;
  level: string;
  language: string;
  price: number | null;
  module_count: number;
  org_name: string | null;
  org_logo: string | null;
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Başlangıç",
  intermediate: "Orta",
  advanced: "İleri",
};

const CATEGORIES = [
  "Bilgi Teknolojileri", "Proje Yönetimi", "İnsan Kaynakları",
  "Finans & Muhasebe", "Pazarlama", "Satış",
  "Üretim & Kalite", "Sağlık & Güvenlik", "Hukuk & Uyum",
  "Kişisel Gelişim", "Liderlik & Yönetim", "Diğer",
];

export default function CourseMarketplacePage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const [courses, setCourses] = useState<MarketplaceCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);

  async function load(search?: string, cat?: string, free?: boolean) {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (cat) params.set("category", cat);
    if (free) params.set("free_only", "true");
    const res = await publicApiFetch(`/public/marketplace/courses?${params}`);
    const data = await (res as Response).json();
    setCourses(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(q, category, freeOnly);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">
          {isTr ? "Kurs Kataloğu" : "Course Catalog"}
        </h1>
        <p className="text-gray-500 text-sm">
          {isTr
            ? "Sertifikalı kursları keşfedin ve kariyerinize değer katın."
            : "Discover certified courses and grow your career."}
        </p>
        {/* Category tabs: Events / Courses */}
        <div className="flex gap-2">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            {isTr ? "Etkinlikler" : "Events"}
          </Link>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">
            <BookOpen className="w-4 h-4" />
            {isTr ? "Kurslar" : "Courses"}
          </span>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder={isTr ? "Kurs ara..." : "Search courses..."}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={category}
          onChange={(e) => { setCategory(e.target.value); load(q, e.target.value, freeOnly); }}
        >
          <option value="">{isTr ? "Tüm Kategoriler" : "All Categories"}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={freeOnly}
            onChange={(e) => { setFreeOnly(e.target.checked); load(q, category, e.target.checked); }}
            className="rounded"
          />
          {isTr ? "Sadece ücretsiz" : "Free only"}
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          {isTr ? "Ara" : "Search"}
        </button>
      </form>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p>{isTr ? "Kurs bulunamadı." : "No courses found."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              {c.thumbnail_url ? (
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={c.thumbnail_url}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {c.preview_video_url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="w-4 h-4 text-indigo-700 ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-44 bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-indigo-200" />
                </div>
              )}

              {/* Content */}
              <div className="p-4 space-y-2">
                {c.category && (
                  <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
                    {c.category}
                  </span>
                )}
                <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                  {c.title}
                </h3>
                {c.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{c.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
                  <span className="capitalize">{LEVEL_LABELS[c.level] ?? c.level}</span>
                  <span>{c.module_count} modül</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5">
                    {c.org_logo && (
                      <img src={c.org_logo} alt="" className="w-4 h-4 rounded-full object-cover" />
                    )}
                    {c.org_name && (
                      <span className="text-xs text-gray-400 truncate max-w-[120px]">{c.org_name}</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-indigo-700">
                    {c.price ? `₺${c.price}` : (isTr ? "Ücretsiz" : "Free")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
