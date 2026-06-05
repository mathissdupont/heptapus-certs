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
import { useI18n } from "@/lib/i18n";

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

function buildCriteriaCatalogue(isTr: boolean): CriteriaDef[] {
  return [
    {
      key: "min_sessions",
      label: isTr ? "Minimum Oturum Katılımı" : "Minimum Session Attendance",
      description: isTr
        ? "Katılımcının check-in yaptığı oturum sayısı en az bu kadar olmalı"
        : "The number of sessions the attendee checked in must be at least this many",
      type: "number",
      icon: <Hash className="h-4 w-4" />,
      placeholder: "2",
      min: 1,
      unit: isTr ? "oturum" : "sessions",
    },
    {
      key: "attendance_rate",
      label: isTr ? "Minimum Katılım Oranı" : "Minimum Attendance Rate",
      description: isTr
        ? "Tüm oturumlara göre katılım yüzdesi (toplam oturum sayısı üzerinden)"
        : "Attendance percentage relative to all sessions (out of total session count)",
      type: "number",
      icon: <Percent className="h-4 w-4" />,
      placeholder: "80",
      min: 0,
      max: 100,
      unit: "%",
    },
    {
      key: "registered_rank_max",
      label: isTr ? "Erken Kayıt Limiti" : "Early Registration Limit",
      description: isTr
        ? "Etkinliğe kayıt sırasında ilk N kişi arasında olmalı (erken kuş rozeti için)"
        : "Must be among the first N registrants for the event (for early bird badge)",
      type: "number",
      icon: <Users className="h-4 w-4" />,
      placeholder: "50",
      min: 1,
      unit: isTr ? "kişi" : "people",
    },
    {
      key: "survey_completed",
      label: isTr ? "Anket Tamamlandı" : "Survey Completed",
      description: isTr
        ? "Katılımcı etkinlik anketini tamamlamış olmalı"
        : "The attendee must have completed the event survey",
      type: "boolean",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      key: "can_download_cert",
      label: isTr ? "Sertifika İzni Var" : "Certificate Permission",
      description: isTr
        ? "Sertifika indirme yetkisi olan katılımcılara verilir"
        : "Awarded to attendees who have certificate download permission",
      type: "boolean",
      icon: <Award className="h-4 w-4" />,
    },
  ];
}

function getCriteriaDef(key: string, catalogue: CriteriaDef[]): CriteriaDef | undefined {
  return catalogue.find((c) => c.key === key);
}

// ── CriteriaEditor sub-component ─────────────────────────────────────────────
function CriteriaEditor({
  criteria,
  onChange,
  copy,
  catalogue,
}: {
  criteria: Record<string, any>;
  onChange: (updated: Record<string, any>) => void;
  copy: {
    addCriteria: string;
    noCriteria: string;
    yes: string;
    no: string;
  };
  catalogue: CriteriaDef[];
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedKeys = Object.keys(criteria);
  const availableToAdd = catalogue.filter((c) => !selectedKeys.includes(c.key));

  const addCriteria = (key: string) => {
    const def = getCriteriaDef(key, catalogue);
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
    const def = getCriteriaDef(key, catalogue);
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
        const def = getCriteriaDef(key, catalogue);
        const value = criteria[key];
        return (
          <div
            key={key}
            className="flex items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5"
          >
            <div className="mt-0.5 text-brand-500 shrink-0">{def?.icon ?? <Hash className="h-4 w-4" />}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-surface-800">
                  {def?.label ?? key}
                </span>
                <code className="text-xs text-surface-400 font-mono">{key}</code>
              </div>
              {def?.description && (
                <p className="text-xs text-surface-500 mt-0.5">{def.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {def?.type === "boolean" ? (
                <select
                  value={String(value)}
                  onChange={(e) => updateValue(key, e.target.value)}
                  className="rounded-md border border-surface-300 px-2 py-1 text-sm"
                >
                  <option value="true">{copy.yes}</option>
                  <option value="false">{copy.no}</option>
                </select>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={String(value)}
                    min={def?.min}
                    max={def?.max}
                    onChange={(e) => updateValue(key, e.target.value)}
                    className="w-20 rounded-md border border-surface-300 px-2 py-1 text-sm text-right"
                  />
                  {def?.unit && (
                    <span className="text-xs text-surface-500">{def.unit}</span>
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
            {copy.addCriteria}
            <ChevronDown className="h-3 w-3" />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl border border-surface-200 shadow-lg min-w-[300px]"
              >
                {availableToAdd.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => addCriteria(c.key)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-50 text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="mt-0.5 text-brand-500 shrink-0">{c.icon}</div>
                    <div>
                      <div className="text-sm font-semibold text-surface-800">{c.label}</div>
                      <div className="text-xs text-surface-500 mt-0.5">{c.description}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {selectedKeys.length === 0 && (
        <p className="text-xs text-surface-400 italic">{copy.noCriteria}</p>
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

const badgeDateFormatterTr = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

const badgeDateFormatterEn = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

export default function GamificationPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const criteriaCatalogue = buildCriteriaCatalogue(isTr);

  const copy = {
    pageTitle: isTr ? "Rozet Sistemi" : "Badge System",
    pageSubtitle: isTr ? "Katılımcıları başarılarıyla ödüllendirin" : "Reward participants for their achievements",
    loadError: isTr ? "Rozet kuralları yüklenemedi" : "Could not load badge rules",
    saveSuccess: isTr ? "Rozet kuralları kaydedildi" : "Badge rules saved",
    saveError: isTr ? "Kaydedilemedi" : "Could not save",
    calcSuccess: isTr ? "Rozetler hesaplandı" : "Badges calculated",
    calcError: isTr ? "Hesaplama başarısız" : "Calculation failed",
    addBadgeError: isTr ? "Lütfen rozet türü ve adını girin" : "Please enter badge type and name",
    statStatus: isTr ? "Durum" : "Status",
    statActive: isTr ? "Aktif" : "Active",
    statInactive: isTr ? "Pasif" : "Inactive",
    statActiveHint: isTr ? "Hesaplama açık" : "Calculation on",
    statInactiveHint: isTr ? "Kurallar beklemede" : "Rules pending",
    statBadgeTypes: isTr ? "Rozet Turu" : "Badge Types",
    statBadgeTypesHint: (n: number) => isTr ? `${n} tanım güncellenebilir` : `${n} definitions editable`,
    statTotalDist: isTr ? "Toplam Dağıtım" : "Total Distribution",
    statTotalDistHint: (auto: number, manual: number) => isTr ? `${auto} otomatik / ${manual} manuel` : `${auto} automatic / ${manual} manual`,
    statFeaturedTypes: isTr ? "Öne Çıkan Türler" : "Featured Types",
    statMoreTypes: (n: number) => isTr ? `${n} tür daha var` : `${n} more types`,
    statNoTypes: isTr ? "Henüz tür yok" : "No types yet",
    tabRules: isTr ? "Rozet Kuralları" : "Badge Rules",
    tabAwarded: isTr ? "Verilen Rozetler" : "Awarded Badges",
    badgeSystemTitle: isTr ? "Rozet Sistemi" : "Badge System",
    badgeSystemEnabled: isTr ? "Etkindir" : "Enabled",
    badgeSystemDisabled: isTr ? "Devre dışı" : "Disabled",
    btnDisable: isTr ? "Devre Dışı Bırak" : "Disable",
    btnEnable: isTr ? "Etkinleştir" : "Enable",
    badgeDefinitionsTitle: isTr ? "Rozet Tanımları" : "Badge Definitions",
    labelBadgeType: isTr ? "Rozet Türü" : "Badge Type",
    labelBadgeName: isTr ? "Rozet Adı" : "Badge Name",
    labelBadgeDesc: isTr ? "Rozet Açıklaması" : "Badge Description",
    placeholderBadgeDesc: isTr ? "Bu rozeti kazanma koşullarını açıklayın" : "Describe the conditions for earning this badge",
    labelCriteriaRules: isTr ? "Kriter Kuralları" : "Criteria Rules",
    labelBadgeColor: isTr ? "Rozet Rengi" : "Badge Color",
    labelBadgeUrl: isTr ? "Rozet URL" : "Badge URL",
    previewLabel: isTr ? "Önizleme" : "Preview",
    previewBadgeName: isTr ? "Rozet adı" : "Badge name",
    previewBadgeDesc: isTr ? "Rozet açıklaması burada görünecek." : "Badge description will appear here.",
    previewOpenToAll: isTr ? "Tüm katılımcılara açık" : "Open to all attendees",
    btnRemoveBadge: isTr ? "Rozeti kaldır" : "Remove badge",
    newBadgeTitle: isTr ? "Yeni Rozet Ekle" : "Add New Badge",
    placeholderBadgeType: isTr ? "Rozet Türü (örn: early_bird)" : "Badge Type (e.g.: early_bird)",
    placeholderBadgeNameInput: isTr ? "Rozet Adı (örn: Erken Katılımcı)" : "Badge Name (e.g.: Early Attendee)",
    btnAddBadge: isTr ? "Rozet Ekle" : "Add Badge",
    btnSaveRules: isTr ? "Kuralları Kaydet" : "Save Rules",
    btnCalculate: isTr ? "Rozetleri Hesapla" : "Calculate Badges",
    searchPlaceholder: isTr ? "Rozet veya katılımcı ara" : "Search badge or attendee",
    labelAutomatic: isTr ? "Otomatik" : "Automatic",
    labelManual: isTr ? "Manuel" : "Manual",
    emptyNoBadges: isTr ? "Henüz rozet verilmedi" : "No badges awarded yet",
    emptyNoMatch: isTr ? "Filtreye uyan rozet bulunamadı" : "No badges match the filter",
    attendeeIdPrefix: isTr ? "Katılımcı ID: " : "Attendee ID: ",
    badgeAutomatic: isTr ? "Otomatik" : "Automatic",
    badgeManual: isTr ? "Manuel" : "Manual",
    badgeTypePrefix: isTr ? "Tür: " : "Type: ",
    awardedLabel: isTr ? "Verildi" : "Awarded",
    criteriaPassed: isTr ? "Geçti" : "Passed",
    criteriaFailed: isTr ? "Kaldı" : "Failed",
    criteriaRequired: isTr ? "Gereken: " : "Required: ",
    criteriaActual: isTr ? "Gerçekleşen: " : "Actual: ",
    addCriteria: isTr ? "Kriter Ekle" : "Add Criteria",
    noCriteria: isTr ? "Henüz kriter eklenmedi — rozet tüm katılımcılara verilir" : "No criteria added yet — badge is given to all attendees",
    yes: isTr ? "Evet" : "Yes",
    no: isTr ? "Hayır" : "No",
  };

  const badgeDateFormatter = isTr ? badgeDateFormatterTr : badgeDateFormatterEn;

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
      setError(err.message || copy.loadError);
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

      setSuccess(copy.saveSuccess);
      await loadData();
    } catch (err: any) {
      setError(err.message || copy.saveError);
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
      setSuccess(data.message || copy.calcSuccess);
      await loadData();
    } catch (err: any) {
      setError(err.message || copy.calcError);
    } finally {
      setSaving(false);
    }
  };

  const addBadge = () => {
    if (!newBadge || !newBadge.type || !newBadge.name) {
      setError(copy.addBadgeError);
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
        <h1 className="text-3xl font-bold text-surface-900">{copy.pageTitle}</h1>
        <p className="text-surface-500 text-sm mt-1">{copy.pageSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: copy.statStatus,
            value: enabled ? copy.statActive : copy.statInactive,
            hint: enabled ? copy.statActiveHint : copy.statInactiveHint,
            icon: ToggleLeft,
          },
          {
            label: copy.statBadgeTypes,
            value: String(badgeTypeCount),
            hint: copy.statBadgeTypesHint(editingBadges.length),
            icon: Award,
          },
          {
            label: copy.statTotalDist,
            value: String(awardedBadges.length),
            hint: copy.statTotalDistHint(badgeSummary.automatic_vs_manual.automatic, badgeSummary.automatic_vs_manual.manual),
            icon: Trophy,
          },
          {
            label: copy.statFeaturedTypes,
            value: badgeTypeCount > 0 ? Object.keys(badgeSummary.by_type).slice(0, 1)[0] : "-",
            hint: badgeTypeCount > 1 ? copy.statMoreTypes(badgeTypeCount - 1) : copy.statNoTypes,
            icon: BarChart3,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-surface-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-surface-900">{item.value}</p>
                  <p className="mt-2 text-sm text-surface-500">{item.hint}</p>
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
      <div className="flex gap-2 border-b border-surface-200">
        {["rules", "awarded"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "rules" | "awarded")}
            className={`px-4 py-3 font-semibold text-sm transition-colors ${
              activeTab === tab
                ? "text-brand-600 border-b-2 border-brand-600"
                : "text-surface-600 hover:text-surface-900"
            }`}
          >
            {tab === "rules" ? copy.tabRules : copy.tabAwarded}
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
          <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-surface-900">{copy.badgeSystemTitle}</h3>
                <p className="text-sm text-surface-500 mt-1">
                  {enabled ? copy.badgeSystemEnabled : copy.badgeSystemDisabled}
                </p>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  enabled
                    ? "bg-brand-600 text-white hover:bg-brand-700"
                    : "bg-surface-200 text-surface-700 hover:bg-gray-300"
                }`}
              >
                {enabled ? copy.btnDisable : copy.btnEnable}
              </button>
            </div>
          </div>

          {/* Badge List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-surface-900">{copy.badgeDefinitionsTitle}</h3>

            {editingBadges.map((badge, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[28px] border border-surface-200 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-surface-700 mb-2">
                          {copy.labelBadgeType}
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
                          className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-surface-700 mb-2">
                          {copy.labelBadgeName}
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
                          className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-surface-700 mb-2">
                        {copy.labelBadgeDesc}
                      </label>
                      <textarea
                        value={badge.description || ""}
                        onChange={(e) => {
                          const updated = [...editingBadges];
                          updated[idx].description = e.target.value;
                          setEditingBadges(updated);
                        }}
                        placeholder={copy.placeholderBadgeDesc}
                        className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm h-20 resize-none"
                      />
                    </div>

                    {/* Criteria editor */}
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-surface-700 mb-2">
                        {copy.labelCriteriaRules}
                      </label>
                      <CriteriaEditor
                        criteria={badge.criteria || {}}
                        onChange={(updated) => {
                          const next = [...editingBadges];
                          next[idx] = { ...next[idx], criteria: updated };
                          setEditingBadges(next);
                        }}
                        copy={{ addCriteria: copy.addCriteria, noCriteria: copy.noCriteria, yes: copy.yes, no: copy.no }}
                        catalogue={criteriaCatalogue}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-surface-700 mb-2">
                          {copy.labelBadgeColor}
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
                            className="flex-1 rounded-lg border border-surface-300 px-3 py-2 text-sm bg-surface-50"
                            readOnly
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-surface-700 mb-2">
                          {copy.labelBadgeUrl}
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
                          className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="xl:w-[260px] xl:shrink-0">
                    <div className="rounded-3xl border border-surface-200 bg-surface-50 p-4">
                      <div
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                        style={{
                          color: badge.color_hex || "#4CAF50",
                          borderColor: `${badge.color_hex || "#4CAF50"}55`,
                          backgroundColor: `${badge.color_hex || "#4CAF50"}12`,
                        }}
                      >
                        <Award className="h-3.5 w-3.5" />
                        {copy.previewLabel}
                      </div>
                      <p className="mt-4 break-words text-lg font-black text-surface-900">
                        {badge.name || copy.previewBadgeName}
                      </p>
                      <p className="mt-2 break-words text-sm leading-6 text-surface-600">
                        {badge.description || copy.previewBadgeDesc}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {Object.keys(badge.criteria || {}).length > 0 ? (
                          Object.keys(badge.criteria || {}).map((key) => (
                            <span
                              key={key}
                              className="rounded-full border border-surface-200 bg-white px-3 py-1 text-xs font-semibold text-surface-600"
                            >
                              {getCriteriaDef(key, criteriaCatalogue)?.label || key}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-dashed border-slate-300 bg-white px-3 py-1 text-xs text-surface-500">
                            {copy.previewOpenToAll}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeBadge(idx)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <X className="h-4 w-4" />
                      {copy.btnRemoveBadge}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add New Badge */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-50 rounded-xl border-2 border-dashed border-surface-300 p-4"
            >
              <h4 className="font-semibold text-surface-900 mb-4">{copy.newBadgeTitle}</h4>
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder={copy.placeholderBadgeType}
                  value={newBadge?.type || ""}
                  onChange={(e) =>
                    setNewBadge({
                      ...newBadge,
                      type: e.target.value,
                      name: newBadge?.name || "",
                      criteria: newBadge?.criteria || {},
                    })
                  }
                  className="rounded-lg border border-surface-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder={copy.placeholderBadgeNameInput}
                  value={newBadge?.name || ""}
                  onChange={(e) =>
                    setNewBadge({
                      ...newBadge,
                      name: e.target.value,
                      type: newBadge?.type || "",
                      criteria: newBadge?.criteria || {},
                    })
                  }
                  className="rounded-lg border border-surface-300 px-3 py-2 text-sm"
                />
              </div>

              {/* New badge criteria */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-surface-700 mb-2">
                  {copy.labelCriteriaRules}
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
                  copy={{ addCriteria: copy.addCriteria, noCriteria: copy.noCriteria, yes: copy.yes, no: copy.no }}
                  catalogue={criteriaCatalogue}
                />
              </div>

              <button
                onClick={addBadge}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 text-white font-semibold py-2 hover:bg-brand-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {copy.btnAddBadge}
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
              {copy.btnSaveRules}
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
              {copy.btnCalculate}
            </button>
          </div>
        </div>
      )}

      {/* Awarded Badges Tab */}
      {activeTab === "awarded" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr,220px,220px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={badgeQuery}
                  onChange={(e) => setBadgeQuery(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="w-full rounded-xl border border-surface-300 py-2.5 pl-10 pr-3 text-sm"
                />
              </label>
              <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-surface-500">{copy.labelAutomatic}</div>
                <div className="mt-1 text-2xl font-semibold text-surface-900">{badgeSummary.automatic_vs_manual.automatic}</div>
              </div>
              <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-surface-500">{copy.labelManual}</div>
                <div className="mt-1 text-2xl font-semibold text-surface-900">{badgeSummary.automatic_vs_manual.manual}</div>
              </div>
            </div>
            {Object.entries(badgeSummary.by_type || {}).length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(badgeSummary.by_type).map(([type, count]) => (
                  <span
                    key={type}
                    className="rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-xs font-semibold text-surface-700"
                  >
                    {type} • {count}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {filteredAwardedBadges.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-surface-200">
              <Trophy className="h-16 w-16 text-surface-300 mx-auto mb-4" />
              <p className="text-surface-500">
                {awardedBadges.length === 0 ? copy.emptyNoBadges : copy.emptyNoMatch}
              </p>
            </div>
          ) : (
            filteredAwardedBadges.map((badge) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-4 rounded-[28px] border border-surface-200 bg-white p-5 shadow-sm xl:grid-cols-[minmax(0,1fr)_320px]"
              >
                <div className="min-w-0">
                  <div className="break-words text-lg font-black text-surface-900">
                    {badge.badge_name || badge.badge_type}
                  </div>
                  {badge.badge_description && (
                    <div className="mt-1 break-words text-sm text-surface-500">{badge.badge_description}</div>
                  )}
                  <div className="mt-2 break-words text-sm text-surface-500">
                    {badge.attendee_name || `${copy.attendeeIdPrefix}${badge.attendee_id}`}
                    {badge.attendee_email ? ` • ${badge.attendee_email}` : ""}
                  </div>
                  <div className="mt-1 text-sm text-surface-500">
                    {badge.is_automatic ? copy.badgeAutomatic : copy.badgeManual} • {copy.badgeTypePrefix}{badge.badge_type}
                  </div>
                  <div className="mt-1 text-xs text-surface-400">
                    {badgeDateFormatter.format(new Date(badge.awarded_at))}
                  </div>
                </div>

                <div className="xl:min-w-[320px]">
                  <div
                    style={{
                      backgroundColor: `${badge.badge_color_hex || "#4CAF50"}20`,
                      borderColor: badge.badge_color_hex || "#4CAF50",
                      color: badge.badge_color_hex || "#2f855a",
                    }}
                    className="inline-flex px-3 py-1 rounded-full border font-semibold text-sm"
                  >
                    {copy.awardedLabel}
                  </div>

                  {Object.keys(badge.criteria_met || {}).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {Object.entries(badge.criteria_met).map(([key, value]) => {
                        const criteria = value as { actual?: unknown; required?: unknown; passed?: boolean };
                        return (
                          <div key={key} className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium text-surface-700">{key}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${criteria.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                {criteria.passed ? copy.criteriaPassed : copy.criteriaFailed}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-surface-500">
                              {copy.criteriaRequired}{String(criteria.required ?? "-")} • {copy.criteriaActual}{String(criteria.actual ?? "-")}
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
