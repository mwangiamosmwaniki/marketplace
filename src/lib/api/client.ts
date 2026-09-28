export type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string[] | string>;
};

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  data?: T;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
  error?: ApiError;
};

const API_BASE = "/api/v1";

function getRequestId(): string {
  if (typeof window === "undefined") {
    return "server-request";
  }

  const key = "kesales_request_id";
  const current = sessionStorage.getItem(key);
  if (current) {
    return current;
  }

  const value = crypto.randomUUID();
  sessionStorage.setItem(key, value);
  return value;
}

export async function apiRequest<T = unknown>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>,
): Promise<ApiEnvelope<T>> {
  const headers = new Headers({
    Accept: "application/json",
    "X-Request-ID": getRequestId(),
  });

  if (body && method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body && method !== "GET" ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = payload?.error ?? {
      code: "REQUEST_FAILED",
      message: "The request could not be completed.",
    };

    return {
      success: false,
      error,
    };
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    return payload as ApiEnvelope<T>;
  }

  return {
    success: true,
    data: payload as T,
  };
}
