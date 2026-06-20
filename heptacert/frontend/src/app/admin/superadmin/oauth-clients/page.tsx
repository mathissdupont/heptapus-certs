"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight, Pencil, X, Check, LogOut } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type OAuthClient = {
  client_id: string;
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
};

type NewSecret = { client_id: string; client_secret: string; name: string };

const ALL_SCOPES = [
  "events:read",
  "events:write",
  "attendees:read",
  "attendees:write",
  "certificates:read",
  "certificates:write",
  "analytics:read",
  "crm:read",
  "crm:write",
  "forms:read",
  "forms:write",
  "reports:read",
];

function getCopy(isTr: boolean) {
  return isTr
    ? {
        copy: "Kopyala",
        newClient: "Yeni OAuth istemcisi",
        name: "İsim",
        logo: "Logo URL (opsiyonel)",
        redirectUris: "Redirect URI'ları",
        onePerLine: "her satıra bir tane",
        scopes: "İzin verilecek kapsamlar",
        create: "İstemci oluştur",
        creating: "Oluşturuluyor...",
        redirectRequired: "En az bir redirect URI gerekli",
        scopesRequired: "En az bir kapsam seçilmeli",
        createFailed: "Oluşturulamadı",
        secretTitle: "Client Secret yalnızca şimdi görünür",
        secretBody: "Bu değeri hemen kopyalayın ve güvenli bir yerde saklayın. Tekrar gösterilmeyecek.",
        copiedClose: "Kopyaladım, kapat",
        uriRequired: "En az bir URI gerekli",
        saveFailed: "Kaydedilemedi",
        uriPlaceholder: "Her satıra bir URI",
        saving: "Kaydediliyor...",
        save: "Kaydet",
        cancel: "İptal",
        title: "OAuth istemcileri",
        subtitle: "ChatGPT GPT gibi üçüncü parti uygulamaların HeptaCert kullanıcıları adına hareket etmesine izin verin.",
        tokensRevoked: "Tüm tokenlar iptal edildi.",
        disconnected: "Kendi bağlantın kesildi. Artık farklı bir hesapla giriş yapabilirsin.",
        registeredClients: "Kayıtlı istemciler",
        loading: "Yükleniyor...",
        empty: "Henüz kayıtlı istemci yok.",
        active: "Aktif",
        passive: "Pasif",
        editRedirect: "Redirect URI düzenle",
        disconnect: "Kendi bağlantımı kes (farklı hesapla test için)",
        deactivate: "Pasif yap",
        activate: "Aktif yap",
        revokeTokens: "Tüm tokenları iptal et (herkesi çıkar)",
      }
    : {
        copy: "Copy",
        newClient: "New OAuth client",
        name: "Name",
        logo: "Logo URL (optional)",
        redirectUris: "Redirect URIs",
        onePerLine: "one per line",
        scopes: "Allowed scopes",
        create: "Create client",
        creating: "Creating...",
        redirectRequired: "At least one redirect URI is required",
        scopesRequired: "Select at least one scope",
        createFailed: "Could not create",
        secretTitle: "Client Secret is visible only now",
        secretBody: "Copy this value now and store it securely. It will not be shown again.",
        copiedClose: "Copied, close",
        uriRequired: "At least one URI is required",
        saveFailed: "Could not save",
        uriPlaceholder: "One URI per line",
        saving: "Saving...",
        save: "Save",
        cancel: "Cancel",
        title: "OAuth clients",
        subtitle: "Allow third-party apps such as ChatGPT GPTs to act on behalf of HeptaCert users.",
        tokensRevoked: "All tokens have been revoked.",
        disconnected: "Your connection was disconnected. You can now sign in with another account.",
        registeredClients: "Registered clients",
        loading: "Loading...",
        empty: "No registered clients yet.",
        active: "Active",
        passive: "Inactive",
        editRedirect: "Edit redirect URIs",
        disconnect: "Disconnect my account for testing with another account",
        deactivate: "Deactivate",
        activate: "Activate",
        revokeTokens: "Revoke all tokens and sign everyone out",
      };
}

type CopyText = ReturnType<typeof getCopy>;

function CopyButton({ value, copy }: { value: string; copy: CopyText }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button type="button" onClick={handleCopy} className="ml-2 rounded p-1 text-surface-400 hover:text-surface-700" title={copy.copy}>
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CreateClientForm({ onCreated, copy }: { onCreated: (s: NewSecret) => void; copy: CopyText }) {
  const [name, setName] = useState("");
  const [uris, setUris] = useState("");
  const [scopes, setScopes] = useState<string[]>(ALL_SCOPES.filter((s) => !s.includes("crm") && !s.includes("forms")));
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleScope(scope: string) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((x) => x !== scope) : [...prev, scope]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const redirectUris = uris.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!redirectUris.length) {
      setError(copy.redirectRequired);
      return;
    }
    if (!scopes.length) {
      setError(copy.scopesRequired);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<Response>("/admin/superadmin/oauth-clients", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), redirect_uris: redirectUris, allowed_scopes: scopes, logo_url: logo || null }),
      });
      const data = await res.json();
      onCreated(data as NewSecret);
      setName("");
      setUris("");
      setLogo("");
      setScopes(ALL_SCOPES.filter((s) => !s.includes("crm") && !s.includes("forms")));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : copy.createFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <h2 className="card-title">{copy.newClient}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">{copy.name}</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="ChatGPT HeptaCert GPT" className="input" />
        </label>
        <label className="block">
          <span className="label">{copy.logo}</span>
          <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." className="input" />
        </label>
      </div>

      <label className="block">
        <span className="label">
          {copy.redirectUris} <span className="font-normal text-surface-400">({copy.onePerLine})</span>
        </span>
        <textarea required rows={3} value={uris} onChange={(e) => setUris(e.target.value)} placeholder="https://chat.openai.com/aip/g-xxx/oauth/callback" className="input font-mono" />
      </label>

      <div>
        <p className="label">{copy.scopes}</p>
        <div className="flex flex-wrap gap-2">
          {ALL_SCOPES.map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => toggleScope(scope)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                scopes.includes(scope) ? "border-brand-800 bg-brand-900 text-white" : "border-surface-200 bg-white text-surface-500 hover:border-surface-300"
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="error-banner">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        <Plus className="h-4 w-4" />
        {loading ? copy.creating : copy.create}
      </button>
    </form>
  );
}

function SecretReveal({ data, onDismiss, copy }: { data: NewSecret; onDismiss: () => void; copy: CopyText }) {
  return (
    <div className="warning-banner block">
      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{copy.secretTitle}</p>
          <p className="text-xs">{copy.secretBody}</p>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-amber-200 bg-white p-3 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-surface-500">client_id</span>
          <span className="flex items-center text-surface-900">
            {data.client_id}
            <CopyButton value={data.client_id} copy={copy} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-surface-500">client_secret</span>
          <span className="flex items-center break-all text-surface-900">
            {data.client_secret}
            <CopyButton value={data.client_secret} copy={copy} />
          </span>
        </div>
      </div>

      <button type="button" onClick={onDismiss} className="mt-3 text-xs font-semibold underline">
        {copy.copiedClose}
      </button>
    </div>
  );
}

function EditUris({
  clientId,
  current,
  onSaved,
  onCancel,
  copy,
}: {
  clientId: string;
  current: string[];
  onSaved: () => void;
  onCancel: () => void;
  copy: CopyText;
}) {
  const [value, setValue] = useState(current.join("\n"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const uris = value.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!uris.length) {
      setError(copy.uriRequired);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/admin/superadmin/oauth-clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({ redirect_uris: uris }),
      });
      onSaved();
    } catch {
      setError(copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea rows={4} value={value} onChange={(e) => setValue(e.target.value)} className="input font-mono text-xs" placeholder={copy.uriPlaceholder} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary min-h-0 px-3 py-1.5 text-xs">
          <Check className="h-3.5 w-3.5" />
          {saving ? copy.saving : copy.save}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary min-h-0 px-3 py-1.5 text-xs">
          <X className="h-3.5 w-3.5" />
          {copy.cancel}
        </button>
      </div>
    </div>
  );
}

export default function OAuthClientsPage() {
  const { lang } = useI18n();
  const copy = getCopy(lang === "tr");
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSecret, setNewSecret] = useState<NewSecret | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [editingUris, setEditingUris] = useState<string | null>(null);

  async function loadClients() {
    try {
      const res = await apiFetch<Response>("/admin/superadmin/oauth-clients");
      const data = await res.json();
      setClients(data as OAuthClient[]);
    } catch {
      // Keep page usable even if the list request fails.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  async function toggleActive(client: OAuthClient) {
    try {
      await apiFetch(`/admin/superadmin/oauth-clients/${client.client_id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !client.is_active }),
      });
      await loadClients();
    } catch {
      // ignore
    }
  }

  async function revokeTokens(clientId: string) {
    setRevoking(clientId);
    try {
      await apiFetch(`/admin/superadmin/oauth-clients/${clientId}/tokens`, { method: "DELETE" });
      alert(copy.tokensRevoked);
    } catch {
      // ignore
    } finally {
      setRevoking(null);
    }
  }

  async function disconnectMyAccount(clientId: string) {
    setDisconnecting(clientId);
    try {
      await apiFetch(`/oauth/disconnect/${clientId}`, { method: "DELETE" });
      alert(copy.disconnected);
    } catch {
      // ignore
    } finally {
      setDisconnecting(null);
    }
  }

  function handleCreated(secret: NewSecret) {
    setNewSecret(secret);
    void loadClients();
  }

  return (
    <div className="page-content mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="page-title">{copy.title}</h1>
        <p className="page-subtitle">{copy.subtitle}</p>
      </div>

      {newSecret && <SecretReveal data={newSecret} onDismiss={() => setNewSecret(null)} copy={copy} />}

      <CreateClientForm onCreated={handleCreated} copy={copy} />

      <section className="section">
        <h2 className="card-title">{copy.registeredClients}</h2>

        {loading ? (
          <p className="body-sm">{copy.loading}</p>
        ) : clients.length === 0 ? (
          <div className="card empty-state">
            <p className="empty-state-title">{copy.empty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div key={client.client_id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-surface-900">{client.name}</p>
                      <span className={client.is_active ? "badge-active" : "badge-neutral"}>{client.is_active ? copy.active : copy.passive}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-surface-400">{client.client_id}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {client.allowed_scopes.map((scope) => (
                        <span key={scope} className="badge-neutral">
                          {scope}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 space-y-0.5">
                      {client.redirect_uris.map((uri) => (
                        <p key={uri} className="break-all font-mono text-xs text-surface-400">{uri}</p>
                      ))}
                    </div>

                    {editingUris === client.client_id && (
                      <EditUris
                        clientId={client.client_id}
                        current={client.redirect_uris}
                        onSaved={() => {
                          setEditingUris(null);
                          void loadClients();
                        }}
                        onCancel={() => setEditingUris(null)}
                        copy={copy}
                      />
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => setEditingUris(editingUris === client.client_id ? null : client.client_id)} title={copy.editRedirect} className="btn-ghost px-2">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => void disconnectMyAccount(client.client_id)} disabled={disconnecting === client.client_id} title={copy.disconnect} className="btn-ghost px-2 text-amber-600 hover:bg-amber-50">
                      <LogOut className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => void toggleActive(client)} title={client.is_active ? copy.deactivate : copy.activate} className="btn-ghost px-2">
                      {client.is_active ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button type="button" onClick={() => void revokeTokens(client.client_id)} disabled={revoking === client.client_id} title={copy.revokeTokens} className="btn-ghost px-2 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
