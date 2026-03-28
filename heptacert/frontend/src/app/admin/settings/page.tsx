"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Mail, CheckCircle2, Eye, EyeOff,
  ShieldCheck, Loader2, Check,
  History, TrendingUp, TrendingDown, Globe, Settings
} from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";

const TABS = [
  { id: "account", label: "Hesap", icon: Lock },
  { id: "2fa", label: "2FA Güvenlik", icon: ShieldCheck },
  { id: "transactions", label: "Coin Geçmişi", icon: History },
  { id: "domain", label: "Özel Domain", icon: Globe },
  { id: "branding", label: "Kurumsal", icon: Settings },
];

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric" });
}
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-gray-400 hover:text-indigo-600 transition"
      title="Kopyala"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
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
  const [myDomains, setMyDomains] = useState<Array<any>>([]);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to read existing organization domain if endpoint exists; fallback to empty.
    apiFetch("/admin/organization/domain")
      .then(r => r.json())
      .then(d => { setDomain(d.custom_domain || ""); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // fetch domains owned by this user
    apiFetch("/admin/organization/domains")
      .then(r => r.ok ? r.json() : [])
      .then(d => setMyDomains(d || []))
      .catch(() => {});
  }, []);

  // When domain text changes, if token/status unknown try to fetch domain details
  useEffect(() => {
    const dom = domain.trim();
    if (!dom) return;
    apiFetch(`/domains/${encodeURIComponent(dom)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setToken(d.token || null); setStatus(d.status || null); setCreatedAt(d.created_at || null);
        }
      })
      .catch(() => {})
  }, [domain]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(false); setSaving(true);
    try {
      const dom = domain.trim();
      if (!dom) {
        // If empty, try to remove via old endpoint
        await apiFetch("/admin/organization/domain", {
          method: "PUT",
          body: JSON.stringify({ custom_domain: null }),
        });
        setToken(null); setStatus(null); setOk(true); setTimeout(() => setOk(false), 3000);
        return;
      }

      // Create domain via new API
      const resp = await apiFetch("/domains", {
        method: "POST",
        body: JSON.stringify({ domain: dom, owner: undefined }),
      });
      const data = await resp.json();
      setToken(data.token || null);
      setStatus(data.status || null);
      setCreatedAt(data.created_at || null);
      setOk(true);
      // refresh list
      try { const list = await (await apiFetch("/admin/organization/domains")).json(); setMyDomains(list || []); } catch {};
      setTimeout(() => setOk(false), 3000);
    } catch (e: any) {
      setErr(e?.message || "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function checkDNS() {
    setErr(null); setChecking(true);
    try {
      const dom = domain.trim();
      if (!dom) throw new Error("Alan adı boş.");
      const r = await apiFetch(`/domains/${encodeURIComponent(dom)}/check`);
      const j = await r.json();
      setStatus(j.status || null);
    } catch (e: any) {
      setErr(e?.message || "Doğrulama başarısız.");
    } finally { setChecking(false); }
  }

  async function regenerate() {
    setErr(null);
    try {
      const dom = domain.trim();
      if (!dom) throw new Error("Alan adı boş.");
      const r = await apiFetch(`/domains/${encodeURIComponent(dom)}/regenerate`, { method: "POST" });
      const j = await r.json();
      setToken(j.token || null);
      // refresh list
      try { const list = await (await apiFetch("/admin/organization/domains")).json(); setMyDomains(list || []); } catch {};
    } catch (e: any) { setErr(e?.message || "Token yenilenemedi."); }
  }

  async function removeDomain() {
    if (!confirm("Bu alan adını silmek istediğinize emin misiniz?")) return;
    setErr(null);
    try {
      const dom = domain.trim();
      if (!dom) throw new Error("Alan adı boş.");
      await apiFetch(`/domains/${encodeURIComponent(dom)}`, { method: "DELETE" });
      setDomain(""); setToken(null); setStatus(null); setCreatedAt(null);
      // refresh list
      try { const list = await (await apiFetch("/admin/organization/domains")).json(); setMyDomains(list || []); } catch {};
    } catch (e: any) { setErr(e?.message || "Silinemedi."); }
  }

  if (loading) return <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>;

  return (
    <div className="max-w-lg space-y-6">
      {myDomains.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-2">Kayıtlı Alan Adlarınız</h3>
          <ul className="space-y-2 text-sm">
            {myDomains.map(d => (
              <li key={d.domain} className="flex items-center justify-between">
                <div>{d.domain} <span className="text-xs text-gray-400">{d.status}</span></div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={async () => { setDomain(d.domain); setToken(d.token || null); setStatus(d.status || null); }}>{/* select */}Seç</button>
                  <button className="btn-ghost" onClick={async () => { await apiFetch(`/domains/${encodeURIComponent(d.domain)}/regenerate`, { method: 'POST' }); const list = await (await apiFetch('/admin/organization/domains')).json(); setMyDomains(list || []); }}>Token Yenile</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Globe className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Özel Alan Adı</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sertifika doğrulama sayfaları kendi alan adınızda görünsün</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 mb-5">
          <p className="text-xs text-amber-700 font-medium">Growth ve Enterprise planlarına özeldir. Doğrulama için DNS'inize bir <code className="font-mono bg-amber-100 px-1 rounded">TXT</code> kaydı eklemeniz gerekir (aşağıda gösteriliyor).</p>
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
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs font-mono space-y-2">
          <p className="text-gray-500"># DNS sağlayıcınıza şu TXT kaydını ekleyin:</p>
          <p className="text-gray-800">Ad: <span className="font-mono">_heptacert-verify.{domain || 'your-domain.tld'}</span></p>
          <p className="text-gray-800">Değer: <span className="font-mono">{token || '<kaydetmeden sonra token görünür>'}</span> <CopyBtn text={token || ''} /></p>
          {createdAt && <p className="text-gray-500">Oluşturulma: <span className="font-mono">{new Date(createdAt).toLocaleString()}</span></p>}
          <div className="flex gap-2">
            <button onClick={checkDNS} disabled={checking || !domain} className="btn-ghost">{checking ? 'Kontrol ediliyor...' : 'DNS Kontrolü Yap'}</button>
            <button onClick={regenerate} disabled={!domain} className="btn-ghost">Token Yenile</button>
            <button onClick={removeDomain} disabled={!domain} className="btn-danger">Alan Adını Sil</button>
          </div>
          {status && <p className="text-sm">Durum: <strong>{status}</strong></p>}
        </div>
        <p className="text-xs text-gray-400">DNS değişikliklerinin yayılması: genelde birkaç dakika, maksimum 24 saat.</p>
      </div>
    </div>
  );
}

// ─── Branding Tab ───────────────────────────────────────────────────────────
function BrandingTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [settingsState, setSettingsState] = useState<Record<string, any>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch("/admin/organization/settings")
      .then((r) => r.json())
      .then((d) => {
        setBrandLogo(d.brand_logo || null);
        setBrandColor(d.brand_color || "#6366f1");
        setSettingsState(d.settings || {});
      })
      .catch((e) => setErr(e?.message || "Yüklenemedi"))
      .finally(() => setLoading(false));
  }, []);

  async function uploadLogo(file: File | null) {
    if (!file) return;
    setErr(null); setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await apiFetch("/admin/organization/logo", { method: "POST", body: fd });
      const j = await r.json();
      setBrandLogo(j.brand_logo || null);
    } catch (e: any) {
      setErr(e?.message || "Yükleme başarısız");
    } finally { setLogoUploading(false); }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);

    try {
      const resp = await apiFetch("/admin/organization/settings", {
        method: "PATCH",
        body: JSON.stringify({
          brand_color: brandColor,
          ...settingsState,
        }),
      });

      const data = await resp.json();

      setBrandColor(data.brand_color || "#6366f1");
      setBrandLogo(data.brand_logo || null);
      setSettingsState(data.settings || {});
    } catch (e: any) {
      setErr(e?.message || "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>;

  return (
    <div className="space-y-6 max-w-lg">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600"><Settings className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Kurumsal Görünüm</h2>
            <p className="text-xs text-gray-400 mt-0.5">Logo, renk ve diğer marka ayarlarını yönetebilirsiniz.</p>
          </div>
        </div>

        {err && <div className="error-banner">{err}</div>}

        <form onSubmit={saveSettings} className="space-y-4">
          <div>
            <label className="label">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-28 h-16 rounded border border-gray-100 bg-white flex items-center justify-center overflow-hidden">
                {brandLogo ? <img src={brandLogo} alt="brand" className="max-w-full max-h-full" /> : <div className="text-xs text-gray-400">Logo yok</div>}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-ghost cursor-pointer">
                  {logoUploading ? 'Yükleniyor...' : 'Logo Yükle'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => uploadLogo(e.target.files ? e.target.files[0] : null)} />
                </label>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={async () => {
                    setErr(null);
                    try {
                      const resp = await apiFetch("/admin/organization/settings", {
                        method: "PATCH",
                        body: JSON.stringify({ brand_logo: null }),
                      });
                      const data = await resp.json();
                      setBrandLogo(data.brand_logo || null);
                    } catch (e: any) {
                      setErr(e?.message || "Logo kaldırılamadı.");
                    }
                  }}
                >
                  Logoyu Kaldır
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Marka Rengi</label>
            <div className="flex items-center gap-3">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-12 h-8 p-0 border rounded" />
              <input className="input-field" value={brandColor} onChange={e => setBrandColor(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Doğrulama Yolu (verification_path)</label>
            <input className="input-field" value={settingsState.verification_path || ''} onChange={e => setSettingsState(s => ({ ...s, verification_path: e.target.value }))} placeholder="/verify" />
            <p className="text-xs text-gray-400 mt-1">Boş bırakılırsa varsayılan doğrulama yolu kullanılır.</p>
          </div>

          <div>
            <label className="label">Sertifika Altbilgisi (certificate_footer)</label>
            <input className="input-field" value={settingsState.certificate_footer || ''} onChange={e => setSettingsState(s => ({ ...s, certificate_footer: e.target.value }))} placeholder="© Şirketiniz 2026" />
          </div>

          <div className="flex items-center gap-3">
            <input id="hide" type="checkbox" checked={!!settingsState.hide_heptacert_home} onChange={e => setSettingsState(s => ({ ...s, hide_heptacert_home: e.target.checked }))} />
            <label htmlFor="hide" className="text-sm text-gray-700">HeptaCert ana sayfasını gizle (`hide_heptacert_home`)</label>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</button>
            <button type="button" onClick={() => { setSettingsState({}); setBrandColor('#6366f1'); }} className="btn-ghost">Sıfırla</button>
          </div>
        </form>
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
          {activeTab === "2fa" && <TwoFATab />}
          {activeTab === "transactions" && <TransactionsTab />}
          {activeTab === "domain" && <CustomDomainTab />}
          {activeTab === "branding" && <BrandingTab />}
          {activeTab === "kurumsal" && <BrandingTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
