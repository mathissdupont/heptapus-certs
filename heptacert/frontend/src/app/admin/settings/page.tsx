"use client";

import { useState, useEffect } from "react";
import { apiFetch, clearToken, deleteAdminAccount } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Mail, CheckCircle2, Eye, EyeOff,
  ShieldCheck, Loader2, Check,
  History, TrendingUp, TrendingDown, Globe, Settings,
  Building2, Palette, Sparkles, RefreshCcw, Trash2,
  ImagePlus, BadgeCheck, Shield, Link2
} from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import { useToast } from "@/hooks/useToast";

const TABS = [
  { id: "account", label: "Hesap", description: "Sifre ve email", icon: Lock },
  { id: "2fa", label: "2FA Guvenlik", description: "Kimlik korumasi", icon: ShieldCheck },
  { id: "transactions", label: "Coin Gecmisi", description: "Harcama ve yukleme", icon: History },
  { id: "domain", label: "Ozel Domain", description: "DNS ve dogrulama", icon: Globe },
  { id: "branding", label: "Kurumsal", description: "Marka ve gorunum", icon: Settings },
];

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric" });
}
function titleCaseStatus(raw: string) {
  return raw
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(99, 102, 241, ${alpha})`;
  const numeric = Number.parseInt(value, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getDomainStatusMeta(status: string | null) {
  const raw = (status || "").toLowerCase();

  if (!raw) {
    return {
      label: "Taslak",
      chipClass: "border-slate-200 bg-slate-100 text-slate-700",
      panelClass: "border-slate-200 bg-slate-50",
      description: "Alan adinizi kaydedin, ardindan DNS kaydi ekleyip dogrulamayi baslatin.",
    };
  }

  if (raw.includes("verified") || raw.includes("active") || raw === "ok") {
    return {
      label: "Dogrulandi",
      chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      panelClass: "border-emerald-200 bg-emerald-50/70",
      description: "Alan adiniz dogrulanmis gorunuyor. Sertifika baglantilariniz kurumsal sekilde yayinlanabilir.",
    };
  }

  if (raw.includes("fail") || raw.includes("error") || raw.includes("invalid")) {
    return {
      label: "Sorun Var",
      chipClass: "border-rose-200 bg-rose-50 text-rose-700",
      panelClass: "border-rose-200 bg-rose-50/70",
      description: "DNS kaydi beklenen degerle eslesmiyor olabilir. Kaydi ve token degerini yeniden kontrol edin.",
    };
  }

  return {
    label: titleCaseStatus(status || "Bekleniyor"),
    chipClass: "border-amber-200 bg-amber-50 text-amber-700",
    panelClass: "border-amber-200 bg-amber-50/70",
    description: "Kaydiniz alindi. DNS yayilimi tamamlandiginda dogrulama tekrar kontrol edilmelidir.",
  };
}

function normalizeVerificationPath(path: string) {
  if (!path) return "/verify";
  return path.startsWith("/") ? path : `/${path}`;
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
// â”€â”€â”€ Account Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AccountTab({ me }: { me: { email: string; role?: string } | null }) {
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confPw, setConfPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null); const [pwOk, setPwOk] = useState(false); const [pwLoading, setPwLoading] = useState(false);
  const [newEmail, setNewEmail] = useState(""); const [emailPw, setEmailPw] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null); const [emailOk, setEmailOk] = useState(false); const [emailLoading, setEmailLoading] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwErr(null); setPwOk(false);
    if (newPw.length < 8) { setPwErr("Yeni sifre en az 8 karakter olmalidir."); return; }
    if (newPw !== confPw) { setPwErr("Sifreler eslesmiyor."); return; }
    setPwLoading(true);
    try {
      await apiFetch("/me/password", { method: "PATCH", body: JSON.stringify({ current_password: curPw, new_password: newPw }) });
      setPwOk(true); setCurPw(""); setNewPw(""); setConfPw("");
    } catch (e: any) { setPwErr(e?.message || "Sifre guncellenemedi."); } finally { setPwLoading(false); }
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault(); setEmailErr(null); setEmailOk(false); setEmailLoading(true);
    try {
      await apiFetch("/me/email", { method: "PATCH", body: JSON.stringify({ current_password: emailPw, new_email: newEmail }) });
      setEmailOk(true); setNewEmail(""); setEmailPw("");
    } catch (e: any) { setEmailErr(e?.message || "E-posta guncellenemedi."); } finally { setEmailLoading(false); }
  }

  async function removeAccount(e: React.FormEvent) {
    e.preventDefault(); setDeleteErr(null); setDeleteLoading(true);
    try {
      await deleteAdminAccount({ current_password: deletePw });
      clearToken();
      if (typeof window !== "undefined") window.location.href = "/admin/login";
    } catch (e: any) { setDeleteErr(e?.message || "Hesap silinemedi."); } finally { setDeleteLoading(false); }
  }

  return (
    <div className="space-y-8">
      {me && <p className="text-sm text-gray-500">Mevcut e-posta: <strong className="text-gray-700">{me.email}</strong></p>}
      {/* Password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Lock className="h-5 w-5" /></div>
          <div><h2 className="font-semibold text-gray-900">Sifre Degistir</h2><p className="text-xs text-gray-400 mt-0.5">Guvenlik icin duzenli olarak sifrenizi guncelleyin</p></div>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label">Mevcut Sifre</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10 pr-10" type={showPw ? "text" : "password"} value={curPw} onChange={e => setCurPw(e.target.value)} required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div><label className="label">Yeni Sifre</label><input className="input-field" type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="En az 8 karakter" required /></div>
          <div><label className="label">Yeni Sifre Tekrar</label><input className="input-field" type={showPw ? "text" : "password"} value={confPw} onChange={e => setConfPw(e.target.value)} required /></div>
          <AnimatePresence>
            {pwErr && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="error-banner">{pwErr}</div></motion.div>}
            {pwOk && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="success-banner"><CheckCircle2 className="h-4 w-4 shrink-0" /> Sifre basariyla guncellendi.</div></motion.div>}
          </AnimatePresence>
          <button type="submit" disabled={pwLoading} className="btn-primary">{pwLoading ? "Kaydediliyor..." : "Sifreyi Guncelle"}</button>
        </form>
      </div>
      {/* Email */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Mail className="h-5 w-5" /></div>
          <div><h2 className="font-semibold text-gray-900">E-posta Degistir</h2><p className="text-xs text-gray-400 mt-0.5">Dogrulama icin mevcut sifrenizi girmeniz gerekmektedir</p></div>
        </div>
        <form onSubmit={changeEmail} className="space-y-4">
          <div><label className="label">Yeni E-posta Adresi</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="yeni@sirket.com" required autoComplete="email" /></div></div>
          <div><label className="label">Mevcut Sifre (Dogrulama)</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input className="input-field pl-10" type="password" value={emailPw} onChange={e => setEmailPw(e.target.value)} required /></div></div>
          <AnimatePresence>
            {emailErr && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="error-banner">{emailErr}</div></motion.div>}
            {emailOk && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="success-banner"><CheckCircle2 className="h-4 w-4 shrink-0" /> E-posta basariyla guncellendi.</div></motion.div>}
          </AnimatePresence>
          <button type="submit" disabled={emailLoading} className="btn-primary">{emailLoading ? "Kaydediliyor..." : "E-postayi Guncelle"}</button>
        </form>
      </div>

      {me?.role !== "superadmin" ? (
        <div className="card border border-rose-200 bg-rose-50/70 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><Trash2 className="h-5 w-5" /></div>
            <div><h2 className="font-semibold text-rose-900">Hesabi ve Verileri Sil</h2><p className="text-xs text-rose-700 mt-0.5">Bu islem geri alinamaz. Etkinlikleriniz ve iliskili verileriniz kalici olarak silinir.</p></div>
          </div>
          <form onSubmit={removeAccount} className="space-y-4">
            <div><label className="label text-rose-900">Mevcut Sifre ile Onay</label><input className="input-field border-rose-200 bg-white" type="password" value={deletePw} onChange={e => setDeletePw(e.target.value)} required /></div>
            <AnimatePresence>
              {deleteErr && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="error-banner">{deleteErr}</div></motion.div>}
            </AnimatePresence>
            <button type="submit" disabled={deleteLoading} className="btn-danger">{deleteLoading ? "Siliniyor..." : "Hesabi ve Verileri Sil"}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

// â”€â”€â”€ 2FA Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    } catch (e: any) { setErr(e?.message || "Kurulum baslatilamadi."); } finally { setLoading(false); }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setLoading(true);
    try {
      await apiFetch("/auth/2fa/confirm", { method: "POST", body: JSON.stringify({ code }) });
      setStatus("enabled"); setCode("");
    } catch (e: any) { setErr(e?.message || "Gecersiz kod."); } finally { setLoading(false); }
  }

  async function disable2FA(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setLoading(true);
    try {
      await apiFetch("/auth/2fa/disable", { method: "PATCH", body: JSON.stringify({ code }) });
      setStatus("disabled"); setCode("");
    } catch (e: any) { setErr(e?.message || "Devre disi birakilamadi."); } finally { setLoading(false); }
  }

  const qrUrl = otpauthUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}` : "";

  if (status === "loading") return <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>;

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Iki Faktorlu Dogrulama (TOTP)</h2>
        <p className="text-sm text-gray-500 mt-0.5">Giris yaparken Google Authenticator veya Authy ile ek guvenlik katmani ekleyin.</p>
      </div>

      {status === "disabled" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100"><ShieldCheck className="h-5 w-5 text-gray-400" /></div>
            <div><p className="font-medium text-gray-900">2FA Devre Disi</p><p className="text-sm text-gray-500">Hesabiniz yalnizca sifre ile korunuyor.</p></div>
          </div>
          {err && <div className="error-banner">{err}</div>}
          <button onClick={startSetup} disabled={loading} className="btn-primary gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} 2FA'yi Etkinlestir
          </button>
        </div>
      )}

      {status === "setup" && (
        <div className="card p-6 space-y-5">
          <p className="font-medium text-gray-900">Kimlik Dogrulayiciyi Yapilandir</p>
          <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
            <li>Telefonunuzda Google Authenticator veya Authy'yi acin.</li>
            <li>Asagidaki QR kodu veya gizli anahtari kullanarak ekleyin.</li>
            <li>6 haneli kodu girin ve onaylayin.</li>
          </ol>
          {qrUrl && <div className="flex justify-center"><img src={qrUrl} alt="2FA QR" className="rounded-xl border border-gray-200 p-2" /></div>}
          <div>
            <label className="label">El ile Giris</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <code className="text-xs font-mono text-gray-700 flex-1 break-all">{showSecret ? secret : "*".repeat(Math.min(secret.length, 32))}</code>
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="text-gray-400 hover:text-gray-700">
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <CopyBtn text={secret} />
            </div>
          </div>
          <form onSubmit={confirmSetup} className="space-y-3">
            <div>
              <label className="label">Dogrulama Kodu</label>
              <input className="input-field text-center text-xl tracking-[0.4em] font-mono" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" required maxLength={6} />
            </div>
            {err && <div className="error-banner">{err}</div>}
            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Onayla &amp; Etkinlestir
            </button>
            <button type="button" onClick={() => setStatus("disabled")} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">Iptal</button>
          </form>
        </div>
      )}

      {status === "enabled" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100"><ShieldCheck className="h-5 w-5 text-green-600" /></div>
            <div><p className="font-medium text-gray-900">2FA Etkin </p><p className="text-sm text-gray-500">Hesabiniz iki faktorlu kimlik dogrulama ile korunuyor.</p></div>
          </div>
          <form onSubmit={disable2FA} className="space-y-3 pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500">Devre disi birakmak icin mevcut kodunuzu girin:</p>
            <input className="input-field text-center text-xl tracking-[0.4em] font-mono" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" required maxLength={6} />
            {err && <div className="error-banner">{err}</div>}
            <button type="submit" disabled={loading || code.length !== 6} className="w-full btn-danger justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} 2FA'yi Devre Disi Birak
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Transactions Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      .catch((e) => setErr(e?.message || "Gecmis yuklenemedi."))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-gray-700">
            <History className="h-4 w-4 text-gray-400" /> Coin Islem Gecmisi
          </div>
          <span className="text-xs font-bold text-gray-400">Toplam: {total}</span>
        </div>
        {loading ? (
          <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
        ) : err ? (
          <div className="p-8 text-rose-600 text-sm">{err}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">Henuz islem yok.</div>
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
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost text-xs disabled:opacity-30">{"<-"} Onceki</button>
            <span className="text-xs font-bold text-gray-400">{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost text-xs disabled:opacity-30">Sonraki {"->"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Custom Domain Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CustomDomainTab() {
  const toast = useToast();
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
  const [existingDomain, setExistingDomain] = useState<string | null>(null);

  async function refreshDomains() {
    try {
      const list = await (await apiFetch("/admin/organization/domains")).json();
      setMyDomains(list || []);
      return list || [];
    } catch {
      setMyDomains([]);
      return [];
    }
  }

  useEffect(() => {
    // Attempt to read existing organization domain if endpoint exists; fallback to empty.
    Promise.all([
      apiFetch("/admin/organization/domain").then(r => r.json()).catch(() => ({ custom_domain: "" })),
      refreshDomains(),
    ])
      .then(([domainData, domains]) => {
        const currentDomain = domainData.custom_domain || "";
        setDomain(currentDomain);
        setExistingDomain(currentDomain || null);
        if (currentDomain) {
          const selected = (domains || []).find((item: any) => item.domain === currentDomain);
          if (selected) {
            setToken(selected.token || null);
            setStatus(selected.status || null);
            setCreatedAt(selected.created_at || null);
          }
        }
      })
      .finally(() => setLoading(false));
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
      const dom = (domain.trim() || existingDomain || "").trim();
      if (!dom) {
        if (existingDomain) {
          await apiFetch(`/domains/${encodeURIComponent(existingDomain)}`, { method: "DELETE" });
        } else {
          await apiFetch("/admin/organization/domain", {
            method: "PUT",
            body: JSON.stringify({ custom_domain: null }),
          });
        }
        setDomain("");
        setExistingDomain(null);
        setToken(null); setStatus(null); setCreatedAt(null); setOk(true); setTimeout(() => setOk(false), 3000);
        await refreshDomains();
        toast.success("Ozel domain kaldirildi.", "Kurumsal Alan Adi");
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
      setExistingDomain(data.domain || dom);
      setOk(true);
      await refreshDomains();
      setTimeout(() => setOk(false), 3000);
      toast.success("Ozel domain kaydedildi.", "Kurumsal Alan Adi");
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
      if (!dom) throw new Error("Alan adi bos.");
      const r = await apiFetch(`/domains/${encodeURIComponent(dom)}/check`);
      const j = await r.json();
      setStatus(j.status || null);
      const nextStatus = getDomainStatusMeta(j.status || null);
      toast.info(nextStatus.description, nextStatus.label);
    } catch (e: any) {
      setErr(e?.message || "Dogrulama basarisiz.");
    } finally { setChecking(false); }
  }

  async function regenerate(targetDomain?: string) {
    setErr(null);
    try {
      const dom = (targetDomain || domain.trim() || existingDomain || "").trim();
      if (!dom) throw new Error("Alan adi bos.");
      const r = await apiFetch(`/domains/${encodeURIComponent(dom)}/regenerate`, { method: "POST" });
      const j = await r.json();
      if ((domain.trim() || existingDomain || "").trim() === dom) {
        setToken(j.token || null);
        setDomain(dom);
        setExistingDomain(dom);
      }
      await refreshDomains();
      toast.success("Dogrulama tokeni yenilendi.", dom);
    } catch (e: any) { setErr(e?.message || "Token yenilenemedi."); }
  }

  async function removeDomain() {
    if (!confirm("Bu alan adini silmek istediginize emin misiniz?")) return;
    setErr(null);
    try {
      const targetDomain = (domain.trim() || existingDomain || "").trim();
      if (!targetDomain) throw new Error("Alan adi bos.");
      await apiFetch(`/domains/${encodeURIComponent(targetDomain)}`, { method: "DELETE" });
      setDomain(""); setExistingDomain(null); setToken(null); setStatus(null); setCreatedAt(null);
      await refreshDomains();
      toast.success("Alan adi silindi.", "Kurumsal Alan Adi");
    } catch (e: any) { setErr(e?.message || "Silinemedi."); }
  }

  if (loading) return <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>;

  const activeDomain = (domain.trim() || existingDomain || "").trim();
  const statusMeta = getDomainStatusMeta(status);
  const dnsHost = activeDomain ? `_heptacert-verify.${activeDomain}` : "_heptacert-verify.your-domain.tld";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
      <div className="space-y-6">
      {myDomains.length > 0 && (
        <div className="hidden">
          <h3 className="text-sm font-semibold mb-2">Kayitli Alan Adlariniz</h3>
          <ul className="space-y-2 text-sm">
            {myDomains.map(d => (
              <li key={d.domain} className="flex items-center justify-between">
                <div>{d.domain} <span className="text-xs text-gray-400">{d.status}</span></div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={async () => { setDomain(d.domain); setExistingDomain(d.domain); setToken(d.token || null); setStatus(d.status || null); setCreatedAt(d.created_at || null); }}>{/* select */}Sec</button>
                  <button className="btn-ghost" onClick={async () => { await apiFetch(`/domains/${encodeURIComponent(d.domain)}/regenerate`, { method: 'POST' }); const list = await (await apiFetch('/admin/organization/domains')).json(); setMyDomains(list || []); }}>Token Yenile</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card border border-slate-200/80 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Globe className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Ozel Alan Adi</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sertifika dogrulama sayfalari kendi alan adinizda gorunsun</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 mb-5">
          <p className="text-xs text-amber-700 font-medium">Growth ve Enterprise planlarina ozeldir. Dogrulama icin DNS'inize bir <code className="font-mono bg-amber-100 px-1 rounded">TXT</code> kaydi eklemeniz gerekir (asagida gosteriliyor).</p>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Alan Adi</label>
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
            <p className="text-xs text-gray-400 mt-1.5">Bos birakirsaniz ozel alan adi kaldirilir.</p>
          </div>
          {err && <div className="error-banner">{err}</div>}
          {ok && <div className="success-banner"><CheckCircle2 className="h-4 w-4 shrink-0" /> Alan adi kaydedildi.</div>}
          <button type="submit" disabled={saving} className="btn-primary gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Kaydet
          </button>
        </form>
      </div>
      <div className="card border border-slate-200/80 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">DNS Yapilandirmasi</h3>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs font-mono space-y-2">
          <p className="text-gray-500"># DNS saglayiciniza su TXT kaydini ekleyin:</p>
          <p className="text-gray-800">Ad: <span className="font-mono">{dnsHost}</span></p>
          <p className="text-gray-800">Deger: <span className="font-mono">{token || '<kaydetmeden sonra token gorunur>'}</span> <CopyBtn text={token || ''} /></p>
          {createdAt && <p className="text-gray-500">Olusturulma: <span className="font-mono">{new Date(createdAt).toLocaleString()}</span></p>}
          <div className="flex gap-2">
            <button onClick={checkDNS} disabled={checking || !domain} className="btn-ghost">{checking ? 'Kontrol ediliyor...' : 'DNS Kontrolu Yap'}</button>
            <button onClick={() => regenerate()} disabled={!domain} className="btn-ghost">Token Yenile</button>
            <button onClick={removeDomain} disabled={!domain} className="btn-danger">Alan Adini Sil</button>
          </div>
          {status && <p className="text-sm">Durum: <strong>{status}</strong></p>}
        </div>
        <p className="text-xs text-gray-400">DNS degisikliklerinin yayilmasi: genelde birkac dakika, maksimum 24 saat.</p>
      </div>
      </div>
      <div className="space-y-6">
        <div className="card border border-slate-200/80 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Canli gorunum</p>
              <p className="text-xs text-slate-500">Ziyaretciler ozel alan adinizi bu hissiyatla gorur.</p>
            </div>
          </div>

          <div
            className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.32)]"
            style={{ boxShadow: `0 24px 60px -32px ${withAlpha("#0f172a", 0.35)}` }}
          >
            <div
              className="px-5 py-5"
              style={{ background: `linear-gradient(135deg, ${withAlpha("#ffffff", 0.96)} 0%, ${withAlpha("#ffffff", 0.84)} 32%, ${withAlpha("#f8fafc", 1)} 100%), radial-gradient(circle at top right, ${withAlpha("#6366f1", 0.15)} 0%, transparent 45%)` }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm">
                    <span className="text-lg font-semibold text-slate-700">{(activeDomain || "C").charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{activeDomain || "certs.sirketiniz.com"}</p>
                    <p className="text-xs text-slate-500">Kurumsal dogrulama sayfasi</p>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.chipClass}`}>
                  {statusMeta.label}
                </span>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">One Cikan Alan Adi</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{activeDomain || "Alan adi henuz secilmedi"}</p>
                <p className="mt-1 text-sm text-slate-500">{statusMeta.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">TXT Hazir</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{token ? "Token uretildi" : "Henuz uretim yok"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Son Guncelleme</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{fmtDate(createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card border border-slate-200/80 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Kayitli alan adlari</p>
              <p className="text-xs text-slate-500">Farkli domain kayitlari arasinda hizli gecis yapabilirsiniz.</p>
            </div>
          </div>

          {myDomains.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-slate-800">Henuz kayitli alan adi yok</p>
              <p className="mt-2 text-sm text-slate-500">Ilk domaininizi eklediginizde dogrulama gecmisi ve token yonetimi burada listelenecek.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myDomains.map((d) => {
                const itemStatus = getDomainStatusMeta(d.status || null);
                return (
                  <div key={d.domain} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{d.domain}</p>
                        <p className="mt-1 text-xs text-slate-500">Olusturulma: {fmtDate(d.created_at || null)}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${itemStatus.chipClass}`}>
                        {itemStatus.label}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-ghost gap-2"
                        onClick={() => {
                          setDomain(d.domain);
                          setExistingDomain(d.domain);
                          setToken(d.token || null);
                          setStatus(d.status || null);
                          setCreatedAt(d.created_at || null);
                        }}
                      >
                        <Link2 className="h-4 w-4" />
                        Sec
                      </button>
                      <button
                        type="button"
                        className="btn-ghost gap-2"
                        onClick={() => regenerate(d.domain)}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Token Yenile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Branding Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BrandingTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [postSaving, setPostSaving] = useState(false);
  const [publicId, setPublicId] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [settingsState, setSettingsState] = useState<Record<string, any>>({});
  const [communityPosts, setCommunityPosts] = useState<Array<{ public_id: string; author_name: string; body: string; created_at: string }>>([]);
  const [postBody, setPostBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch("/admin/organization/settings")
      .then((r) => r.json())
      .then((d) => {
        setPublicId(d.public_id || "");
        setBrandLogo(d.brand_logo || null);
        setBrandColor(d.brand_color || "#6366f1");
        setOrgName(d.org_name || "");
        setSettingsState(d.settings || {});
      })
      .catch((e) => setErr(e?.message || "Yuklenemedi"))
      .finally(() => setLoading(false));

    setPostLoading(true);
    apiFetch("/admin/community/posts")
      .then((r) => r.json())
      .then((items) => setCommunityPosts(items || []))
      .catch(() => null)
      .finally(() => setPostLoading(false));
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
      toast.success("Logo guncellendi.", "Kurumsal Gorunum");
    } catch (e: any) {
      setErr(e?.message || "Yukleme basarisiz");
    } finally { setLogoUploading(false); }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);

    try {
      const payload = {
        org_name: orgName,
        brand_color: brandColor,
        verification_path: settingsState.verification_path || "",
        certificate_footer: settingsState.certificate_footer || "",
        hide_heptacert_home: !!settingsState.hide_heptacert_home,
        public_bio: settingsState.public_bio || "",
        public_website_url: settingsState.public_website_url || "",
        public_linkedin_url: settingsState.public_linkedin_url || "",
        public_github_url: settingsState.public_github_url || "",
        public_x_url: settingsState.public_x_url || "",
        public_instagram_url: settingsState.public_instagram_url || "",
      };

      const resp = await apiFetch("/admin/organization/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      setSettingsState(data.settings || {});
      setPublicId(data.public_id || "");
      setBrandColor(data.brand_color || "#6366f1");
      setOrgName(data.org_name || "");
      toast.success("Kurumsal ayarlar kaydedildi.", "Marka Kimligi");
    } catch (e: any) {
      setErr(e?.message || "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function createCommunityPost() {
    if (!postBody.trim()) return;
    setPostSaving(true);
    setErr(null);
    try {
      const resp = await apiFetch("/admin/community/posts", {
        method: "POST",
        body: JSON.stringify({ body: postBody.trim() }),
      });
      const data = await resp.json();
      setCommunityPosts((current) => [data, ...current]);
      setPostBody("");
      toast.success("Topluluk gonderisi yayinlandi.", "Community");
    } catch (e: any) {
      setErr(e?.message || "Gonderi yayinlanamadi.");
    } finally {
      setPostSaving(false);
    }
  }

  async function removeCommunityPost(postPublicId: string) {
    setErr(null);
    try {
      await apiFetch(`/admin/community/posts/${postPublicId}`, { method: "DELETE" });
      setCommunityPosts((current) => current.filter((item) => item.public_id !== postPublicId));
      toast.success("Topluluk gonderisi silindi.", "Community");
    } catch (e: any) {
      setErr(e?.message || "Gonderi silinemedi.");
    }
  }

  if (loading) return <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>;

  const previewName = orgName.trim() || "Kurumunuz";
  const previewPath = normalizeVerificationPath(settingsState.verification_path || "");
  const previewFooter = settingsState.certificate_footer || "Sertifika dogrulama sayfaniza guven veren kisa bir alt bilgi ekleyin.";
  const previewLogoLetter = previewName.charAt(0).toUpperCase() || "K";
  const heroGlow = withAlpha(brandColor, 0.2);
  const heroSoft = withAlpha(brandColor, 0.12);
  const publicPageUrl = publicId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/organizations/${publicId}`
    : "";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
      <div className="card border border-slate-200/80 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600"><Settings className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">Kurumsal Gorunum</h2>
            <p className="text-xs text-gray-400 mt-0.5">Logo, renk ve diger marka ayarlarini yonetebilirsiniz.</p>
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
                  {logoUploading ? 'Yukleniyor...' : 'Logo Yukle'}
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
                      setErr(e?.message || "Logo kaldirilamadi.");
                    }
                  }}
                >
                  Logoyu Kaldir
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Kurum Adi</label>
            <input className="input-field" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Sirket / organizasyon adi" />
          </div>

          <div>
            <label className="label">Topluluk Biyografisi</label>
            <textarea
              className="input-field min-h-28"
              value={settingsState.public_bio || ""}
              onChange={e => setSettingsState(s => ({ ...s, public_bio: e.target.value }))}
              placeholder="Kulubunuzun veya kurumunuzun ne yaptigini, kimlere hitap ettigini anlatin."
            />
          </div>

          <div>
            <label className="label">Public Website</label>
            <input className="input-field" value={settingsState.public_website_url || ""} onChange={e => setSettingsState(s => ({ ...s, public_website_url: e.target.value }))} placeholder="https://..." />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">LinkedIn</label>
              <input className="input-field" value={settingsState.public_linkedin_url || ""} onChange={e => setSettingsState(s => ({ ...s, public_linkedin_url: e.target.value }))} placeholder="https://linkedin.com/..." />
            </div>
            <div>
              <label className="label">GitHub</label>
              <input className="input-field" value={settingsState.public_github_url || ""} onChange={e => setSettingsState(s => ({ ...s, public_github_url: e.target.value }))} placeholder="https://github.com/..." />
            </div>
            <div>
              <label className="label">X</label>
              <input className="input-field" value={settingsState.public_x_url || ""} onChange={e => setSettingsState(s => ({ ...s, public_x_url: e.target.value }))} placeholder="https://x.com/..." />
            </div>
            <div>
              <label className="label">Instagram</label>
              <input className="input-field" value={settingsState.public_instagram_url || ""} onChange={e => setSettingsState(s => ({ ...s, public_instagram_url: e.target.value }))} placeholder="https://instagram.com/..." />
            </div>
          </div>

          {publicId ? (
            <div>
              <label className="label">Topluluk Sayfasi</label>
              <div className="input-field flex items-center justify-between gap-3">
                <span className="truncate text-sm text-gray-700">{publicPageUrl}</span>
                <CopyBtn text={publicPageUrl} />
              </div>
            </div>
          ) : null}

          <div>
            <label className="label">Marka Rengi</label>
            <div className="flex items-center gap-3">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-12 h-8 p-0 border rounded" />
              <input className="input-field" value={brandColor} onChange={e => setBrandColor(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Dogrulama Yolu (verification_path)</label>
            <input className="input-field" value={settingsState.verification_path || ''} onChange={e => setSettingsState(s => ({ ...s, verification_path: e.target.value }))} placeholder="/verify" />
            <p className="text-xs text-gray-400 mt-1">Bos birakilirsa varsayilan dogrulama yolu kullanilir.</p>
          </div>

          <div>
            <label className="label">Sertifika Altbilgisi (certificate_footer)</label>
            <input className="input-field" value={settingsState.certificate_footer || ''} onChange={e => setSettingsState(s => ({ ...s, certificate_footer: e.target.value }))} placeholder="(c) Sirketiniz 2026" />
          </div>

          <div className="flex items-center gap-3">
            <input id="hide" type="checkbox" checked={!!settingsState.hide_heptacert_home} onChange={e => setSettingsState(s => ({ ...s, hide_heptacert_home: e.target.checked }))} />
            <label htmlFor="hide" className="text-sm text-gray-700">HeptaCert ana sayfasini gizle (`hide_heptacert_home`)</label>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Kaydediliyor...' : 'Ayarlari Kaydet'}</button>
            <button type="button" onClick={() => { setSettingsState({}); setBrandColor('#6366f1'); setOrgName(''); }} className="btn-ghost">Sifirla</button>
          </div>
        </form>

        <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Topluluk Akisi</h3>
              <p className="text-xs text-slate-500">Kurum adina resmi guncelleme ve duyurular paylasin.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <textarea
              className="input-field min-h-28"
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              maxLength={1500}
              placeholder="Toplulugunuz icin bir duyuru veya guncelleme yazin."
            />
            <div className="flex justify-end">
              <button type="button" onClick={() => void createCommunityPost()} disabled={postSaving || !postBody.trim()} className="btn-primary">
                {postSaving ? "Paylasiliyor..." : "Gonderi Paylas"}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {postLoading ? (
              <div className="flex items-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yukleniyor...</div>
            ) : communityPosts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                Henuz kurum gonderisi yok.
              </div>
            ) : (
              communityPosts.map((post) => (
                <div key={post.public_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{post.author_name}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(post.created_at).toLocaleString("tr-TR")}</p>
                    </div>
                    <button type="button" onClick={() => void removeCommunityPost(post.public_id)} className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{post.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
        <div className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)]">
          <div
            className="overflow-hidden rounded-[22px] border border-slate-200"
            style={{
              background: `linear-gradient(160deg, ${heroGlow} 0%, ${heroSoft} 42%, rgba(255,255,255,0.96) 100%)`,
            }}
          >
            <div className="border-b border-white/70 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm">
                    {brandLogo ? (
                      <img src={brandLogo} alt="Brand preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-semibold text-slate-700">{previewLogoLetter}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Canli Onizleme</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{previewName}</h3>
                    <p className="mt-1 text-sm text-slate-600">{previewPath}</p>
                  </div>
                </div>
                <div className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                  Kurumsal Kimlik
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Dogrulama Karti</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Belge dogrulandi</p>
                    <p className="mt-1 text-sm text-slate-500">Ziyaretciler marka renginizle hizalanmis guven ekranini gorur.</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm" style={{ backgroundColor: brandColor }}>
                    <BadgeCheck className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Alt Bilgi</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{previewFooter}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/90 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Gorunurluk</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {settingsState.hide_heptacert_home
                      ? "Ana sayfa gizli, kullanicilar dogrudan kurum deneyimine yonlenir."
                      : "HeptaCert ana sayfasi gorunur, kurum deneyimiyle birlikte genel giris noktasi korunur."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Marka Rengi</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: brandColor }} />
                <p className="text-sm font-semibold text-slate-900">{brandColor}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Deneyim Notu</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Bu panel, yaptiginiz degisikliklerin ziyaretci tarafinda nasil bir his yarattigini kaydetmeden once gormenizi saglar.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AdminSettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; role?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("account");
  const activeTabMeta = TABS.find((tab) => tab.id === activeTab) || TABS[0];

  useEffect(() => {
    apiFetch("/me", { method: "GET" }).then(r => r.json()).then(d => setMe(d)).catch(() => router.push("/admin/login"));
  }, [router]);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Ayarlar"
        subtitle="Hesap, guvenlik ve kurumsal ayarlari daha rahat yonetebilmeniz icin tek bir operasyon alani."
        icon={<Settings className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`card flex items-start gap-3 p-4 text-left transition ${
                isActive
                  ? "border-brand-200 bg-brand-50 shadow-soft"
                  : "hover:border-surface-300 hover:bg-surface-50"
              }`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isActive ? "bg-white text-brand-600" : "bg-surface-100 text-surface-500"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${isActive ? "text-surface-900" : "text-surface-700"}`}>{tab.label}</p>
                <p className="mt-1 text-xs leading-5 text-surface-500">{tab.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">Aktif Bolum</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-surface-900">{activeTabMeta.label}</h2>
            <p className="mt-2 text-sm leading-6 text-surface-500">{activeTabMeta.description}</p>
          </div>
          {me && (
            <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">Admin</p>
              <p className="mt-1 text-sm font-semibold text-surface-900">{me.email}</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {activeTab === "account" && <AccountTab me={me} />}
          {activeTab === "2fa" && <TwoFATab />}
          {activeTab === "transactions" && <TransactionsTab />}
          {activeTab === "domain" && <CustomDomainTab />}
          {activeTab === "branding" && <BrandingTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

