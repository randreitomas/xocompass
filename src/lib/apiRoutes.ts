import { apiUrl } from "./api";

export const apiRoutes = {
  models: () => apiUrl("/api/models"),
  businessAnalytics: (modelId: number, year?: string) =>
    apiUrl(
      `/api/business-analytics?model_id=${modelId}${
        year && year !== "overall" ? `&year=${encodeURIComponent(year)}` : ""
      }`
    ),
  forecastKpis: (modelId: number) => apiUrl(`/api/forecast-outlook/${modelId}`),
  forecastGraph: (modelId: number) => apiUrl(`/api/forecast-graph/${modelId}`),
  advancedMetrics: (modelId: number) => apiUrl(`/api/advanced-metrics?model_id=${modelId}`),
  legacyForecastOutlook: (modelId: number) => apiUrl(`/api/forecast?model_id=${modelId}`),
  legacyForecastGraph: (modelId: number) => apiUrl(`/api/forecast-graph?model_id=${modelId}`),
  legacyAdvancedMetrics: (modelId: number) => apiUrl(`/api/advanced-metrics/${modelId}`),
};

export const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
};
