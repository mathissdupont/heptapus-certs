'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { PageHeader } from '@/components/Admin/PageHeader';
import { EmptyState } from '@/components/Admin/EmptyState';
import { ConfirmModal } from '@/components/Admin/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Webhook,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Info,
  TestTube2,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { FeatureGate } from '@/lib/useSubscription';

interface Webhook {
  id: number;
  user_id: number;
  event_type: string;
  url: string;
  is_active: boolean;
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'attendee.register', label: 'Katılımcı Kaydı', color: 'badge-active' },
  { value: 'email.sent',    label: 'Email Gönderildi',  color: 'badge-active' },
  { value: 'email.failed',  label: 'Email Başarısız',   color: 'badge-revoked' },
  { value: 'email.bounced', label: 'Email Bounce',      color: 'badge-expired' },
  { value: 'email.opened',  label: 'Email Açıldı',      color: 'badge-neutral' },
];

function getEventMeta(type: string) {
  return EVENT_TYPES.find(e => e.value === type) ?? { value: type, label: type, color: 'badge-neutral' };
}

function fmt(s: string) {
  return new Date(s).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function WebhooksPage() {
  const toast = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    event_type: 'attendee.register',
    url: '',
    secret: '',
  });

  useEffect(() => { fetchWebhooks(); }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await apiFetch('/admin/webhooks');
      setWebhooks(await res.json());
    } catch {
      toast.error('Webhooklar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.url) { setFormError('Lütfen bir URL girin'); return; }
    if (!formData.url.startsWith('https://')) { setFormError('URL HTTPS ile başlamalıdır'); return; }

    setCreating(true);
    try {
      const res = await apiFetch('/admin/webhooks', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setWebhooks(prev => [...prev, data]);
      setFormData({ event_type: 'attendee.register', url: '', secret: '' });
      setShowForm(false);
      toast.success('Webhook oluşturuldu');
    } catch (error: any) {
      setFormError(error?.message || 'Webhook oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    setToggling(webhook.id);
    try {
      const res = await apiFetch(`/admin/webhooks/${webhook.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !webhook.is_active }),
      });
      const data = await res.json();
      setWebhooks(prev => prev.map(w => (w.id === webhook.id ? data : w)));
      toast.success(webhook.is_active ? 'Webhook devre dışı bırakıldı' : 'Webhook etkinleştirildi');
    } catch (error: any) {
      toast.error(error?.message || 'Güncelleme başarısız');
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/webhooks/${deleteTarget.id}`, { method: 'DELETE' });
      setWebhooks(prev => prev.filter(w => w.id !== deleteTarget.id));
      toast.success('Webhook silindi');
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error?.message || 'Silme başarısız');
    } finally {
      setDeleting(false);
    }
  };

  const handleTest = async (webhookId: number) => {
    setTesting(webhookId);
    try {
      const res = await apiFetch(`/admin/webhooks/${webhookId}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'sent') {
        toast.success(`Test başarılı — endpoint ${data.http_status} döndü`);
      } else {
        toast.error(`Test başarısız: ${data.message}`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Test başarısız');
    } finally {
      setTesting(null);
    }
  };

  return (
    <FeatureGate requiredPlans={["growth","enterprise"]}>
      <div className="flex flex-col gap-6">
      <PageHeader
        title="Webhooks"
        subtitle="Katılımcı kayıtlarını, e-posta olaylarını ve otomasyon verilerini kendi sistemlerinize gerçek zamanlı gönderin"
        icon={<Webhook className="h-5 w-5" />}
        actions={
          <button onClick={() => setShowForm(v => !v)} className="btn-primary">
            {showForm ? (
              <><X className="h-4 w-4" /> İptal</>
            ) : (
              <><Plus className="h-4 w-4" /> Yeni Webhook</>
            )}
          </button>
        }
      />

      {/* Info Box */}
      <div className="card bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-1">Webhook nedir?</p>
            <p className="mb-2">Bir olay tetiklendiğinde sistem sizin belirlediğiniz URL'ye veri gönderir. Google Sheets entegrasyonu için bir Google Apps Script Web App URL'si oluşturup burada Katılımcı Kaydı olayına bağlayabilirsiniz.</p>
            <p className="text-xs opacity-90 font-mono bg-white dark:bg-blue-900 px-2 py-1 rounded">
              attendee.register - registration_answer_labels alanını Sheet satırına yazabilirsiniz
            </p>
          </div>
        </div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreate} className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-surface-900">Webhook Oluştur</h2>
              <p className="text-xs text-surface-500">Aşağıda, olayı tetiklendiğinde bildirimleri alacak noktayı (endpoint) yapılandırın</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">
                    Olay Tipi
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 cursor-help" title="Hangi e-posta olayı tetiklediğinde webhook tetiklenecek">?</span>
                  </label>
                  <select
                    value={formData.event_type}
                    onChange={e => setFormData(f => ({ ...f, event_type: e.target.value }))}
                    className="input-field"
                  >
                    {EVENT_TYPES.map(e => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-surface-400">Katılımcı kaydı seçilirse her kayıt/yeniden kayıt olayında endpoint'e form cevapları gönderilir.</p>
                </div>
                <div>
                  <label className="label">
                    Webhook URL
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 cursor-help" title="İstek alacak sunucunuzun adresi">?</span>
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={e => setFormData(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://your-domain.com/webhook"
                    className="input-field"
                    required
                  />
                  <p className="mt-1 text-xs text-surface-400">Kendi sunucunuzun URL'si (HTTPS gerekli). Örn: https://example.com/api/email-events</p>
                </div>
              </div>

              <div>
                <label className="label">
                  Secret (İsteğe bağlı)
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 cursor-help" title="Webhook isteklerini doğrulamak için gizli anahtar">?</span>
                </label>
                <input
                  type="text"
                  value={formData.secret}
                  onChange={e => setFormData(f => ({ ...f, secret: e.target.value }))}
                  placeholder="Boş bırakılırsa otomatik oluşturulur"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-surface-400">
                  Webhook güvenliği için: Biz gelen isteğe X-Webhook-Secret header'ı ekliyoruz. Alıcı tarafında bu header'ı doğrulayarak isteklerin gerçekten bizden geldiğini kontrol edebilirsiniz.
                </p>
              </div>

              {formError && (
                <div className="error-banner">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {creating ? 'Oluşturuluyor…' : 'Oluştur'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setFormError(null); }} className="btn-secondary">
                  İptal
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhook List */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div>
            <h2 className="text-sm font-semibold text-surface-900">Webhooklar</h2>
            <p className="text-xs text-surface-400 mt-0.5">{webhooks.length} webhook kayıtlı</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
          </div>
        ) : webhooks.length === 0 ? (
          <EmptyState
            icon={<Webhook className="h-7 w-7" />}
            title="Henüz webhook yok"
            description="Email olaylarını harici sistemlere göndermek için webhook ekleyin"
            action={
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus className="h-4 w-4" /> İlk Webhooku Ekle
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-surface-100">
            {webhooks.map(webhook => {
              const meta = getEventMeta(webhook.event_type);
              return (
                <div
                  key={webhook.id}
                  className={`px-5 py-4 transition-colors hover:bg-surface-50 ${!webhook.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={meta.color}>{meta.label}</span>
                        <span className={webhook.is_active ? 'badge-active' : 'badge-neutral'}>
                          {webhook.is_active ? 'Etkin' : 'Devre Dışı'}
                        </span>
                      </div>
                      <code className="text-xs text-surface-600 font-mono break-all">{webhook.url}</code>
                      <p className="text-xs text-surface-400 mt-1">Oluşturuldu: {fmt(webhook.created_at)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleTest(webhook.id)}
                        disabled={!webhook.is_active || testing === webhook.id}
                        className="btn-ghost text-xs px-2.5 py-1.5"
                        title="Test Et"
                      >
                        {testing === webhook.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <TestTube2 className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Test</span>
                      </button>

                      <button
                        onClick={() => handleToggle(webhook)}
                        disabled={toggling === webhook.id}
                        className="btn-ghost text-xs px-2.5 py-1.5"
                        title={webhook.is_active ? 'Devre Dışı Bırak' : 'Etkinleştir'}
                      >
                        {toggling === webhook.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : webhook.is_active ? (
                          <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">{webhook.is_active ? 'Kapat' : 'Aç'}</span>
                      </button>

                      <button
                        onClick={() => setDeleteTarget(webhook)}
                        className="btn-ghost text-xs px-2.5 py-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                        title="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payload Format */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100">
          <h2 className="text-sm font-semibold text-surface-900">Payload Formatı</h2>
          <p className="text-xs text-surface-400 mt-0.5">Her webhook isteğinde gönderilen veri yapısı</p>
        </div>
        <div className="p-5">
          <pre className="rounded-lg bg-surface-900 text-surface-100 p-4 text-xs font-mono overflow-x-auto leading-relaxed">
{`{
  "event": "email.sent",
  "timestamp": "2026-03-07T12:00:00Z",
  "data": {
    "bulk_job_id": 123,
    "attendee_id": 456,
    "email": "user@example.com",
    "status": "sent"
  }
}`}
          </pre>
          <div className="mt-3 flex flex-col gap-1">
            <p className="text-xs text-surface-500">Her istek şu başlıkları içerir:</p>
            <code className="text-xs font-mono text-surface-600">X-Heptacert-Event: email.sent</code>
            <code className="text-xs font-mono text-surface-600">X-Heptacert-Timestamp: 1709430600</code>
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Webhook Silinsin mi?"
        description={deleteTarget ? `"${deleteTarget.url}" adresine bağlı webhook kalıcı olarak silinecek.` : ''}
        confirmLabel="Sil"
        cancelLabel="İptal"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      </div>
    </FeatureGate>
  );
}
