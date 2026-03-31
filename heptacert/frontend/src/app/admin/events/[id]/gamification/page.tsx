"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Plus, X, Loader2, CheckCircle2, AlertCircle,
  Trophy, ChevronDown, Hash, Percent, ToggleLeft, Users, Award, Search, BarChart3,
} from "lucide-react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";

// ── Predefined criteria catalogue ────────────────────────────────────────────
type CriteriaType = "number" | "boolean";

interface CriteriaDef {
  key: string;
  label: string;
  description: string;
  type: CriteriaType;
  icon: React.ReactNode;
  placeholder?: string;
  min?: number;
  max?: number;
  unit?: string;
}

const CRITERIA_CATALOGUE: CriteriaDef[] = [
  {
    key: "min_sessions",
    label: "Minimum Oturum Katılımı",
    description: "Katılımcının check-in yaptığı oturum sayısı en az bu kadar olmalı",
    type: "number",
    icon: <Hash className="h-4 w-4" />,
    placeholder: "2",
    min: 1,
    unit: "oturum",
  },
  {
    key: "attendance_rate",
    label: "Minimum Katılım Oranı",
    description: "Tüm oturumlara göre katılım yüzdesi (toplam oturum sayısı üzerinden)",
    type: "number",
    icon: <Percent className="h-4 w-4" />,
    placeholder: "80",
    min: 0,
    max: 100,
    unit: "%",
  },
  {
    key: "registered_rank_max",
    label: "Erken Kayıt Limiti",
    description: "Etkinliğe kayıt sırasında ilk N kişi arasında olmalı (erken kuş rozeti için)",
    type: "number",
    icon: <Users className="h-4 w-4" />,
    placeholder: "50",
    min: 1,
    unit: "kişi",
  },
  {
    key: "survey_completed",
    label: "Anket Tamamlandı",
    description: "Katılımcı etkinlik anketini tamamlamış olmalı",
    type: "boolean",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    key: "can_download_cert",
    label: "Sertifika İzni Var",
    description: "Sertifika indirme yetkisi olan katılımcılara verilir",
    type: "boolean",
    icon: <Award className="h-4 w-4" />,
  },
];

function getCriteriaDef(key: string): CriteriaDef | undefined {
  return CRITERIA_CATALOGUE.find((c) => c.key === key);
}

// ── CriteriaEditor sub-component ─────────────────────────────────────────────
function CriteriaEditor({
  criteria,
  onChange,
}: {
  criteria: Record<string, any>;
  onChange: (updated: Record<string, any>) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedKeys = Object.keys(criteria);
  const availableToAdd = CRITERIA_CATALOGUE.filter((c) => !selectedKeys.includes(c.key));

  const addCriteria = (key: string) => {
    const def = getCriteriaDef(key);
    const defaultVal = def?.type === "boolean" ? true : (def?.min ?? 1);
    onChange({ ...criteria, [key]: defaultVal });
    setShowDropdown(false);
  };

  const removeCriteria = (key: string) => {
    const next = { ...criteria };
    delete next[key];
    onChange(next);
  };

  const updateValue = (key: string, raw: string) => {
    const def = getCriteriaDef(key);
    if (def?.type === "boolean") {
      onChange({ ...criteria, [key]: raw === "true" });
    } else {
      const num = parseFloat(raw);
      onChange({ ...criteria, [key]: isNaN(num) ? raw : num });
    }
  };

  return (
    <div className="space-y-2">
      {selectedKeys.map((key) => {
        const def = getCriteriaDef(key);
        const value = criteria[key];
        return (
          <div
            key={key}
            className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5"
          >
            <div className="mt-0.5 text-brand-500 shrink-0">{def?.icon ?? <Hash className="h-4 w-4" />}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">
                  {def?.label ?? key}
                </span>
                <code className="text-xs text-gray-400 font-mono">{key}</code>
              </div>
              {def?.description && (
                <p className="text-xs text-gray-500 mt-0.5">{def.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {def?.type === "boolean" ? (
                <select
                  value={String(value)}
                  onChange={(e) => updateValue(key, e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="true">Evet</option>
                  <option value="false">Hayır</option>
                </select>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={String(value)}
                    min={def?.min}
                    max={def?.max}
                    onChange={(e) => updateValue(key, e.target.value)}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
                  />
                  {def?.unit && (
                    <span className="text-xs text-gray-500">{def.unit}</span>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => removeCriteria(key)}
                className="p-1 hover:bg-red-100 rounded text-red-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {availableToAdd.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold py-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Kriter Ekle
            <ChevronDown className="h-3 w-3" />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-lg min-w-[300px]"
              >
                {availableToAdd.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => addCriteria(c.key)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="mt-0.5 text-brand-500 shrink-0">{c.icon}</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{c.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{c.description}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {selectedKeys.length === 0 && (
        <p className="text-xs text-gray-400 italic">Henüz kriter eklenmedi — rozet tüm katılımcılara verilir</p>
      )}
    </div>
  );
}

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
  badge_name?: string | null;
  badge_description?: string | null;
  badge_icon_url?: string | null;
  badge_color_hex?: string | null;
  attendee_name?: string | null;
  attendee_email?: string | null;
  criteria_met: Record<string, any>;
  awarded_by: number | null;
  awarded_at: string;
  is_automatic: boolean;
  badge_metadata?: Record<string, any>;
};

type BadgeSummary = {
  by_type: Record<string, number>;
  automatic_vs_manual: {
    automatic: number;
    manual: number;
  };
};



export default function GamificationPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [eventName, setEventName] = useState("");
  const [badgeRules, setBadgeRules] = useState<BadgeRules | null>(null);
  const [awardedBadges, setAwardedBadges] = useState<ParticipantBadge[]>([]);
  const [badgeSummary, setBadgeSummary] = useState<BadgeSummary>({
    by_type: {},
    automatic_vs_manual: { automatic: 0, manual: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"rules" | "awarded">("rules");
  const [badgeQuery, setBadgeQuery] = useState("");

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
      const [rulesRes, badgesRes, eventRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/badge-rules`, { method: "GET" }),
        apiFetch(`/admin/events/${eventId}/badges`, { method: "GET" }),
        apiFetch(`/admin/events/${eventId}`, { method: "GET" }),
      ]);

      if (eventRes) {
        const eventData = await eventRes.json();
        setEventName(eventData?.name || "");
      }

      if (rulesRes) {
        const rulesData = await rulesRes.json();
        if (rulesData) {
          setBadgeRules(rulesData);
          setEditingBadges(rulesData.badge_definitions || []);
          setEnabled(Boolean(rulesData.enabled));
        } else {
          setBadgeRules(null);
          setEditingBadges([]);
          setEnabled(true);
        }
      } else {
        setBadgeRules(null);
        setEditingBadges([]);
        setEnabled(true);
      }

      if (badgesRes) {
        const badgesData = await badgesRes.json();
        setAwardedBadges(badgesData?.badges || []);
        setBadgeSummary(
          badgesData?.badge_summary || {
            by_type: {},
            automatic_vs_manual: { automatic: 0, manual: 0 },
          }
        );
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
    setEditingBadges([
      ...editingBadges,
      {
        ...newBadge,
        color_hex: newBadge.color_hex || "#4CAF50",
        description: newBadge.description || "",
        icon_url: newBadge.icon_url || "",
      },
    ]);
    setNewBadge(null);
  };

  const removeBadge = (index: number) => {
    setEditingBadges(editingBadges.filter((_, i) => i !== index));
  };

  const filteredAwardedBadges = useMemo(() => {
    return awardedBadges.filter((badge) => {
      const haystack = [
        badge.badge_name,
        badge.badge_type,
        badge.attendee_name,
        badge.attendee_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !badgeQuery.trim() || haystack.includes(badgeQuery.trim().toLowerCase());
    });
  }, [awardedBadges, badgeQuery]);

  const badgeTypeCount = Object.keys(badgeSummary.by_type || {}).length;

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
      <EventAdminNav eventId={eventId} eventName={eventName} active="gamification" className="mb-2 flex flex-col gap-2" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Rozet Sistemi</h1>
        <p className="text-gray-500 text-sm mt-1">Katılımcıları başarılarıyla ödüllendirin</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Durum",
            value: enabled ? "Aktif" : "Pasif",
            hint: enabled ? "Hesaplama acik" : "Kurallar beklemede",
            icon: ToggleLeft,
          },
          {
            label: "Rozet Turu",
            value: String(badgeTypeCount),
            hint: `${editingBadges.length} tanim guncellenebilir`,
            icon: Award,
          },
          {
            label: "Toplam Dagitim",
            value: String(awardedBadges.length),
            hint: `${badgeSummary.automatic_vs_manual.automatic} otomatik / ${badgeSummary.automatic_vs_manual.manual} manuel`,
            icon: Trophy,
          },
          {
            label: "One Cikan Turler",
            value: badgeTypeCount > 0 ? Object.keys(badgeSummary.by_type).slice(0, 1)[0] : "-",
            hint: badgeTypeCount > 1 ? `${badgeTypeCount - 1} tur daha var` : "Henuz tur yok",
            icon: BarChart3,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{item.value}</p>
                  <p className="mt-2 text-sm text-gray-500">{item.hint}</p>
                </div>
                <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
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

                    {/* Criteria editor */}
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Kriter Kuralları
                      </label>
                      <CriteriaEditor
                        criteria={badge.criteria || {}}
                        onChange={(updated) => {
                          const next = [...editingBadges];
                          next[idx] = { ...next[idx], criteria: updated };
                          setEditingBadges(next);
                        }}
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
                  placeholder="Rozet Türü (örn: early_bird)"
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
                  placeholder="Rozet Adı (örn: Erken Katılımcı)"
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

              {/* New badge criteria */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Kriter Kuralları
                </label>
                <CriteriaEditor
                  criteria={newBadge?.criteria || {}}
                  onChange={(updated) =>
                    setNewBadge({
                      type: newBadge?.type || "",
                      name: newBadge?.name || "",
                      criteria: updated,
                    })
                  }
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
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr,220px,220px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={badgeQuery}
                  onChange={(e) => setBadgeQuery(e.target.value)}
                  placeholder="Rozet veya katilimci ara"
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm"
                />
              </label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Otomatik</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{badgeSummary.automatic_vs_manual.automatic}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Manuel</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{badgeSummary.automatic_vs_manual.manual}</div>
              </div>
            </div>
          </div>

          {filteredAwardedBadges.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {awardedBadges.length === 0 ? "Henüz rozet verilmedi" : "Filtreye uyan rozet bulunamadi"}
              </p>
            </div>
          ) : (
            filteredAwardedBadges.map((badge) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div>
                  <div className="font-semibold text-gray-900">
                    {badge.badge_name || badge.badge_type}
                  </div>
                  {badge.badge_description && (
                    <div className="text-sm text-gray-500 mt-1">{badge.badge_description}</div>
                  )}
                  <div className="text-sm text-gray-500 mt-1">
                    {badge.attendee_name || `Katılımcı ID: ${badge.attendee_id}`}
                    {badge.attendee_email ? ` • ${badge.attendee_email}` : ""}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {badge.is_automatic ? "Otomatik" : "Manuel"} • Tür: {badge.badge_type}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(badge.awarded_at).toLocaleString("tr-TR")}
                  </div>
                </div>

                <div className="lg:max-w-sm lg:min-w-[320px]">
                  <div
                    style={{
                      backgroundColor: `${badge.badge_color_hex || "#4CAF50"}20`,
                      borderColor: badge.badge_color_hex || "#4CAF50",
                      color: badge.badge_color_hex || "#2f855a",
                    }}
                    className="inline-flex px-3 py-1 rounded-full border font-semibold text-sm"
                  >
                    Verildi
                  </div>

                  {Object.keys(badge.criteria_met || {}).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {Object.entries(badge.criteria_met).map(([key, value]) => {
                        const criteria = value as { actual?: unknown; required?: unknown; passed?: boolean };
                        return (
                          <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium text-gray-700">{key}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${criteria.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                {criteria.passed ? "Gecti" : "Kaldi"}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              Gereken: {String(criteria.required ?? "-")} • Gerceklesen: {String(criteria.actual ?? "-")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
