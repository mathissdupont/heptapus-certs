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
        className="flex flex-col overflow-hidden rounded-xl border border-outline-subtle bg-raised shadow-sm focus-within:border-outline-strong focus-within:ring-1 focus-within:ring-outline-strong transition-all"
      >
        {/* Kime Yanıt Verildiğini Gösteren Bilgi Çubuğu */}
        {parentAuthor && (
          <div className="flex items-center gap-1.5 border-b border-outline-subtle bg-canvas/50 px-4 py-2 text-xs text-content-muted">
            <CornerDownRight className="h-3.5 w-3.5 text-content-muted" />
            <span>
              <span className="font-semibold text-content-secondary">@{parentAuthor}</span> adlı kullanıcıya yanıtlanıyor
            </span>
          </div>
        )}

        {/* Hata Mesajı Alanı */}
        {error && (
          <div className="flex items-center gap-2 border-b border-status-danger-border bg-status-danger-bg/80 px-4 py-2.5">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-status-danger-content" />
            <p className="flex-1 text-xs font-medium text-status-danger-content">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-status-danger-content transition-colors hover:text-status-danger-content"
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
          className="min-h-[80px] w-full resize-none border-none bg-transparent px-4 py-3 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-0 disabled:opacity-50"
        />

        {/* Alt Çubuk (Aksiyon Butonları) */}
        <div className="flex items-center justify-end gap-2 border-t border-outline-subtle bg-raised px-4 py-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-content-muted transition-colors hover:bg-sunken hover:text-content-primary disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !body.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-inverse-surface px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-inverse-surface disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {isSubmitting ? 'Gönderiliyor...' : 'Yanıtla'}
          </button>
        </div>
      </form>
    </div>
  );
}