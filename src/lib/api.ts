/**
 * Prefer same-origin `/backend` in production (Vercel rewrite avoids CORS).
 * Override anytime via `VITE_API_BASE_URL`.
 */
const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? "/backend"
  : "https://xocompass-backend-572370238000.asia-southeast1.run.app";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
);

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
