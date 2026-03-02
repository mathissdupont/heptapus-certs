'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface EmailTemplate {
  id: number;
  name: string;
  subject_tr: string;
  subject_en: string;
  body_html: string;
  template_type: string;
}

interface PreviewData {
  subject: string;
  body_html: string;
  language: 'tr' | 'en';
}

export default function EmailTemplatePreviewPage() {
  const params = useParams();
  const eventId = parseInt(params.eventId as string);
  const templateId = parseInt(params.templateId as string);

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');

  const [sampleData, setSampleData] = useState({
    name: 'Ahmet Yılmaz',
    email: 'ahmet@example.com',
  });

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/email-templates/${templateId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async () => {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/email-templates/${templateId}/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            language,
            sample_attendee: sampleData,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (template) {
      generatePreview();
    }
  }, [language, template]);

  if (loading) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  if (!template) {
    return <div className="p-8 text-center text-red-600">Şablon bulunamadı</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Email Şablonu Önizleme</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 sticky top-8">
              <h2 className="text-lg font-semibold mb-4">Şablon: {template.name}</h2>

              {/* Language Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dil
                </label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value as 'tr' | 'en')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Sample Data */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-3">Örnek Veriler</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyadı
                  </label>
                  <input
                    type="text"
                    value={sampleData.name}
                    onChange={e => setSampleData({ ...sampleData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={sampleData.email}
                    onChange={e => setSampleData({ ...sampleData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <button
                  onClick={generatePreview}
                  disabled={generating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {generating ? 'Oluşturuluyor...' : 'Önizlemeyi Yenile'}
                </button>
              </div>

              {/* Template Info */}
              <div className="border-t pt-6 mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Bilgi</h3>
                <p className="text-sm text-gray-600">
                  Tip: <span className="font-medium">{template.template_type}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {preview ? (
                <>
                  {/* Email Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
                    <div className="text-sm opacity-75 mb-2">Konu:</div>
                    <h2 className="text-2xl font-bold">{preview.subject}</h2>
                  </div>

                  {/* Email Body */}
                  <div className="p-8 border-t border-gray-200">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview.body_html }}
                    />
                  </div>

                  {/* HTML Raw View */}
                  <div className="bg-gray-100 p-8 border-t border-gray-200">
                    <details className="cursor-pointer">
                      <summary className="font-medium text-gray-900 mb-2">
                        HTML Kodunu Göster
                      </summary>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-xs font-mono">
                        {preview.body_html}
                      </pre>
                    </details>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Önizleme oluşturuluyor...
                </div>
              )}
            </div>

            {/* Additional Variables Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h3 className="font-medium text-blue-900 mb-2">Mevcut Değişkenler</h3>
              <code className="text-sm text-blue-800 block space-y-1">
                <div>{'{{attendee_name}}'} - Katılımcı adı</div>
                <div>{'{{attendee_email}}'} - Katılımcı e-postası</div>
                <div>{'{{event_name}}'} - Etkinlik adı</div>
                <div>{'{{event_date}}'} - Etkinlik tarihi</div>
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
