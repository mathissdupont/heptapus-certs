"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Shield, X, Eye, EyeOff, ArrowRight } from "lucide-react";
import { getApiBase, getToken, setToken } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type ClientInfo = {
  client_name:      string;
  logo_url:         string | null;
  requested_scopes: string[];
  granted_scopes:   string[];
};

type Phase = "loading" | "error" | "login" | "consent" | "redirecting";

// ── Scope labels ───────────────────────────────────────────────────────────────

const SCOPE_LABELS: Record<string, { label: string; desc: string }> = {
 "events:read":        { label: "Etkinlikleri oku",            desc: "Etkinlik listesi ve detaylarını görüntüle" },
 "events:write":       { label: "Etkinlik yönet",              desc: "Etkinlik oluştur, güncelle ve sil" },
 "attendees:read":     { label: "Katılımcıları oku",           desc: "Katılımcı listesi ve yoklama durumunu görüntüle" },
 "attendees:write":    { label: "Katılımcı yönet",             desc: "Katılımcı ekle, güncelle ve kaldır" },
 "certificates:read":  { label: "Sertifikaları oku",           desc: "Sertifika listesi ve durumunu görüntüle" },
 "certificates:write": { label: "Sertifika yönet",             desc: "Sertifika oluştur ve iptal et" },
 "analytics:read":     { label: "Analitikleri oku",            desc: "Etkinlik istatistikleri ve raporları görüntüle" },
 "sessions:read":      { label: "Oturumları oku",              desc: "Etkinlik oturumlarını / ajandayı görüntüle" },
 "sessions:write":     { label: "Oturum yönet",                desc: "Oturum oluştur, güncelle ve sil" },
 "checkin:write":      { label: "Check-in yap",                desc: "Katılımcıların yoklamasını (check-in) işle" },
 "automations:read":   { label: "Otomasyonları oku",           desc: "Otomasyon kurallarını görüntüle" },
 "automations:write":  { label: "Otomasyon yönet",             desc: "Otomasyon kuralı oluştur ve düzenle" },
 "crm:read":           { label: "CRM verilerini oku",          desc: "Kişi ve şirket bilgilerini görüntüle" },
 "crm:write":          { label: "CRM verilerini yönet",        desc: "Kişi ve şirket bilgilerini düzenle" },
 "forms:read":         { label: "Formları oku",                desc: "Lead formlarını görüntüle" },
 "forms:write":        { label: "Form yönet",                  desc: "Lead formları oluştur ve düzenle" },
 "reports:read":       { label: "Raporları oku",               desc: "Zamanlanmış raporları görüntüle" },
};

// ── Login form ─────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${getApiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.detail || "Giriş başarısız");
      }
      const { access_token } = await res.json();
      setToken(access_token);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-content-secondary">
          E-posta
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@sirket.com"
          className="w-full rounded-lg border border-outline-subtle bg-raised px-3 py-2.5 text-sm text-content-primary placeholder-content-faint outline-none focus:border-outline-strong focus:ring-2 focus:ring-outline-subtle"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-content-secondary">
          Şifre
        </label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-outline-subtle bg-raised px-3 py-2.5 pr-10 text-sm text-content-primary placeholder-content-faint outline-none focus:border-outline-strong focus:ring-2 focus:ring-outline-subtle"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-xs text-status-danger-content">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-inverse-surface px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-inverse-surface disabled:opacity-60"
      >
        {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}

// ── Main consent client ────────────────────────────────────────────────────────

export default function OAuthConsentClient() {
  const params = useSearchParams();

  const clientId    = params.get("client_id")    ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const scope       = params.get("scope")        ?? "";
  const resource    = params.get("resource")     ?? "";
  const state       = params.get("state")        ?? "";
  const challenge   = params.get("code_challenge") ?? undefined;
  const method      = params.get("code_challenge_method") ?? undefined;

  const [phase, setPhase]     = useState<Phase>("loading");
  const [client, setClient]   = useState<ClientInfo | null>(null);
  const [errorMsg, setError]  = useState("");
  const [approving, setApproving] = useState(false);

  // ── Step 1: validate client + check if user is already logged in ────────────
  useEffect(() => {
    if (!clientId || !redirectUri) {
      setError("Geçersiz yetkilendirme isteği: client_id veya redirect_uri eksik.");
      setPhase("error");
      return;
    }

    const apiBase = getApiBase();
    const qs = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope });
    if (resource) qs.set("resource", resource);

    fetch(`${apiBase}/oauth/validate?${qs.toString()}`)
      .then((r) => {
        if (!r.ok) return r.json().then((j) => Promise.reject(j?.detail || "Geçersiz istemci"));
        return r.json() as Promise<ClientInfo>;
      })
      .then((info) => {
        setClient(info);
        const token = getToken();
        setPhase(token ? "consent" : "login");
      })
      .catch((msg: unknown) => {
        setError(typeof msg === "string" ? msg : "İstemci doğrulanamadı");
        setPhase("error");
      });
  }, [clientId, redirectUri, scope, resource]);

  // ── Step 2a: user logged in → show consent ──────────────────────────────────
  async function handleApprove() {
    const token = getToken();
    if (!token || !client) return;
    setApproving(true);
    try {
      const res = await fetch(`${getApiBase()}/oauth/authorize`, {
        method: "POST",
        headers: {
 "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_id:             clientId,
          redirect_uri:          redirectUri,
          scope:                 client.granted_scopes.join(" "),
          resource:              resource || null,
          state,
          code_challenge:        challenge ?? null,
          code_challenge_method: method ?? null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.detail || "Yetkilendirme kodu oluşturulamadı");
      }
      const { redirect_url } = await res.json();
      setPhase("redirecting");
      window.location.href = redirect_url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
      setPhase("error");
    } finally {
      setApproving(false);
    }
  }

  // ── Step 2b: user denied ────────────────────────────────────────────────────
  function handleDeny() {
    const qs = new URLSearchParams({ error: "access_denied" });
    if (state) qs.set("state", state);
    window.location.href = `${redirectUri}?${qs.toString()}`;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        {/* HeptaCert brand */}
        <div className="mb-8 flex justify-center">
          <Image src="/logo.svg" alt="HeptaCert" width={120} height={32} className="h-7 w-auto" />
        </div>

        {/* Loading */}
        {phase === "loading" && (
          <div className="rounded-2xl border border-outline-subtle bg-raised p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-outline-subtle border-t-slate-700" />
            <p className="mt-4 text-sm text-content-muted">Doğrulanıyor…</p>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="rounded-2xl border border-status-danger-border bg-raised p-8 shadow-sm">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-danger-bg">
                <X className="h-6 w-6 text-status-danger-content" />
              </div>
            </div>
            <h1 className="text-center text-base font-semibold text-content-primary">Hata</h1>
            <p className="mt-2 text-center text-sm text-content-muted">{errorMsg}</p>
          </div>
        )}

        {/* Redirecting */}
        {phase === "redirecting" && (
          <div className="rounded-2xl border border-outline-subtle bg-raised p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-outline-subtle border-t-slate-700" />
            <p className="mt-4 text-sm text-content-muted">Yönlendiriliyor…</p>
          </div>
        )}

        {/* Login */}
        {phase === "login" && client && (
          <div className="rounded-2xl border border-outline-subtle bg-raised p-8 shadow-sm">
            <div className="mb-6 text-center">
              <div className="mb-3 flex items-center justify-center gap-3">
                {client.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={client.logo_url} alt={client.client_name} className="h-8 w-auto object-contain" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-inverse-surface text-xs font-bold text-white">
                    {client.client_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-content-muted">
                  {client.client_name}
                </span>
              </div>
              <h1 className="text-base font-semibold text-content-primary">
                HeptaCert hesabınla giriş yap
              </h1>
              <p className="mt-1.5 text-xs text-content-muted">
                Giriş yaptıktan sonra{" "}
                <span className="font-medium text-content-secondary">{client.client_name}</span>{" "}
                uygulamasına erişim izni vermeniz istenecek.
              </p>
            </div>

            <LoginForm onSuccess={() => setPhase("consent")} />
          </div>
        )}

        {/* Consent */}
        {phase === "consent" && client && (
          <div className="rounded-2xl border border-outline-subtle bg-raised shadow-sm">
            {/* Header */}
            <div className="border-b border-outline-subtle p-6 text-center">
              <div className="mb-4 flex items-center justify-center gap-2">
                {client.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={client.logo_url} alt={client.client_name} className="h-8 w-auto object-contain" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-inverse-surface text-sm font-bold text-white">
                    {client.client_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-content-muted">→</div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline-subtle bg-canvas">
                  <Shield className="h-4 w-4 text-content-secondary" />
                </div>
              </div>
              <h1 className="text-base font-semibold text-content-primary">
                <span className="text-content-muted">{client.client_name}</span> erişim istiyor
              </h1>
              <p className="mt-1.5 text-xs text-content-muted">
                HeptaCert hesabınıza aşağıdaki izinlerle erişim talep ediyor.
              </p>
            </div>

            {/* Scopes */}
            <div className="p-6">
              {client.granted_scopes.length === 0 ? (
                <p className="text-center text-sm text-content-muted">İzin istenmedi.</p>
              ) : (
                <ul className="space-y-2.5">
                  {client.granted_scopes.map((s) => {
                    const info = SCOPE_LABELS[s] ?? { label: s, desc: "" };
                    return (
                      <li key={s} className="flex items-start gap-3 rounded-lg border border-outline-subtle bg-canvas px-3 py-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success-content" />
                        <div>
                          <p className="text-xs font-medium text-content-primary">{info.label}</p>
                          {info.desc && (
                            <p className="mt-0.5 text-11 text-content-muted">{info.desc}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* KVKK Aydınlatma */}
              <div className="mt-4 rounded-lg border border-outline-subtle bg-canvas px-3 py-3 text-11 text-content-muted">
                <p className="font-semibold text-content-secondary">KVKK Aydınlatma Metni</p>
                <p className="mt-1 leading-relaxed">
                  6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında bilginize sunarız:{" "}
                  <span className="font-medium text-content-secondary">{client.client_name}</span> uygulamasına yalnızca{" "}
                  <span className="font-medium text-content-secondary">e-posta adresiniz</span> aktarılacaktır.
                  Telefon, adres veya ödeme bilgisi gibi diğer kişisel verileriniz paylaşılmaz.
                  Bu erişim iznini istediğiniz zaman{" "}
                  <a href="/admin/integrations" className="font-medium text-content-secondary underline" target="_blank">
                    Entegrasyonlar
                  </a>{" "}
                  sayfasından kaldırabilirsiniz.
                </p>
              </div>

              <p className="mt-3 text-center text-11 text-content-muted">
                İzin verdiğinizde bu oturum{" "}
                <span className="font-medium">30 gün</span> geçerli olur.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-outline-subtle p-4">
              <button
                type="button"
                onClick={handleDeny}
                disabled={approving}
                className="flex-1 rounded-xl border border-outline-subtle bg-raised px-4 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:bg-canvas disabled:opacity-60"
              >
                Reddet
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 rounded-xl bg-inverse-surface px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-inverse-surface disabled:opacity-60"
              >
                {approving ? "İşleniyor…" : "İzin Ver"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-11 text-content-muted">
          Bu işlem HeptaCert tarafından güvenli biçimde yönetilmektedir.
        </p>
      </div>
    </div>
  );
}
