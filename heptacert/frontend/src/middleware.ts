import { NextRequest, NextResponse } from "next/server";

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
