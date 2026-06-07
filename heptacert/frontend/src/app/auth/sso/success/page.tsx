"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setPublicMemberToken } from "@/lib/api";

function SsoSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      setPublicMemberToken(token);
      router.replace("/courses");
    } else {
      router.replace("/login?error=sso_failed");
    }
  }, [params, router]);

  return (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      <p className="text-sm text-gray-600">Giriş yapılıyor...</p>
    </div>
  );
}

export default function SsoSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-indigo-600" />}>
        <SsoSuccessContent />
      </Suspense>
    </div>
  );
}
