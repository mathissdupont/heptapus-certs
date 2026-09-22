/**
 * Render tests for the ChatGPT plugin UI components.
 *
 * The components live with the MCP server (`backend/src/mcp_widgets/`) because
 * the server serves them as `ui://` resources, but they are browser code and
 * the Python suite can only check that their text comes out of the resource.
 * This is the only place that actually executes them, so a typo in a component
 * surfaces here instead of in a reviewer's ChatGPT window.
 *
 * The assembly below mirrors `_widget_html()` in mcp_server.py: shared runtime
 * first, then the component, in document order.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Resolved from the workspace root, not import.meta.url: the jsdom environment
// rewrites import.meta.url to the fake page origin, which has no file scheme.
const WIDGET_DIR = resolve(process.cwd(), "../backend/src/mcp_widgets");
if (!existsSync(WIDGET_DIR)) {
  throw new Error(`Widget sources not found at ${WIDGET_DIR} — run vitest from heptacert/frontend`);
}

const read = (name: string) => readFileSync(join(WIDGET_DIR, name), "utf8");
const RUNTIME = read("common.js");

type OpenAiStub = {
  toolOutput: unknown;
  widgetState?: Record<string, unknown>;
  theme?: string;
  displayMode?: string;
  locale?: string;
  setWidgetState?: (state: Record<string, unknown>) => void;
  sendFollowUpMessage?: (arg: { prompt: string }) => Promise<void>;
  requestDisplayMode?: (arg: { mode: string }) => Promise<void>;
  openExternal?: (arg: { href: string }) => void;
};

/** Execute one component exactly as the host would, and return its root. */
function mount(widget: string, openai: OpenAiStub | null): HTMLElement {
  const source = read(`${widget}.html`);
  const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const markup = source.replace(/<script>[\s\S]*?<\/script>/g, "");

  if (openai) (window as unknown as { openai: OpenAiStub }).openai = openai;
  else delete (window as unknown as { openai?: OpenAiStub }).openai;

  document.body.innerHTML = markup;
  // Scripts inserted through innerHTML never run — in jsdom or in a browser —
  // so run them here in the same order the document declares them.
  for (const code of [RUNTIME, ...scripts]) new Function(code)();

  const root = document.getElementById("hc-root");
  if (!root) throw new Error(`${widget} did not render a root element`);
  return root;
}

const stub = (toolOutput: unknown, extra: Partial<OpenAiStub> = {}): OpenAiStub => ({
  toolOutput,
  widgetState: {},
  theme: "light",
  displayMode: "inline",
  locale: "en-US",
  setWidgetState: () => {},
  sendFollowUpMessage: async () => {},
  requestDisplayMode: async () => {},
  openExternal: () => {},
  ...extra,
});

afterEach(() => {
  document.body.innerHTML = "";
  delete (window as unknown as { openai?: OpenAiStub }).openai;
  document.documentElement.removeAttribute("data-hc-theme");
});

describe("HeptaCert ChatGPT components", () => {
  it("renders an event list and offers a follow-up for the first event", () => {
    const root = mount(
      "event-list",
      stub({
        total: 2,
        events: [
          { id: 1, name: "Demo Day", event_date: "2026-10-01", event_type: "conference", visibility: "public" },
          { id: 2, name: "Closed Workshop", event_date: "2026-11-03", registration_closed: true },
        ],
      }),
    );
    expect(root.textContent).toContain("2 events");
    expect(root.textContent).toContain("Demo Day");
    expect(root.textContent).toContain("Registration closed");
    expect(root.querySelector("button")?.textContent).toBe("Event summary");
  });

  it("renders event stats on the event card", () => {
    const root = mount(
      "event-card",
      stub({
        event: { id: 1, name: "Demo Day", visibility: "public", certificate_enabled: true },
        stats: { attendee_count: 12, session_count: 3, certificate_count: 8, checkin_count: 9 },
      }),
    );
    expect(root.textContent).toContain("Demo Day");
    expect(root.textContent).toContain("Attendees");
    expect(root.textContent).toContain("12");
    expect(root.textContent).toContain("Certificates");
  });

  it("renders attendees with their status", () => {
    const root = mount(
      "attendee-table",
      stub({
        event_id: 7,
        total: 1,
        attendees: [{ id: 4, name: "Ada Lovelace", email: "ada@example.com", has_certificate: true }],
      }),
    );
    expect(root.textContent).toContain("1 attendee");
    expect(root.textContent).toContain("Ada Lovelace");
    expect(root.textContent).toContain("Certified");
  });

  it("marks a revoked certificate in the list", () => {
    const root = mount(
      "certificate-list",
      stub({
        total: 1,
        certificates: [{ id: 1, public_id: "abc-123", recipient_name: "Ada", status: "revoked" }],
      }),
    );
    expect(root.textContent).toContain("1 certificate");
    expect(root.textContent).toContain("revoked");
    expect(root.querySelector('[data-tone="danger"]')).not.toBeNull();
  });

  it("opens a certificate's verification page through the host bridge", () => {
    const opened: string[] = [];
    const root = mount(
      "certificate-card",
      stub(
        {
          certificate: {
            public_id: "abc-123",
            recipient_name: "Ada",
            event_name: "Demo Day",
            status: "active",
            verify_url: "https://heptacert.com/verify/abc-123",
          },
        },
        { openExternal: ({ href }) => opened.push(href) },
      ),
    );
    expect(root.textContent).toContain("Valid");
    const button = root.querySelector("button");
    expect(button?.textContent).toBe("Open verification page");
    button?.dispatchEvent(new MouseEvent("click"));
    expect(opened).toEqual(["https://heptacert.com/verify/abc-123"]);
  });

  it("asks for confirmation before issuance and never issues on its own", () => {
    const prompts: string[] = [];
    const root = mount(
      "issue-confirmation",
      stub(
        { status: "preview", event_id: 7, eligible_count: 41, requires_confirm: true, warning: "May spend balance." },
        {
          sendFollowUpMessage: async ({ prompt }) => {
            prompts.push(prompt);
          },
        },
      ),
    );
    expect(root.textContent).toContain("Confirm certificate issuance");
    expect(root.textContent).toContain("41");
    const confirm = root.querySelector('button[data-variant="primary"]') as HTMLButtonElement;
    confirm.dispatchEvent(new MouseEvent("click"));
    // The component only drafts a prompt; the write stays behind the model's
    // own confirm=True call.
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain("issue certificates");
  });

  it("re-renders when the host swaps globals", () => {
    const openai = stub({ total: 0, events: [] });
    const root = mount("event-list", openai);
    expect(root.textContent).toContain("No events match this search.");

    openai.toolOutput = { total: 1, events: [{ id: 3, name: "Later Event" }] };
    openai.theme = "dark";
    window.dispatchEvent(new Event("openai:set_globals"));

    expect(root.textContent).toContain("Later Event");
    expect(document.documentElement.getAttribute("data-hc-theme")).toBe("dark");
  });

  it("degrades to an empty state instead of throwing without a host", () => {
    for (const widget of [
      "event-list",
      "event-card",
      "attendee-table",
      "certificate-list",
      "certificate-card",
      "issue-confirmation",
    ]) {
      const root = mount(widget, null);
      expect(root.textContent?.length ?? 0).toBeGreaterThan(0);
      expect(root.textContent).not.toContain("could not be displayed");
    }
  });
});
