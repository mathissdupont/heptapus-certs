import type { Metadata } from "next";
import VerifyDetailClient from "./_verify-detail-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8765/api";

type Props = { params: Promise<{ uuid: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uuid } = await params;
  try {
    const res = await fetch(`${API_BASE}/verify/${uuid}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const cert = await res.json();
      const title = `${cert.student_name} - ${cert.event_name}`;
      const description = `${cert.student_name} received a digital certificate for ${cert.event_name}. Verification code: ${uuid}`;
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
    // fall through
  }

  return {
    title: "Certificate Verification",
    description: "Verify the authenticity of this digital certificate.",
  };
}

export default async function VerifyDetailPage({ params }: Props) {
  return <VerifyDetailClient params={await params} />;
}
