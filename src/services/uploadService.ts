import { apiRequest } from "../lib/apiClient";
import type { components } from "../types/api";

type UploadResponse = components["schemas"]["UploadResponse"];
type RetrainRequest = components["schemas"]["RetrainRequest"];
type RetrainStatusResponse = components["schemas"]["RetrainStatusResponse"];

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<UploadResponse>("/api/upload", {
    method: "POST",
    body: formData,
  });
}

export async function triggerRetrain(
  body: RetrainRequest
): Promise<RetrainStatusResponse> {
  return apiRequest<RetrainStatusResponse>("/api/retrain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
