'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface Webhook {
  id: number;
  user_id: number;
  event_type: string;
  url: string;
  is_active: boolean;
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'email.sent', label: '📤 Email Gönderildi', color: 'bg-green-100 text-green-800' },
  { value: 'email.failed', label: '❌ Email Başarısız', color: 'bg-red-100 text-red-800' },
  { value: 'email.bounced', label: '↩️ Email Bounce', color: 'bg-orange-100 text-orange-800' },
  { value: 'email.opened', label: '👁️ Email Açıldı', color: 'bg-blue-100 text-blue-800' },
];

export default function WebhooksPage() {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    event_type: 'email.sent',
    url: '',
    secret: '',
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await apiFetch('/admin/webhooks');
      const data = await res.json();
      setWebhooks(data);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.url) {
      alert('Lütfen bir URL girin');
      return;
    }
    if (!formData.url.startsWith('https://')) {
      alert('URL HTTPS ile başlamalıdır');
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch('/admin/webhooks', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setWebhooks([...webhooks, data]);
      setFormData({ event_type: 'email.sent', url: '', secret: '' });
      setShowForm(false);
      alert('Webhook oluşturuldu');
    } catch (error: any) {
      alert(`Hata: ${error?.message || error}`);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      const res = await apiFetch(`/admin/webhooks/${webhook.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !webhook.is_active }),
      });
      const data = await res.json();
      setWebhooks(webhooks.map(w => (w.id === webhook.id ? data : w)));
    } catch (error: any) {
      alert(`Hata: ${error?.message || error}`);
    }
  };

  const handleDelete = async (webhookId: number) => {
    if (!confirm('Bu webhook silinsin mi?')) return;
    try {
      await apiFetch(`/admin/webhooks/${webhookId}`, { method: 'DELETE' });
      setWebhooks(webhooks.filter(w => w.id !== webhookId));
      alert('Webhook silindi');
    } catch (error: any) {
      alert(`Hata: ${error?.message || error}`);
    }
  };

  const handleTest = async (webhookId: number) => {
    setTesting(webhookId);
    try {
      const res = await apiFetch(`/admin/webhooks/${webhookId}/test`, { method: 'POST' });
      const data = await res.json();
      alert(
        data.status === 'sent'
          ? `Test başarılı! Endpoint ${data.http_status} döndü.`
          : `Hata: ${data.message}`
      );
    } catch (error: any) {
      alert(`Hata: ${error?.message || error}`);
    } finally {
      setTesting(null);
    }
  };

  const getEventLabel = (type: string) => {
    return EVENT_TYPES.find(e => e.value === type)?.label || type;
  };

  const getEventColor = (type: string) => {
    return EVENT_TYPES.find(e => e.value === type)?.color || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Geri Dön
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-gray-600 mt-2">
            Email olaylarını harici sistemlere gönderin (sent, failed, bounced, opened)
          </p>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? '✕ İptal' : '+ Yeni Webhook'}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Webhook Oluştur</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Olay Tipi
              </label>
              <select
                value={formData.event_type}
                onChange={e =>
                  setFormData({ ...formData, event_type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {EVENT_TYPES.map(e => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={e =>
                  setFormData({ ...formData, url: e.target.value })
                }
                placeholder="https://your-domain.com/webhooks/email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL HTTPS ile başlamalıdır ve geçerli bir endpoint olmalıdır
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secret (İsteğe bağlı)
              </label>
              <input
                type="text"
                value={formData.secret}
                onChange={e =>
                  setFormData({ ...formData, secret: e.target.value })
                }
                placeholder="Otomatik oluşturulur eğer boş bırakılırsa"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Webhook isteklerini doğrulamak için HMAC secret
              </p>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </div>
        )}

        {/* Webhooks List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Webhooks ({webhooks.length})
            </h2>
          </div>

          {webhooks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Henüz webhook oluşturulmadı
            </div>
          ) : (
            <div className="divide-y">
              {webhooks.map(webhook => {
                const eventLabel = getEventLabel(webhook.event_type);
                const eventColor = getEventColor(webhook.event_type);

                return (
                  <div key={webhook.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${eventColor}`}>
                            {eventLabel}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              webhook.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {webhook.is_active ? '✓ Etkin' : '⊘ Devre Dışı'}
                          </span>
                        </div>
                        <code className="text-sm text-gray-600 break-all">
                          {webhook.url}
                        </code>
                        <p className="text-xs text-gray-500 mt-2">
                          Oluşturuldu:{' '}
                          {new Date(webhook.created_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleToggle(webhook)}
                        className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {webhook.is_active ? '⊘ Devre Dışı Bırak' : '✓ Etkinleştir'}
                      </button>
                      <button
                        onClick={() => handleTest(webhook.id)}
                        disabled={testing === webhook.id}
                        className="text-sm px-3 py-1 border border-blue-300 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
                      >
                        {testing === webhook.id ? 'Test ediliyor...' : '🧪 Test Et'}
                      </button>
                      <button
                        onClick={() => handleDelete(webhook.id)}
                        className="text-sm px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
                      >
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Webhook Format Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-blue-900 mb-3">📋 Webhook Payload Formatı</h3>
          <pre className="bg-blue-900 text-blue-100 p-4 rounded text-xs overflow-auto">
{`{
  "event": "email.sent",
  "timestamp": "2026-03-02T21:30:00Z",
  "data": {
    "bulk_job_id": 123,
    "attendee_id": 456,
    "email": "user@example.com",
    "status": "sent"
  }
}`}
          </pre>
          <p className="text-sm text-blue-800 mt-3">
            Her webhook isteği şu headers'ı içerir:
            <br />
            <code className="font-mono">X-Heptacert-Event: email.sent</code>
            <br />
            <code className="font-mono">X-Heptacert-Timestamp: 1709430600</code>
          </p>
        </div>
      </div>
    </div>
  );
}
