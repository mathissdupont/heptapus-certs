import React, { useState } from 'react';
import { Send, Loader2, AlertCircle, X, CornerDownRight } from 'lucide-react';

interface ReplyFormProps {
  parentAuthor?: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  isSubmitting?: boolean;
}

export default function ReplyForm({
  parentAuthor,
  onSubmit,
  onCancel,
  placeholder = 'Yanıtınızı yazın...',
  isSubmitting = false,
}: ReplyFormProps) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Lütfen boş bir yanıt göndermeyin.');
      return;
    }

    try {
      setError(null);
      await onSubmit(body.trim());
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yanıt gönderilemedi. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="mt-3">
      <form 
        onSubmit={handleSubmit} 
        className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all"
      >
        {/* Kime Yanıt Verildiğini Gösteren Bilgi Çubuğu */}
        {parentAuthor && (
          <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50/50 px-4 py-2 text-xs text-gray-500">
            <CornerDownRight className="h-3.5 w-3.5 text-gray-400" />
            <span>
              <span className="font-semibold text-gray-700">@{parentAuthor}</span> adlı kullanıcıya yanıtlanıyor
            </span>
          </div>
        )}

        {/* Hata Mesajı Alanı */}
        {error && (
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50/80 px-4 py-2.5">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
            <p className="flex-1 text-xs font-medium text-red-600">{error}</p>
            <button 
              type="button" 
              onClick={() => setError(null)}
              className="text-red-400 transition-colors hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Ana Metin Alanı (Textarea) */}
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (error) setError(null); // Yazmaya başlayınca hatayı temizle
          }}
          placeholder={placeholder}
          disabled={isSubmitting}
          rows={3}
          className="min-h-[80px] w-full resize-none border-none bg-transparent px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 disabled:opacity-50"
        />

        {/* Alt Çubuk (Aksiyon Butonları) */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-4 py-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !body.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {isSubmitting ? 'Gönderiliyor...' : 'Yanıtla'}
          </button>
        </div>
      </form>
    </div>
  );
}