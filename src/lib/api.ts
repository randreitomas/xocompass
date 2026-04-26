/**
 * Prefer same-origin `/backend` in all environments to avoid CORS.
 * In development, Vite proxy forwards `/backend` to the real API.
 * Override anytime via `VITE_API_BASE_URL`.
 */
const DEFAULT_API_BASE_URL = "/backend";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
);

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
