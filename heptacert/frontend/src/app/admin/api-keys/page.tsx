"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Loader2, AlertCircle, Plus, Copy, CheckCircle2, Eye, EyeOff, Trash2, Lock, Calendar, Terminal } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import { DataTable } from "@/components/DataTable/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";

type ApiKey = {
  id: number;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  scopes: string[];
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expiresDays, setExpiresDays] = useState("");
  const [displayedFullKey, setDisplayedFullKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setError(null);
      const res = await apiFetch("/admin/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(Array.isArray(data) ? data : data.items || []);
      } else {
        setError("API anahtarları yüklenemedi");
      }
    } catch (e: any) {
      setError(e?.message || "API anahtarları yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) {
      toast.error("Lütfen bir anahtar ismi girin");
      return;
    }

    setCreating(true);
    try {
      const body: Record<string, unknown> = { name: keyName };
      if (expiresDays.trim()) body.expires_days = parseInt(expiresDays, 10);
      const res = await apiFetch("/admin/api-keys", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setDisplayedFullKey(data.full_key ?? data.key ?? null);
        setKeyName("");
        setExpiresDays("");
        setShowCreateModal(false);
        await fetchKeys();
        toast.success("API anahtarı oluşturuldu");
      } else {
        toast.error("API anahtarı oluşturulamadı");
      }
    } catch (e: any) {
      toast.error(e?.message || "API anahtarı oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/admin/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys(prev => prev.filter(k => k.id !== id));
        toast.success("Anahtar devre dışı bırakıldı");
      } else {
        toast.error("Anahtar silme başarısız");
      }
    } catch (e: any) {
      toast.error(e?.message || "Anahtar silme başarısız");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyKey = (fullKey: string, keyId: number) => {
    navigator.clipboard.writeText(fullKey);
    setCopiedKeyId(keyId);
    toast.success("Anahtar panoya kopyalandı");
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const columns = useMemo<ColumnDef<ApiKey>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Ad",
        cell: (info) => <span className="font-semibold text-gray-950 tracking-tight">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "key_prefix",
        header: "Anahtar",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg text-gray-700 tracking-tight">
              {info.getValue() as string}
            </span>
            <Lock className="h-3 w-3 text-gray-400 stroke-[1.8]" />
          </div>
        ),
      },
      {
        accessorKey: "scopes",
        header: "Yetkiler",
        cell: (info) => {
          const scopes = (info.getValue() as string[]) ?? [];
          if (scopes.length === 0) return <span className="text-xs font-medium text-gray-400">Tüm yetkiler</span>;
          return (
            <div className="flex gap-1 flex-wrap">
              {scopes.length <= 2
                ? scopes.map((s) => (
                    <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200/50 text-gray-700">
                      {s}
                    </span>
                  ))
                : <span className="text-xs font-semibold text-gray-500">{scopes.length} yetki</span>}
            </div>
          );
        },
      },
      {
        accessorKey: "last_used_at",
        header: "Son Kullanım",
        cell: (info) => {
          const date = info.getValue();
          return date ? (
            <span className="text-gray-500 font-medium text-xs">
              {new Date(date as string).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
            </span>
          ) : (
            <span className="text-gray-300 font-medium text-xs">-</span>
          );
        },
      },
      {
        accessorKey: "expires_at",
        header: "Son Kullanma",
        cell: (info) => {
          const date = info.getValue();
          return date ? (
            <span className="text-gray-500 font-medium text-xs">
              {new Date(date as string).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          ) : (
            <span className="text-gray-400 font-semibold text-[10px] tracking-tight bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">Süresiz</span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Oluşturuldu",
        cell: (info) => (
          <span className="text-gray-400 font-medium text-xs">
            {new Date(info.getValue() as string).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (info) => {
          const key = info.row.original;
          return (
            <button
              onClick={() => handleDeleteKey(key.id)}
              disabled={deletingId === key.id}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 disabled:opacity-40"
              title="Devre dışı bırak"
            >
              {deletingId === key.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 stroke-[1.8]" />}
            </button>
          );
        },
      },
    ],
    [deletingId]
  );

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center p-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-5 antialiased text-gray-900">
      
      {/* SAYFA BAŞLIĞI */}
      <PageHeader
        title="API Anahtarları"
        subtitle="Harici entegrasyonlar ve güvenli API erişimi için kimlik doğrulama anahtarlarını yönetin"
        icon={<Lock className="h-4 w-4 stroke-[2]" />}
        breadcrumbs={[{ label: "Ayarlar", href: "/admin/settings" }, { label: "API Anahtarları" }]}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-4 text-xs font-semibold text-white transition hover:bg-gray-900 active:scale-95 shadow-sm"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" /> 
            <span>Yeni Anahtar</span>
          </button>
        }
      />

      {/* ÜST BİLGİLENDİRME KUTUSU (Apple Tarzı Soft Kart) */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex gap-3.5 items-start">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
            <Terminal className="h-4 w-4 stroke-[2]" />
          </div>
          <div className="text-xs leading-relaxed text-gray-500 space-y-2 flex-1">
            <h4 className="font-semibold text-gray-950 text-xs tracking-tight">API Anahtarları Nasıl Kullanılır?</h4>
            <p>API anahtarları; harici uygulamalarınızdan veya üçüncü parti servislerden sistemimize güvenli bir şekilde erişebilmeniz için üretilir. Her istekte başlık (Header) alanına anahtar eklenerek kimlik doğrulaması otomatik olarak tamamlanır.</p>
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 p-3 font-mono text-[11px] text-gray-700 font-medium">
              curl -H "Authorization: Bearer YOUR_API_KEY" https://api.heptapusgroup.com/admin/events
            </div>
            <p className="text-[10px] text-amber-600 font-semibold bg-amber-50/50 border border-amber-100/50 rounded-lg px-2.5 py-1 w-fit">
              ⚠️ Güvenlik Uyarısı: API anahtarlarınızı asla GitHub reposu gibi halka açık veya sızdırılabilecek alanlarda paylaşmayın!
            </p>
          </div>
        </div>
      </motion.div>

      {/* HATA BANNERI */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ANA ANAHTAR TABLOSU VE BOŞ DURUM ALANI */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/30 p-12 text-center">
            <div className="flex h-11 w-11 mx-auto items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-sm mb-4">
              <Lock className="h-4 w-4 stroke-[1.8]" />
            </div>
            <p className="text-xs font-semibold text-gray-900 tracking-tight mb-1">Henüz üretilmiş bir API anahtarı yok</p>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto mb-5 leading-relaxed">Harici servislerin HeptaCert verilerine erişmesi için güvenli bir anahtar kurgulayın.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-3.5 text-xs font-semibold text-white transition hover:bg-gray-900 active:scale-95 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> 
              <span>İlk Anahtarı Oluştur</span>
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={keys}
            pageSize={10}
            searchable={true}
            searchPlaceholder="İsme veya anahtara göre ara..."
            enableExport={true}
            exportFileName="api-keys.csv"
            enableColumnVisibility={true}
          />
        )}
      </motion.div>

      {/* GÜVENLİK KILAVUZU (Apple Altyazı Bloğu) */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2.5">API Anahtarı Güvenlik Protokolü</h3>
        <ul className="space-y-2 text-xs font-medium text-gray-500 leading-relaxed">
          <li className="flex items-start gap-1.5"><span>•</span> <span>API anahtarları en üst düzey hassasiyete sahiptir; asla sürüm kontrol (Git) geçmişine eklemeyin.</span></li>
          <li className="flex items-start gap-1.5"><span>•</span> <span>Maskelenmiş olarak listelenen anahtarlar güvenlik politikası gereği sistemde kriptolu tutulur ve tekrar çözülemez.</span></li>
          <li className="flex items-start gap-1.5"><span>•</span> <span>Oluşturulan anahtarın ham halini (Full Key) **yalnızca üretim anında tek bir kez** görüntüleyebilirsiniz.</span></li>
          <li className="flex items-start gap-1.5"><span>•</span> <span>Anahtarın üçüncü şahısların eline geçtiğinden şüphelendiğiniz an listeden derhal devre dışı (silme) bırakın.</span></li>
          <li className="flex items-start gap-1.5"><span>•</span> <span>Test/Staging ortamı ile canlı üretim (Production) altyapısı için her zaman ayrı anahtarlar kurgulayın.</span></li>
        </ul>
      </motion.div>

      {/* MODALLAR KATMANI (AnimatePresence Entegrasyonu) */}
      <AnimatePresence>
        {/* 1. GÖRÜNTÜLEME MODALI (Full Key Display) */}
        {displayedFullKey && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/20 backdrop-blur-md"
              onClick={() => setDisplayedFullKey(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-xl backdrop-blur-xl"
            >
              <h2 className="text-sm font-bold text-gray-950 tracking-tight mb-3">API Anahtarınız Hazır</h2>
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5 text-xs text-amber-800 leading-relaxed mb-4">
                <strong>Önemli Protokol:</strong> Bu gizli anahtarı şimdi güvenli bir yere kopyalayın. Güvenlik altyapısı gereği pencereyi kapattıktan sonra anahtarı bir daha asla göremeyeceksiniz.
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 mb-5 flex items-center justify-between gap-3 font-mono text-xs">
                <code className="text-gray-900 break-all select-all pr-1 font-semibold">{displayedFullKey}</code>
                <button
                  type="button"
                  onClick={() => handleCopyKey(displayedFullKey, 0)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-900 transition-all active:scale-90 shadow-sm"
                >
                  {copiedKeyId === 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-500 stroke-[2.5]" /> : <Copy className="h-4 w-4 stroke-[2]" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDisplayedFullKey(null)}
                className="w-full inline-flex min-h-[38px] items-center justify-center rounded-xl bg-gray-950 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 active:scale-[0.98]"
              >
                Kopyaladım, Kapat
              </button>
            </motion.div>
          </div>
        )}

        {/* 2. ANAHTAR ÜRETİM MODALI (Create Modal) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/20 backdrop-blur-md"
              onClick={() => { if (!creating) { setShowCreateModal(false); setKeyName(""); setExpiresDays(""); } }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 8 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-xl backdrop-blur-xl space-y-4"
            >
              <div>
                <h2 className="text-sm font-bold text-gray-950 tracking-tight">Yeni API Anahtarı Üret</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-400">Bu anahtar harici sistemlerdeki arka plan botları veya özel panelleriniz için yetkilendirme sağlayacaktır.</p>
              </div>

              {/* İsim Alanı */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500">
                  Anahtar Tanımlama Adı
                </label>
                <input
                  type="text"
                  placeholder="Örn: Mobil Entegrasyon, Test Ortamı"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                  disabled={creating}
                />
              </div>

              {/* Geçerlilik Süresi */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500">
                  Geçerlilik Süresi (Gün)
                </label>
                <input
                  type="number"
                  placeholder="Süresiz kalması için boş bırakın"
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(e.target.value)}
                  min="1"
                  className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                  disabled={creating}
                />
                <p className="text-[10px] text-gray-400 leading-normal pt-0.5">Sistem güvenliği için 30 veya 90 günlük periyotlar belirlemeniz tavsiye edilir.</p>
              </div>

              {/* Buton Kontrolleri */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setKeyName(""); setExpiresDays(""); }}
                  disabled={creating}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleCreateKey}
                  disabled={creating || !keyName.trim()}
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 active:scale-[0.98] disabled:opacity-30"
                >
                  {creating ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Üretiliyor...
                    </span>
                  ) : "Anahtarı Üret"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}