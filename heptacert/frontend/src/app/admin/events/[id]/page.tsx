"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type EventOut } from "@/lib/api";

type EventIndexPageProps = {
  params: { id: string };
};

export default function EventIndexPage({ params }: EventIndexPageProps) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/admin/events/${params.id}`)
      .then((response) => response.json())
      .then((event: EventOut) => {
        if (cancelled) return;
        const target = event.certificate_enabled === false ? "attendees" : "certificates";
        router.replace(`/admin/events/${params.id}/${target}`);
      })
      .catch(() => {
        if (!cancelled) router.replace(`/admin/events/${params.id}/attendees`);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  return (
    <div className="surface-panel p-6 text-sm font-medium text-surface-500">
      Etkinlik açılıyor...
    </div>
  );
}
