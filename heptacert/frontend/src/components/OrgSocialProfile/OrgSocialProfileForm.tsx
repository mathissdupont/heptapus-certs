import React, { useState } from 'react';
import { 
  Camera, 
  Globe, 
  Github, 
  Instagram, 
  Mail, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';

export interface OrgSocialProfileData {
  bio: string;
  banner_url?: string;
  website?: string;
  github_url?: string;
  instagram_handle?: string;
  contact_email?: string;
}

interface OrgSocialProfileFormProps {
  initialData: OrgSocialProfileData;
  onSubmit: (data: OrgSocialProfileData) => Promise<void>;
  isLoading?: boolean;
  orgName: string;
}

export default function OrgSocialProfileForm({
  initialData,
  onSubmit,
  isLoading = false,
  orgName,
}: OrgSocialProfileFormProps) {
  const [formData, setFormData] = useState<OrgSocialProfileData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initialData.banner_url || null);

  const handleChange = (field: keyof OrgSocialProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Banner dosyası 5MB\'dan küçük olmalıdır.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Lütfen sadece resim dosyası seçin (PNG, JPG).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setBannerPreview(result);
        setFormData((prev) => ({ ...prev, banner_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bio.trim()) {
      setError('Lütfen topluluğunuz için kısa bir açıklama yazın.');
      return;
    }
    if (formData.bio.length > 500) {
      setError('Açıklama 500 karakteri aşamaz.');
      return;
    }

    try {
      setError(null);
      await onSubmit(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilgiler kaydedilemedi. Lütfen tekrar deneyin.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* Banner Upload Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Topluluk Kapak Fotoğrafı
        </label>
        <div className="relative h-48 w-full sm:h-56 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden group transition-colors hover:border-gray-300">
          {bannerPreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={bannerPreview} 
                alt={`${orgName} banner preview`} 
                className="h-full w-full object-cover" 
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gray-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <div className="flex items-center gap-2 bg-white/90 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                  <Camera className="h-4 w-4" />
                  Kapağı Değiştir
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
              <div className="h-12 w-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm mb-3">
                <Camera className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium">Resim yükle veya sürükle</p>
              <p className="text-xs text-gray-400 mt-1">16:9 oranında PNG, JPG (Max 5MB)</p>
            </div>
          )}
          
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleBannerChange}
            disabled={isLoading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            title="Kapak fotoğrafı seç"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sol Kolon: Bio */}
        <div className="lg:col-span-7 space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Hakkımızda (Bio) <span className="text-red-500">*</span>
          </label>
          <div className="rounded-xl border border-gray-200 bg-white focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all overflow-hidden shadow-sm">
            <textarea
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Topluluğunuzun amacı nedir? Neler yaparsınız?"
              rows={6}
              maxLength={500}
              disabled={isLoading}
              className="w-full resize-none border-none bg-transparent p-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 disabled:opacity-50"
            />
            <div className="bg-gray-50/50 px-4 py-2 border-t border-gray-100 flex justify-end">
              <span className={`text-xs font-medium ${
                formData.bio.length > 450 ? 'text-amber-500' : 'text-gray-400'
              }`}>
                {formData.bio.length} / 500
              </span>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Linkler ve İletişim */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Website */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900">Web Sitesi</label>
            <div className="flex rounded-lg shadow-sm border border-gray-200 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all overflow-hidden bg-white">
              <span className="inline-flex items-center px-3 border-r border-gray-200 bg-gray-50 text-gray-500">
                <Globe className="h-4 w-4" />
              </span>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleChange('website', e.currentTarget.value)}
                placeholder="https://example.com"
                disabled={isLoading}
                className="flex-1 w-full min-w-0 px-3 py-2.5 text-sm text-gray-900 border-none focus:ring-0 placeholder:text-gray-400 disabled:opacity-50"
              />
            </div>
          </div>

          {/* GitHub */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900">GitHub</label>
            <div className="flex rounded-lg shadow-sm border border-gray-200 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all overflow-hidden bg-white">
              <span className="inline-flex items-center px-3 border-r border-gray-200 bg-gray-50 text-gray-500 text-sm">
                <Github className="h-4 w-4 mr-1.5" /> github.com/
              </span>
              <input
                type="text"
                value={formData.github_url || ''}
                onChange={(e) => handleChange('github_url', e.currentTarget.value)}
                placeholder="username"
                disabled={isLoading}
                className="flex-1 w-full min-w-0 px-3 py-2.5 text-sm text-gray-900 border-none focus:ring-0 placeholder:text-gray-400 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Instagram */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900">Instagram</label>
            <div className="flex rounded-lg shadow-sm border border-gray-200 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all overflow-hidden bg-white">
              <span className="inline-flex items-center px-3 border-r border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium">
                <Instagram className="h-4 w-4 mr-1.5" /> @
              </span>
              <input
                type="text"
                value={formData.instagram_handle || ''}
                onChange={(e) => handleChange('instagram_handle', e.currentTarget.value)}
                placeholder="kullaniciadi"
                disabled={isLoading}
                className="flex-1 w-full min-w-0 px-3 py-2.5 text-sm text-gray-900 border-none focus:ring-0 placeholder:text-gray-400 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900">İletişim E-postası</label>
            <div className="flex rounded-lg shadow-sm border border-gray-200 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all overflow-hidden bg-white">
              <span className="inline-flex items-center px-3 border-r border-gray-200 bg-gray-50 text-gray-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => handleChange('contact_email', e.currentTarget.value)}
                placeholder="iletisim@topluluk.com"
                disabled={isLoading}
                className="flex-1 w-full min-w-0 px-3 py-2.5 text-sm text-gray-900 border-none focus:ring-0 placeholder:text-gray-400 disabled:opacity-50"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Profil başarıyla güncellendi!
        </div>
      )}

      {/* Submit Button Area */}
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-500 hidden sm:block">
          Değişiklikler anında topluluk profilinize yansıyacaktır.
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 w-full sm:w-auto justify-center shadow-sm"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </form>
  );
}