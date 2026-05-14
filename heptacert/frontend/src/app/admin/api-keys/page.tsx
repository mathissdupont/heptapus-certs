"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Loader2, AlertCircle, Plus, Copy, CheckCircle2, Eye, EyeOff, Trash2, Lock } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import { DataTable } from "@/components/DataTable/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";

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
        cell: (info) => <span className="font-semibold text-gray-800 dark:text-gray-200">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "key_prefix",
        header: "Anahtar",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
              {info.getValue() as string}
            </span>
            <Lock className="h-3 w-3 text-gray-400" />
          </div>
        ),
      },
      {
        accessorKey: "scopes",
        header: "Yetkiler",
        cell: (info) => {
          const scopes = (info.getValue() as string[]) ?? [];
          if (scopes.length === 0) return <span className="text-xs text-gray-400">Tüm yetkiler</span>;
          return (
            <div className="flex gap-1 flex-wrap">
              {scopes.length <= 2
                ? scopes.map((s) => (
                    <span key={s} className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {s}
                    </span>
                  ))
                : <span className="text-xs text-gray-500">{scopes.length} yetki</span>}
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
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {new Date(date as string).toLocaleString("tr-TR")}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-sm">Hiç</span>
          );
        },
      },
      {
        accessorKey: "expires_at",
        header: "Son Kullanma",
        cell: (info) => {
          const date = info.getValue();
          return date ? (
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {new Date(date as string).toLocaleDateString("tr-TR")}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-sm">Süresiz</span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Oluşturuldu",
        cell: (info) => (
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            {new Date(info.getValue() as string).toLocaleDateString("tr-TR")}
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
              className="p-1.5 rounded hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors disabled:opacity-50"
              title="Devre dışı bırak"
            >
              {deletingId === key.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          );
        },
      },
    ],
    [deletingId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="API Anahtarları"
        subtitle="API erişimi ve entegrasyonlar için kimlik doğrulama anahtarlarını yönetin"
        icon={<Lock className="h-5 w-5" />}
        breadcrumbs={[{ label: "Ayarlar", href: "/admin/settings" }, { label: "API Anahtarları" }]}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Yeni Anahtar
          </button>
        }
      />

      {/* Info Box */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="card bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-1">API Anahtarları Nasıl Kullanılır?</p>
            <p className="mb-2">API anahtarları, harici uygulamalardan (ör: kendi yazılımınız, üçüncü parti servisler) API'mize güvenli bir şekilde erişebilmeniz için kullanılır. Her istekte anahtar gönderilerek kimlik doğrulaması yapılır.</p>
            <div className="text-xs opacity-90 space-y-1 mt-2 font-mono bg-white dark:bg-blue-900 px-2 py-2 rounded">
              <div>curl -H "Authorization: Bearer YOUR_API_KEY" https://api.example.com/events</div>
            </div>
            <p className="mt-2 text-xs"><strong>Uyarı:</strong> API anahtarlarınızı asla halka açık yerlere (GitHub, sosyal medya) yazmayın!</p>
          </div>
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <div className="error-banner mb-6">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Hata</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Full Key Display Modal */}
      {displayedFullKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">🔐 API Anahtarınız</h2>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-900 dark:text-amber-200 mb-3">
                <strong>Önemli:</strong> Bu anahtarı şimdi kopyalayın. Güvenlik nedeniyle bu anahtarı bir daha göremeyeceksiniz.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6 flex items-center justify-between">
              <code className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all">{displayedFullKey}</code>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => handleCopyKey(displayedFullKey, 0)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0 ml-2"
              >
                {copiedKeyId === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              </motion.button>
            </div>

            <button
              onClick={() => setDisplayedFullKey(null)}
              className="w-full px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
            >
              Tamam
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Yeni API Anahtarı</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Bu anahtar yazılımınızda API istekleri için kullanılacak. Oluştur'u tıklamadan sonra, anahtar sadece bir kez gösterilir - lütfen güvenli bir yerde saklayın.</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Anahtar İsmi
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-xs bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400" title="Bu anahtarı neyin için kullanacağınızı açıklayan isim">?</span>
              </label>
              <input
                type="text"
                placeholder="örn. Production API Key, Mobile App"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-gray-500">Birden fazla anahtar oluşturup farklı uygulamalar için kullanabilirsiniz (örneğin: test ortamı, production)</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Geçerlilik Süresi (gün)
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-xs bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400" title="Kaç gün sonra bu anahtar otomatik olarak devre dışı bırakılacak">?</span>
              </label>
              <input
                type="number"
                placeholder="Boş bırakırsanız süresiz olur"
                value={expiresDays}
                onChange={(e) => setExpiresDays(e.target.value)}
                min="1"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-gray-500">Güvenlik için 30-90 gün arası belirlemeniz önerilir. Anahtarlar her zaman devre dışı bırakılabilir.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCreateModal(false); setKeyName(""); setExpiresDays(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleCreateKey}
                disabled={creating || !keyName.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors"
              >
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Keys Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {keys.length === 0 ? (
          <div className="card p-12 text-center">
            <Lock className="h-12 w-12 text-surface-300 mx-auto mb-4" />
            <p className="text-surface-500 mb-6">Henüz API anahtarı yok. Başlamak için bir tane oluşturun.</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> İlk Anahtarı Oluştur
            </motion.button>
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

      {/* Security Info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8 card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-6">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3">🔐 API Anahtarı Güvenliği</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>• API anahtarları hassas kimlik bilgileridir — asla paylaşmayın veya sürüm kontrol sistemine eklemeyin</li>
          <li>• Kısayolla (...****) görüntülenen anahtarlar oluşturulduktan sonra tekrar görüntülenemez</li>
          <li>• Tam anahtarı yalnızca oluşturma anında görebilirsiniz</li>
          <li>• Açığa çıkma durumunda anahtarları derhal devre dışı bırakın</li>
          <li>• Geliştirme ve üretim ortamları için ayrı anahtarlar kullanın</li>
          <li>• Daha iyi güvenlik için anahtarlara son kullanma tarihi belirleyin</li>
        </ul>
      </motion.div>
    </div>
  );
}
