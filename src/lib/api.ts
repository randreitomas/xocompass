const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

/** Production Cloud Run fallback when env is unset. */
const FALLBACK_API_BASE =
  "https://xocompass-backend-572370238000.asia-southeast1.run.app";

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ?? FALLBACK_API_BASE
);

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
