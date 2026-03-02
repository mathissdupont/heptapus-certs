'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SMTPPreset = {
  name: string;
  host: string;
  port: number;
  security: 'none' | 'tls' | 'ssl';
};

const SMTP_PRESETS: SMTPPreset[] = [
  {
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    security: 'tls',
  },
  {
    name: 'Outlook / Microsoft 365',
    host: 'smtp.office365.com',
    port: 587,
    security: 'tls',
  },
  {
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    security: 'tls',
  },
  {
    name: 'Mailgun',
    host: 'smtp.mailgun.org',
    port: 587,
    security: 'tls',
  },
];

interface EmailConfig {
  id: number;
  user_id: number;
  smtp_enabled: boolean;
  from_name: string | null;
  reply_to: string | null;
  auto_cc: string | null;
  enable_tracking_pixel: boolean;
}

export default function EmailSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);

  const [formData, setFormData] = useState({
    from_name: '',
    reply_to: '',
    auto_cc: '',
    enable_tracking_pixel: false,
    smtp_enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/email-config', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setFormData(prev => ({
          ...prev,
          from_name: data.from_name || '',
          reply_to: data.reply_to || '',
          auto_cc: data.auto_cc || '',
          enable_tracking_pixel: data.enable_tracking_pixel || false,
          smtp_enabled: data.smtp_enabled || false,
        }));
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePresetSelect = (preset: SMTPPreset) => {
    setFormData(prev => ({
      ...prev,
      smtp_host: preset.host,
      smtp_port: preset.port,
    }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/email-config/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          smtp_host: formData.smtp_host,
          smtp_port: parseInt(formData.smtp_port.toString()),
          smtp_user: formData.smtp_user,
          smtp_password: formData.smtp_password,
          from_email: formData.reply_to || 'noreply@heptacert.com',
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        status: 'error',
        message: `Bağlantı hatası: ${error}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/email-config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        alert('Email ayarları kaydedildi');
      } else {
        alert('Kaydedilirken hata oluştu');
      }
    } catch (error) {
      alert(`Hata: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Email İle Ayarları</h1>

        {/* Enable/Disable SMTP */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">SMTP Yapılandırması</h2>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="smtp_enabled"
                checked={formData.smtp_enabled}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-gray-700">SMTP'yi Etkinleştir</span>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Kendi SMTP sunucunuzu kullanarak emails gönderin
            </p>
          </div>

          {formData.smtp_enabled && (
            <>
              {/* SMTP Presets */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Önceden Ayarlanmış Sağlayıcılar</label>
                <div className="grid grid-cols-2 gap-2">
                  {SMTP_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetSelect(preset)}
                      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* SMTP Host */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Sunucu</label>
                <input
                  type="text"
                  name="smtp_host"
                  value={formData.smtp_host}
                  onChange={handleInputChange}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* SMTP Port */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <input
                  type="number"
                  name="smtp_port"
                  value={formData.smtp_port}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* SMTP User */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
                <input
                  type="email"
                  name="smtp_user"
                  value={formData.smtp_user}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* SMTP Password */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                <input
                  type="password"
                  name="smtp_password"
                  value={formData.smtp_password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Test Connection Button */}
              <div className="mb-6">
                <button
                  onClick={handleTestConnection}
                  disabled={testing || !formData.smtp_host || !formData.smtp_user || !formData.smtp_password}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {testing ? 'Test ediliyor...' : 'Bağlantıyı Test Et'}
                </button>
              </div>

              {/* Test Result */}
              {testResult && (
                <div
                  className={`p-4 rounded-lg mb-6 ${
                    testResult.status === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <p
                    className={`font-medium ${
                      testResult.status === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {testResult.status === 'success' ? '✓ Başarılı' : '✗ Hata'}
                  </p>
                  <p className="text-sm mt-1">{testResult.message}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* From Name and Reply-To */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Gönderen Bilgileri</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Gönderen Adı</label>
            <input
              type="text"
              name="from_name"
              value={formData.from_name}
              onChange={handleInputChange}
              placeholder="HeptaCert"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Yanıt E-postası</label>
            <input
              type="email"
              name="reply_to"
              value={formData.reply_to}
              onChange={handleInputChange}
              placeholder="support@heptacert.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Otomatik CC</label>
            <input
              type="email"
              name="auto_cc"
              value={formData.auto_cc}
              onChange={handleInputChange}
              placeholder="archive@example.com (İsteğe bağlı)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* Tracking */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Tracking ve Analitik</h2>

          <label className="flex items-center">
            <input
              type="checkbox"
              name="enable_tracking_pixel"
              checked={formData.enable_tracking_pixel}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-gray-700">Açılma Takibini Etkinleştir</span>
          </label>
          <p className="text-sm text-gray-500 mt-1">
            E-postaların açılmasını takip etmek için tracking pixel kullan
          </p>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
