import type { Metadata } from "next";
import VerifyDetailClient from "./_verify-detail-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8765/api";

type Props = { params: { uuid: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const res = await fetch(`${API_BASE}/verify/${params.uuid}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const cert = await res.json();
      const title = `${cert.student_name} — ${cert.event_name}`;
      const description = `${cert.student_name} adlı kişiye "${cert.event_name}" etkinliği için düzenlenmiş HeptaCert dijital sertifikası. Doğrulama: ${params.uuid}`;
      return {
        title,
        description,
        openGraph: {
          title: `${title} | HeptaCert`,
          description,
          type: "website",
        },
      };
    }
  } catch {
    // fall through to default
  }
  return {
    title: "Sertifika Doğrulama",
    description:
      "Bu dijital sertifikanın gerçekliğini doğrulayın.",
  };
}

export default function VerifyDetailPage({ params }: Props) {
  return <VerifyDetailClient params={params} />;
}
