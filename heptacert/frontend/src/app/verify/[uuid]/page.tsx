import type { Metadata } from "next";
import VerifyDetailClient from "./_verify-detail-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8765/api";
const FRONTEND_BASE = process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://heptacert.com";

function absoluteUrl(value: string | null | undefined, base = FRONTEND_BASE) {
  if (!value) return null;
  try {
    return new URL(value).toString();
  } catch {
    return new URL(value.startsWith("/") ? value : `/${value}`, base).toString();
  }
}

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
      const url = absoluteUrl(`/verify/${uuid}`) || `${FRONTEND_BASE.replace(/\/$/, "")}/verify/${uuid}`;
      const imageUrl = absoluteUrl(cert.png_url) || absoluteUrl("/logo.png");
      return {
        metadataBase: new URL(FRONTEND_BASE),
        title,
        description,
        alternates: {
          canonical: url,
        },
        openGraph: {
          title: `${title} | HeptaCert`,
          description,
          type: "website",
          url,
          images: imageUrl
            ? [
                {
                  url: imageUrl,
                  width: 1200,
                  height: 630,
                  alt: `${title} certificate preview`,
                },
              ]
            : undefined,
        },
        twitter: {
          card: imageUrl ? "summary_large_image" : "summary",
          title: `${title} | HeptaCert`,
          description,
          images: imageUrl ? [imageUrl] : undefined,
        },
      };
    }
  } catch {
    // fall through
  }

  return {
    metadataBase: new URL(FRONTEND_BASE),
    title: "Certificate Verification",
    description: "Verify the authenticity of this digital certificate.",
    openGraph: {
      title: "Certificate Verification | HeptaCert",
      description: "Verify the authenticity of this digital certificate.",
      type: "website",
      images: [{ url: "/logo.png", width: 1200, height: 630, alt: "HeptaCert" }],
    },
  };
}

export default async function VerifyDetailPage({ params }: Props) {
  return <VerifyDetailClient params={await params} />;
}
