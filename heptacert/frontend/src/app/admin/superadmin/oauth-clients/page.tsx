"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

type OAuthClient = {
  client_id:      string;
  name:           string;
  redirect_uris:  string[];
  allowed_scopes: string[];
  logo_url:       string | null;
  is_active:      boolean;
  created_at:     string;
};

type NewSecret = { client_id: string; client_secret: string; name: string };

// ── Scope options ───────────────────────────────────────────────────────────────

const ALL_SCOPES = [
  "events:read", "events:write",
  "attendees:read", "attendees:write",
  "certificates:read", "certificates:write",
  "analytics:read",
  "crm:read", "crm:write",
  "forms:read", "forms:write",
  "reports:read",
];

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 rounded p-1 text-slate-400 hover:text-slate-700"
      title="Kopyala"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── Create form ────────────────────────────────────────────────────────────────

function CreateClientForm({ onCreated }: { onCreated: (s: NewSecret) => void }) {
  const [name, setName]         = useState("");
  const [uris, setUris]         = useState("");
  const [scopes, setScopes]     = useState<string[]>(ALL_SCOPES.filter((s) => !s.includes("crm") && !s.includes("forms")));
  const [logo, setLogo]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  function toggleScope(s: string) {
    setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const redirectUris = uris.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!redirectUris.length) { setError("En az bir redirect URI gerekli"); return; }
    if (!scopes.length) { setError("En az bir kapsam seçilmeli"); return; }
    setLoading(true);
    try {
      const res = await apiFetch<Response>("/admin/superadmin/oauth-clients", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), redirect_uris: redirectUris, allowed_scopes: scopes, logo_url: logo || null }),
      });
      const data = await res.json();
      onCreated(data as NewSecret);
      setName(""); setUris(""); setLogo("");
      setScopes(ALL_SCOPES.filter((s) => !s.includes("crm") && !s.includes("forms")));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Oluşturulamadı");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-900">Yeni OAuth İstemcisi</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">İsim</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ChatGPT HeptaCert GPT"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Logo URL (opsiyonel)</label>
          <input
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Redirect URI&apos;ları <span className="font-normal text-slate-400">(her satıra bir tane)</span>
        </label>
        <textarea
          required
          rows={3}
          value={uris}
          onChange={(e) => setUris(e.target.value)}
          placeholder="https://chat.openai.com/aip/g-xxx/oauth/callback"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-slate-400"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-slate-700">İzin Verilecek Kapsamlar</label>
        <div className="flex flex-wrap gap-2">
          {ALL_SCOPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleScope(s)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                scopes.includes(s)
                  ? "border-slate-700 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        {loading ? "Oluşturuluyor…" : "İstemci Oluştur"}
      </button>
    </form>
  );
}

// ── Secret reveal box (shown once after creation) ──────────────────────────────

function SecretReveal({ data, onDismiss }: { data: NewSecret; onDismiss: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Client Secret — yalnızca şimdi görünür</p>
          <p className="text-xs text-amber-700">Bu değeri hemen kopyalayın ve güvenli bir yerde saklayın. Tekrar gösterilmeyecek.</p>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-amber-200 bg-white p-3 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">client_id</span>
          <span className="flex items-center text-slate-900">
            {data.client_id}
            <CopyButton value={data.client_id} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">client_secret</span>
          <span className="flex items-center break-all text-slate-900">
            {data.client_secret}
            <CopyButton value={data.client_secret} />
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 text-xs text-amber-700 underline hover:text-amber-900"
      >
        Kopyaladım, kapat
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OAuthClientsPage() {
  const [clients, setClients]       = useState<OAuthClient[]>([]);
  const [loading, setLoading]       = useState(true);
  const [newSecret, setNewSecret]   = useState<NewSecret | null>(null);
  const [revoking, setRevoking]     = useState<string | null>(null);

  async function loadClients() {
    try {
      const res  = await apiFetch<Response>("/admin/superadmin/oauth-clients");
      const data = await res.json();
      setClients(data as OAuthClient[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadClients(); }, []);

  async function toggleActive(client: OAuthClient) {
    try {
      await apiFetch(`/admin/superadmin/oauth-clients/${client.client_id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !client.is_active }),
      });
      await loadClients();
    } catch { /* ignore */ }
  }

  async function revokeTokens(clientId: string) {
    setRevoking(clientId);
    try {
      await apiFetch(`/admin/superadmin/oauth-clients/${clientId}/tokens`, { method: "DELETE" });
      alert("Tüm tokenlar iptal edildi.");
    } catch { /* ignore */ } finally {
      setRevoking(null);
    }
  }

  function handleCreated(secret: NewSecret) {
    setNewSecret(secret);
    void loadClients();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">OAuth İstemcileri</h1>
        <p className="mt-1 text-sm text-slate-500">
          ChatGPT GPT gibi üçüncü parti uygulamaların HeptaCert kullanıcıları adına hareket etmesine izin verin.
        </p>
      </div>

      {newSecret && (
        <div className="mb-6">
          <SecretReveal data={newSecret} onDismiss={() => setNewSecret(null)} />
        </div>
      )}

      <CreateClientForm onCreated={handleCreated} />

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Kayıtlı İstemciler</h2>

        {loading ? (
          <p className="text-sm text-slate-400">Yükleniyor…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-slate-400">Henüz kayıtlı istemci yok.</p>
        ) : (
          <div className="space-y-3">
            {clients.map((c) => (
              <div
                key={c.client_id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-10 font-medium ${
                        c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {c.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-400">{c.client_id}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.allowed_scopes.map((s) => (
                        <span key={s} className="rounded-full border border-slate-200 px-2 py-0.5 text-10 text-slate-500">
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 space-y-0.5">
                      {c.redirect_uris.map((u) => (
                        <p key={u} className="truncate font-mono text-10 text-slate-400">{u}</p>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      title={c.is_active ? "Pasif yap" : "Aktif yap"}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    >
                      {c.is_active
                        ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                        : <ToggleLeft className="h-5 w-5" />
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeTokens(c.client_id)}
                      disabled={revoking === c.client_id}
                      title="Tüm tokenları iptal et"
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
