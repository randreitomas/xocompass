import { apiUrl } from "./api";

export const apiRoutes = {
  models: () => apiUrl("/api/models"),
  businessAnalytics: (modelId: number) =>
    apiUrl(`/api/business-analytics?model_id=${modelId}`),
  forecastOutlook: (modelId: number) => apiUrl(`/api/forecast-outlook/${modelId}`),
  advancedMetrics: (modelId: number) => apiUrl(`/api/advanced-metrics/${modelId}`),
};

export const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
};
