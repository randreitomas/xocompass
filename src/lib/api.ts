// Default to the deployed backend. Override via VITE_API_BASE_URL when needed
// (e.g. local dev proxy at /backend).
const DEFAULT_API_BASE_URL =
  "https://xocompass-backend-572370238000.asia-southeast1.run.app";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
);

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
