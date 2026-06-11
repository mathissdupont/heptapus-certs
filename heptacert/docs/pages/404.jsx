import Link from "next/link";

export default function Custom404() {
  return (
    <div style={styles.root}>
      <div style={styles.glow} />

      <div style={styles.container}>
        <div style={styles.badge}>docs.heptacert.com</div>

        <div style={styles.code}>404</div>

        <h1 style={styles.title}>Sayfa bulunamadı</h1>
        <p style={styles.desc}>
          Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
        </p>

        <div style={styles.actions}>
          <Link href="/" style={styles.btnPrimary}>
            Ana sayfaya dön
          </Link>
          <Link href="/api-reference" style={styles.btnSecondary}>
            API Referansı
          </Link>
        </div>

        <div style={styles.links}>
          <Link href="/quickstart" style={styles.link}>Hızlı Başlangıç</Link>
          <span style={styles.dot}>·</span>
          <Link href="/mcp-agent" style={styles.link}>MCP Agent</Link>
          <span style={styles.dot}>·</span>
          <Link href="/cli" style={styles.link}>CLI</Link>
          <span style={styles.dot}>·</span>
          <Link href="/webhooks" style={styles.link}>Webhooks</Link>
        </div>
      </div>
    </div>
  );
}

Custom404.getLayout = (page) => page;

const styles = {
  root: {
    minHeight: "100vh",
    background: "#09090b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "600px",
    height: "400px",
    background:
      "radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  container: {
    textAlign: "center",
    padding: "2rem",
    position: "relative",
    zIndex: 1,
    maxWidth: "480px",
    width: "100%",
  },
  badge: {
    display: "inline-block",
    padding: "0.3rem 0.9rem",
    borderRadius: "9999px",
    border: "1px solid rgba(99,102,241,0.35)",
    background: "rgba(99,102,241,0.1)",
    color: "#a5b4fc",
    fontSize: "0.78rem",
    letterSpacing: "0.04em",
    marginBottom: "2rem",
  },
  code: {
    fontSize: "clamp(6rem, 20vw, 9rem)",
    fontWeight: 800,
    lineHeight: 1,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    marginBottom: "1rem",
    letterSpacing: "-0.04em",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#f4f4f5",
    margin: "0 0 0.75rem",
  },
  desc: {
    fontSize: "1rem",
    color: "#71717a",
    lineHeight: 1.6,
    margin: "0 0 2.5rem",
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: "2.5rem",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.6rem 1.4rem",
    borderRadius: "8px",
    background: "#6366f1",
    color: "#fff",
    fontWeight: 500,
    fontSize: "0.9rem",
    textDecoration: "none",
    transition: "background 0.15s",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.6rem 1.4rem",
    borderRadius: "8px",
    background: "transparent",
    border: "1px solid #3f3f46",
    color: "#a1a1aa",
    fontWeight: 500,
    fontSize: "0.9rem",
    textDecoration: "none",
  },
  links: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  link: {
    color: "#52525b",
    fontSize: "0.85rem",
    textDecoration: "none",
  },
  dot: {
    color: "#3f3f46",
    fontSize: "0.85rem",
    userSelect: "none",
  },
};
