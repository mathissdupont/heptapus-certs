import { useRouter } from "next/router";

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

  docsRepositoryBase: "https://github.com/heptapusgroup/heptacert",

  i18n: [
    { locale: "tr", text: "Türkçe" },
    { locale: "en", text: "English" },
  ],

  head: () => {
    const { locale } = useRouter();
    const title =
      locale === "en"
        ? "HeptaCert Developer Docs"
        : "HeptaCert Geliştirici Dokümantasyonu";
    const desc =
      locale === "en"
        ? "API reference, MCP agent guide, CLI, and webhooks for HeptaCert."
        : "HeptaCert API referansı, MCP agent rehberi, CLI ve webhook dokümantasyonu.";
    return (
      <>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <link rel="icon" href="https://heptacert.com/favicon.ico" />
      </>
    );
  },

  sidebar: { defaultMenuCollapseLevel: 1, autoCollapse: true },

  toc: { float: true },

  footer: {
    text: () => {
      const { locale } = useRouter();
      return (
        <span>
          © 2026 HeptaCert.{" "}
          <a href="https://heptacert.com" target="_blank" rel="noopener" style={{ color: "#6366f1" }}>
            {locale === "en" ? "Back to app →" : "Uygulamaya dön →"}
          </a>
        </span>
      );
    },
  },

  useNextSeoProps() {
    return {
      titleTemplate: "%s – HeptaCert Docs",
    };
  },

  primaryHue: 243,
  primarySaturation: 90,
};
