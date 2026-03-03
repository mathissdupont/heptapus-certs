"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Save, Plus, X, Loader2, CheckCircle2, AlertCircle,
  Trophy, Zap, Star, Target, Sparkles, BarChart3, CalendarDays, User,
  UserCheck, QrCode, LockKeyhole, Mail,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type BadgeDefinition = {
  type: string;
  name: string;
  description?: string;
  criteria: Record<string, any>;
  icon_url?: string;
  color_hex?: string;
};

type BadgeRules = {
  id: number;
  event_id: number;
  badge_definitions: BadgeDefinition[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type ParticipantBadge = {
  id: number;
  event_id: number;
  attendee_id: number;
  badge_type: string;
  criteria_met: Record<string, any>;
  awarded_by: number | null;
  awarded_at: string;
  is_automatic: boolean;
  metadata?: Record<string, any>;
};

const Badge_Icons = {
  trophy: Trophy,
  zap: Zap,
  star: Star,
  target: Target,
  sparkles: Sparkles,
};

export default function GamificationPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [badgeRules, setBadgeRules] = useState<BadgeRules | null>(null);
  const [awardedBadges, setAwardedBadges] = useState<ParticipantBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"rules" | "awarded">("rules");

  const [editingBadges, setEditingBadges] = useState<BadgeDefinition[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [newBadge, setNewBadge] = useState<BadgeDefinition | null>(null);

  // Load badge rules and awarded badges
  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, badgesRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/badge-rules`, { method: "GET" }),
        apiFetch(`/admin/events/${eventId}/badges`, { method: "GET" }),
      ]);

      if (rulesRes) {
        const rulesData = await rulesRes.json();
        setBadgeRules(rulesData);
        setEditingBadges(rulesData.badge_definitions || []);
        setEnabled(rulesData.enabled);
      } else {
        setEditingBadges([]);
        setEnabled(true);
      }

      if (badgesRes) {
        const badgesData = await badgesRes.json();
        if (badgesData?.badges) {
          setAwardedBadges(badgesData.badges);
        }
      }
    } catch (err: any) {
      setError(err.message || "Rozet kuralları yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const saveBadgeRules = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/admin/events/${eventId}/badge-rules`, {
        method: "POST",
        body: JSON.stringify({
          badge_definitions: editingBadges,
          enabled,
        }),
      });

      setSuccess("Rozet kuralları kaydedildi");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const calculateBadges = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await apiFetch(`/admin/events/${eventId}/badges/calculate`, {
        method: "POST",
      });

      const data = await result.json();
      setSuccess(data.message || "Rozetler hesaplandı");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Hesaplama başarısız");
    } finally {
      setSaving(false);
    }
  };

  const addBadge = () => {
    if (!newBadge || !newBadge.type || !newBadge.name) {
      setError("Lütfen rozet türü ve adını girin");
      return;
    }
    setEditingBadges([...editingBadges, newBadge]);
    setNewBadge(null);
  };

  const removeBadge = (index: number) => {
    setEditingBadges(editingBadges.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/events/${eventId}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rozet Sistemi</h1>
            <p className="text-gray-500 text-sm mt-1">Katılımcıları başarılarıyla ödüllendirin</p>
          </div>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
        <Link href={`/admin/events/${eventId}/certificates`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <BarChart3 className="h-3.5 w-3.5" /> Sertifikalar
        </Link>
        <Link href={`/admin/events/${eventId}/sessions`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <CalendarDays className="h-3.5 w-3.5" /> Oturumlar
        </Link>
        <Link href={`/admin/events/${eventId}/attendees`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <User className="h-3.5 w-3.5" /> Katılımcılar
        </Link>
        <Link href={`/admin/events/${eventId}/checkin`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <QrCode className="h-3.5 w-3.5" /> Check-in
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700">
          <Target className="h-3.5 w-3.5" /> Gamification
        </span>
        <Link href={`/admin/events/${eventId}/surveys`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <UserCheck className="h-3.5 w-3.5" /> Anketler
        </Link>
        <Link href={`/admin/events/${eventId}/advanced-analytics`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <BarChart3 className="h-3.5 w-3.5" /> Analitik
        </Link>
        <Link href={`/admin/events/${eventId}/email-templates`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <Mail className="h-3.5 w-3.5" /> Email
        </Link>
        <Link href={`/admin/events/${eventId}/settings`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <LockKeyhole className="h-3.5 w-3.5" /> Ayarlar
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {["rules", "awarded"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "rules" | "awarded")}
            className={`px-4 py-3 font-semibold text-sm transition-colors ${
              activeTab === tab
                ? "text-brand-600 border-b-2 border-brand-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab === "rules" ? "Rozet Kuralları" : "Verilen Rozetler"}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3"
        >
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 text-sm">{success}</p>
        </motion.div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Rozet Sistemi</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {enabled ? "Etkindir" : "Devre dışı"}
                </p>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  enabled
                    ? "bg-brand-600 text-white hover:bg-brand-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {enabled ? "Devre Dışı Bırak" : "Etkinleştir"}
              </button>
            </div>
          </div>

          {/* Badge List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Rozet Tanımları</h3>

            {editingBadges.map((badge, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Rozet Türü
                        </label>
                        <input
                          type="text"
                          value={badge.type}
                          onChange={(e) => {
                            const updated = [...editingBadges];
                            updated[idx].type = e.target.value;
                            setEditingBadges(updated);
                          }}
                          placeholder="fastest_register"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Rozet Adı
                        </label>
                        <input
                          type="text"
                          value={badge.name}
                          onChange={(e) => {
                            const updated = [...editingBadges];
                            updated[idx].name = e.target.value;
                            setEditingBadges(updated);
                          }}
                          placeholder="Hızlı Kaydolan"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Rozet Açıklaması
                      </label>
                      <textarea
                        value={badge.description || ""}
                        onChange={(e) => {
                          const updated = [...editingBadges];
                          updated[idx].description = e.target.value;
                          setEditingBadges(updated);
                        }}
                        placeholder="Bu rozeti kazanma koşullarını açıklayın"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Rozet Rengi
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={badge.color_hex || "#4CAF50"}
                            onChange={(e) => {
                              const updated = [...editingBadges];
                              updated[idx].color_hex = e.target.value;
                              setEditingBadges(updated);
                            }}
                            className="h-10 rounded-lg cursor-pointer"
                          />
                          <input
                            type="text"
                            value={badge.color_hex || "#4CAF50"}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50"
                            readOnly
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Rozet URL
                        </label>
                        <input
                          type="text"
                          value={badge.icon_url || ""}
                          onChange={(e) => {
                            const updated = [...editingBadges];
                            updated[idx].icon_url = e.target.value;
                            setEditingBadges(updated);
                          }}
                          placeholder="https://example.com/badge.png"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeBadge(idx)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-600 mt-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Add New Badge */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4"
            >
              <h4 className="font-semibold text-gray-900 mb-4">Yeni Rozet Ekle</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Rozet Türü"
                  value={newBadge?.type || ""}
                  onChange={(e) =>
                    setNewBadge({
                      ...newBadge,
                      type: e.target.value,
                      name: newBadge?.name || "",
                      criteria: newBadge?.criteria || {},
                    })
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Rozet Adı"
                  value={newBadge?.name || ""}
                  onChange={(e) =>
                    setNewBadge({
                      ...newBadge,
                      name: e.target.value,
                      type: newBadge?.type || "",
                      criteria: newBadge?.criteria || {},
                    })
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={addBadge}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 text-white font-semibold py-2 hover:bg-brand-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Rozet Ekle
              </button>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={saveBadgeRules}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-600 text-white font-semibold py-3 hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Kuralları Kaydet
            </button>

            <button
              onClick={calculateBadges}
              disabled={saving || !enabled}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 text-white font-semibold py-3 hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trophy className="h-5 w-5" />
              )}
              Rozetleri Hesapla
            </button>
          </div>
        </div>
      )}

      {/* Awarded Badges Tab */}
      {activeTab === "awarded" && (
        <div className="space-y-4">
          {awardedBadges.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Henüz rozet verilmedi</p>
            </div>
          ) : (
            awardedBadges.map((badge) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between"
              >
                <div>
                  <div className="font-semibold text-gray-900">{badge.badge_type}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Katılımcı ID: {badge.attendee_id} • {badge.is_automatic ? "Otomatik" : "Manuel"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(badge.awarded_at).toLocaleString("tr-TR")}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: `${badge.criteria_met?.color_hex || "#4CAF50"}20`,
                    borderColor: badge.criteria_met?.color_hex || "#4CAF50",
                  }}
                  className="px-3 py-1 rounded-full border font-semibold text-sm"
                >
                  ✓ Verildi
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
