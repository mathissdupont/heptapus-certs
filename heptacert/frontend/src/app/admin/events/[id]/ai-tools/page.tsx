"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles, Mail, ClipboardList, Copy, CheckCircle2,
  ChevronDown, Loader2, AlertTriangle, RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";

// ── Types ──────────────────────────────────────────────────────────────────────

type EmailOut = { subject: string; body: string; provider: string };
type FormField = { label: string; name: string; type: string; required: boolean; placeholder?: string; options?: string[] };
type FormOut = { fields: FormField[]; provider: string };

// ── Shared ─────────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Kopyalandı" : "Kopyala"}
    </button>
  );
}

const INTENT_OPTIONS = [
  { value: "davet",              label: "Davet maili" },
  { value: "hatırlatma",         label: "Hatırlatma" },
  { value: "sertifika bildirimi", label: "Sertifika bildirimi" },
  { value: "check-in açıldı",   label: "Check-in açıldı" },
  { value: "teşekkür",           label: "Etkinlik sonrası teşekkür" },
  { value: "iptal",              label: "İptal / erteleme bildirimi" },
];

const EVENT_TYPES = [
  { value: "certificate_event", label: "Sertifikalı etkinlik" },
  { value: "workshop",          label: "Workshop" },
  { value: "conference",        label: "Konferans" },
  { value: "training",          label: "Eğitim" },
  { value: "seminar",           label: "Seminer" },
  { value: "online_event",      label: "Online etkinlik" },
];

// ── Email section ──────────────────────────────────────────────────────────────

function EmailGenerator({ eventId }: { eventId: string }) {
  const [intent, setIntent]       = useState("davet");
  const [customIntent, setCustom] = useState("");
  const [lang, setLang]           = useState<"tr" | "en">("tr");
  const [extra, setExtra]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<EmailOut | null>(null);
  const [error, setError]         = useState("");

  async function generate() {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await apiFetch<Response>("/admin/ai/generate-email", {
        method: "POST",
        body: JSON.stringify({
          event_id: Number(eventId),
          intent: customIntent || intent,
          language: lang,
          extra_notes: extra || null,
          // event_name/date/location fetched server-side from event_id
          event_name: "",
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j?.detail || "Hata"); }
      setResult(await res.json() as EmailOut);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Intent */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Mail amacı</label>
          <div className="relative">
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm outline-none focus:border-slate-400"
            >
              {INTENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
              <option value="__custom">Özel…</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
          {intent === "__custom" && (
            <input
              value={customIntent}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Mail amacını yazın…"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          )}
        </div>

        {/* Language */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Dil</label>
          <div className="flex gap-2">
            {(["tr", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  lang === l
                    ? "border-slate-700 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {l === "tr" ? "Türkçe" : "English"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Extra notes */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-700">
          Ek notlar <span className="font-normal text-slate-400">(opsiyonel — özel vurgu, indirim kodu vb.)</span>
        </label>
        <textarea
          rows={2}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Örn: Katılımcılara ücretsiz öğle yemeği verileceğini belirt"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Yazılıyor…</>
          : <><Sparkles className="h-4 w-4" /> Mail oluştur</>
        }
      </button>

      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {result && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sonuç {result.provider === "fallback" ? "· şablon" : "· Claude AI"}
            </p>
            <button type="button" onClick={generate} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
              <RefreshCw className="h-3 w-3" /> Yeniden üret
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">KONU</p>
              <CopyBtn text={result.subject} />
            </div>
            <p className="text-sm font-medium text-slate-900">{result.subject}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">İÇERİK</p>
              <CopyBtn text={result.body} />
            </div>
            <div
              className="prose prose-sm max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: result.body }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Form section ───────────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Metin", email: "E-posta", tel: "Telefon",
  textarea: "Uzun metin", select: "Seçenek", checkbox: "Onay kutusu",
  number: "Sayı", date: "Tarih",
};

function FormGenerator({ eventId }: { eventId: string }) {
  const [eventType, setEventType] = useState("certificate_event");
  const [lang, setLang]           = useState<"tr" | "en">("tr");
  const [extra, setExtra]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<FormOut | null>(null);
  const [error, setError]         = useState("");

  async function generate() {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await apiFetch<Response>("/admin/ai/generate-form", {
        method: "POST",
        body: JSON.stringify({
          event_id: Number(eventId),
          event_name: "",
          event_type: eventType,
          language: lang,
          extra_notes: extra || null,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j?.detail || "Hata"); }
      setResult(await res.json() as FormOut);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Etkinlik türü</label>
          <div className="relative">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm outline-none focus:border-slate-400"
            >
              {EVENT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Dil</label>
          <div className="flex gap-2">
            {(["tr", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  lang === l
                    ? "border-slate-700 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {l === "tr" ? "Türkçe" : "English"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-700">
          Ek notlar <span className="font-normal text-slate-400">(opsiyonel — "şirket bilgisi de iste", "T-shirt bedeni sor" vb.)</span>
        </label>
        <textarea
          rows={2}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Örn: Katılımcıdan kurum adı ve unvan bilgisi de iste"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Oluşturuluyor…</>
          : <><Sparkles className="h-4 w-4" /> Form oluştur</>
        }
      </button>

      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {result && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {result.fields.length} alan {result.provider === "fallback" ? "· şablon" : "· Claude AI"}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={generate} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                <RefreshCw className="h-3 w-3" /> Yeniden üret
              </button>
              <CopyBtn text={JSON.stringify(result.fields, null, 2)} />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Etiket</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Tür</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Zorunlu</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Seçenekler</th>
                </tr>
              </thead>
              <tbody>
                {result.fields.map((f, i) => (
                  <tr key={i} className={i !== result.fields.length - 1 ? "border-b border-slate-100" : ""}>
                    <td className="px-4 py-3 font-medium text-slate-900">{f.label}</td>
                    <td className="px-4 py-3 text-slate-600">{FIELD_TYPE_LABELS[f.type] ?? f.type}</td>
                    <td className="px-4 py-3">
                      {f.required
                        ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-10 font-medium text-red-600">Zorunlu</span>
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {f.options ? f.options.join(", ") : f.placeholder ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400">
            Bu alanları kopyalayıp Etkinlik → Ayarlar → Kayıt Formu bölümünden manuel olarak ekleyebilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = "email" | "form";

export default function AIToolsPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("email");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "email", label: "E-posta Taslağı", icon: <Mail className="h-4 w-4" /> },
    { id: "form",  label: "Kayıt Formu",     icon: <ClipboardList className="h-4 w-4" /> },
  ];

  return (
    <div>
      <EventAdminNav eventId={id} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageHeader
          title="AI Araçları"
          subtitle="Claude AI ile etkinliğiniz için içerik ve form oluşturun."
          icon={<Sparkles className="h-5 w-5" />}
        />

        {/* Tab bar */}
        <div className="mt-6 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          {tab === "email" ? <EmailGenerator eventId={id} /> : <FormGenerator eventId={id} />}
        </div>
      </div>
    </div>
  );
}
