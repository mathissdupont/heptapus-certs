import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import * as middlewareModule from "../middleware";
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

describe("locale routing", () => {
  it("hands locale-prefixed public paths to next-intl", () => {
    const response = middleware(new NextRequest("https://heptacert.com/de/i18n-pilot"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-request-x-next-intl-locale")).toBe("de");
  });

  it("leaves un-prefixed routes to the existing app", () => {
    const response = middleware(new NextRequest("https://heptacert.com/pricing"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-request-x-next-intl-locale")).toBeNull();
  });
});

describe("legacy token links", () => {
  it("still redirects URLs whose itsdangerous token contains dots", () => {
    const token = "eyJ1IjoxfQ.ZxY1Aw.sig-_";
    const response = middleware(new NextRequest(`https://heptacert.com/verify-emailtoken=${token}`));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`https://heptacert.com/verify-email?token=${token}`);
  });

  it("runs on every path — a matcher skipping dotted paths would break the redirect above", () => {
    expect("config" in middlewareModule).toBe(false);
  });
});
