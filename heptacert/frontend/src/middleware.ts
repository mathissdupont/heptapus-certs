import { NextRequest, NextResponse } from "next/server";

const PRIMARY_APP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "heptacert.com",
  "www.heptacert.com",
  "cert.heptapusgroup.com",
]);

const WHITE_LABEL_BLOCKED_AUTH_PATHS = [
  "/login",
  "/register",
  "/admin/login",
  "/admin/magic-verify",
  "/forgot-password",
  "/reset-password",
  "/auth/google/callback",
  "/profile",
  "/post/create",
  "/member/verify-email",
  "/verify-email",
];

const LEGACY_TOKEN_ROUTES = [
  {
    pattern: /^\/events\/([^/]+)\/verify-emailtoken=(.+)$/,
    buildPath: (match: RegExpMatchArray) => `/events/${match[1]}/verify-email`,
  },
  {
    pattern: /^\/events\/([^/]+)\/surveytoken=(.+)$/,
    buildPath: (match: RegExpMatchArray) => `/events/${match[1]}/survey`,
  },
  {
    pattern: /^\/events\/([^/]+)\/statustoken=(.+)$/,
    buildPath: (match: RegExpMatchArray) => `/events/${match[1]}/status`,
  },
  {
    pattern: /^\/member\/verify-emailtoken=(.+)$/,
    buildPath: () => "/member/verify-email",
  },
  {
    pattern: /^\/verify-emailtoken=(.+)$/,
    buildPath: () => "/verify-email",
  },
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .split(":")[0]
    .trim()
    .toLowerCase();
  const isWhiteLabelHost = Boolean(hostname && !PRIMARY_APP_HOSTS.has(hostname));

  if (
    isWhiteLabelHost &&
    WHITE_LABEL_BLOCKED_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.json(
      { error: "Method not allowed" },
      { status: 405, headers: { Allow: "GET, HEAD, OPTIONS" } },
    );
  }

  for (const route of LEGACY_TOKEN_ROUTES) {
    const match = pathname.match(route.pattern);
    if (!match) continue;

    const token = match[match.length - 1];
    const url = request.nextUrl.clone();
    url.pathname = route.buildPath(match);
    url.searchParams.set("token", token);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
