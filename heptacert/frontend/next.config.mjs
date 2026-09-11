/** @type {import('next').NextConfig} */

// Caddy normally sends backend-owned paths there directly. Keep these rewrites
// as a deployment-safe fallback: older/shared proxy configurations that only
// route /api/* must still expose MCP and its OAuth discovery documents.
// NEXT_SERVER_API_BASE is a build-time setting because Next compiles rewrites
// into the production image; setting it only on the running container is too
// late and leaves the compiled destination pointing at localhost.
const BACKEND_ORIGIN = (
  process.env.NEXT_SERVER_API_BASE ||
  process.env.INTERNAL_API_BASE ||
  (process.env.NODE_ENV === "production"
    ? "http://backend:8000/api"
    : "http://localhost:8000/api")
).replace(/\/api\/?$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        // Target the slash form inside FastAPI so Starlette's mount redirect
        // cannot fight Next.js's trailing-slash normalization.
        source: "/mcp",
        destination: `${BACKEND_ORIGIN}/mcp/`,
      },
      {
        source: "/mcp/:path*",
        destination: `${BACKEND_ORIGIN}/mcp/:path*`,
      },
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
