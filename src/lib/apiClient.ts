import { apiUrl } from "./api";
import { authAccessHolder } from "./authAccessHolder";
import { ApiClientError, parseErrorResponse } from "./apiError";

export interface ApiClientConfig {
  refreshTokens: () => Promise<boolean>;
  hardLogout: () => void;
}

let config: ApiClientConfig | null = null;

let refreshInFlight: Promise<boolean> | null = null;

export function configureApiClient(next: ApiClientConfig): void {
  config = next;
}

async function singleFlightRefresh(): Promise<boolean> {
  if (!config) return false;
  if (!refreshInFlight) {
    refreshInFlight = config.refreshTokens().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function performRequest<T>(
  path: string,
  fetchInit: RequestInit,
  skipAuth: boolean,
  is401Retry: boolean
): Promise<T> {
  if (!config && !skipAuth) {
    throw new ApiClientError({
      status: 0,
      message: "API client not configured",
      code: "client_misconfigured",
    });
  }

  const url = apiUrl(path);
  const headers = new Headers(fetchInit.headers);

  if (!skipAuth) {
    const token = authAccessHolder.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...fetchInit,
    headers,
  });

  if (response.status === 401 && !skipAuth && config) {
    const parsed = await parseErrorResponse(response);
    const isExpired = parsed.code === "token_expired";

    if (!isExpired) {
      config.hardLogout();
      throw new ApiClientError({
        status: 401,
        message: parsed.message,
        code: parsed.code,
        validationErrors: parsed.validationErrors,
      });
    }

    if (is401Retry) {
      config.hardLogout();
      throw new ApiClientError({
        status: 401,
        message: parsed.message || "Session expired.",
        code: parsed.code ?? "token_expired",
      });
    }

    const refreshed = await singleFlightRefresh();
    if (!refreshed) {
      config.hardLogout();
      throw new ApiClientError({
        status: 401,
        message: "Unable to refresh session.",
        code: "token_expired",
      });
    }

    return performRequest<T>(path, fetchInit, skipAuth, true);
  }

  if (!response.ok) {
    const parsed = await parseErrorResponse(response);
    throw new ApiClientError({
      status: response.status,
      message: parsed.message,
      code: parsed.code,
      validationErrors: parsed.validationErrors,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
};

/**
 * Central backend fetch. Attach Bearer token unless `skipAuth` is true.
 * 401 + `token_expired` → single refresh + one retry; otherwise hardLogout.
 */
export async function apiRequest<T>(
  path: string,
  init: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuth: skipAuthRaw, ...fetchInit } = init;
  const skipAuth = Boolean(skipAuthRaw);
  return performRequest<T>(path, fetchInit, skipAuth, false);
}
