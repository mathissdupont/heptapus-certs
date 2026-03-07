"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Mail, CheckCircle2, Eye, EyeOff, Key, Webhook,
  ShieldCheck, Plus, Trash2, Loader2, Copy, Check, ChevronDown, ChevronUp,
  History, TrendingUp, TrendingDown, Globe, Settings
} from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────
type ApiKey = {
  id: number; name: string; key_prefix: string; is_active: boolean;
  scopes: string[]; last_used_at: string | null; expires_at: string | null; created_at: string;
};
type WebhookEndpoint = {
  id: number; url: string; events: string[]; secret: string | null;
  is_active: boolean; created_at: string; last_fired_at: string | null;
};
type WebhookDelivery = {
  id: number; event_type: string; status: string; http_status: number | null; attempt: number; delivered_at: string;
};

const TABS = [
  { id: "account", label: "Hesap", icon: Lock },
  { id: "apikeys", label: "API Anahtarları", icon: Key },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "2fa", label: "2FA Güvenlik", icon: ShieldCheck },
  { id: "transactions", label: "Coin Geçmişi", icon: History },
  { id: "domain", label: "Özel Domain", icon: Globe },
];
const WEBHOOK_EVENTS = ["cert.issued", "cert.revoked", "cert.bulk_completed", "cert.expiring_soon"];

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric" });
}
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-1 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Kopyala">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Account Tab ──────────────────────────────────────────────────────────────
function AccountTab({ me }: { me: { email: string } | null }) {
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confPw, setConfPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null); const [pwOk, setPwOk] = useState(false); const [pwLoading, setPwLoading] = useState(false);
  const [newEmail, setNewEmail] = useState(""); const [emailPw, setEmailPw] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null); const [emailOk, setEmailOk] = useState(false); const [emailLoading, setEmailLoading] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwErr(null); setPwOk(false);
    if (newPw.length < 8) { setPwErr("Yeni şifre en az 8 karakter olmalıdır."); return; }
    if (newPw !== confPw) { setPwErr("Şifreler eşleşmiyor."); return; }
    setPwLoading(true);
    try {
      await apiFetch("/me/password", { method: "PATCH", body: JSON.stringify({ current_password: curPw, new_password: newPw }) });
      setPwOk(true); setCurPw(""); setNewPw(""); setConfPw("");
    } catch (e: any) { setPwErr(e?.message || "Şifre güncellenemedi."); } finally { setPwLoading(false); }
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault(); setEmailErr(null); setEmailOk(false); setEmailLoading(true);
    try {
      await apiFetch("/me/email", { method: "PATCH", body: JSON.stringify({ current_password: emailPw, new_email: newEmail }) });
      setEmailOk(true); setNewEmail(""); setEmailPw("");
    } catch (e: any) { setEmailErr(e?.message || "E-posta güncellenemedi."); } finally { setEmailLoading(false); }
  }

  return (
    <div className="space-y-8">
      {me && <p className="text-sm text-gray-500">Mevcut e-posta: <strong className="text-gray-700">{me.email}</strong></p>}
      {/* Password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Lock className="h-5 w-5" /></div>
          <div><h2 className="font-semibold text-gray-900">Şifre Değiştir</h2><p className="text-xs text-gray-400 mt-0.5">Güvenlik için düzenli olarak şifrenizi güncelleyin</p></div>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label">Mevcut Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10 pr-10" type={showPw ? "text" : "password"} value={curPw} onChange={e => setCurPw(e.target.value)} required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div><label className="label">Yeni Şifre</label><input className="input-field" type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="En az 8 karakter" required /></div>
          <div><label className="label">Yeni Şifre Tekrar</label><input className="input-field" type={showPw ? "text" : "password"} value={confPw} onChange={e => setConfPw(e.target.value)} required /></div>
          <AnimatePresence>
            {pwErr && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="error-banner">{pwErr}</div></motion.div>}
            {pwOk && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="success-banner"><CheckCircle2 className="h-4 w-4 shrink-0" /> Şifre başarıyla güncellendi.</div></motion.div>}
          </AnimatePresence>
          <button type="submit" disabled={pwLoading} className="btn-primary">{pwLoading ? "Kaydediliyor..." : "Şifreyi Güncelle"}</button>
        </form>
      </div>
      {/* Email */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Mail className="h-5 w-5" /></div>
          <div><h2 className="font-semibold text-gray-900">E-posta Değiştir</h2><p className="text-xs text-gray-400 mt-0.5">Doğrulama için mevcut şifrenizi girmeniz gerekmektedir</p></div>
        </div>
        <form onSubmit={changeEmail} className="space-y-4">
          <div><label className="label">Yeni E-posta Adresi</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="yeni@sirket.com" required autoComplete="email" /></div></div>
          <div><label className="label">Mevcut Şifre (Doğrulama)</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" type="password" value={emailPw} onChange={e => setEmailPw(e.target.value)} required /></div></div>
          <AnimatePresence>
            {emailErr && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="error-banner">{emailErr}</div></motion.div>}
            {emailOk && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="success-banner"><CheckCircle2 className="h-4 w-4 shrink-0" /> E-posta başarıyla güncellendi.</div></motion.div>}
          </AnimatePresence>
          <button type="submit" disabled={emailLoading} className="btn-primary">{emailLoading ? "Kaydediliyor..." : "E-postayı Güncelle"}</button>
        </form>
      </div>
    </div>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────
function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(""); const [expiresDays, setExpiresDays] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await apiFetch("/admin/api-keys"); setKeys(await r.json()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setCreating(true);
    try {
      const r = await apiFetch("/admin/api-keys", { method: "POST", body: JSON.stringify({ name, expires_days: expiresDays ? parseInt(expiresDays) : null }) });
      const data = await r.json(); setNewKey(data.full_key); setName(""); setExpiresDays(""); setShowForm(false); load();
    } catch (e: any) { setErr(e?.message || "Anahtar oluşturulamadı."); } finally { setCreating(false); }
  }

  async function revokeKey(id: number) {
    if (!confirm("Bu API anahtarını iptal etmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/admin/api-keys/${id}`, { method: "DELETE" }); load();
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {newKey && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800 mb-2">✅ API anahtarınız oluşturuldu — bir kez görünür, kaydedin!</p>
            <div className="flex items-center gap-2 bg-white rounded-lg border border-green-200 px-3 py-2">
              <code className="text-xs font-mono text-gray-800 break-all flex-1">{newKey}</code>
              <CopyBtn text={newKey} />
            </div>
            <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-green-700 underline">Kapat</button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">API Anahtarları</h2>
          <p className="text-sm text-gray-500 mt-0.5">REST API erişimi için. Anahtar yalnızca oluşturulurken görünür.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary gap-2"><Plus className="h-4 w-4" /> Yeni Anahtar</button>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={createKey} className="card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Anahtar Adı</label><input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Üretim Entegrasyonu" required minLength={1} /></div>
                <div><label className="label">Son Kullanma (gün)</label><input className="input-field" type="number" value={expiresDays} onChange={e => setExpiresDays(e.target.value)} placeholder="365 (boş = sonsuz)" min="1" max="3650" /></div>
              </div>
              {err && <div className="error-banner">{err}</div>}
              <div className="flex gap-3">
                <button type="submit" disabled={creating} className="btn-primary gap-2">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Oluştur</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      {loading ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Key className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Henüz API anahtarı yok.</p></div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <div key={k.id} className={`card p-4 flex items-center gap-4 ${!k.is_active ? "opacity-50" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{k.name}</span>
                  {!k.is_active && <span className="badge badge-red">İptal</span>}
                </div>
                <code className="text-xs text-gray-500 font-mono">{k.key_prefix}••••••••</code>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span>Oluşturuldu: {fmtDate(k.created_at)}</span>
                  {k.expires_at && <span>Son: {fmtDate(k.expires_at)}</span>}
                  {k.last_used_at && <span>Son kullanım: {fmtDate(k.last_used_at)}</span>}
                </div>
              </div>
              {k.is_active && (
                <button onClick={() => revokeKey(k.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Webhooks Tab ─────────────────────────────────────────────────────────────
function WebhooksTab() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState(""); const [selectedEvents, setSelectedEvents] = useState<string[]>(["cert.issued"]);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deliveries, setDeliveries] = useState<Record<number, WebhookDelivery[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await apiFetch("/admin/webhooks"); setEndpoints(await r.json()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createEndpoint(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setCreating(true);
    try {
      await apiFetch("/admin/webhooks", { method: "POST", body: JSON.stringify({ url, events: selectedEvents }) });
      setUrl(""); setSelectedEvents(["cert.issued"]); setShowForm(false); load();
    } catch (e: any) { setErr(e?.message || "Webhook oluşturulamadı."); } finally { setCreating(false); }
  }

  async function deleteEndpoint(id: number) {
    if (!confirm("Webhook endpoint'ini silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/admin/webhooks/${id}`, { method: "DELETE" }); load();
  }

  async function loadDeliveries(id: number) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!deliveries[id]) {
      const r = await apiFetch(`/admin/webhooks/${id}/deliveries`);
      const data = await r.json();
      setDeliveries(prev => ({ ...prev, [id]: data }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Webhook Endpoint'leri</h2>
          <p className="text-sm text-gray-500 mt-0.5">Sertifika olaylarında HMAC-SHA256 imzalı POST alın.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary gap-2"><Plus className="h-4 w-4" /> Endpoint Ekle</button>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={createEndpoint} className="card p-5 space-y-4">
              <div><label className="label">URL</label><input className="input-field" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://siz.com/webhook" required /></div>
              <div>
                <label className="label mb-2">Olaylar</label>
                <div className="flex flex-wrap gap-2">
                  {WEBHOOK_EVENTS.map(ev => (
                    <button key={ev} type="button"
                      onClick={() => setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${selectedEvents.includes(ev) ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-200 hover:border-brand-400"}`}>
                      {ev}
                    </button>
                  ))}
                </div>
              </div>
              {err && <div className="error-banner">{err}</div>}
              <div className="flex gap-3">
                <button type="submit" disabled={creating || selectedEvents.length === 0} className="btn-primary gap-2">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ekle</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      {loading ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
      ) : endpoints.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Webhook className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Henüz webhook endpoint'i yok.</p></div>
      ) : (
        <div className="space-y-3">
          {endpoints.map(ep => (
            <div key={ep.id} className="card overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-gray-800 truncate">{ep.url}</span>
                    <span className={`badge ${ep.is_active ? "badge-green" : "badge-red"}`}>{ep.is_active ? "Aktif" : "Pasif"}</span>
                  </div>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {ep.events.map(ev => <span key={ev} className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{ev}</span>)}
                  </div>
                  {ep.secret && (
                    <div className="flex items-center mt-1 text-xs text-gray-400">
                      <span className="font-mono">Secret: {ep.secret.slice(0, 16)}••••</span>
                      <CopyBtn text={ep.secret} />
                    </div>
                  )}
                  {ep.last_fired_at && <p className="text-xs text-gray-400 mt-0.5">Son tetiklenme: {fmtDate(ep.last_fired_at)}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => loadDeliveries(ep.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Teslimatlar">
                    {expandedId === ep.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button onClick={() => deleteEndpoint(ep.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <AnimatePresence>
                {expandedId === ep.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-100">
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Son Teslimatlar</p>
                      {!deliveries[ep.id] ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        : deliveries[ep.id].length === 0 ? <p className="text-xs text-gray-400">Teslimat yok.</p>
                        : (
                          <div className="space-y-1.5">
                            {deliveries[ep.id].map(d => (
                              <div key={d.id} className="flex items-center gap-3 text-xs">
                                <span className={`badge ${d.status === "success" ? "badge-green" : "badge-red"}`}>{d.status}</span>
                                <span className="font-mono text-gray-500">{d.event_type}</span>
                                <span className="text-gray-400">HTTP {d.http_status ?? "—"}</span>
                                <span className="text-gray-400">#{d.attempt}</span>
                                <span className="text-gray-400 ml-auto">{fmtDate(d.delivered_at)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 2FA Tab ──────────────────────────────────────────────────────────────────
function TwoFATab() {
  const [status, setStatus] = useState<"loading" | "disabled" | "setup" | "enabled">("loading");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    apiFetch("/auth/2fa/status", { method: "GET" })
      .then((r) => r.json())
      .then((d: { enabled: boolean }) => setStatus(d.enabled ? "enabled" : "disabled"))
      .catch(() => setStatus("disabled"));
  }, []);

  async function startSetup() {
    setErr(null); setLoading(true);
    try {
      const r = await apiFetch("/auth/2fa/setup", { method: "POST" });
      const data = await r.json();
      setOtpauthUrl(data.otpauth_url); setSecret(data.secret); setStatus("setup");
    } catch (e: any) { setErr(e?.message || "Kurulum başlatılamadı."); } finally { setLoading(false); }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setLoading(true);
    try {
      await apiFetch("/auth/2fa/confirm", { method: "POST", body: JSON.stringify({ code }) });
      setStatus("enabled"); setCode("");
    } catch (e: any) { setErr(e?.message || "Geçersiz kod."); } finally { setLoading(false); }
  }

  async function disable2FA(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setLoading(true);
    try {
      await apiFetch("/auth/2fa/disable", { method: "PATCH", body: JSON.stringify({ code }) });
      setStatus("disabled"); setCode("");
    } catch (e: any) { setErr(e?.message || "Devre dışı bırakılamadı."); } finally { setLoading(false); }
  }

  const qrUrl = otpauthUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}` : "";

  if (status === "loading") return <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>;

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">İki Faktörlü Doğrulama (TOTP)</h2>
        <p className="text-sm text-gray-500 mt-0.5">Giriş yaparken Google Authenticator veya Authy ile ek güvenlik katmanı ekleyin.</p>
      </div>

      {status === "disabled" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100"><ShieldCheck className="h-5 w-5 text-gray-400" /></div>
            <div><p className="font-medium text-gray-900">2FA Devre Dışı</p><p className="text-sm text-gray-500">Hesabınız yalnızca şifre ile korunuyor.</p></div>
          </div>
          {err && <div className="error-banner">{err}</div>}
          <button onClick={startSetup} disabled={loading} className="btn-primary gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} 2FA'yı Etkinleştir
          </button>
        </div>
      )}

      {status === "setup" && (
        <div className="card p-6 space-y-5">
          <p className="font-medium text-gray-900">Kimlik Doğrulayıcıyı Yapılandır</p>
          <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
            <li>Telefonunuzda Google Authenticator veya Authy'yi açın.</li>
            <li>Aşağıdaki QR kodu veya gizli anahtarı kullanarak ekleyin.</li>
            <li>6 haneli kodu girin ve onaylayın.</li>
          </ol>
          {qrUrl && <div className="flex justify-center"><img src={qrUrl} alt="2FA QR" className="rounded-xl border border-gray-200 p-2" /></div>}
          <div>
            <label className="label">El ile Giriş</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <code className="text-xs font-mono text-gray-700 flex-1 break-all">{showSecret ? secret : "•".repeat(Math.min(secret.length, 32))}</code>
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="text-gray-400 hover:text-gray-700">
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <CopyBtn text={secret} />
            </div>
          </div>
          <form onSubmit={confirmSetup} className="space-y-3">
            <div>
              <label className="label">Doğrulama Kodu</label>
              <input className="input-field text-center text-xl tracking-[0.4em] font-mono" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" required maxLength={6} />
            </div>
            {err && <div className="error-banner">{err}</div>}
            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Onayla &amp; Etkinleştir
            </button>
            <button type="button" onClick={() => setStatus("disabled")} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">İptal</button>
          </form>
        </div>
      )}

      {status === "enabled" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100"><ShieldCheck className="h-5 w-5 text-green-600" /></div>
            <div><p className="font-medium text-gray-900">2FA Etkin ✅</p><p className="text-sm text-gray-500">Hesabınız iki faktörlü kimlik doğrulama ile korunuyor.</p></div>
          </div>
          <form onSubmit={disable2FA} className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500">Devre dışı bırakmak için mevcut kodunuzu girin:</p>
            <input className="input-field text-center text-xl tracking-[0.4em] font-mono" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" required maxLength={6} />
            {err && <div className="error-banner">{err}</div>}
            <button type="submit" disabled={loading || code.length !== 6} className="w-full btn-danger justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} 2FA'yı Devre Dışı Bırak
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────
type Transaction = {
  id: number;
  type: "credit" | "spend";
  amount: number;
  description: string;
  created_at: string;
};

function TransactionsTab() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/transactions/list?page=${page}&limit=${limit}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setTotal(d.total || 0); })
      .catch((e) => setErr(e?.message || "Geçmiş yüklenemedi."))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-gray-700">
            <History className="h-4 w-4 text-gray-400" /> Coin İşlem Geçmişi
          </div>
          <span className="text-xs font-bold text-gray-400">Toplam: {total}</span>
        </div>
        {loading ? (
          <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
        ) : err ? (
          <div className="p-8 text-rose-600 text-sm">{err}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">Henüz işlem yok.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((tx) => (
              <div key={tx.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${tx.type === "credit" ? "bg-emerald-50" : "bg-rose-50"}`}>
                    {tx.type === "credit" ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-rose-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{tx.description}</p>
                    <p className="text-xs text-gray-400">{fmtDate(tx.created_at)}</p>
                  </div>
                </div>
                <span className={`text-sm font-extrabold ${tx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                  {tx.type === "credit" ? "+" : "-"}{tx.amount} HC
                </span>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost text-xs disabled:opacity-30">← Önceki</button>
            <span className="text-xs font-bold text-gray-400">{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost text-xs disabled:opacity-30">Sonraki →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Custom Domain Tab ────────────────────────────────────────────────────────
function CustomDomainTab() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/admin/organization/domain")
      .then(r => r.json())
      .then(d => { setDomain(d.custom_domain || ""); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(false); setSaving(true);
    try {
      await apiFetch("/admin/organization/domain", {
        method: "PUT",
        body: JSON.stringify({ custom_domain: domain.trim() || null }),
      });
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (e: any) {
      setErr(e?.message || "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>;

  return (
    <div className="max-w-lg space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Globe className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Özel Alan Adı</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sertifika doğrulama sayfaları kendi alan adınızda görünsün</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 mb-5">
          <p className="text-xs text-amber-700 font-medium">Growth ve Enterprise planlarına özeldir. DNS'inizde <code className="font-mono bg-amber-100 px-1 rounded">CNAME</code> kaydı oluşturmanız gerekir.</p>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Alan Adı</label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-10"
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="certs.sirketiniz.com"
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Boş bırakırsanız özel alan adı kaldırılır.</p>
          </div>
          {err && <div className="error-banner">{err}</div>}
          {ok && <div className="success-banner"><CheckCircle2 className="h-4 w-4 shrink-0" /> Alan adı kaydedildi.</div>}
          <button type="submit" disabled={saving} className="btn-primary gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Kaydet
          </button>
        </form>
      </div>
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">DNS Yapılandırması</h3>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs font-mono space-y-1">
          <p className="text-gray-500"># DNS sağlayıcınıza şu kaydı ekleyin:</p>
          <p className="text-gray-800">{domain || "certs.sirketiniz.com"} &nbsp;CNAME&nbsp; {typeof window !== "undefined" ? window.location.hostname : "heptacert.app"}</p>
        </div>
        <p className="text-xs text-gray-400">DNS değişikliklerinin yayılması 24-48 saat sürebilir.</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string } | null>(null);
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    apiFetch("/me", { method: "GET" }).then(r => r.json()).then(d => setMe(d)).catch(() => router.push("/admin/login"));
  }, [router]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ayarlar"
        subtitle="Hesap, güvenlik ve entegrasyon ayarlarını yönetin"
        icon={<Settings className="h-5 w-5" />}
      />

      {/* Tabs – underline style */}
      <div className="flex gap-0 border-b border-surface-200 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-surface-500 hover:text-surface-800 hover:border-surface-300"
              }`}
            >
              <Icon className="h-4 w-4" />{tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {activeTab === "account" && <AccountTab me={me} />}
          {activeTab === "apikeys" && <ApiKeysTab />}
          {activeTab === "webhooks" && <WebhooksTab />}
          {activeTab === "2fa" && <TwoFATab />}
          {activeTab === "transactions" && <TransactionsTab />}
          {activeTab === "domain" && <CustomDomainTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
