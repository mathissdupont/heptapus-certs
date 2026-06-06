import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Developer Portal — HeptaCert API Dokümantasyonu",
  description:
    "HeptaCert REST API ile etkinlik, sertifika, katılımcı ve CRM verilerinizi programatik olarak yönetin. API anahtarı alın, endpoint'leri keşfedin, rate limit ve kapsam bilgilerine ulaşın.",
  keywords: [
    "HeptaCert API",
    "sertifika API",
    "etkinlik yönetimi API",
    "dijital sertifika entegrasyon",
    "REST API Turkey",
    "certificate management API",
  ],
  alternates: { canonical: "/developers" },
  openGraph: {
    title: "HeptaCert Developer Portal",
    description: "REST API ile sertifika ve etkinlik verilerinizi sisteminize entegre edin.",
    url: "/developers",
    type: "website",
  },
  robots: { index: true, follow: true },
};

type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  path: string;
  description: string;
  scope?: string;
};

const ENDPOINTS: { group: string; items: Endpoint[] }[] = [
  {
    group: "Etkinlikler",
    items: [
      { method: "GET",    path: "/api/admin/events",                      description: "Tüm etkinlikleri listele",    scope: "events:read"  },
      { method: "POST",   path: "/api/admin/events",                      description: "Yeni etkinlik oluştur",       scope: "events:write" },
      { method: "GET",    path: "/api/admin/events/{id}",                 description: "Etkinlik detayı",             scope: "events:read"  },
      { method: "PATCH",  path: "/api/admin/events/{id}",                 description: "Etkinlik güncelle",           scope: "events:write" },
      { method: "DELETE", path: "/api/admin/events/{id}",                 description: "Etkinliği sil",               scope: "events:write" },
    ],
  },
  {
    group: "Sertifikalar",
    items: [
      { method: "GET",    path: "/api/admin/events/{id}/certificates",    description: "Sertifikaları listele",       scope: "certificates:read"  },
      { method: "POST",   path: "/api/admin/events/{id}/certificates",    description: "Sertifika oluştur",           scope: "certificates:write" },
      { method: "GET",    path: "/api/admin/certificates/{cert_id}",      description: "Sertifika detayı",            scope: "certificates:read"  },
      { method: "DELETE", path: "/api/admin/certificates/{cert_id}",      description: "Sertifika iptal et",          scope: "certificates:write" },
    ],
  },
  {
    group: "Katılımcılar",
    items: [
      { method: "GET",    path: "/api/admin/events/{id}/attendees",       description: "Katılımcıları listele",       scope: "attendees:read"  },
      { method: "POST",   path: "/api/admin/events/{id}/attendees",       description: "Katılımcı ekle",              scope: "attendees:write" },
      { method: "PATCH",  path: "/api/admin/events/{id}/attendees/{aid}", description: "Katılımcı güncelle",          scope: "attendees:write" },
    ],
  },
  {
    group: "CRM",
    items: [
      { method: "GET",  path: "/api/admin/crm/accounts",  description: "Şirketleri listele",     scope: "crm:read"  },
      { method: "POST", path: "/api/admin/crm/accounts",  description: "Yeni şirket oluştur",    scope: "crm:write" },
      { method: "GET",  path: "/api/admin/crm/pipeline",  description: "Pipeline görünümü",      scope: "crm:read"  },
    ],
  },
  {
    group: "Analitik",
    items: [
      { method: "GET", path: "/api/admin/analytics/org/overview",           description: "Genel bakış metrikleri",  scope: "analytics:read" },
      { method: "GET", path: "/api/admin/analytics/org/crm",               description: "CRM analitik verileri",   scope: "analytics:read" },
      { method: "GET", path: "/api/admin/analytics/org/training-compliance",description: "Eğitim uyum raporu",     scope: "analytics:read" },
    ],
  },
  {
    group: "Marketplace (Public)",
    items: [
      { method: "GET", path: "/api/public/marketplace",      description: "Listelenmiş programları getir" },
      { method: "GET", path: "/api/public/marketplace/{id}", description: "Program detayı"                },
    ],
  },
  {
    group: "Lead Forms (Public)",
    items: [
      { method: "GET",  path: "/api/public/forms/{slug}/meta",   description: "Form tanımını getir" },
      { method: "POST", path: "/api/public/forms/{slug}/submit", description: "Form gönderimi"      },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-blue-50 text-blue-700",
  POST:   "bg-green-50 text-green-700",
  PATCH:  "bg-yellow-50 text-yellow-800",
  DELETE: "bg-red-50 text-red-700",
  PUT:    "bg-purple-50 text-purple-700",
};

const RATE_LIMITS = [
  { plan: "Starter",    rpm: 60,   rph: "3.600" },
  { plan: "Growth",     rpm: 300,  rph: "18.000" },
  { plan: "Enterprise", rpm: 1000, rph: "60.000" },
];

const FAQ = [
  {
    q: "HeptaCert API'si nasıl çalışır?",
    a: "HeptaCert REST API, Bearer token kimlik doğrulaması kullanır. Tüm istekler JSON döndürür. API anahtarını /admin/settings/api adresinden oluşturabilirsiniz.",
  },
  {
    q: "Hangi programlama dilleri destekleniyor?",
    a: "REST API olduğu için Python, JavaScript/Node.js, PHP, Go, Ruby gibi HTTP isteği yapabilen her dille kullanılabilir.",
  },
  {
    q: "Sertifika doğrulama API'si var mı?",
    a: "Evet. GET /api/v/certs/{cert_code} endpoint'i sertifika geçerliliğini kontrol eder. Bu endpoint public'tir ve kimlik doğrulama gerektirmez.",
  },
  {
    q: "Webhook desteği var mı?",
    a: "Evet. Sertifika oluşturulması, katılımcı eklenmesi gibi olaylar için webhook endpoint'leri tanımlayabilirsiniz.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  name: "HeptaCert API Dokümantasyonu",
  description: "HeptaCert REST API ile dijital sertifika oluşturma, etkinlik yönetimi ve CRM verilerine programatik erişim sağlayın.",
  author: { "@type": "Organization", name: "Heptapus Group" },
  publisher: { "@type": "Organization", name: "Heptapus Group", url: "https://heptapusgroup.com" },
  inLanguage: ["tr", "en"],
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function DevelopersPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }} />

      <div className="min-h-screen bg-surface-50">
        {/* Page header */}
        <div className="bg-white border-b border-surface-200 px-4 py-10">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-surface-900 mb-1">Developer Portal</h1>
            <p className="text-surface-500 text-sm mb-6">
              REST API ile etkinlik, sertifika ve CRM verilerinizi sisteminize entegre edin.
              Tüm endpoint&apos;ler JSON döndürür, Bearer token kimlik doğrulama gerektirir.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/admin/settings/api"
                className="btn-primary text-sm"
              >
                API Anahtarı Al
              </Link>
              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                Swagger Docs ↗
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* Auth */}
          <section aria-labelledby="auth-heading">
            <h2 id="auth-heading" className="text-base font-semibold text-surface-900 mb-3">Kimlik Doğrulama</h2>
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <p className="text-sm text-surface-600 mb-3">
                Her istekte <code className="font-mono bg-surface-100 px-1.5 py-0.5 rounded text-xs">Authorization</code> header&apos;ı gönderin:
              </p>
              <pre className="bg-surface-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto font-mono leading-relaxed">
{`curl https://cert.heptapusgroup.com/api/admin/events \\
  -H "Authorization: Bearer hc_YOUR_API_KEY"`}
              </pre>
            </div>
          </section>

          {/* Rate Limits */}
          <section aria-labelledby="rate-heading">
            <h2 id="rate-heading" className="text-base font-semibold text-surface-900 mb-3">Rate Limit</h2>
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-surface-700 text-xs uppercase tracking-wide">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-700 text-xs uppercase tracking-wide">İstek / Dakika</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-700 text-xs uppercase tracking-wide">İstek / Saat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {RATE_LIMITS.map((r) => (
                    <tr key={r.plan} className="hover:bg-surface-50">
                      <td className="px-4 py-3 font-medium text-surface-900">{r.plan}</td>
                      <td className="px-4 py-3 text-surface-600">{r.rpm}</td>
                      <td className="px-4 py-3 text-surface-600">{r.rph}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-surface-400 mt-2">
              Limit aşıldığında <code className="font-mono">429 Too Many Requests</code> döner.{" "}
              <code className="font-mono">Retry-After</code> header&apos;ı bekleme süresini belirtir.
            </p>
          </section>

          {/* Endpoints */}
          <section aria-labelledby="endpoints-heading">
            <h2 id="endpoints-heading" className="text-base font-semibold text-surface-900 mb-3">Endpoint&apos;ler</h2>
            <div className="space-y-4">
              {ENDPOINTS.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1.5 pl-1">{group.group}</p>
                  <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-surface-100">
                        {group.items.map((ep, i) => (
                          <tr key={i} className="hover:bg-surface-50">
                            <td className="px-4 py-2.5 w-16">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold font-mono ${METHOD_COLORS[ep.method]}`}>
                                {ep.method}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-surface-800 min-w-56 max-w-72">{ep.path}</td>
                            <td className="px-4 py-2.5 text-surface-600 text-xs">{ep.description}</td>
                            <td className="px-4 py-2.5 text-right">
                              {ep.scope ? (
                                <span className="text-xs bg-surface-100 text-surface-600 px-2 py-0.5 rounded font-mono">{ep.scope}</span>
                              ) : (
                                <span className="text-xs text-surface-400">Public</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Code example */}
          <section aria-labelledby="example-heading">
            <h2 id="example-heading" className="text-base font-semibold text-surface-900 mb-3">Örnek: Sertifika Listele</h2>
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <pre className="bg-surface-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto font-mono leading-relaxed">
{`curl "https://cert.heptapusgroup.com/api/admin/events/123/certificates?limit=50" \\
  -H "Authorization: Bearer hc_YOUR_API_KEY"

# Yanıt:
[
  {
    "id": 9001,
    "public_id": "abc123",
    "attendee_name": "Ahmet Yılmaz",
    "issued_at": "2026-06-01T10:00:00Z",
    "cert_url": "https://cert.heptapusgroup.com/c/abc123"
  }
]`}
              </pre>
            </div>
          </section>

          {/* FAQ */}
          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-base font-semibold text-surface-900 mb-3">Sık Sorulan Sorular</h2>
            <div className="space-y-2">
              {FAQ.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-surface-200 p-5">
                  <h3 className="font-semibold text-surface-900 mb-1.5 text-sm">{item.q}</h3>
                  <p className="text-xs text-surface-600 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Support */}
          <div className="bg-surface-100 rounded-xl border border-surface-200 p-5 text-center">
            <p className="text-sm text-surface-700">
              Sorunuz mu var?{" "}
              <a href="mailto:destek@heptacert.com" className="font-medium text-surface-900 underline underline-offset-2">
                destek@heptacert.com
              </a>{" "}
              adresine yazın.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
