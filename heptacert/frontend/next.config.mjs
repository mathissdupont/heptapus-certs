/** @type {import('next').NextConfig} */

// The reverse proxy routes /api/* to the backend and everything else here (the
// Next.js frontend). OAuth/MCP discovery documents must be served from the
// backend (the authorization server owns them), so we transparently proxy the
// /.well-known/oauth-* paths to it. This keeps discovery working with the
// default proxy config without requiring an extra Caddy rule. The backend
// builds the absolute URLs inside these documents from its own settings, so
// proxying does not distort issuer/endpoint values.
const BACKEND_ORIGIN = (
  process.env.NEXT_SERVER_API_BASE || "http://localhost:8000/api"
).replace(/\/api\/?$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-authorization-server",
        destination: `${BACKEND_ORIGIN}/.well-known/oauth-authorization-server`,
      },
      {
        source: "/.well-known/oauth-authorization-server/:path*",
        destination: `${BACKEND_ORIGIN}/.well-known/oauth-authorization-server/:path*`,
      },
      {
        source: "/.well-known/oauth-protected-resource",
        destination: `${BACKEND_ORIGIN}/.well-known/oauth-protected-resource`,
      },
      {
        source: "/.well-known/oauth-protected-resource/:path*",
        destination: `${BACKEND_ORIGIN}/.well-known/oauth-protected-resource/:path*`,
      },
      {
        source: "/.well-known/openid-configuration",
        destination: `${BACKEND_ORIGIN}/.well-known/openid-configuration`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
