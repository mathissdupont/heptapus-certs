import type { NextConfig } from "next";
import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config.mjs";

type Rewrite = { source: string; destination: string };

// The config is wrapped by the next-intl plugin, so it is typed as a plain NextConfig
// whose rewrites() may return either a flat list or before/after/fallback phases.
async function allRewrites(config: NextConfig): Promise<Rewrite[]> {
  const result = await config.rewrites?.();
  if (!result) return [];
  if (Array.isArray(result)) return result;
  return [...(result.beforeFiles ?? []), ...(result.afterFiles ?? []), ...(result.fallback ?? [])];
}

describe("backend-owned fallback rewrites", () => {
  it("produces a standalone deployment artifact", () => {
    expect(nextConfig.output).toBe("standalone");
  });

  it("proxies MCP and OAuth discovery to the backend", async () => {
    const rewrites = await allRewrites(nextConfig);
    const bySource = new Map(rewrites.map((rewrite) => [rewrite.source, rewrite.destination]));

    expect(bySource.get("/mcp")).toMatch(/\/mcp\/$/);
    expect(bySource.get("/mcp/:path*")).toMatch(/\/mcp\/:path\*$/);
    expect(bySource.get("/.well-known/oauth-authorization-server")).toMatch(
      /\/\.well-known\/oauth-authorization-server$/,
    );
    expect(bySource.get("/.well-known/oauth-protected-resource")).toMatch(
      /\/\.well-known\/oauth-protected-resource$/,
    );
  });

  it("keeps the security headers after the next-intl plugin wraps the config", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const keys = rules.find((rule) => rule.source === "/:path*")?.headers.map((header) => header.key) ?? [];

    expect(keys).toEqual(
      expect.arrayContaining([
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Strict-Transport-Security",
      ]),
    );
  });
});
