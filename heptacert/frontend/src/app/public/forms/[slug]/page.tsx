"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { publicApiFetch } from "@/lib/api";

type FieldDef = {
  name: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string[];
  placeholder?: string | null;
};

type FormMeta = {
  id: number;
  name: string;
  slug: string;
  fields_json: FieldDef[];
  redirect_url: string | null;
  active: boolean;
};

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [meta, setMeta] = useState<FormMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await publicApiFetch(`/public/forms/${slug}/meta`);
        const data = (await response.json()) as FormMeta;

        if (!cancelled) {
          setMeta(data);
        }
      } catch {
        if (!cancelled) {
          // Fallback: set a placeholder message
          setError("Form bulunamadı veya aktif değil.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  function setValue(name: string, val: string) {
    setValues((v) => ({ ...v, [name]: val }));
    setFieldErrors((e) => ({ ...e, [name]: "" }));
  }

  function validate(): boolean {
    if (!meta) return false;
    const errs: Record<string, string> = {};
    for (const field of meta.fields_json) {
      if (field.required && !values[field.name]?.trim()) {
        errs[field.name] = `${field.label} zorunlu`;
      }
      if (field.field_type === "email" && values[field.name] && !values[field.name].includes("@")) {
        errs[field.name] = "Geçerli bir e-posta girin";
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      const _sr = await publicApiFetch(`/public/forms/${slug}/submit`, {
        method: "POST",
        body: JSON.stringify({
          data: values,
          source_url: window.location.href,
          utm_source: searchParams.get("utm_source"),
          utm_medium: searchParams.get("utm_medium"),
          utm_campaign: searchParams.get("utm_campaign"),
        }),
      });
      const res = await _sr.json();
      setSubmitted(true);
      if (res?.redirect_url) {
        setTimeout(() => router.push(res.redirect_url), 1500);
      }
    } catch (err: any) {
      setError(err?.detail || "Gönderim başarısız. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-900">Teşekkürler!</h2>
          <p className="text-sm text-gray-500">Formunuz başarıyla gönderildi.</p>
        </div>
      </div>
    );
  }

  if (!meta) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{meta.name}</h1>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {meta.fields_json.map((field) => (
            <div key={field.name} className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.field_type === "textarea" ? (
                <textarea
                  rows={3}
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    fieldErrors[field.name] ? "border-red-300" : "border-gray-200"
                  }`}
                  placeholder={field.placeholder ?? ""}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValue(field.name, e.target.value)}
                />
              ) : field.field_type === "dropdown" ? (
                <select
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    fieldErrors[field.name] ? "border-red-300" : "border-gray-200"
                  }`}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValue(field.name, e.target.value)}
                >
                  <option value="">Seçin...</option>
                  {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : field.field_type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={values[field.name] === "true"}
                    onChange={(e) => setValue(field.name, e.target.checked ? "true" : "false")}
                  />
                  {field.placeholder || field.label}
                </label>
              ) : (
                <input
                  type={field.field_type}
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    fieldErrors[field.name] ? "border-red-300" : "border-gray-200"
                  }`}
                  placeholder={field.placeholder ?? ""}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValue(field.name, e.target.value)}
                />
              )}

              {fieldErrors[field.name] && (
                <p className="text-xs text-red-500">{fieldErrors[field.name]}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gönder
          </button>
        </form>
      </div>
    </div>
  );
}
