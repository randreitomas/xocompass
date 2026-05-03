import { apiRequest } from "../lib/apiClient";
import type { components } from "../types/api";

type LoginRequest = components["schemas"]["LoginRequest"];
type LoginResponse = components["schemas"]["LoginResponse"];
type RefreshRequest = components["schemas"]["RefreshRequest"];
type RefreshResponse = components["schemas"]["RefreshResponse"];
type LogoutRequest = components["schemas"]["LogoutRequest"];
type LogoutResponse = components["schemas"]["LogoutResponse"];
type MeResponse = components["schemas"]["MeResponse"];
type RegisterRequest = components["schemas"]["RegisterRequest"];
type ForgotPasswordRequest = components["schemas"]["ForgotPasswordRequest"];
type ForgotPasswordResponse = components["schemas"]["ForgotPasswordResponse"];
type ResetPasswordRequest = components["schemas"]["ResetPasswordRequest"];
type ResetPasswordResponse = components["schemas"]["ResetPasswordResponse"];

export async function login(body: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export async function refresh(body: RefreshRequest): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>("/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export async function logout(body: LogoutRequest): Promise<LogoutResponse> {
  return apiRequest<LogoutResponse>("/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/auth/me");
}

export async function register(body: RegisterRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export async function forgotPassword(
  body: ForgotPasswordRequest
): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export async function resetPassword(
  body: ResetPasswordRequest
): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    skipAuth: true,
  });
}
