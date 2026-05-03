import { apiRequest } from "../lib/apiClient";
import type { components } from "../types/api";

type AdminUserListResponse = components["schemas"]["AdminUserListResponse"];
type CreateInvitationRequest = components["schemas"]["CreateInvitationRequest"];
type CreateInvitationResponse = components["schemas"]["CreateInvitationResponse"];
type InvitationListResponse = components["schemas"]["InvitationListResponse"];
type AuditLogPageResponse = components["schemas"]["AuditLogPageResponse"];
type AuditActionTypesResponse = components["schemas"]["AuditActionTypesResponse"];
type SystemOverviewResponse = components["schemas"]["SystemOverviewResponse"];
type PipelineStatusResponse = components["schemas"]["PipelineStatusResponse"];
type GlobalSettingItem = components["schemas"]["GlobalSettingItem"];
type GlobalSettingsListResponse = components["schemas"]["GlobalSettingsListResponse"];
type UpdateSettingRequest = components["schemas"]["UpdateSettingRequest"];
type UserStatusResponse = components["schemas"]["UserStatusResponse"];
type UpdateUserRequest = components["schemas"]["UpdateUserRequest"];
type AdminUserDetailResponse = components["schemas"]["AdminUserDetailResponse"];
type AdminInitiateResetResponse = components["schemas"]["AdminInitiateResetResponse"];

export interface ListUsersParams {
  page?: number;
  page_size?: number;
  role?: string | null;
  status?: string | null;
  search?: string | null;
}

export async function getUsers(
  params: ListUsersParams = {}
): Promise<AdminUserListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.page_size != null) search.set("page_size", String(params.page_size));
  if (params.role != null && params.role !== "") search.set("role", params.role);
  if (params.status != null && params.status !== "")
    search.set("status", params.status);
  if (params.search != null && params.search !== "")
    search.set("search", params.search);
  const qs = search.toString();
  return apiRequest<AdminUserListResponse>(
    qs ? `/admin/users?${qs}` : "/admin/users"
  );
}

export async function activateUser(userId: string): Promise<UserStatusResponse> {
  return apiRequest<UserStatusResponse>(
    `/admin/users/${encodeURIComponent(userId)}/activate`,
    { method: "POST" }
  );
}

export async function deactivateUser(userId: string): Promise<UserStatusResponse> {
  return apiRequest<UserStatusResponse>(
    `/admin/users/${encodeURIComponent(userId)}/deactivate`,
    { method: "POST" }
  );
}

/** Soft-delete: backend returns 204 with no body. */
export async function deleteUser(userId: string): Promise<void> {
  await apiRequest<void>(
    `/admin/users/${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
}

export async function patchUser(
  userId: string,
  body: UpdateUserRequest
): Promise<AdminUserDetailResponse> {
  return apiRequest<AdminUserDetailResponse>(
    `/admin/users/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function initiateUserPasswordReset(
  userId: string
): Promise<AdminInitiateResetResponse> {
  return apiRequest<AdminInitiateResetResponse>(
    `/admin/users/${encodeURIComponent(userId)}/reset-password`,
    { method: "POST" }
  );
}

export async function createInvitation(
  payload: CreateInvitationRequest
): Promise<CreateInvitationResponse> {
  return apiRequest<CreateInvitationResponse>("/admin/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getInvitations(params?: {
  page?: number;
  page_size?: number;
  status?: string | null;
}): Promise<InvitationListResponse> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.page_size != null) search.set("page_size", String(params.page_size));
  if (params?.status != null && params.status !== "")
    search.set("status", params.status);
  const qs = search.toString();
  return apiRequest<InvitationListResponse>(
    qs ? `/admin/invitations?${qs}` : "/admin/invitations"
  );
}

export async function revokeInvitation(inviteId: string): Promise<void> {
  await apiRequest<unknown>(
    `/admin/invitations/${encodeURIComponent(inviteId)}`,
    { method: "DELETE" }
  );
}

export interface AuditLogsParams {
  cursor?: string | null;
  limit?: number;
  from_date?: string | null;
  to_date?: string | null;
  action_type?: string | null;
  module?: string | null;
  status?: string | null;
  user_id?: string | null;
}

export async function getAuditLogs(
  params: AuditLogsParams = {}
): Promise<AuditLogPageResponse> {
  const search = new URLSearchParams();
  if (params.cursor != null && params.cursor !== "")
    search.set("cursor", params.cursor);
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.from_date != null && params.from_date !== "")
    search.set("from_date", params.from_date);
  if (params.to_date != null && params.to_date !== "")
    search.set("to_date", params.to_date);
  if (params.action_type != null && params.action_type !== "")
    search.set("action_type", params.action_type);
  if (params.module != null && params.module !== "")
    search.set("module", params.module);
  if (params.status != null && params.status !== "")
    search.set("status", params.status);
  if (params.user_id != null && params.user_id !== "")
    search.set("user_id", params.user_id);
  const qs = search.toString();
  return apiRequest<AuditLogPageResponse>(
    qs ? `/admin/audit-logs?${qs}` : "/admin/audit-logs"
  );
}

export async function getAuditLogActionTypes(): Promise<AuditActionTypesResponse> {
  return apiRequest<AuditActionTypesResponse>(
    "/admin/audit-logs/action-types"
  );
}

export async function getSystemOverview(): Promise<SystemOverviewResponse> {
  return apiRequest<SystemOverviewResponse>("/admin/system/overview");
}

export async function getPipelineStatus(): Promise<PipelineStatusResponse> {
  return apiRequest<PipelineStatusResponse>("/admin/system/pipeline-status");
}

export async function listSettings(): Promise<GlobalSettingsListResponse> {
  return apiRequest<GlobalSettingsListResponse>("/admin/settings");
}

export async function updateSetting(
  key: string,
  value: unknown
): Promise<GlobalSettingItem> {
  const body: UpdateSettingRequest = { value };
  return apiRequest<GlobalSettingItem>(
    `/admin/settings/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}
