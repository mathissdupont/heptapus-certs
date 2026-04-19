"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OrgSocialProfileAdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/settings?tab=branding");
  }, [router]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-600" />
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Kurumsal sekmeye yönlendiriliyorsunuz</h1>
        <p className="mt-2 text-sm text-slate-600">
          Organization Social ve Kurumsal alanları tek ekranda birleştirildi.
        </p>
        <div className="mt-6">
          <Link href="/admin/settings?tab=branding" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800">
            <ArrowLeft className="h-4 w-4" />
            Kurumsal sekmeye git
          </Link>
        </div>
      </div>
    </div>
  );
}
