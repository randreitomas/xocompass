import { apiRequest } from "../lib/apiClient";

// TEMP: `/api/sessions` is not yet in OpenAPI — replace with generated types when available.
export interface TempWorkspaceSession {
  id: string;
  name: string;
  created_at: string;
}

// TEMP
export interface TempSessionsListResponse {
  sessions: TempWorkspaceSession[];
}

// TEMP
export interface TempCreateSessionBody {
  name: string;
}

/** TEMP */
export async function getSessions(): Promise<TempSessionsListResponse> {
  return apiRequest<TempSessionsListResponse>("/api/sessions");
}

/** TEMP */
export async function createSession(name: string): Promise<TempWorkspaceSession> {
  const body: TempCreateSessionBody = { name };
  return apiRequest<TempWorkspaceSession>("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** TEMP */
export async function deleteSession(sessionId: string): Promise<void> {
  await apiRequest<unknown>(
    `/api/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "DELETE",
    }
  );
}
