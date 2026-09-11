import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "../middleware";

describe("frontend method guard", () => {
  it("lets MCP POST requests reach the backend rewrite", () => {
    const response = middleware(
      new NextRequest("https://heptacert.com/mcp", { method: "POST" }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("still rejects POST requests to frontend pages", async () => {
    const response = middleware(
      new NextRequest("https://heptacert.com/login", { method: "POST" }),
    );

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({ error: "Method not allowed" });
  });
});
