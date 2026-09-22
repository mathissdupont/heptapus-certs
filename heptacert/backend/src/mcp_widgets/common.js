/* Shared HeptaCert widget runtime.
   Injected ahead of every ui:// component by _widget_html() in mcp_server.py.

   Every host API is feature-detected: the same markup has to survive an older
   ChatGPT build, a non-ChatGPT MCP client that renders the resource plainly,
   and a preview with no window.openai at all. Nothing here reads network data
   directly — the widget only ever renders structuredContent the server already
   redacted, or calls another MCP tool through the host bridge. */

(function () {
  "use strict";

  var SET_GLOBALS_EVENT = "openai:set_globals";

  function host() {
    return typeof window !== "undefined" && window.openai ? window.openai : null;
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    var key;
    for (key in props || {}) {
      if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
      var value = props[key];
      if (value === null || value === undefined) continue;
      if (key === "text") node.textContent = String(value);
      else if (key === "onClick") node.addEventListener("click", value);
      else node.setAttribute(key, String(value));
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  // Dates arrive as ISO strings from the API; fall back to the raw value so a
  // partial date ("2026-09") still shows something instead of "Invalid Date".
  function fmtDate(value, withTime) {
    if (!value) return "";
    var parsed = new Date(value);
    if (isNaN(parsed.getTime())) return String(value);
    var api = host();
    var locale = (api && api.locale) || undefined;
    var opts = { year: "numeric", month: "short", day: "numeric" };
    if (withTime) {
      opts.hour = "2-digit";
      opts.minute = "2-digit";
    }
    try {
      return parsed.toLocaleDateString(locale, opts);
    } catch (err) {
      return parsed.toISOString().slice(0, withTime ? 16 : 10);
    }
  }

  function num(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value !== "number") return String(value);
    try {
      return value.toLocaleString((host() && host().locale) || undefined);
    } catch (err) {
      return String(value);
    }
  }

  function badge(label, tone) {
    return el("span", { class: "hc-badge", "data-tone": tone || "", text: label });
  }

  function fact(label, value) {
    return el("div", { class: "hc-fact" }, [
      el("div", { class: "hc-fact-label", text: label }),
      el("div", { class: "hc-fact-value", text: value }),
    ]);
  }

  function setState(patch) {
    var api = host();
    if (!api || typeof api.setWidgetState !== "function") return;
    var next = Object.assign({}, api.widgetState || {}, patch);
    try {
      api.setWidgetState(next);
    } catch (err) {
      /* state persistence is a convenience, never required for rendering */
    }
  }

  function callTool(name, args) {
    var api = host();
    if (!api || typeof api.callTool !== "function") return Promise.reject(new Error("unavailable"));
    return api.callTool(name, args || {});
  }

  function followUp(prompt) {
    var api = host();
    if (!api || typeof api.sendFollowUpMessage !== "function") return Promise.resolve();
    return api.sendFollowUpMessage({ prompt: prompt });
  }

  function requestFullscreen() {
    var api = host();
    if (!api || typeof api.requestDisplayMode !== "function") return Promise.resolve();
    return api.requestDisplayMode({ mode: "fullscreen" });
  }

  // Wire a button that asks ChatGPT to continue the conversation. Widgets never
  // mutate HeptaCert data on their own: writes stay behind the model's own
  // confirmation flow, so the button only ever drafts a follow-up prompt.
  function askButton(label, prompt, variant) {
    return el("button", {
      class: "hc-btn",
      "data-variant": variant || "",
      type: "button",
      text: label,
      onClick: function () {
        followUp(prompt);
      },
    });
  }

  /* Sandboxed iframes cannot navigate the parent, so an external link has to go
     through the host bridge. Fall back to a plain anchor when there is no host. */
  function externalButton(label, href, variant) {
    var api = host();
    if (!api || typeof api.openExternal !== "function") {
      return el("a", {
        class: "hc-link",
        href: href,
        target: "_blank",
        rel: "noopener noreferrer",
        text: label,
      });
    }
    return el("button", {
      class: "hc-btn",
      "data-variant": variant || "",
      type: "button",
      text: label,
      onClick: function () {
        api.openExternal({ href: href });
      },
    });
  }

  function applyTheme() {
    var api = host();
    var theme = api && api.theme;
    if (theme) document.documentElement.setAttribute("data-hc-theme", String(theme));
  }

  function reportHeight() {
    var api = host();
    if (!api || typeof api.notifyIntrinsicHeight !== "function") return;
    try {
      api.notifyIntrinsicHeight(document.documentElement.scrollHeight);
    } catch (err) {
      /* the host falls back to its own measurement */
    }
  }

  /* mount(render) renders once, then again whenever the host swaps globals
     (new tool output, theme change, display-mode change). */
  function mount(render) {
    var root = document.getElementById("hc-root");
    if (!root) return;

    function draw() {
      applyTheme();
      var api = host();
      var data = (api && api.toolOutput) || null;
      root.replaceChildren();
      try {
        var view = render(data || {}, {
          theme: (api && api.theme) || "light",
          displayMode: (api && api.displayMode) || "inline",
          widgetState: (api && api.widgetState) || {},
          hasHost: !!api,
        });
        if (view) root.appendChild(view);
      } catch (err) {
        root.appendChild(el("p", { class: "hc-empty", text: "This view could not be displayed." }));
      }
      reportHeight();
    }

    draw();
    if (typeof window !== "undefined") {
      window.addEventListener(SET_GLOBALS_EVENT, draw, { passive: true });
    }
  }

  globalThis.HC = {
    el: el,
    fmtDate: fmtDate,
    num: num,
    badge: badge,
    fact: fact,
    mount: mount,
    setState: setState,
    callTool: callTool,
    followUp: followUp,
    askButton: askButton,
    externalButton: externalButton,
    requestFullscreen: requestFullscreen,
  };
})();
