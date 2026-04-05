"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2, MapPin, ShieldCheck, Ticket, UserCircle2, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { getPublicMemberMe, listMyPublicEvents, type PublicMemberEvent } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function formatDate(value: string | null | undefined, lang: "tr" | "en") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const cardVariant = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

export default function MyEventsPage() {
  const { lang } = useI18n();
  const [memberName, setMemberName] = useState("");
  const [items, setItems] = useState<PublicMemberEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => lang === "tr" ? {
    eyebrow: "Üye Paneli",
    title: "Katıldığım Etkinlikler",
    subtitle: "Hesabınıza bağlı tüm etkinlik kayıtlarını, katılım durumunuzu ve sertifika hak edişlerinizi buradan takip edebilirsiniz.",
    emptyTitle: "Henüz bir etkinliğe katılmadınız",
    emptySubtitle: "Bu hesaba bağlı aktif bir etkinlik kaydı bulunamadı. Hemen yeni etkinlikler keşfedin.",
    exploreEvents: "Etkinlikleri Keşfet",
    loginRequiredTitle: "Giriş Yapmanız Gerekiyor",
    loginRequired: "Biletlerinizi ve katıldığınız etkinlikleri görmek için üye hesabınızla giriş yapmalısınız.",
    goLogin: "Sistem Girişi",
    openEvent: "Etkinliğe Git",
    status: "Durum Sayfası",
    verified: "Kayıt Onaylandı",
    pending: "Onay Bekliyor",
    attendance: "Katılım Durumu",
    fallback: "Etkinlikler yüklenirken bir sorun oluştu.",
    sessionWord: "oturum",
  } : {
    eyebrow: "Member Dashboard",
    title: "My Events",
    subtitle: "Track your event registrations, attendance progress, and certificate eligibility all in one place.",
    emptyTitle: "No events found",
    emptySubtitle: "There are no event registrations linked to your account yet. Start exploring!",
    exploreEvents: "Explore Events",
    loginRequiredTitle: "Authentication Required",
    loginRequired: "You need to sign in with your member account to view your tickets and events.",
    goLogin: "Member Login",
    openEvent: "View Event",
    status: "Status Page",
    verified: "Registration Verified",
    pending: "Pending Approval",
    attendance: "Attendance Progress",
    fallback: "Failed to load your events.",
    sessionWord: "sessions",
  }, [lang]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([getPublicMemberMe(), listMyPublicEvents()])
      .then(([member, events]) => {
        if (!active) return;
        setMemberName(member.display_name || member.email);
        setItems(events);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || copy.fallback);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [copy.fallback]);

  // --- SKELETON LOADER ---
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-12 space-y-4">
          <div className="h-6 w-32 animate-pulse rounded-full bg-slate-200"></div>
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200"></div>
          <div className="h-4 w-96 animate-pulse rounded bg-slate-200"></div>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="h-48 w-full animate-pulse bg-slate-200"></div>
              <div className="p-6 space-y-4">
                <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200"></div>
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200"></div>
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200 mt-6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- AUTH ERROR STATE ---
  if (error?.includes("401") || error === "Oturum sona erdi.") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/40">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <UserCircle2 className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-900">{copy.loginRequiredTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{copy.loginRequired}</p>
          <Link href="/login?mode=member" className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-800">
            {copy.goLogin} <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 selection:bg-slate-200 pb-24">

      {/* PAGE HEADER */}
      <section className="px-6 pt-12 pb-10 sm:px-10 lg:pt-16 lg:pb-12 max-w-7xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 shadow-sm">
          <UserCircle2 className="h-4 w-4" />
          {copy.eyebrow}
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          {memberName ? `${lang === "tr" ? "Merhaba" : "Hello"}, ${memberName.split(' ')[0]}` : copy.title}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          {copy.subtitle}
        </motion.p>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        {error && !error.includes("401") ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          /* EMPTY STATE */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
            <Ticket className="mb-5 h-12 w-12 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-900">{copy.emptyTitle}</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{copy.emptySubtitle}</p>
            <Link href="/events" className="mt-8 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 shadow-sm">
              {copy.exploreEvents}
            </Link>
          </motion.div>
        ) : (
          /* EVENTS GRID */
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const verified = item.email_verified; // Or whatever signifies verified registration
              const totalSessions = item.min_sessions_required || 1;
              const attended = item.sessions_attended || 0;
              const progressPct = Math.min(100, Math.round((attended / totalSessions) * 100));
              const isCompleted = attended >= totalSessions && totalSessions > 0;

              return (
                <motion.article
                  key={item.attendee_id}
                  variants={cardVariant}
                  className="group flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-xl"
                >
                  {/* IMAGE & BADGE */}
                  <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                    {item.event_banner_url ? (
                      <img src={item.event_banner_url} alt={item.event_name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center">
                        <span className="text-lg font-bold text-white/80 line-clamp-2">{item.event_name}</span>
                      </div>
                    )}

                    <div className="absolute left-4 top-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${verified ? "border border-emerald-500/30 bg-emerald-500/90 text-white" : "border border-amber-500/30 bg-amber-500/90 text-white"
                        }`}>
                        {verified ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {verified ? copy.verified : copy.pending}
                      </span>
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <h2 className="text-xl font-bold text-slate-900 line-clamp-2">{item.event_name}</h2>

                    <div className="mt-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{formatDate(item.event_date, lang)}</span>
                      </div>

                      <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{item.event_location || "-"}</span>
                      </div>
                    </div>

                    {/* ATTENDANCE PROGRESS BAR */}
                    <div className="mt-6 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        <span>{copy.attendance}</span>
                        <span className={isCompleted ? "text-emerald-600" : "text-slate-700"}>
                          {attended} / {totalSessions}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? "bg-emerald-500" : "bg-slate-900"}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-auto pt-6 flex flex-col gap-2 sm:flex-row">
                      <Link href={`/events/${item.event_id}`} className="flex-1 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800">
                        {copy.openEvent}
                      </Link>
                      {item.status_url && (
                        <a href={item.status_url} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300">
                          <ShieldCheck className="h-4 w-4 text-slate-400" />
                          {copy.status}
                        </a>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </section>
    </div>
  );
}