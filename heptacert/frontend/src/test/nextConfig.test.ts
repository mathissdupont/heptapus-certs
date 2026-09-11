import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config.mjs";

describe("backend-owned fallback rewrites", () => {
  it("proxies MCP and OAuth discovery to the backend", async () => {
    const rewrites = await nextConfig.rewrites();
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
});
