import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase() || "";
  const platformHost = (process.env.PLATFORM_DOMAIN || "localhost:3002").split(":")[0].toLowerCase();
  const suffix = `.${platformHost}`;
  const url = request.nextUrl.clone();
  if (hostname.endsWith(suffix)) {
    const subdomain = hostname.slice(0, -suffix.length);
    if (!/^[a-z0-9-]+$/.test(subdomain)) return NextResponse.next();
    url.pathname = `/site/${hostname}${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") return NextResponse.next();
  url.pathname = `/site/${hostname}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/((?!_next|api|favicon.ico|site).*)"] };
