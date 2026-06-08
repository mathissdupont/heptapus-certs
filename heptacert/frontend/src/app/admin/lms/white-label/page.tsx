"use client";

import { useEffect, useState } from "react";
import { Globe, Loader2, Palette, Save, UploadCloud } from "lucide-react";
import { apiFetch } from "@/lib/api";

type OrgSettings = {
  id?: number;
  org_name: string;
  brand_logo?: string | null;
  brand_color: string;
  custom_domain?: string | null;
  settings?: Record<string, any>;
};

export default function LmsWhiteLabelPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [form, setForm] = useState({
    org_name: "",
    brand_color: "#6366f1",
    brand_logo: "" as string | null,
    custom_domain: "",
    lms_portal_title: "",
    lms_support_email: "",
    lms_welcome_text: "",
  });

  async function load() {
    setLoading(true);
    const data = (await apiFetch("/admin/organization/settings").then((r) => r.json())) as OrgSettings;
    if (data.id) setOrgId(data.id);
    setForm({
      org_name: data.org_name || "",
      brand_color: data.brand_color || "#6366f1",
      brand_logo: data.brand_logo || null,
      custom_domain: data.custom_domain || "",
      lms_portal_title: data.settings?.lms_portal_title || "",
      lms_support_email: data.settings?.lms_support_email || "",
      lms_welcome_text: data.settings?.lms_welcome_text || "",
    });
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function uploadLogo(file: File | null) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const data = await apiFetch("/admin/organization/logo", { method: "POST", body: fd }).then((r) => r.json());
    setForm((prev) => ({ ...prev, brand_logo: data.brand_logo || null }));
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    const data = await apiFetch("/admin/organization/settings", {
      method: "PATCH",
      body: JSON.stringify({
        org_name: form.org_name,
        brand_color: form.brand_color,
        brand_logo: form.brand_logo,
        lms_portal_title: form.lms_portal_title,
        lms_support_email: form.lms_support_email,
        lms_welcome_text: form.lms_welcome_text,
      }),
    }).then((r) => r.json());
    await apiFetch("/admin/organization/domain", {
      method: "PUT",
      body: JSON.stringify({ custom_domain: form.custom_domain || null }),
    }).catch(() => null);
    setForm((prev) => ({
      ...prev,
      org_name: data.org_name || prev.org_name,
      brand_color: data.brand_color || prev.brand_color,
      brand_logo: data.brand_logo || prev.brand_logo,
      custom_domain: data.custom_domain || prev.custom_domain,
    }));
    setSaving(false);
    setToast("White-label ayarlari kaydedildi.");
    setTimeout(() => setToast(null), 2500);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const portalUrl = form.custom_domain
    ? `https://${form.custom_domain}/portal`
    : orgId
    ? `/portal?org=${orgId}`
    : "/portal";

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-950">
            <Palette className="h-6 w-6 text-indigo-600" />
            LMS White-label
          </h2>
          <p className="mt-1 text-sm text-slate-500">Ogrenci portalinin kurum adi, logo, renk, domain ve karsilama metnini yonetin.</p>
        </div>

        {toast && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{toast}</div>}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Marka</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Kurum adi</label>
              <input
                value={form.org_name}
                onChange={(e) => setForm((f) => ({ ...f, org_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ana renk</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.brand_color}
                  onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
                  className="h-10 w-12 rounded border border-slate-200"
                />
                <input
                  value={form.brand_color}
                  onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Logo</label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Logo yukle
                <input type="file" accept="image/*" className="hidden" onChange={(e) => void uploadLogo(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Ogrenci portali</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Portal basligi</label>
              <input
                value={form.lms_portal_title}
                onChange={(e) => setForm((f) => ({ ...f, lms_portal_title: e.target.value }))}
                placeholder="Online Akademi"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Destek e-postasi</label>
              <input
                type="email"
                value={form.lms_support_email}
                onChange={(e) => setForm((f) => ({ ...f, lms_support_email: e.target.value }))}
                placeholder="lms@kurum.edu"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Karsilama metni</label>
              <textarea
                rows={4}
                value={form.lms_welcome_text}
                onChange={(e) => setForm((f) => ({ ...f, lms_welcome_text: e.target.value }))}
                placeholder="Ogrenci portalina hos geldiniz..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <Globe className="h-4 w-4" />
            Domain
          </h3>
          <input
            value={form.custom_domain}
            onChange={(e) => setForm((f) => ({ ...f, custom_domain: e.target.value }))}
            placeholder="learn.kurum.edu"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-2 text-xs text-slate-500">DNS dogrulama ve CNAME kaydi mevcut white-label domain altyapisini kullanir.</p>
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </button>
      </div>

      <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-xl border border-slate-100 p-4" style={{ borderColor: `${form.brand_color}33` }}>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {form.brand_logo ? <img src={form.brand_logo} alt="" className="h-full w-full object-cover" /> : <Palette className="h-6 w-6 text-slate-400" />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">{form.lms_portal_title || form.org_name || "LMS Portal"}</p>
              <p className="text-xs text-slate-500">{portalUrl}</p>
            </div>
          </div>
          <div className="mt-6 rounded-lg p-4 text-sm text-white" style={{ backgroundColor: form.brand_color }}>
            {form.lms_welcome_text || "Ogrenciler kurslarina, notlarina ve yoklama durumlarina buradan erisir."}
          </div>
          <button className="mt-4 w-full rounded-lg py-2 text-sm font-semibold text-white" style={{ backgroundColor: form.brand_color }}>
            Ogrenci girisi
          </button>
          {form.lms_support_email && <p className="mt-3 text-center text-xs text-slate-500">Destek: {form.lms_support_email}</p>}
        </div>
      </aside>
    </div>
  );
}
