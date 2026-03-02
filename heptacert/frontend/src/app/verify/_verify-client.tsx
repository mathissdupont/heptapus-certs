"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, QrCode, ShieldCheck } from "lucide-react";

export default function VerifyIndexPage() {
  const [uuid, setUuid] = useState("");
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = uuid.trim();
    if (!trimmed) return;
    router.push(`/verify/${trimmed}`);
  }

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center py-12 text-center">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-brand">
          <ShieldCheck className="h-8 w-8" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Sertifika Doğrulama</h1>
        <p className="text-gray-500 mb-10 max-w-sm mx-auto">
          Sertifika kimliğini (UUID) veya üzerindeki QR kodu okutarak belgenin gerçekliğini doğrulayın.
        </p>

        {/* Search form */}
        <form onSubmit={onSubmit} className="card p-6">
          <label className="label text-left block mb-2">Sertifika Kimliği (UUID)</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-10"
                type="text"
                value={uuid}
                onChange={(e) => setUuid(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                spellCheck={false}
              />
            </div>
            <button type="submit" className="btn-primary shrink-0">
              Sorgula
            </button>
          </div>
          <p className="mt-3 text-left text-xs text-gray-400">
            UUID'yi sertifika üzerindeki QR kodun altında veya belge metninde bulabilirsiniz.
          </p>
        </form>

        {/* Tips */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <QrCode className="h-5 w-5 text-brand-600 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">QR Kod</h3>
            <p className="text-xs text-gray-500">Telefonunuzla QR kodu okutun; doğrulama sayfasına otomatik yönlendirilirsiniz.</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <Search className="h-5 w-5 text-emerald-600 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Manuel Sorgulama</h3>
            <p className="text-xs text-gray-500">UUID'yi yukarıdaki alana yapıştırarak da doğrulama yapabilirsiniz.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
