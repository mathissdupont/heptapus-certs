const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx",
  defaultShowCopyCode: true,
});

module.exports = withNextra({
  reactStrictMode: true,
  // Preserve the old flat URLs after the docs were reorganized into sections, so
  // bookmarks and in-app deep links keep working.
  async redirects() {
    return [
      { source: "/quickstart", destination: "/getting-started/quickstart", permanent: true },
      { source: "/concepts", destination: "/getting-started/concepts", permanent: true },
      { source: "/authentication", destination: "/api-reference/authentication", permanent: true },
      { source: "/mcp-agent", destination: "/integrations/mcp-agent", permanent: true },
      { source: "/cli", destination: "/integrations/cli", permanent: true },
      { source: "/webhooks", destination: "/integrations/webhooks", permanent: true },
    ];
  },
});
