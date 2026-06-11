"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  path: string;
  descriptionTr: string;
  descriptionEn: string;
  scope?: string;
};

type EndpointGroup = {
  groupTr: string;
  groupEn: string;
  items: Endpoint[];
};

const ENDPOINTS: EndpointGroup[] = [
  {
    groupTr: "Etkinlikler", groupEn: "Events",
    items: [
      { method: "GET",    path: "/api/admin/events",                      descriptionTr: "Tüm etkinlikleri listele",    descriptionEn: "List all events",         scope: "events:read"  },
      { method: "POST",   path: "/api/admin/events",                      descriptionTr: "Yeni etkinlik oluştur",       descriptionEn: "Create new event",        scope: "events:write" },
      { method: "GET",    path: "/api/admin/events/{id}",                 descriptionTr: "Etkinlik detayı",             descriptionEn: "Get event detail",        scope: "events:read"  },
      { method: "PATCH",  path: "/api/admin/events/{id}",                 descriptionTr: "Etkinlik güncelle",           descriptionEn: "Update event",            scope: "events:write" },
      { method: "DELETE", path: "/api/admin/events/{id}",                 descriptionTr: "Etkinliği sil",               descriptionEn: "Delete event",            scope: "events:write" },
    ],
  },
  {
    groupTr: "Sertifikalar", groupEn: "Certificates",
    items: [
      { method: "GET",    path: "/api/admin/events/{id}/certificates",    descriptionTr: "Sertifikaları listele",       descriptionEn: "List certificates",       scope: "certificates:read"  },
      { method: "POST",   path: "/api/admin/events/{id}/certificates",    descriptionTr: "Sertifika oluştur",           descriptionEn: "Issue certificate",       scope: "certificates:write" },
      { method: "GET",    path: "/api/admin/certificates/{cert_id}",      descriptionTr: "Sertifika detayı",            descriptionEn: "Get certificate detail",  scope: "certificates:read"  },
      { method: "DELETE", path: "/api/admin/certificates/{cert_id}",      descriptionTr: "Sertifika iptal et",          descriptionEn: "Revoke certificate",      scope: "certificates:write" },
    ],
  },
  {
    groupTr: "Katılımcılar", groupEn: "Attendees",
    items: [
      { method: "GET",    path: "/api/admin/events/{id}/attendees",       descriptionTr: "Katılımcıları listele",       descriptionEn: "List attendees",          scope: "attendees:read"  },
      { method: "POST",   path: "/api/admin/events/{id}/attendees",       descriptionTr: "Katılımcı ekle",              descriptionEn: "Add attendee",            scope: "attendees:write" },
      { method: "PATCH",  path: "/api/admin/events/{id}/attendees/{aid}", descriptionTr: "Katılımcı güncelle",          descriptionEn: "Update attendee",         scope: "attendees:write" },
    ],
  },
  {
    groupTr: "CRM", groupEn: "CRM",
    items: [
      { method: "GET",  path: "/api/admin/crm/accounts",  descriptionTr: "Şirketleri listele",     descriptionEn: "List company accounts",  scope: "crm:read"  },
      { method: "POST", path: "/api/admin/crm/accounts",  descriptionTr: "Yeni şirket oluştur",    descriptionEn: "Create company account", scope: "crm:write" },
      { method: "GET",  path: "/api/admin/crm/pipeline",  descriptionTr: "Pipeline görünümü",      descriptionEn: "Pipeline view",          scope: "crm:read"  },
    ],
  },
  {
    groupTr: "Analitik", groupEn: "Analytics",
    items: [
      { method: "GET", path: "/api/admin/analytics/org/overview",            descriptionTr: "Genel bakış metrikleri",  descriptionEn: "Overview metrics",         scope: "analytics:read" },
      { method: "GET", path: "/api/admin/analytics/org/crm",                 descriptionTr: "CRM analitik verileri",   descriptionEn: "CRM analytics data",       scope: "analytics:read" },
      { method: "GET", path: "/api/admin/analytics/org/training-compliance", descriptionTr: "Eğitim uyum raporu",      descriptionEn: "Training compliance report",scope: "analytics:read" },
    ],
  },
  {
    groupTr: "Marketplace (Public)", groupEn: "Marketplace (Public)",
    items: [
      { method: "GET", path: "/api/public/marketplace",      descriptionTr: "Listelenmiş programları getir", descriptionEn: "Get listed programs" },
      { method: "GET", path: "/api/public/marketplace/{id}", descriptionTr: "Program detayı",                descriptionEn: "Program detail"      },
    ],
  },
  {
    groupTr: "Lead Forms (Public)", groupEn: "Lead Forms (Public)",
    items: [
      { method: "GET",  path: "/api/public/forms/{slug}/meta",   descriptionTr: "Form tanımını getir", descriptionEn: "Get form definition" },
      { method: "POST", path: "/api/public/forms/{slug}/submit", descriptionTr: "Form gönderimi",      descriptionEn: "Submit form"         },
    ],
  },
];

type FaqItem = { qTr: string; qEn: string; aTr: string; aEn: string };
const FAQ: FaqItem[] = [
  {
    qTr: "HeptaCert API'si nasıl çalışır?",
    qEn: "How does the HeptaCert API work?",
    aTr: "HeptaCert REST API, Bearer token kimlik doğrulaması kullanır. Tüm istekler JSON döndürür. API anahtarını /admin/settings/api adresinden oluşturabilirsiniz.",
    aEn: "The HeptaCert REST API uses Bearer token authentication. All requests return JSON. You can generate an API key from /admin/settings/api.",
  },
  {
    qTr: "Hangi programlama dilleri destekleniyor?",
    qEn: "Which programming languages are supported?",
    aTr: "REST API olduğu için Python, JavaScript/Node.js, PHP, Go, Ruby gibi HTTP isteği yapabilen her dille kullanılabilir.",
    aEn: "Since it's a REST API, any language that can make HTTP requests is supported — Python, JavaScript/Node.js, PHP, Go, Ruby, and more.",
  },
  {
    qTr: "Sertifika doğrulama API'si var mı?",
    qEn: "Is there a certificate verification API?",
    aTr: "Evet. GET /api/v/certs/{cert_code} endpoint'i sertifika geçerliliğini kontrol eder. Bu endpoint public'tir ve kimlik doğrulama gerektirmez.",
    aEn: "Yes. The GET /api/v/certs/{cert_code} endpoint checks certificate validity. This endpoint is public and requires no authentication.",
  },
  {
    qTr: "Webhook desteği var mı?",
    qEn: "Is there webhook support?",
    aTr: "Evet. Sertifika oluşturulması, katılımcı eklenmesi gibi olaylar için webhook endpoint'leri tanımlayabilirsiniz.",
    aEn: "Yes. You can define webhook endpoints for events such as certificate issuance and attendee registration.",
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

export default function DevelopersClient() {
  const { lang } = useI18n();

  const copy = lang === "tr" ? {
    subtitle: "REST API ile etkinlik, sertifika ve CRM verilerinizi sisteminize entegre edin. Tüm endpoint'ler JSON döndürür, Bearer token kimlik doğrulama gerektirir.",
    getApiKey: "API Anahtarı Al",
    authHeading: "Kimlik Doğrulama",
    authDesc: "Her istekte",
    authDesc2: "header'ı gönderin:",
    rateLimitHeading: "Rate Limit",
    colPlan: "Plan",
    colRpm: "İstek / Dakika",
    colRph: "İstek / Saat",
    rateLimitNote: "Limit aşıldığında",
    rateLimitNote2: "döner.",
    rateLimitNote3: "header'ı bekleme süresini belirtir.",
    endpointsHeading: "Endpoint'ler",
    exampleHeading: "Örnek: Sertifika Listele",
    codeComment: "# Yanıt:",
    faqHeading: "Sık Sorulan Sorular",
    supportText: "Sorunuz mu var?",
    supportText2: "adresine yazın.",
  } : {
    subtitle: "Integrate your events, certificates and CRM data via REST API. All endpoints return JSON and require Bearer token authentication.",
    getApiKey: "Get API Key",
    authHeading: "Authentication",
    authDesc: "Send the",
    authDesc2: "header with every request:",
    rateLimitHeading: "Rate Limits",
    colPlan: "Plan",
    colRpm: "Requests / Min",
    colRph: "Requests / Hour",
    rateLimitNote: "When the limit is exceeded, a",
    rateLimitNote2: "is returned.",
    rateLimitNote3: "The header specifies the retry delay.",
    endpointsHeading: "Endpoints",
    exampleHeading: "Example: List Certificates",
    codeComment: "# Response:",
    faqHeading: "Frequently Asked Questions",
    supportText: "Have a question?",
    supportText2: "to reach us.",
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Page header */}
      <div className="bg-white border-b border-surface-200 px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-surface-900 mb-1">Developer Portal</h1>
          <p className="text-surface-500 text-sm mb-6">{copy.subtitle}</p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/admin/settings/api" className="btn-primary text-sm">
              {copy.getApiKey}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Auth */}
        <section aria-labelledby="auth-heading">
          <h2 id="auth-heading" className="text-base font-semibold text-surface-900 mb-3">{copy.authHeading}</h2>
          <div className="bg-white rounded-xl border border-surface-200 p-5">
            <p className="text-sm text-surface-600 mb-3">
              {copy.authDesc}{" "}
              <code className="font-mono bg-surface-100 px-1.5 py-0.5 rounded text-xs">Authorization</code>{" "}
              {copy.authDesc2}
            </p>
            <pre className="bg-surface-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto font-mono leading-relaxed">
{`curl https://heptacert.com/api/admin/events \\
  -H "Authorization: Bearer hc_YOUR_API_KEY"`}
            </pre>
          </div>
        </section>

        {/* Rate Limits */}
        <section aria-labelledby="rate-heading">
          <h2 id="rate-heading" className="text-base font-semibold text-surface-900 mb-3">{copy.rateLimitHeading}</h2>
          <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-surface-700 text-xs uppercase tracking-wide">{copy.colPlan}</th>
                  <th className="text-left px-4 py-3 font-medium text-surface-700 text-xs uppercase tracking-wide">{copy.colRpm}</th>
                  <th className="text-left px-4 py-3 font-medium text-surface-700 text-xs uppercase tracking-wide">{copy.colRph}</th>
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
            {copy.rateLimitNote}{" "}
            <code className="font-mono">429 Too Many Requests</code>{" "}
            {copy.rateLimitNote2}{" "}
            <code className="font-mono">Retry-After</code>{" "}
            {copy.rateLimitNote3}
          </p>
        </section>

        {/* Endpoints */}
        <section aria-labelledby="endpoints-heading">
          <h2 id="endpoints-heading" className="text-base font-semibold text-surface-900 mb-3">{copy.endpointsHeading}</h2>
          <div className="space-y-4">
            {ENDPOINTS.map((group) => (
              <div key={group.groupEn}>
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1.5 pl-1">
                  {lang === "tr" ? group.groupTr : group.groupEn}
                </p>
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
                          <td className="px-4 py-2.5 text-surface-600 text-xs">
                            {lang === "tr" ? ep.descriptionTr : ep.descriptionEn}
                          </td>
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
          <h2 id="example-heading" className="text-base font-semibold text-surface-900 mb-3">{copy.exampleHeading}</h2>
          <div className="bg-white rounded-xl border border-surface-200 p-5">
            <pre className="bg-surface-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto font-mono leading-relaxed">
{`curl "https://heptacert.com/api/admin/events/123/certificates?limit=50" \\
  -H "Authorization: Bearer hc_YOUR_API_KEY"

${copy.codeComment}
[
  {
    "id": 9001,
    "public_id": "abc123",
    "attendee_name": "Ahmet Yılmaz",
    "issued_at": "2026-06-01T10:00:00Z",
    "cert_url": "https://heptacert.com/c/abc123"
  }
]`}
            </pre>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-base font-semibold text-surface-900 mb-3">{copy.faqHeading}</h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-200 p-5">
                <h3 className="font-semibold text-surface-900 mb-1.5 text-sm">
                  {lang === "tr" ? item.qTr : item.qEn}
                </h3>
                <p className="text-xs text-surface-600 leading-relaxed">
                  {lang === "tr" ? item.aTr : item.aEn}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Support */}
        <div className="bg-surface-100 rounded-xl border border-surface-200 p-5 text-center">
          <p className="text-sm text-surface-700">
            {copy.supportText}{" "}
            <a href="mailto:destek@heptacert.com" className="font-medium text-surface-900 underline underline-offset-2">
              destek@heptacert.com
            </a>{" "}
            {copy.supportText2}
          </p>
        </div>
      </div>
    </div>
  );
}
