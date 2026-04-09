import React, { useState } from 'react';
import { Send, Loader2, AlertCircle, X } from 'lucide-react';

interface CreatePostFormProps {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
  userAvatar?: string;
  isSubmitting?: boolean;
  maxLength?: number;
}

export default function CreatePostForm({
  onSubmit,
  placeholder = 'Topluluğa bir şey yaz...',
  userAvatar,
  isSubmitting = false,
  maxLength = 500,
}: CreatePostFormProps) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const charCount = body.length;
  const isOverLimit = charCount > maxLength;
  const isNearLimit = charCount > maxLength * 0.9; // Son %10'a girildiğinde uyarmak için
  const isValid = body.trim().length > 0 && !isOverLimit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Lütfen boş bir gönderi yayınlamayın.');
      return;
    }
    if (isOverLimit) {
      setError(`Gönderi en fazla ${maxLength} karakter olabilir.`);
      return;
    }

    try {
      setError(null);
      await onSubmit(body.trim());
      setBody(''); // Başarılı olursa temizle
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gönderi paylaşılamadı. Lütfen tekrar deneyin.');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all overflow-hidden flex flex-col"
    >
      {/* Hata Mesajı Alanı */}
      {error && (
        <div className="bg-red-50/80 border-b border-red-100 px-4 py-2.5 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-xs font-medium text-red-600 flex-1">{error}</p>
          <button 
            type="button" 
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Ana Editör Alanı */}
      <div className="flex gap-3 p-4">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt="Profil"
            className="h-10 w-10 rounded-full object-cover border border-gray-100 bg-gray-50 flex-shrink-0 mt-0.5"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-sm font-semibold text-slate-500">U</span>
          </div>
        )}
        
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (error) setError(null); // Kullanıcı yazmaya başlayınca hatayı temizle
          }}
          placeholder={placeholder}
          disabled={isSubmitting}
          rows={3}
          className="w-full resize-none border-none bg-transparent p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 disabled:opacity-50 min-h-[72px]"
        />
      </div>

      {/* Alt Çubuk (Toolbar) */}
      <div className="bg-gray-50/50 border-t border-gray-100 px-4 py-3 flex items-center justify-between">
        {/* Karakter Sayacı */}
        <div className="flex items-center gap-4">
          <div className={`text-xs font-medium transition-colors ${
            isOverLimit ? 'text-red-600' : isNearLimit ? 'text-amber-500' : 'text-gray-400'
          }`}>
            {charCount} / {maxLength}
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex items-center gap-2">
          {body.trim() && (
            <button
              type="button"
              onClick={() => {
                setBody('');
                setError(null);
              }}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors disabled:opacity-50"
            >
              Temizle
            </button>
          )}
          
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </div>
      </div>
    </form>
  );
}