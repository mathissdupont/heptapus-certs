"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch, clearToken, deleteAdminAccount } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Mail, CheckCircle2, Eye, EyeOff,
  ShieldCheck, Loader2, Check,
  History, TrendingUp, TrendingDown, Globe, Settings,
  Building2, Sparkles, RefreshCcw, Trash2,
  BadgeCheck, Link2, UploadCloud, MonitorSmartphone
} from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import { useToast } from "@/hooks/useToast";
import { normalizeExternalUrl } from "@/lib/url";

const TABS = [
  { id: "account", label: "Hesap", description: "Şifre ve e-posta", icon: Lock },
  { id: "2fa", label: "2FA Güvenlik", description: "Kimlik koruması", icon: ShieldCheck },
  { id: "transactions", label: "Bakiye", description: "Harcama geçmişi", icon: History },
  { id: "domain", label: "Özel Domain", description: "DNS ayarları", icon: Globe },
  { id: "branding", label: "Kurumsal", description: "Marka kimliği", icon: Sparkles },
];

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function titleCaseStatus(raw: string) {
  return raw
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDomainStatusMeta(status: string | null) {
  const raw = (status || "").toLowerCase();
  if (!raw) {
    return { label: "Taslak", chipClass: "border-zinc-200 bg-zinc-100 text-zinc-700", description: "Alan adınızı kaydedin, ardından DNS kaydı ekleyip doğrulamayı başlatın." };
  }
  if (raw.includes("verified") || raw.includes("active") || raw === "ok") {
    return { label: "Doğrulandı", chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700", description: "Alan adınız doğrulanmış görünüyor. Sertifika bağlantılarınız kurumsal şekilde yayınlanabilir." };
  }
  if (raw.includes("fail") || raw.includes("error") || raw.includes("invalid")) {
    return { label: "Sorun Var", chipClass: "border-rose-200 bg-rose-50 text-rose-700", description: "DNS kaydı beklenen değerle eşleşmiyor olabilir. Kaydı ve token değerini yeniden kontrol edin." };
  }
  return { label: titleCaseStatus(status || "Bekleniyor"), chipClass: "border-amber-200 bg-amber-50 text-amber-700", description: "Kaydınız alındı. DNS yayılımı tamamlandığında doğrulama tekrar kontrol edilmelidir." };
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
      className="text-zinc-400 hover:text-zinc-900 transition-colors"
      title="Kopyala"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
    </button>
  );
}

// ─── Account Tab ─────────────────────────────────────────────────────────────
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

  async function removeAccount(e: React.FormEvent) {
    e.preventDefault(); setDeleteErr(null); setDeleteLoading(true);
    try {
      await deleteAdminAccount({ current_password: deletePw });
      clearToken();
      if (typeof window !== "undefined") window.location.href = "/admin/login";
    } catch (e: any) { setDeleteErr(e?.message || "Hesap silinemedi."); } finally { setDeleteLoading(false); }
  }

  return (
    <div className="space-y-6">
      {me && <p className="text-sm text-zinc-500 px-2">Mevcut e-posta: <strong className="text-zinc-900">{me.email}</strong></p>}
      
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900"><Lock className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-semibold text-zinc-900">Şifre Değiştir</h2><p className="text-sm text-zinc-500">Güvenlik için düzenli güncelleyin</p></div>
          </div>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Mevcut Şifre</label>
              <div className="relative">
                <input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white" type={showPw ? "text" : "password"} value={curPw} onChange={e => setCurPw(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Yeni Şifre</label><input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white" type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="En az 8 karakter" required /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Yeni Şifre Tekrar</label><input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white" type={showPw ? "text" : "password"} value={confPw} onChange={e => setConfPw(e.target.value)} required /></div>
            <AnimatePresence>
              {pwErr && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-rose-600">{pwErr}</motion.p>}
              {pwOk && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Şifre güncellendi.</motion.p>}
            </AnimatePresence>
            <button type="submit" disabled={pwLoading} className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 mt-2">{pwLoading ? "Kaydediliyor..." : "Şifreyi Güncelle"}</button>
          </form>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900"><Mail className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-semibold text-zinc-900">E-posta Değiştir</h2><p className="text-sm text-zinc-500">Mevcut şifrenizle onaylayın</p></div>
          </div>
          <form onSubmit={changeEmail} className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Yeni E-posta</label><input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="yeni@sirket.com" required /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Mevcut Şifre (Doğrulama)</label><input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white" type="password" value={emailPw} onChange={e => setEmailPw(e.target.value)} required /></div>
            <AnimatePresence>
              {emailErr && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-rose-600">{emailErr}</motion.p>}
              {emailOk && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> E-posta güncellendi.</motion.p>}
            </AnimatePresence>
            <button type="submit" disabled={emailLoading} className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 mt-2">{emailLoading ? "Kaydediliyor..." : "E-postayı Güncelle"}</button>
          </form>
        </div>
      </div>

      {me?.role !== "superadmin" ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm sm:p-8 lg:w-1/2">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><Trash2 className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-semibold text-rose-900">Hesabı ve Verileri Sil</h2><p className="text-sm text-rose-700">Bu işlem geri alınamaz.</p></div>
          </div>
          <form onSubmit={removeAccount} className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium text-rose-900">Mevcut Şifre ile Onay</label><input className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-rose-500" type="password" value={deletePw} onChange={e => setDeletePw(e.target.value)} required /></div>
            <AnimatePresence>
              {deleteErr && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-rose-600">{deleteErr}</motion.p>}
            </AnimatePresence>
            <button type="submit" disabled={deleteLoading} className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 mt-2">{deleteLoading ? "Siliniyor..." : "Hesabı ve Verileri Sil"}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

// ─── 2FA Tab ─────────────────────────────────────────────────────────────────
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

  if (status === "loading") return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" /></div>;

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100"><ShieldCheck className="h-8 w-8 text-zinc-900" /></div>
        <h2 className="text-xl font-bold text-zinc-900">İki Faktörlü Doğrulama</h2>
        <p className="mt-2 text-sm text-zinc-500">Hesabınızı korumak için Authenticator uygulaması kullanın.</p>
      </div>

      {status === "disabled" && (
        <div className="text-center">
          <button onClick={startSetup} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} 2FA'yı Etkinleştir
          </button>
        </div>
      )}

      {status === "setup" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600 leading-relaxed">
            1. Telefonunuzda Google Authenticator veya Authy'yi açın.<br/>
            2. Aşağıdaki QR kodu okutun veya gizli anahtarı girin.<br/>
            3. Üretilen 6 haneli kodu aşağıya yazın.
          </div>
          {qrUrl && <div className="flex justify-center"><img src={qrUrl} alt="2FA QR" className="rounded-2xl border border-zinc-200 p-3 bg-white shadow-sm" /></div>}
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <code className="flex-1 font-mono text-sm text-zinc-800 break-all">{showSecret ? secret : "••••••••••••••••••••••••••••"}</code>
            <button type="button" onClick={() => setShowSecret(!showSecret)} className="text-zinc-400 hover:text-zinc-700">{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            <CopyBtn text={secret} />
          </div>
          <form onSubmit={confirmSetup} className="space-y-4">
            <input className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] outline-none transition focus:border-zinc-900" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" required maxLength={6} />
            {err && <p className="text-sm text-rose-600 text-center">{err}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 inline-flex justify-center items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Onayla ve Etkinleştir
            </button>
            <button type="button" onClick={() => setStatus("disabled")} className="w-full text-center text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors">İptal</button>
          </form>
        </div>
      )}

      {status === "enabled" && (
        <form onSubmit={disable2FA} className="space-y-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-6">
          <p className="text-center text-sm text-zinc-600">Devre dışı bırakmak için mevcut Authenticator kodunuzu girin.</p>
          <input className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] outline-none transition focus:border-zinc-900" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" required maxLength={6} />
          {err && <p className="text-sm text-rose-600 text-center">{err}</p>}
          <button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-xl border border-rose-200 bg-rose-50 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 inline-flex justify-center items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} 2FA'yı Devre Dışı Bırak
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Transactions Tab ────────────────────────────────────────────────────────
type Transaction = { id: number; type: "credit" | "spend"; amount: number; description: string; created_at: string; };

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
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
        <h3 className="font-semibold text-zinc-900 flex items-center gap-2"><History className="h-5 w-5 text-zinc-400" /> İşlem Geçmişi</h3>
        <span className="rounded-full bg-zinc-200/50 px-3 py-1 text-xs font-semibold text-zinc-700">Toplam İşlem: {total}</span>
      </div>
      
      {loading ? (
        <div className="p-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-zinc-400" /></div>
      ) : err ? (
        <div className="p-8 text-center text-sm font-medium text-rose-600">{err}</div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center text-sm text-zinc-500">Henüz işlem bulunmuyor.</div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {items.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tx.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-600"}`}>
                  {tx.type === "credit" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{tx.description}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{fmtDate(tx.created_at)}</p>
                </div>
              </div>
              <span className={`text-sm font-bold tracking-tight ${tx.type === "credit" ? "text-emerald-600" : "text-zinc-900"}`}>
                {tx.type === "credit" ? "+" : "-"}{tx.amount} HC
              </span>
            </div>
          ))}
        </div>
      )}
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/80 px-6 py-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-30 transition">Önceki</button>
          <span className="text-xs font-medium text-zinc-500">Sayfa {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-30 transition">Sonraki</button>
        </div>
      )}
    </div>
  );
}

// ─── Custom Domain Tab ───────────────────────────────────────────────────────
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
        if (existingDomain) { await apiFetch(`/domains/${encodeURIComponent(existingDomain)}`, { method: "DELETE" }); } 
        else { await apiFetch("/admin/organization/domain", { method: "PUT", body: JSON.stringify({ custom_domain: null }) }); }
        setDomain(""); setExistingDomain(null); setToken(null); setStatus(null); setCreatedAt(null); setOk(true); setTimeout(() => setOk(false), 3000);
        await refreshDomains();
        toast.success("Özel domain kaldırıldı.", "Kurumsal Alan Adı");
        return;
      }

      const resp = await apiFetch("/domains", { method: "POST", body: JSON.stringify({ domain: dom, owner: undefined }) });
      const data = await resp.json();
      setToken(data.token || null); setStatus(data.status || null); setCreatedAt(data.created_at || null); setExistingDomain(data.domain || dom);
      setOk(true); await refreshDomains(); setTimeout(() => setOk(false), 3000);
      toast.success("Özel domain kaydedildi.", "Kurumsal Alan Adı");
    } catch (e: any) { setErr(e?.message || "Kaydedilemedi."); } finally { setSaving(false); }
  }

  async function checkDNS() {
    setErr(null); setChecking(true);
    try {
      const dom = domain.trim();
      if (!dom) throw new Error("Alan adı boş.");
      const r = await apiFetch(`/domains/${encodeURIComponent(dom)}/check`);
      const j = await r.json();
      setStatus(j.status || null);
      const nextStatus = getDomainStatusMeta(j.status || null);
      toast.info(nextStatus.description, nextStatus.label);
    } catch (e: any) { setErr(e?.message || "Doğrulama başarısız."); } finally { setChecking(false); }
  }

  async function regenerate(targetDomain?: string) {
    setErr(null);
    try {
      const dom = (targetDomain || domain.trim() || existingDomain || "").trim();
      if (!dom) throw new Error("Alan adı boş.");
      const r = await apiFetch(`/domains/${encodeURIComponent(dom)}/regenerate`, { method: "POST" });
      const j = await r.json();
      if ((domain.trim() || existingDomain || "").trim() === dom) { setToken(j.token || null); setDomain(dom); setExistingDomain(dom); }
      await refreshDomains();
      toast.success("Doğrulama tokeni yenilendi.", dom);
    } catch (e: any) { setErr(e?.message || "Token yenilenemedi."); }
  }

  async function removeDomain() {
    if (!confirm("Bu alan adını silmek istediğinize emin misiniz?")) return;
    setErr(null);
    try {
      const targetDomain = (domain.trim() || existingDomain || "").trim();
      if (!targetDomain) throw new Error("Alan adı boş.");
      await apiFetch(`/domains/${encodeURIComponent(targetDomain)}`, { method: "DELETE" });
      setDomain(""); setExistingDomain(null); setToken(null); setStatus(null); setCreatedAt(null);
      await refreshDomains();
      toast.success("Alan adı silindi.", "Kurumsal Alan Adı");
    } catch (e: any) { setErr(e?.message || "Silinemedi."); }
  }

  if (loading) return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" /></div>;

  const activeDomain = (domain.trim() || existingDomain || "").trim();
  const statusMeta = getDomainStatusMeta(status);
  const dnsHost = activeDomain ? `_heptacert-verify.${activeDomain}` : "_heptacert-verify.your-domain.tld";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900"><Globe className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-semibold text-zinc-900">Özel Alan Adı</h2><p className="text-sm text-zinc-500">Sertifikaları kendi domaininizde sunun</p></div>
          </div>
          
          <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <p className="text-sm text-amber-800 font-medium leading-relaxed">
              Bu özellik Growth ve Enterprise planlarına özeldir. Doğrulama için DNS sağlayıcınıza bir <code className="font-mono bg-amber-200/50 px-1.5 py-0.5 rounded text-amber-900">TXT</code> kaydı eklemeniz gerekir (detaylar sağ tarafta).
            </p>
          </div>

          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Domain Adresi</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                  type="text"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="certs.sirketiniz.com"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">Kaldırmak için alanı boş bırakıp kaydedin.</p>
            </div>
            
            <AnimatePresence>
              {err && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-rose-600">{err}</motion.p>}
              {ok && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> İşlem başarılı.</motion.p>}
            </AnimatePresence>
            
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Kaydet
            </button>
          </form>
        </div>

        {myDomains.length > 0 && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
             <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900"><BadgeCheck className="h-5 w-5" /></div>
              <div><h2 className="text-lg font-semibold text-zinc-900">Kayıtlı Domainler</h2><p className="text-sm text-zinc-500">Önceki kayıtlarınız arasında geçiş yapın.</p></div>
            </div>
            <div className="space-y-3">
              {myDomains.map((d) => {
                const itemStatus = getDomainStatusMeta(d.status || null);
                return (
                  <div key={d.domain} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 hover:bg-zinc-50 transition">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-zinc-900">{d.domain}</p>
                        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${itemStatus.chipClass}`}>{itemStatus.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">Eklenme: {fmtDate(d.created_at || null)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" className="rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition shadow-sm inline-flex items-center gap-1.5"
                        onClick={() => {
                          setDomain(d.domain); setExistingDomain(d.domain); setToken(d.token || null); setStatus(d.status || null); setCreatedAt(d.created_at || null);
                        }}
                      >
                        <Link2 className="h-3.5 w-3.5" /> Seç
                      </button>
                      <button type="button" className="rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition shadow-sm inline-flex items-center gap-1.5"
                        onClick={() => regenerate(d.domain)}
                      >
                        <RefreshCcw className="h-3.5 w-3.5" /> Yenile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div>
         <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden sticky top-24">
           <div className="bg-zinc-50 border-b border-zinc-100 px-6 py-5">
              <h3 className="font-semibold text-zinc-900">DNS Yapılandırması</h3>
              <p className="text-xs text-zinc-500 mt-1">Domain yöneticinizden bu kaydı ekleyin.</p>
           </div>
           <div className="p-6 space-y-6">
             <div className="rounded-2xl bg-zinc-900 p-5 font-mono text-xs text-zinc-300 shadow-inner">
                <p className="text-zinc-500 mb-3"># DNS'inize aşağıdaki TXT kaydını ekleyin:</p>
                <div className="space-y-3">
                  <div>
                    <span className="text-zinc-500 block mb-1">Kayıt Türü:</span>
                    <span className="text-amber-400 font-bold">TXT</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-1">Ad / Host:</span>
                    <span className="text-white break-all">{dnsHost}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-1">Değer (Value):</span>
                    <div className="flex items-center justify-between gap-2 bg-zinc-800 rounded-lg p-2 mt-1">
                      <span className="text-emerald-400 break-all">{token || '<token_bekleniyor>'}</span>
                      <CopyBtn text={token || ''} />
                    </div>
                  </div>
                </div>
             </div>
             
             {status && (
               <div className={`rounded-xl border px-4 py-3 ${statusMeta.chipClass}`}>
                 <div className="flex items-start gap-3">
                    <div className="mt-0.5"><Globe className={`h-4 w-4 ${statusMeta.chipClass.split(' ')[2]}`} /></div>
                    <div>
                      <p className={`text-sm font-semibold ${statusMeta.chipClass.split(' ')[2]}`}>{statusMeta.label}</p>
                      <p className="text-xs mt-1 leading-relaxed opacity-90">{statusMeta.description}</p>
                    </div>
                 </div>
               </div>
             )}

             <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
                <button onClick={checkDNS} disabled={checking || !domain} className="w-full rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50">
                  {checking ? 'Kontrol ediliyor...' : 'Şimdi Doğrula'}
                </button>
                <button onClick={() => regenerate()} disabled={!domain} className="w-full rounded-xl bg-white border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50">
                  Token Yenile
                </button>
                <button onClick={removeDomain} disabled={!domain} className="w-full rounded-xl bg-white border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 mt-4">
                  Domain'i Sistemden Sil
                </button>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
}

// ─── Branding Tab ────────────────────────────────────────────────────────────
function BrandingTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  
  const [postLoading, setPostLoading] = useState(false);
  const [postSaving, setPostSaving] = useState(false);
  const [communityPosts, setCommunityPosts] = useState<Array<{ public_id: string; author_name: string; body: string; created_at: string }>>([]);
  const [postBody, setPostBody] = useState("");
  
  const [publicId, setPublicId] = useState("");
  const [brandColor, setBrandColor] = useState("#000000"); 
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [settingsState, setSettingsState] = useState<Record<string, any>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch("/admin/organization/settings")
      .then((r) => r.json())
      .then((d) => {
        setPublicId(d.public_id || "");
        setBrandLogo(d.brand_logo || null);
        setBrandColor(d.brand_color || "#000000");
        setOrgName(d.org_name || "");
        setSettingsState(d.settings || {});
      })
      .catch((e) => setErr(e?.message || "Yüklenemedi"))
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
      const fd = new FormData(); fd.append("file", file);
      const r = await apiFetch("/admin/organization/logo", { method: "POST", body: fd });
      const j = await r.json();
      setBrandLogo(j.brand_logo || null);
      toast.success("Logo güncellendi.", "Marka");
    } catch (e: any) { setErr(e?.message || "Yükleme başarısız"); } finally { setLogoUploading(false); }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSaving(true);
    try {
      const payload = {
        org_name: orgName, brand_color: brandColor,
        verification_path: settingsState.verification_path || "",
        certificate_footer: settingsState.certificate_footer || "",
        hide_heptacert_home: !!settingsState.hide_heptacert_home,
        public_bio: settingsState.public_bio || "",
        public_website_url: normalizeExternalUrl(settingsState.public_website_url) || "",
        public_linkedin_url: normalizeExternalUrl(settingsState.public_linkedin_url) || "",
        public_github_url: normalizeExternalUrl(settingsState.public_github_url) || "",
        public_x_url: normalizeExternalUrl(settingsState.public_x_url) || "",
        public_instagram_url: normalizeExternalUrl(settingsState.public_instagram_url) || "",
      };
      const resp = await apiFetch("/admin/organization/settings", { method: "PATCH", body: JSON.stringify(payload) });
      const data = await resp.json();
      setSettingsState(data.settings || {}); setPublicId(data.public_id || ""); setBrandColor(data.brand_color || "#000000"); setOrgName(data.org_name || "");
      toast.success("Ayarlar kaydedildi.", "Marka Kimliği");
    } catch (e: any) { setErr(e?.message || "Kaydedilemedi."); } finally { setSaving(false); }
  }

  async function createCommunityPost() {
    if (!postBody.trim()) return;
    setPostSaving(true); setErr(null);
    try {
      const resp = await apiFetch("/admin/community/posts", { method: "POST", body: JSON.stringify({ body: postBody.trim() }) });
      const data = await resp.json();
      setCommunityPosts((current) => [data, ...current]);
      setPostBody("");
      toast.success("Duyuru paylaşıldı.", "Topluluk");
    } catch (e: any) { setErr(e?.message || "Gönderi yayınlanamadı."); } finally { setPostSaving(false); }
  }

  async function removeCommunityPost(postPublicId: string) {
    setErr(null);
    try {
      await apiFetch(`/admin/community/posts/${postPublicId}`, { method: "DELETE" });
      setCommunityPosts((current) => current.filter((item) => item.public_id !== postPublicId));
      toast.success("Duyuru silindi.", "Topluluk");
    } catch (e: any) { setErr(e?.message || "Gönderi silinemedi."); }
  }

  if (loading) return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" /></div>;

  const previewName = orgName.trim() || "Heptapus Group";
  const previewLogoLetter = previewName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col xl:flex-row items-start gap-8">
      {/* SOL: Form Alanı */}
      <div className="w-full flex-1 space-y-6">
        {err && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{err}</div>}

        <form onSubmit={saveSettings} className="space-y-6">
          
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-lg font-semibold text-zinc-900 mb-6">Temel Kimlik</h3>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="shrink-0">
                <label className="mb-2 block text-sm font-medium text-zinc-700">Logo</label>
                <div 
                  className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed border-zinc-300 bg-zinc-50 transition hover:border-zinc-400 hover:bg-zinc-100"
                  style={{ clipPath: "polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)" }}
                >
                  {brandLogo ? (
                    <img src={brandLogo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <UploadCloud className="h-6 w-6 text-zinc-400" />
                  )}
                  <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={e => uploadLogo(e.target.files ? e.target.files[0] : null)} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Değiştir</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Kurum Adı</label>
                  <input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Örn: Heptapus Group" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Vurgu Rengi</label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-zinc-200 shadow-sm">
                      <input type="color" className="absolute -inset-2 h-14 w-14 cursor-pointer" value={brandColor} onChange={e => setBrandColor(e.target.value)} />
                    </div>
                    <input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-mono outline-none transition focus:border-zinc-900 focus:bg-white uppercase" value={brandColor} onChange={e => setBrandColor(e.target.value)} maxLength={7} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-lg font-semibold text-zinc-900 mb-6">Sosyal & İletişim</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Kısa Biyografi</label>
                <textarea className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white min-h-[100px] resize-y" value={settingsState.public_bio || ""} onChange={e => setSettingsState(s => ({ ...s, public_bio: e.target.value }))} placeholder="Kurumunuzu kısaca tanıtın..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Website</label><input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-zinc-900 focus:bg-white" value={settingsState.public_website_url || ""} onChange={e => setSettingsState(s => ({ ...s, public_website_url: e.target.value }))} placeholder="https://" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">LinkedIn</label><input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-zinc-900 focus:bg-white" value={settingsState.public_linkedin_url || ""} onChange={e => setSettingsState(s => ({ ...s, public_linkedin_url: e.target.value }))} placeholder="linkedin.com/company/..." /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">X (Twitter)</label><input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-zinc-900 focus:bg-white" value={settingsState.public_x_url || ""} onChange={e => setSettingsState(s => ({ ...s, public_x_url: e.target.value }))} placeholder="x.com/..." /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Instagram</label><input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-zinc-900 focus:bg-white" value={settingsState.public_instagram_url || ""} onChange={e => setSettingsState(s => ({ ...s, public_instagram_url: e.target.value }))} placeholder="instagram.com/..." /></div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-lg font-semibold text-zinc-900 mb-6">Sertifika & Doğrulama Sayfası</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Alt Bilgi (Footer)</label>
                <input className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white" value={settingsState.certificate_footer || ""} onChange={e => setSettingsState(s => ({ ...s, certificate_footer: e.target.value }))} placeholder="© 2026 Kurum Adı. Tüm hakları saklıdır." />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">HeptaCert Markasını Gizle</p>
                  <p className="text-xs text-zinc-500">Doğrulama sayfasında tamamen sizin markanız öne çıkar.</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" checked={!!settingsState.hide_heptacert_home} onChange={e => setSettingsState(s => ({ ...s, hide_heptacert_home: e.target.checked }))} />
                  <div className="h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-zinc-900 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-zinc-900 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 hover:shadow-md disabled:opacity-50">
              {saving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
            </button>
          </div>
        </form>

        {/* Topluluk Gönderileri Akışı */}
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-zinc-50/50 p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-900 border border-zinc-200 shadow-sm"><Sparkles className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-semibold text-zinc-900">Topluluk Akışı</h2><p className="text-sm text-zinc-500">Kurumunuz adına resmi güncellemeler paylaşın.</p></div>
          </div>

          <div className="space-y-4">
            <textarea
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900 shadow-sm min-h-[100px] resize-y"
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              maxLength={1500}
              placeholder="Yeni bir duyuru yazın..."
            />
            <div className="flex justify-end">
              <button type="button" onClick={() => void createCommunityPost()} disabled={postSaving || !postBody.trim()} className="rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 shadow-sm">
                {postSaving ? "Paylaşılıyor..." : "Duyuru Paylaş"}
              </button>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Önceki Paylaşımlar</h3>
            {postLoading ? (
              <div className="flex items-center text-sm text-zinc-500 py-4"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</div>
            ) : communityPosts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-sm text-zinc-500 text-center">
                Henüz paylaşılmış bir kurum gönderisi yok.
              </div>
            ) : (
              <div className="space-y-4">
                {communityPosts.map((post) => (
                  <div key={post.public_id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{post.author_name}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">{fmtDate(post.created_at)}</p>
                      </div>
                      <button type="button" onClick={() => void removeCommunityPost(post.public_id)} className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100" title="Sil">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 break-words">{post.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SAĞ: Apple-Style Tarayıcı Önizlemesi (Sticky) */}
      <div className="w-full shrink-0 xl:w-[380px] xl:sticky xl:top-24">
        <div className="mb-3 flex items-center gap-2 px-1">
          <MonitorSmartphone className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Canlı Önizleme</span>
        </div>
        
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-1.5 border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-300"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-300"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-300"></div>
            <div className="ml-4 flex-1 rounded-md bg-white px-3 py-1 text-center text-[10px] font-medium text-zinc-400 shadow-sm">
              certs.{orgName.toLowerCase().replace(/\s+/g, '') || 'sirket'}.com
            </div>
          </div>

          <div className="relative p-6 text-center">
            <div className="absolute inset-x-0 top-0 h-32 opacity-10" style={{ background: `linear-gradient(to bottom, ${brandColor}, transparent)` }}></div>
            
            <div 
              className="relative mx-auto flex h-20 w-20 items-center justify-center overflow-hidden border border-zinc-100 bg-white shadow-md"
              style={{ clipPath: "polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)" }}
            >
              {brandLogo ? (
                <img src={brandLogo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-zinc-300">{previewLogoLetter}</span>
              )}
            </div>

            <h4 className="mt-4 text-lg font-bold text-zinc-900">{previewName}</h4>
            
            <div className="mt-2 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-100 bg-white px-3 py-1 text-xs font-medium shadow-sm" style={{ color: brandColor }}>
                <BadgeCheck className="h-4 w-4" /> Resmi Doğrulama
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="h-12 w-full rounded-xl bg-zinc-50 border border-zinc-100"></div>
              <div className="h-24 w-full rounded-xl bg-zinc-50 border border-zinc-100"></div>
              <button className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90" style={{ backgroundColor: brandColor }}>
                Sertifikayı Doğrula
              </button>
            </div>

            <p className="mt-6 text-[10px] text-zinc-400">
              {settingsState.certificate_footer || `© ${new Date().getFullYear()} Kurum Adı. Tüm hakları saklıdır.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; role?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    apiFetch("/me", { method: "GET" }).then(r => r.json()).then(d => setMe(d)).catch(() => router.push("/admin/login"));
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncTabFromLocation = () => {
      const tabFromQuery = new URLSearchParams(window.location.search).get("tab")?.trim() || "";
      const isValidTab = TABS.some((tab) => tab.id === tabFromQuery);
      if (!isValidTab) return;
      setActiveTab((prev) => (prev === tabFromQuery ? prev : tabFromQuery));
    };
    syncTabFromLocation();
    window.addEventListener("popstate", syncTabFromLocation);
    return () => window.removeEventListener("popstate", syncTabFromLocation);
  }, []);

  function handleTabChange(nextTab: string) {
    setActiveTab(nextTab);
    router.replace(`/admin/settings?tab=${nextTab}`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-24 px-4 sm:px-6 lg:px-8 mt-8">
      {/* Orijinal PageHeader componenti duruyor, dilersen kullanabilirsin diye ama yeni hali çok daha Apple-vari oldu. */}
      {/* <PageHeader title="Ayarlar" subtitle="..." icon={<Settings />} /> */}
      
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Ayarlar</h1>
        <p className="text-base text-zinc-500">Hesap, güvenlik, faturalandırma ve kurumsal kimlik yönetimi.</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl bg-zinc-50 p-2 border border-zinc-100">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/50"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === "account" && <AccountTab me={me} />}
            {activeTab === "2fa" && <TwoFATab />}
            {activeTab === "transactions" && <TransactionsTab />}
            {activeTab === "domain" && <CustomDomainTab />}
            {activeTab === "branding" && <BrandingTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}