export type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string[] | string>;
  status?: number;
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
  body?: Record<string, unknown> | FormData,
): Promise<ApiEnvelope<T>> {
  const headers = new Headers({
    Accept: "application/json",
    "X-Request-ID": getRequestId(),
  });
  const token =
    typeof window === "undefined"
      ? null
      : sessionStorage.getItem("kesales_auth_token");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body && method !== "GET" && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body:
        body && method !== "GET"
          ? isFormData
            ? body
            : JSON.stringify(body)
          : undefined,
      credentials: "omit",
    });

    const text = await response.text();
    let payload: Record<string, unknown> = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      return {
        success: false,
        error: {
          code: "MALFORMED_RESPONSE",
          message: "The service returned an invalid response.",
          status: response.status,
        },
      };
    }

    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") {
        sessionStorage.removeItem("kesales_auth_token");
        window.dispatchEvent(new Event("kesales:unauthorized"));
      }

      const upstreamError = payload.error as ApiError | undefined;
      return {
        success: false,
        error: {
          code: upstreamError?.code || `HTTP_${response.status}`,
          message:
            upstreamError?.message ||
            (typeof payload.message === "string"
              ? payload.message
              : "The request could not be completed."),
          fields: upstreamError?.fields,
          status: response.status,
        },
      };
    }

    if (payload && typeof payload === "object" && "success" in payload) {
      return {
        ...payload,
        data: (payload.data ?? payload) as T,
      } as ApiEnvelope<T>;
    }

    return {
      success: true,
      data: payload as T,
    };
  } catch {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "The service could not be reached.",
      },
    };
  }
}
