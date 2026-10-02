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

  const originHeader = request.headers.get("origin");
  if (originHeader) headers.set("Origin", originHeader);

  const refererHeader = request.headers.get("referer");
  if (refererHeader) headers.set("Referer", refererHeader);

  const fetchSiteHeader = request.headers.get("sec-fetch-site");
  if (fetchSiteHeader) headers.set("Sec-Fetch-Site", fetchSiteHeader);

  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers.set("Authorization", authHeader);

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers.set("Cookie", cookieHeader);

  const csrfHeader = request.headers.get("x-csrf-token");
  if (csrfHeader) headers.set("X-CSRF-TOKEN", csrfHeader);

  const xsrfHeader = request.headers.get("x-xsrf-token");
  if (xsrfHeader) headers.set("X-XSRF-TOKEN", xsrfHeader);

  if (body && method !== "GET" && !(body instanceof FormData)) {
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

    const setCookies = upstream.headers.getSetCookie?.() ?? [];

    const formatResponse = (status: number, body: Record<string, unknown>) => {
      const nextResponse =
        status === 204 || status === 304
          ? new NextResponse(null, { status })
          : NextResponse.json(body, { status });
      for (const cookie of setCookies) {
        nextResponse.headers.append("set-cookie", cookie);
      }
      return nextResponse;
    };

    if (!upstream.ok) {
      const error = payload?.error ?? {
        code: "UPSTREAM_ERROR",
        message:
          (typeof payload?.message === "string" && payload.message) ||
          "The service is temporarily unavailable.",
        fields: payload?.errors,
      };
      return formatResponse(upstream.status, {
        success: false,
        error: {
          code: error.code || "UPSTREAM_ERROR",
          message: error.message || "The service is temporarily unavailable.",
          fields: error.fields || payload?.errors,
        },
      });
    }

    return formatResponse(
      upstream.status,
      payload && typeof payload === "object" && "success" in payload
        ? payload
        : { success: true, data: payload },
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
  const body = request.headers
    .get("content-type")
    ?.includes("multipart/form-data")
    ? await request.formData()
    : await request.text();
  return proxyRequest(request, path, "POST", body);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> },
) {
  const { route } = await context.params;
  const path = route.join("/");
  const body = request.headers
    .get("content-type")
    ?.includes("multipart/form-data")
    ? await request.formData()
    : await request.text();
  return proxyRequest(request, path, "PATCH", body);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> },
) {
  const { route } = await context.params;
  const path = route.join("/");
  return proxyRequest(request, path, "DELETE");
}
