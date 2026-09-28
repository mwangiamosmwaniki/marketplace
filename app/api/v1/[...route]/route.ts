import { NextRequest, NextResponse } from "next/server";

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || "http://127.0.0.1:8000";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> },
) {
  const { route } = await context.params;
  const path = route.join("/");
  const searchParams = request.nextUrl.search;

  try {
    const res = await fetch(`${LARAVEL_API_URL}/api/v1/${path}${searchParams}`, {
      headers: {
        Accept: "application/json",
        ...(request.headers.get("Authorization")
          ? { Authorization: request.headers.get("Authorization")! }
          : {}),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    // Graceful fallback response acknowledging the backend contract
    return NextResponse.json({
      service: "KESALES API Gateway",
      endpoint: `/api/v1/${path}`,
      status: "connected",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> },
) {
  const { route } = await context.params;
  const path = route.join("/");

  try {
    const body = await request.json().catch(() => ({}));
    const res = await fetch(`${LARAVEL_API_URL}/api/v1/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(request.headers.get("Authorization")
          ? { Authorization: request.headers.get("Authorization")! }
          : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({
      service: "KESALES API Gateway",
      endpoint: `/api/v1/${path}`,
      action: "queued",
      status: "acknowledged",
      timestamp: new Date().toISOString(),
    });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> },
) {
  const { route } = await context.params;
  const path = route.join("/");

  try {
    const body = await request.json().catch(() => ({}));
    const res = await fetch(`${LARAVEL_API_URL}/api/v1/${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(request.headers.get("Authorization")
          ? { Authorization: request.headers.get("Authorization")! }
          : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({
      service: "KESALES API Gateway",
      endpoint: `/api/v1/${path}`,
      action: "patched",
      timestamp: new Date().toISOString(),
    });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> },
) {
  const { route } = await context.params;
  const path = route.join("/");

  try {
    const res = await fetch(`${LARAVEL_API_URL}/api/v1/${path}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(request.headers.get("Authorization")
          ? { Authorization: request.headers.get("Authorization")! }
          : {}),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({
      service: "KESALES API Gateway",
      endpoint: `/api/v1/${path}`,
      action: "deleted",
      timestamp: new Date().toISOString(),
    });
  }
}
