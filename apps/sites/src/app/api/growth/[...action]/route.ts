import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

const visitorCookie = "velozy_analytics_visitor";

function apiUrl() {
  return (
    process.env.VELOZY_API_URL ||
    process.env.NEXT_PUBLIC_VELOZY_API_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

async function forward(request: NextRequest, action: string[], body?: unknown) {
  const secret = process.env.GROWTH_INTERNAL_SECRET;
  if (!secret || secret.length < 32)
    return NextResponse.json(
      { error: "Analytics collection is not configured." },
      { status: 503 },
    );
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host)
    return NextResponse.json(
      { error: "Site host is unavailable." },
      { status: 400 },
    );
  const storedVisitorId = request.cookies.get(visitorCookie)?.value;
  const visitorId =
    storedVisitorId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      storedVisitorId,
    )
      ? storedVisitorId
      : randomUUID();
  const upstream = await fetch(
    `${apiUrl()}/api/public/growth/${action.join("/")}`,
    {
      method: request.method,
      headers: {
        "content-type": "application/json",
        "x-growth-internal-secret": secret,
        "x-growth-site-host": host,
        ...(request.headers.get("user-agent")
          ? { "user-agent": request.headers.get("user-agent")! }
          : {}),
        "x-growth-visitor-id": visitorId,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    },
  );
  const payload = await upstream.json().catch(() => ({}));
  const response = NextResponse.json(payload, { status: upstream.status });
  response.headers.set("Cache-Control", "no-store");
  if (visitorId !== storedVisitorId)
    response.cookies.set(visitorCookie, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 180 * 24 * 60 * 60,
    });
  if (request.cookies.has("velozy_analytics_consent"))
    response.cookies.set("velozy_analytics_consent", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  return response;
}

type RouteContext = { params: Promise<{ action: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { action } = await context.params;
  if (action.length !== 1 || action[0] !== "settings")
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return forward(request, action);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { action } = await context.params;
  if (!(
    (action.length === 1 && action[0] === "events") ||
    (action.length === 2 &&
      action[0] === "experiments" &&
      action[1] === "assignment")
  ))
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid JSON body is required." },
      { status: 400 },
    );
  }
  return forward(request, action, body);
}
