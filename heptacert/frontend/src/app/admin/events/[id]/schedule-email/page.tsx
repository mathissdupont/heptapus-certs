'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { FeatureGate } from '@/lib/useSubscription';
import { Send } from 'lucide-react';
import DateField from '@/components/Admin/DateField';
import TimeField from '@/components/Admin/TimeField';

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
  cron_expression?: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function ScheduleEmailPage() {
  const params = useParams();
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const locale = isTr ? "tr-TR" : "en-US";

  const copy = {
    invalidId:       isTr ? "Geçersiz etkinlik ID" : "Invalid event ID",
    loading:         isTr ? "Yükleniyor..." : "Loading...",
    pageTitle:       isTr ? "Email Zamanla" : "Schedule Email",
    scheduleNew:     isTr ? "Yeni Email Zamanla" : "Schedule New Email",
    templateLabel:   isTr ? "Şablon" : "Template",
    recipientLabel:  isTr ? "Alıcılar" : "Recipients",
    allAttendees:    isTr ? "Tüm Katılımcılar" : "All Attendees",
    certifiedOnly:   isTr ? "Sertifikaları Alanlar" : "Certificate Recipients",
    scheduleType:    isTr ? "İtme Türü" : "Send Type",
    sendImmediate:   isTr ? "Hemen Gönder" : "Send Immediately",
    sendDatetime:    isTr ? "Belirli Zamanında Gönder" : "Send at Specific Time",
    sendCron:        isTr ? "Dönemsel Gönder (Cron)" : "Recurring Send (Cron)",
    dateLabel:       isTr ? "Tarih" : "Date",
    datePlaceholder: isTr ? "Tarih seçin" : "Select date",
    timeLabel:       isTr ? "Saat" : "Time",
    timePlaceholder: isTr ? "Saat seçin" : "Select time",
    cronLabel:       isTr ? "Cron İfadesi" : "Cron Expression",
    cronPlaceholder: isTr ? "0 9 * * MON (Her Pazartesi 09:00)" : "0 9 * * MON (Every Monday 09:00)",
    cronHint:        isTr ? 'Örnek: "0 9 * * MON" = Her Pazartesi sabah 9\'da' : 'Example: "0 9 * * MON" = Every Monday at 9am',
    scheduleBtn:     isTr ? "Zamanla" : "Schedule",
    scheduling:      isTr ? "Zamanlanıyor..." : "Scheduling...",
    listTitle:       isTr ? "Zamanlanmış Emailler" : "Scheduled Emails",
    noEmails:        isTr ? "Henüz zamanlanmış email yok" : "No scheduled emails yet",
    createdAt:       isTr ? "Oluşturuldu:" : "Created:",
    sendAt:          isTr ? "⏰ Gönderilecek:" : "⏰ Sends at:",
    recurring:       isTr ? "Dönemsel:" : "Recurring:",
    sentProgress:    (sent: number, total: number) => isTr ? `${sent}/${total} gönderildi` : `${sent}/${total} sent`,
    failedCount:     (n: number) => isTr ? `⚠️ ${n} gönderme başarısız` : `⚠️ ${n} failed to send`,
    completedAt:     isTr ? "Tamamlandı:" : "Completed:",
    cancelBtn:       isTr ? "İptal Et" : "Cancel",
    alertSelectTpl:  isTr ? "Lütfen bir şablon seçin" : "Please select a template",
    alertSelectTime: isTr ? "Lütfen bir tarih ve saat seçin" : "Please select a date and time",
    alertSelectCron: isTr ? "Lütfen cron ifadesini girin" : "Please enter a cron expression",
    successScheduled:(msg: string) => isTr ? `Email başarıyla zamanlandı: ${msg}` : `Email scheduled successfully: ${msg}`,
    errorGeneric:    (msg: string) => isTr ? `Hata: ${msg}` : `Error: ${msg}`,
    confirmCancel:   isTr ? "Bu iş iptal edilsin mi?" : "Cancel this job?",
    successCancelled:isTr ? "İş başarıyla iptal edildi" : "Job cancelled successfully",
    statusLabels: {
      scheduled:  isTr ? "⏰ Zamanlanmış" : "⏰ Scheduled",
      pending:    isTr ? "⏳ Beklemede" : "⏳ Pending",
      completed:  isTr ? "✓ Tamamlandı" : "✓ Completed",
      failed:     isTr ? "✗ Başarısız" : "✗ Failed",
      cancelled:  isTr ? "⊘ İptal Edildi" : "⊘ Cancelled",
    } as Record<string, string>,
  };

  const eventId = parseInt(params.id as string);
  if (isNaN(eventId)) {
    return <div className="p-4 text-red-600">{copy.invalidId}</div>;
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
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, scheduledRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/email-templates`),
        apiFetch(`/admin/events/${eventId}/scheduled-emails`),
      ]);
      const templatesData = await templatesRes.json();
      setTemplates(templatesData);
      if (templatesData.length > 0) setFormData(prev => ({ ...prev, email_template_id: templatesData[0].id }));
      setScheduledEmails(await scheduledRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!formData.email_template_id) { alert(copy.alertSelectTpl); return; }
    if (formData.schedule_type === 'datetime' && (!scheduledDate || !scheduledTime)) { alert(copy.alertSelectTime); return; }
    if (formData.schedule_type === 'cron' && !formData.cron_expression) { alert(copy.alertSelectCron); return; }
    setScheduling(true);
    try {
      const payload = {
        ...formData,
        scheduled_datetime: formData.schedule_type === 'datetime' && scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null,
        cron_expression: formData.schedule_type === 'cron' ? formData.cron_expression : null,
      };
      const res = await apiFetch(`/admin/events/${eventId}/scheduled-email`, { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      alert(copy.successScheduled(data.message));
      await fetchData();
      setFormData(prev => ({ ...prev, scheduled_datetime: '', cron_expression: '' }));
      setScheduledDate(''); setScheduledTime('');
    } catch (error: any) {
      alert(copy.errorGeneric(error?.message || error));
    } finally {
      setScheduling(false);
    }
  };

  const handleCancel = async (jobId: number) => {
    if (!confirm(copy.confirmCancel)) return;
    try {
      await apiFetch(`/admin/events/${eventId}/bulk-emails-cancel/${jobId}`, { method: 'POST' });
      alert(copy.successCancelled);
      await fetchData();
    } catch (error: any) {
      alert(copy.errorGeneric(error?.message || error));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-surface-100 text-surface-800';
      default: return 'bg-surface-100 text-surface-800';
    }
  };

  if (loading) return <div className="p-8 text-center">{copy.loading}</div>;

  return (
    <FeatureGate>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-surface-900 flex items-center gap-2">
              <Send className="h-7 w-7 text-brand-600" />
              {copy.pageTitle}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6 sticky top-8">
                <h2 className="text-lg font-semibold mb-6">{copy.scheduleNew}</h2>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-surface-700 mb-2">{copy.templateLabel}</label>
                  <select
                    value={formData.email_template_id}
                    onChange={e => setFormData({ ...formData, email_template_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg"
                  >
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-surface-700 mb-2">{copy.recipientLabel}</label>
                  <select
                    value={formData.recipient_type}
                    onChange={e => setFormData({ ...formData, recipient_type: e.target.value as 'attendees' | 'certified' })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg"
                  >
                    <option value="attendees">{copy.allAttendees}</option>
                    <option value="certified">{copy.certifiedOnly}</option>
                  </select>
                </div>

                <div className="mb-6 border-t pt-6">
                  <label className="block text-sm font-medium text-surface-700 mb-2">{copy.scheduleType}</label>
                  <select
                    value={formData.schedule_type}
                    onChange={e => setFormData({ ...formData, schedule_type: e.target.value as 'immediate' | 'datetime' | 'cron' })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg"
                  >
                    <option value="immediate">{copy.sendImmediate}</option>
                    <option value="datetime">{copy.sendDatetime}</option>
                    <option value="cron">{copy.sendCron}</option>
                  </select>
                </div>

                {formData.schedule_type === 'datetime' && (
                  <div className="mb-6 grid gap-3 sm:grid-cols-2">
                    <DateField label={copy.dateLabel} value={scheduledDate} onChange={setScheduledDate} placeholder={copy.datePlaceholder} locale={locale} />
                    <TimeField label={copy.timeLabel} value={scheduledTime} onChange={setScheduledTime} placeholder={copy.timePlaceholder} />
                  </div>
                )}

                {formData.schedule_type === 'cron' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-surface-700 mb-2">{copy.cronLabel}</label>
                    <input
                      type="text"
                      value={formData.cron_expression}
                      onChange={e => setFormData({ ...formData, cron_expression: e.target.value })}
                      placeholder={copy.cronPlaceholder}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg font-mono text-xs"
                    />
                    <p className="text-xs text-surface-500 mt-2">{copy.cronHint}</p>
                  </div>
                )}

                <button
                  onClick={handleSchedule}
                  disabled={scheduling || !formData.email_template_id}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {scheduling ? copy.scheduling : copy.scheduleBtn}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6 border-b border-surface-200">
                  <h2 className="text-lg font-semibold text-surface-900">
                    {copy.listTitle} ({scheduledEmails.length})
                  </h2>
                </div>
                {scheduledEmails.length === 0 ? (
                  <div className="p-6 text-center text-surface-500">{copy.noEmails}</div>
                ) : (
                  <div className="divide-y">
                    {scheduledEmails.map(email => {
                      const template = templates.find(t => t.id === email.email_template_id);
                      const progress = email.recipients_count > 0
                        ? Math.round((email.sent_count / email.recipients_count) * 100) : 0;
                      return (
                        <div key={email.id} className="p-6 hover:bg-surface-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-surface-900">
                                {template?.name || `Template ${email.email_template_id}`}
                              </p>
                              <p className="text-sm text-surface-500 mt-1">
                                {copy.createdAt} {new Date(email.created_at).toLocaleString(locale)}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                              {copy.statusLabels[email.status] || email.status}
                            </span>
                          </div>
                          {email.scheduled_at && (
                            <p className="text-sm text-surface-600 mb-3">
                              {copy.sendAt} {new Date(email.scheduled_at).toLocaleString(locale)}
                            </p>
                          )}
                          {email.cron_expression && (
                            <p className="text-sm text-surface-600 mb-3">
                              {copy.recurring} <span className="font-mono text-xs">{email.cron_expression}</span>
                            </p>
                          )}
                          {['pending', 'completed'].includes(email.status) && (
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-surface-600 mb-1">
                                <span>{copy.sentProgress(email.sent_count, email.recipients_count)}</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="w-full bg-surface-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${email.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {email.failed_count > 0 && (
                            <p className="text-xs text-red-600 mb-3">{copy.failedCount(email.failed_count)}</p>
                          )}
                          {email.completed_at && (
                            <p className="text-xs text-surface-500 mb-3">
                              {copy.completedAt} {new Date(email.completed_at).toLocaleString(locale)}
                            </p>
                          )}
                          {['pending', 'scheduled'].includes(email.status) && (
                            <button onClick={() => handleCancel(email.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">
                              {copy.cancelBtn}
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
    </FeatureGate>
  );
}
