'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Send } from 'lucide-react';

interface EmailTemplate {
  id: number;
  name: string;
  subject_tr: string;
}

interface ScheduledEmail {
  id: number;
  email_template_id: number;
  status: string;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  scheduled_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function ScheduleEmailPage() {
  const params = useParams();
  const eventId = parseInt(params.id as string);
  if (isNaN(eventId)) {
    return <div className="p-4 text-red-600">Geçersiz etkinlik ID</div>;
  }
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);

  const [formData, setFormData] = useState({
    email_template_id: 0,
    recipient_type: 'attendees' as 'attendees' | 'certified',
    schedule_type: 'immediate' as 'immediate' | 'datetime' | 'cron',
    scheduled_datetime: '',
    cron_expression: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, scheduledRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/email-templates`),
        apiFetch(`/admin/events/${eventId}/scheduled-emails`),
      ]);

      const templatesData = await templatesRes.json();
      setTemplates(templatesData);
      if (templatesData.length > 0) {
        setFormData(prev => ({ ...prev, email_template_id: templatesData[0].id }));
      }

      const scheduledData = await scheduledRes.json();
      setScheduledEmails(scheduledData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!formData.email_template_id) {
      alert('Lütfen bir şablon seçin');
      return;
    }

    if (formData.schedule_type === 'datetime' && !formData.scheduled_datetime) {
      alert('Lütfen bir tarih ve saat seçin');
      return;
    }

    if (formData.schedule_type === 'cron' && !formData.cron_expression) {
      alert('Lütfen cron ifadesini girin');
      return;
    }

    setScheduling(true);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/scheduled-email`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      alert(`Email başarıyla zamanlandı: ${data.message}`);
      await fetchData();
      setFormData(prev => ({
        ...prev,
        scheduled_datetime: '',
        cron_expression: '',
      }));
    } catch (error: any) {
      alert(`Hata: ${error?.message || error}`);
    } finally {
      setScheduling(false);
    }
  };

  const handleCancel = async (jobId: number) => {
    if (!confirm('Bu iş iptal edilsin mi?')) return;
    try {
      await apiFetch(`/admin/events/${eventId}/bulk-emails-cancel/${jobId}`, { method: 'POST' });
      alert('İş başarıyla iptal edildi');
      await fetchData();
    } catch (error: any) {
      alert(`Hata: ${error?.message || error}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: '⏰ Zamanlanmış',
      pending: '⏳ Beklemede',
      completed: '✓ Tamamlandı',
      failed: '✗ Başarısız',
      cancelled: '⊘ İptal Edildi',
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="h-7 w-7 text-brand-600" />
            Email Zamanla
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Schedule Form */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 sticky top-8">
              <h2 className="text-lg font-semibold mb-6">Yeni Email Zamanla</h2>

              {/* Template Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şablon
                </label>
                <select
                  value={formData.email_template_id}
                  onChange={e =>
                    setFormData({ ...formData, email_template_id: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alıcılar
                </label>
                <select
                  value={formData.recipient_type}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      recipient_type: e.target.value as 'attendees' | 'certified',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="attendees">Tüm Katılımcılar</option>
                  <option value="certified">Sertifikaları Alanlar</option>
                </select>
              </div>

              {/* Schedule Type */}
              <div className="mb-6 border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İtme Türü
                </label>
                <select
                  value={formData.schedule_type}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      schedule_type: e.target.value as 'immediate' | 'datetime' | 'cron',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="immediate">Hemen Gönder</option>
                  <option value="datetime">Belirli Zamanında Gönder</option>
                  <option value="cron">Dönemsel Gönder (Cron)</option>
                </select>
              </div>

              {/* DateTime Picker */}
              {formData.schedule_type === 'datetime' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarih ve Saat
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_datetime}
                    onChange={e =>
                      setFormData({ ...formData, scheduled_datetime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {/* Cron Expression */}
              {formData.schedule_type === 'cron' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cron İfadesi
                  </label>
                  <input
                    type="text"
                    value={formData.cron_expression}
                    onChange={e =>
                      setFormData({ ...formData, cron_expression: e.target.value })
                    }
                    placeholder="0 9 * * MON (Her Pazartesi 09:00)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Örnek: &quot;0 9 * * MON&quot; = Her Pazartesi sabah 9&apos;da
                  </p>
                </div>
              )}

              {/* Schedule Button */}
              <button
                onClick={handleSchedule}
                disabled={scheduling || !formData.email_template_id}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {scheduling ? 'Zamanlanıyor...' : 'Zamanla'}
              </button>
            </div>
          </div>

          {/* Scheduled Jobs List */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Zamanlanmış Emailler ({scheduledEmails.length})
                </h2>
              </div>

              {scheduledEmails.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Henüz zamanlanmış email yok
                </div>
              ) : (
                <div className="divide-y">
                  {scheduledEmails.map(email => {
                    const template = templates.find(t => t.id === email.email_template_id);
                    const progress = email.recipients_count > 0
                      ? Math.round((email.sent_count / email.recipients_count) * 100)
                      : 0;

                    return (
                      <div key={email.id} className="p-6 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {template?.name || `Template ${email.email_template_id}`}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Oluşturuldu:{' '}
                              {new Date(email.created_at).toLocaleString('tr-TR')}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                            {getStatusLabel(email.status)}
                          </span>
                        </div>

                        {email.scheduled_at && (
                          <p className="text-sm text-gray-600 mb-3">
                            ⏰ Gönderilecek:{' '}
                            {new Date(email.scheduled_at).toLocaleString('tr-TR')}
                          </p>
                        )}

                        {/* Progress Bar */}
                        {['pending', 'completed'].includes(email.status) && (
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>
                                {email.sent_count}/{email.recipients_count} gönderildi
                              </span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  email.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {email.failed_count > 0 && (
                          <p className="text-xs text-red-600 mb-3">
                            ⚠️ {email.failed_count} gönderme başarısız
                          </p>
                        )}

                        {email.completed_at && (
                          <p className="text-xs text-gray-500 mb-3">
                            Tamamlandı: {new Date(email.completed_at).toLocaleString('tr-TR')}
                          </p>
                        )}

                        {/* Cancel Button */}
                        {['pending', 'scheduled'].includes(email.status) && (
                          <button
                            onClick={() => handleCancel(email.id)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            İptal Et
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
