import { NextRequest, NextResponse } from "next/server";

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || "http://127.0.0.1:8000";

function getRequestId(request: NextRequest): string {
  return (
    request.headers.get("x-request-id") ||
    request.headers.get("X-Request-ID") ||
    crypto.randomUUID()
  );
}

function upstreamError(path: string, status: number, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: status >= 500 ? "UPSTREAM_UNAVAILABLE" : "UPSTREAM_ERROR",
        message,
      },
    },
    { status },
  );
}

async function proxyRequest(
  request: NextRequest,
  path: string,
  method: string,
  body?: BodyInit,
) {
  const requestId = getRequestId(request);
  const headers = new Headers({
    Accept: "application/json",
    "X-Request-ID": requestId,
  });

  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers.set("Authorization", authHeader);

  if (body && method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  try {
    const upstream = await fetch(
      `${LARAVEL_API_URL}/api/v1/${path}${request.nextUrl.search}`,
      {
        method,
        headers,
        body,
        cache: "no-store",
      },
    );

    const text = await upstream.text();
    const payload = text ? JSON.parse(text) : {};

    if (!upstream.ok) {
      const error = payload?.error ?? {
        code: "UPSTREAM_ERROR",
        message: "The service is temporarily unavailable.",
      };
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code || "UPSTREAM_ERROR",
            message: error.message || "The service is temporarily unavailable.",
            fields: error.fields,
          },
        },
        { status: upstream.status },
      );
    }

    return NextResponse.json(
      payload && typeof payload === "object" && "success" in payload
        ? payload
        : { success: true, data: payload },
      { status: upstream.status },
    );
  } catch {
    return upstreamError(path, 503, "The service is temporarily unavailable.");
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> },
) {
  const { route } = await context.params;
  const path = route.join("/");
  return proxyRequest(request, path, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> },
) {
  const { route } = await context.params;
  const path = route.join("/");
  const body = await request.json().catch(() => ({}));
  return proxyRequest(request, path, "POST", JSON.stringify(body));
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> },
) {
  const { route } = await context.params;
  const path = route.join("/");
  const body = await request.json().catch(() => ({}));
  return proxyRequest(request, path, "PATCH", JSON.stringify(body));
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> },
) {
  const { route } = await context.params;
  const path = route.join("/");
  return proxyRequest(request, path, "DELETE");
}
