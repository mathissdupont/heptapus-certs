"use client";

import { useEffect, useState } from "react";
import { apiFetch, getMySubscription, type SubscriptionInfo } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft, Settings, Save, Upload, AlertCircle, Loader2,
  CheckCircle2, Mail, Image as ImageIcon, Lock, Eye, FileText,
  Eye as EyeIcon, Send,
} from "lucide-react";

type EventOut = {
  id: number;
  name: string;
  template_image_url: string;
  event_description?: string;
  event_banner_url?: string;
  config: any;
  auto_email_on_cert?: boolean;
  cert_email_template_id?: number | null;
};

type CertificateTemplate = {
  id: number;
  name: string;
  template_image_url: string;
  config: any;
  order_index: number;
};

export default function EventSettingsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventOut | null>(null);
  const [certTemplates, setCertTemplates] = useState<CertificateTemplate[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    event_description: "",
    event_banner_url: "",
    auto_email_on_cert: false,
    cert_email_template_id: null as number | null,
  });

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [eventId]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [eventRes, certRes, subRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}`),
        apiFetch("/system/cert-templates"),
        getMySubscription(),
      ]);

      const eventData = (await eventRes.json()) as EventOut;
      const certData = (await certRes.json()) as CertificateTemplate[];
      
      setEvent(eventData);
      setCertTemplates(certData);
      setSubscription(subRes);

      setFormData({
        name: eventData.name || "",
        event_description: eventData.event_description || "",
        event_banner_url: eventData.event_banner_url || "",
        auto_email_on_cert: eventData.auto_email_on_cert || false,
        cert_email_template_id: eventData.cert_email_template_id || null,
      });
    } catch (e: any) {
      setError(e?.message || "Veri yükleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  function handleBannerSelect(file: File) {
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setBannerPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.name.trim()) {
        setError("Etkinlik adı gereklidir");
        setSaving(false);
        return;
      }

      const updateData: any = {
        name: formData.name,
        event_description: formData.event_description,
      };

      // Only update cert-related fields if Growth plan is active
      if (subscription?.active && ["growth", "enterprise"].includes(subscription.plan_id || "")) {
        updateData.auto_email_on_cert = formData.auto_email_on_cert;
        updateData.cert_email_template_id = formData.cert_email_template_id;
      }

      const res = await apiFetch(`/admin/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Güncelleme başarısız");

      // Handle banner upload if selected
      if (bannerFile) {
        const formDataBanner = new FormData();
        formDataBanner.append("file", bannerFile);

        const uploadRes = await apiFetch(`/admin/events/${eventId}/banner-upload`, {
          method: "POST",
          body: formDataBanner,
        });

        if (!uploadRes.ok) {
          throw new Error("Banner yükleme başarısız");
        }

        setBannerFile(null);
        setBannerPreview(null);
      }

      setSuccess("Ayarlar başarıyla kaydedildi!");
      await loadData();
    } catch (e: any) {
      setError(e?.message || "İşlem başarısız oldu");
    } finally {
      setSaving(false);
    }
  }

  const hasGrowthPlan = subscription?.active && ["growth", "enterprise"].includes(subscription?.plan_id || "");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/events/${eventId}/editor`} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-8 h-8 text-brand-600" />
                Etkinlik Ayarları
              </h1>
              <p className="text-sm text-gray-500 mt-1">Etkinlik bilgilerini ve özelliklerini yönetin</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/admin/events/${eventId}/email-templates`} title="Email Şablonları" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium">
              <Mail className="h-4 w-4" />
              Email
            </Link>
            <Link href={`/admin/events/${eventId}/bulk-emails`} title="Toplu Email" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium">
              <Send className="h-4 w-4" />
              Kampanya
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 rounded-lg bg-green-50 p-4 text-green-700"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* Basic Information Card */}
          <div className="card p-6">
            <div className="mb-6 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-gray-900">Temel Bilgiler</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Etkinlik Adı *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="ör. DevConf 2024"
                />
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Etkinlik Açıklaması
                </label>
                <textarea
                  value={formData.event_description}
                  onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
                  placeholder="Etkinliğinizin ayrıntılı açıklamasını yazın..."
                  className="input-field min-h-32"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Bu açıklama, katılımcılar etkinliği kaydettiğinde gösterilecektir.
                </p>
              </div>
            </div>
          </div>

          {/* Banner Card */}
          <div className="card p-6">
            <div className="mb-6 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
                <ImageIcon className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-gray-900">Etkinlik Banneri</h2>
            </div>

            <div className="space-y-4">
              {bannerPreview ? (
                <div className="rounded-lg overflow-hidden bg-gray-100 h-48">
                  <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                </div>
              ) : formData.event_banner_url ? (
                <div className="rounded-lg overflow-hidden bg-gray-100 h-48">
                  <img src={formData.event_banner_url} alt="Current Banner" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="rounded-lg bg-gray-100 h-48 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Banner seçilmedi</p>
                </div>
              )}

              <label className="btn btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Banner Yükle
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleBannerSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>

              <p className="text-xs text-gray-500">
                Önerilen boyut: 1200x400px. Desteklenen formatlar: JPG, PNG, WebP
              </p>
            </div>
          </div>

          {/* Email & Certificate Settings */}
          {!hasGrowthPlan ? (
            <div className="card p-6 border-orange-200 bg-orange-50">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Email & Sertifika Ayarları</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Otomatik email gönderme, sertifika şablonu seçimi ve diğer gelişmiş özellikleri kullanmak için Growth veya Enterprise planına yükseltmeniz gerekir.
                  </p>
                  <Link href="/pricing" className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1">
                    Planlara Gözat →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-6">
              <div className="mb-6 flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-green-50 text-green-600">
                  <Mail className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-bold text-gray-900">Email & Sertifika Ayarları</h2>
                <span className="ml-auto text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded">
                  {subscription?.plan_id === "enterprise" ? "Enterprise" : "Growth"}
                </span>
              </div>

              <div className="space-y-6">
                {/* Auto-email toggle */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.auto_email_on_cert}
                      onChange={(e) => setFormData({ ...formData, auto_email_on_cert: e.target.checked })}
                      className="w-4 h-4 accent-brand-600 cursor-pointer"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Sertifika Otomatik Emaili Gönder</p>
                      <p className="text-sm text-gray-600">
                        Sertifika verildiğinde otomatik olarak katılımcıya email gönderin
                      </p>
                    </div>
                  </label>
                </div>

                {/* Certificate template selector */}
                {formData.auto_email_on_cert && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <label className="label mb-2">Email Şablonu</label>
                    <p className="text-sm text-gray-600 mb-3">
                      Katılımcılara sertifika gönderilirken kullanılacak email şablonunu seçin. Email şablonları sertifika fotoğrafı, başarı metni ve bağlantıları içerir.
                    </p>
                    <select
                      value={formData.cert_email_template_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cert_email_template_id: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="input-field"
                    >
                      <option value="">Şablon Seçin</option>
                      <optgroup label="Sistem Şablonları">
                        {/* We'll fetch system templates separately */}
                        <option value="">Sertifika Şablonu Seç</option>
                      </optgroup>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      <Link href={`/admin/events/${eventId}/email-templates`} className="text-brand-600 font-medium">
                        Email şablonlarını yönet →
                      </Link>
                    </p>
                  </motion.div>
                )}

                {/* Certificate design selector */}
                <div>
                  <div className="mb-4">
                    <label className="label mb-2">Sertifika Tasarımı</label>
                    <p className="text-sm text-gray-600 mb-3">
                      Katılımcılara verilecek sertifikaların görünümünü seçin. Her tasarım farklı bir stil sunar.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {certTemplates.map((template) => {
                      const descriptions: { [key: string]: string } = {
                        "Minimalist": "Basit ve temiz tasarım",
                        "Profesyonel": "Kurumsal görünüm",
                        "Renkli": "Canlı ve dinamik tasarım",
                        "Kurumsal": "Resmi sertifika formatı",
                        "Modern": "Çağdaş ve stilish tasarım",
                        "Elegant": "Şık ve zarif tasarım",
                        "Akademik": "Akademik sertifika formatı",
                      };
                      return (
                        <button
                          key={template.id}
                          onClick={() => setFormData({ ...formData, cert_email_template_id: template.id })}
                          className={`relative group rounded-lg overflow-hidden transition-all ${
                            formData.cert_email_template_id === template.id
                              ? "ring-2 ring-brand-600 shadow-lg"
                              : "hover:shadow-md"
                          }`}
                          title={descriptions[template.name] || template.name}
                        >
                          <div className="bg-gray-200 aspect-video flex items-center justify-center">
                            <img
                              src={template.template_image_url}
                              alt={template.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                            {formData.cert_email_template_id === template.id && (
                              <CheckCircle2 className="w-8 h-8 text-white" />
                            )}
                          </div>
                          <div className="p-3 text-sm bg-white">
                            <p className="font-medium text-gray-900 text-center">{template.name}</p>
                            <p className="text-xs text-gray-500 text-center mt-1">
                              {descriptions[template.name] || ""}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick links */}
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <Link
                    href={`/admin/events/${eventId}/email-templates`}
                    className="flex items-center gap-2 text-brand-600 font-medium hover:text-brand-700"
                  >
                    <Mail className="w-4 h-4" />
                    Email Şablonlarını Yönet
                  </Link>
                  <Link
                    href={`/admin/events/${eventId}/bulk-emails`}
                    className="flex items-center gap-2 text-brand-600 font-medium hover:text-brand-700"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Toplu Email Kampanyalarını Yönet
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3 justify-end">
            <Link href={`/admin/events/${eventId}/editor`} className="btn btn-secondary">
              İptal
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Ayarları Kaydet
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
