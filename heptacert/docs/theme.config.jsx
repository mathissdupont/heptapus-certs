export default {
  logo: (
    <span style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
      <span style={{ color: "#6366f1" }}>Hepta</span>
      <span>Cert</span>
      <span
        style={{
          marginLeft: "0.4rem",
          fontSize: "0.65rem",
          fontWeight: 500,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          verticalAlign: "middle",
        }}
      >
        Docs
      </span>
    </span>
  ),

  project: { link: "https://heptacert.com" },

  docsRepositoryBase: "https://github.com/mathissdupont/heptapus-certs",

  head: () => (
    <>
      <title>HeptaCert Geliştirici Dokümantasyonu</title>
      <meta name="description" content="HeptaCert API referansı, MCP agent rehberi, CLI ve webhook dokümantasyonu." />
      <meta property="og:title" content="HeptaCert Geliştirici Dokümantasyonu" />
      <meta property="og:description" content="HeptaCert API referansı, MCP agent rehberi, CLI ve webhook dokümantasyonu." />
      <link rel="icon" href="https://heptacert.com/favicon.ico" />
    </>
  ),

  sidebar: { defaultMenuCollapseLevel: 1, autoCollapse: true },

  toc: { float: true },

  footer: {
    text: (
      <span>
        © 2026 HeptaCert.{" "}
        <a href="https://heptacert.com" target="_blank" rel="noopener" style={{ color: "#6366f1" }}>
          Uygulamaya dön →
        </a>
      </span>
    ),
  },

  useNextSeoProps() {
    return { titleTemplate: "%s – HeptaCert Docs" };
  },

  primaryHue: 243,
  primarySaturation: 90,
};
