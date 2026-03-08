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
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  permissions: string[];
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [displayedFullKey, setDisplayedFullKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setError(null);
      const res = await apiFetch("/admin/api-keys").catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setKeys(Array.isArray(data) ? data : data.items || []);
      } else {
        // Mock data for demo if API not available
        setKeys([
          {
            id: 1,
            name: "Production API Key",
            key_prefix: "sk_live_abc123****",
            last_used_at: new Date().toISOString(),
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            expires_at: null,
            permissions: ["read:events", "write:certificates", "read:analytics"],
          },
          {
            id: 2,
            name: "Development Key",
            key_prefix: "sk_test_def456****",
            last_used_at: null,
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            permissions: ["read:events", "read:analytics"],
          },
        ]);
      }
    } catch (e: any) {
      const message = e?.message || "Failed to load API keys";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch("/admin/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: keyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setDisplayedFullKey(data.key);
        setKeyName("");
        await fetchKeys();
        toast.success("API key created successfully");
      } else {
        toast.error("Failed to create API key");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = (fullKey: string, keyId: number) => {
    navigator.clipboard.writeText(fullKey);
    setCopiedKeyId(keyId);
    toast.success("Key copied to clipboard");
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const columns = useMemo<ColumnDef<ApiKey>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: (info) => <span className="font-semibold text-gray-800 dark:text-gray-200">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "key_prefix",
        header: "Key",
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
        accessorKey: "permissions",
        header: "Permissions",
        cell: (info) => {
          const perms = info.getValue() as string[];
          return (
            <div className="flex gap-1 flex-wrap">
              {perms.length <= 2
                ? perms.map((p) => (
                    <span
                      key={p}
                      className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    >
                      {p}
                    </span>
                  ))
                : `${perms.length} permissions`}
            </div>
          );
        },
      },
      {
        accessorKey: "last_used_at",
        header: "Last Used",
        cell: (info) => {
          const date = info.getValue();
          return date ? (
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {new Date(date as string).toLocaleString()}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-sm">Never</span>
          );
        },
      },
      {
        accessorKey: "expires_at",
        header: "Expires",
        cell: (info) => {
          const date = info.getValue();
          return date ? (
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {new Date(date as string).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-sm">Never</span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: (info) => (
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            {new Date(info.getValue() as string).toLocaleDateString()}
          </span>
        ),
      },
    ],
    []
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
        title="API Keys"
        subtitle="API erişimi ve entegrasyonlar için kimlik doğrulama anahtarlarını yönetin"
        icon={<Lock className="h-5 w-5" />}
        breadcrumbs={[{ label: "Ayarlar", href: "/admin/settings" }, { label: "API Keys" }]}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Yeni Anahtar
          </button>
        }
      />

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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">🔐 Your API Key</h2>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-900 dark:text-amber-200 mb-3">
                <strong>Important:</strong> Copy this key now. For security reasons, you will not be able to see it again.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6 flex items-center justify-between">
              <code className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all">{displayedFullKey}</code>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => handleCopyKey(displayedFullKey, 0)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0 ml-2"
              >
                <Copy className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </motion.button>
            </div>

            <button
              onClick={() => setDisplayedFullKey(null)}
              className="w-full px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
            >
              Done
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Create New API Key</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Name</label>
              <input
                type="text"
                placeholder="e.g., Production API Key"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setKeyName("");
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={creating || !keyName.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors"
              >
                {creating ? "Creating..." : "Create"}
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
              <Plus className="h-4 w-4" /> Create First Key
            </motion.button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={keys}
            pageSize={10}
            searchable={true}
            searchPlaceholder="Search by name or key..."
            enableExport={true}
            exportFileName="api-keys.csv"
            enableColumnVisibility={true}
          />
        )}
      </motion.div>

      {/* Security Info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8 card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-6">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3">🔐 API Key Security</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>• API keys are sensitive credentials - never share them or commit them to version control</li>
          <li>• Keys shown with ellipsis (****) cannot be displayed again after creation</li>
          <li>• Only the key owner can see the full key immediately after generation</li>
          <li>• Revoke keys immediately if they are compromised</li>
          <li>• Use separate keys for development and production environments</li>
          <li>• Set expiration dates on keys for better security practices</li>
        </ul>
      </motion.div>
    </div>
  );
}
