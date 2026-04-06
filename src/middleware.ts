import { NextRequest, NextResponse } from "next/server";

const SLOW_THRESHOLD = 500; // ms

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { method, nextUrl } = request;
  const path = nextUrl.pathname;

  const response = NextResponse.next();

  // Response header'a timing ekle (debug icin)
  const duration = Date.now() - start;
  response.headers.set("X-Response-Time", `${duration}ms`);

  // API isteklerini logla
  if (path.startsWith("/api/")) {
    const level = duration > SLOW_THRESHOLD ? "WARN" : "INFO";
    const slow = duration > SLOW_THRESHOLD ? " [SLOW]" : "";
    console.log(
      `[${level}] ${method} ${path} ${duration}ms${slow}`
    );
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
