import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRoutes, fetchJson } from "../lib/apiRoutes";
import { SkeletonDashboard } from "../components/dashboard/SkeletonDashboard";
import { SavesModal } from "../components/modals/SavesModal";

interface ForecastPoint {
  month: string;
  actual: number;
  predicted: number;
  lowerCI: number;
  upperCI: number;
}

interface ForecastOutlookResponse {
  forecasted_bookings_2w: number;
  highest_forecast_week_date: string;
  highest_forecast_week_value: number;
  critical_weeks: {
    week_start: string;
    forecasted_volume: number;
    risk_factor: "HIGH" | "MEDIUM" | "LOW";
  }[];
}

interface MetricsRouteState {
  selectedModelId?: number;
  selectedModelVersion?: string;
}

interface BackendModel {
  id: number;
  model_name: string;
  version: string;
}

interface ModelsResponse {
  available_models: BackendModel[];
}

interface ForecastActionsProps {
  isBackgroundPreview?: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
}

interface PlaceholderPanelProps {
  title: string;
  description: string;
  className?: string;
  forecastVolumes?: number[];
  forecastLabels?: string[];
}

interface RiskWeekRow {
  week: string;
  forecastedVolume: number;
  riskFactor: "High" | "Medium" | "Low";
}

const fallbackForecastData: ForecastPoint[] = [
  { month: "Jan", actual: 280, predicted: 295, lowerCI: 260, upperCI: 330 },
  { month: "Feb", actual: 310, predicted: 320, lowerCI: 290, upperCI: 350 },
  { month: "Mar", actual: 340, predicted: 355, lowerCI: 320, upperCI: 390 },
  { month: "Apr", actual: 360, predicted: 380, lowerCI: 345, upperCI: 420 },
];

const StatCard: React.FC<StatCardProps> = ({ label, value, helper }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{helper}</p>
  </div>
);

const PlaceholderChart: React.FC<{
  title: string;
  forecastVolumes?: number[];
  forecastLabels?: string[];
}> = ({ title, forecastVolumes, forecastLabels }) => {
  if (title === "Weekly Booking Demand Graph") {
    const volumeData =
      forecastVolumes && forecastVolumes.length > 0
        ? forecastVolumes
        : [14, 15, 16, 15, 12];
    const labels =
      forecastLabels && forecastLabels.length === volumeData.length
        ? forecastLabels
        : volumeData.map((_, index) => `W${index + 1}`);

    const lineData = volumeData.map((predicted, index) => ({
      week: labels[index],
      predicted,
    }));

    return (
      <div className="mt-4 h-[15.5rem] rounded-xl border border-slate-200 bg-white p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineData} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#6B7280" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#6B7280" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                borderColor: "#E5E7EB",
                fontSize: 12,
              }}
            />
            <Legend
              verticalAlign="top"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#111827"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              name="Predicted"
              stroke="#0D9488"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const volumeData =
    forecastVolumes && forecastVolumes.length > 0
      ? forecastVolumes
      : [40, 48, 55, 60, 67, 74, 71, 66];
  const maxVolume = Math.max(...volumeData, 1);
  const normalizedBars = volumeData.map((value) =>
    Math.max((value / maxVolume) * 100, 12)
  );

  const forecastLinePoints = normalizedBars.map((value, index) => {
    const x = (index / Math.max(normalizedBars.length - 1, 1)) * 100;
    const y = 100 - value;
    return `${x},${y}`;
  });

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="relative h-40">
        <div className="absolute inset-0 flex items-end gap-2">
          {normalizedBars.map((height, idx) => (
            <div
              key={`actual-${idx}`}
              className="relative flex-1 rounded-t bg-slate-300"
              style={{ height: `${height}%` }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-600">
                {volumeData[idx]}
              </span>
            </div>
          ))}
        </div>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#0d9488"
            strokeWidth="2"
            points={forecastLinePoints.join(" ")}
          />
        </svg>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-teal-600" />
          Forecast
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Actual
        </span>
      </div>
    </div>
  );
};

const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({
  title,
  description,
  className = "",
  forecastVolumes,
  forecastLabels,
}) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
    <div className="h-64">
      <PlaceholderChart
        title={title}
        forecastVolumes={forecastVolumes}
        forecastLabels={forecastLabels}
      />
    </div>
  </div>
);

export const ForecastActions: React.FC<ForecastActionsProps> = ({
  isBackgroundPreview = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as MetricsRouteState | null) ?? null;
  const storedModelId = (() => {
    try {
      const rawValue = localStorage.getItem("xocompass:selectedModelId");
      if (!rawValue) return null;
      const parsed = Number(rawValue);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  })();
  const storedModelVersion = (() => {
    try {
      return localStorage.getItem("xocompass:selectedModelVersion");
    } catch {
      return null;
    }
  })();

  const selectedModelId = routeState?.selectedModelId ?? storedModelId ?? 2;
  const selectedModelVersion =
    routeState?.selectedModelVersion ?? storedModelVersion ?? "v10.1";

  const [forecastOutlook, setForecastOutlook] =
    useState<ForecastOutlookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [models, setModels] = useState<BackendModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoadingModels(true);
        const data = await fetchJson<ModelsResponse>(apiRoutes.models());
        setModels(data.available_models ?? []);
      } catch (error) {
        console.error("Unable to load models:", error);
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  const hasNoData = !isLoadingModels && models.length === 0;
  const shouldShowColdStart = hasNoData && !isBackgroundPreview;
  const effectiveModelId = useMemo(() => {
    if (models.length === 0) return selectedModelId;
    return models.some((model) => model.id === selectedModelId)
      ? selectedModelId
      : models[0].id;
  }, [models, selectedModelId]);
  const effectiveModelVersion = useMemo(() => {
    if (models.length === 0) return selectedModelVersion;
    const selectedModel = models.find((model) => model.id === effectiveModelId);
    return selectedModel?.version ?? selectedModelVersion;
  }, [effectiveModelId, models, selectedModelVersion]);

  useEffect(() => {
    if (shouldShowColdStart) {
      setForecastOutlook(null);
      setIsLoading(false);
      setLoadError("");
      return;
    }

    const fetchForecastOutlook = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const data = await fetchJson<ForecastOutlookResponse>(
          apiRoutes.forecastOutlook(effectiveModelId)
        );
        setForecastOutlook(data);
      } catch (error) {
        console.error("Unable to load forecast outlook:", error);
        setLoadError("Unable to load forecast outlook.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchForecastOutlook();
  }, [effectiveModelId, shouldShowColdStart]);

  useEffect(() => {
    try {
      localStorage.setItem("xocompass:selectedModelId", String(effectiveModelId));
      localStorage.setItem("xocompass:selectedModelVersion", effectiveModelVersion);
    } catch {
      // Ignore localStorage errors in restricted environments.
    }
  }, [effectiveModelId, effectiveModelVersion]);

  const forecastData = forecastOutlook?.critical_weeks?.length
    ? forecastOutlook.critical_weeks.map((week) => ({
        month: new Date(week.week_start).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        actual: Math.max(week.forecasted_volume - 2, 0),
        predicted: week.forecasted_volume,
        lowerCI: Math.max(week.forecasted_volume - 3, 0),
        upperCI: week.forecasted_volume + 3,
      }))
    : fallbackForecastData;

  const highestForecastWeek = useMemo(() => {
    if (forecastData.length === 0) {
      return { week: "Week 1", predicted: 0 };
    }

    return forecastData.reduce(
      (max, item, index) => {
        if (item.predicted > max.predicted) {
          return {
            week: `Week ${index + 1} (${item.month})`,
            predicted: item.predicted,
          };
        }
        return max;
      },
      {
        week: `Week 1 (${forecastData[0].month})`,
        predicted: forecastData[0].predicted,
      }
    );
  }, [forecastData]);

  const riskWeeks: RiskWeekRow[] = forecastOutlook?.critical_weeks?.length
    ? forecastOutlook.critical_weeks.map((week, index) => ({
        week: `Week ${index + 1} (${new Date(week.week_start).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" }
        )})`,
        forecastedVolume: week.forecasted_volume,
        riskFactor:
          week.risk_factor === "HIGH"
            ? "High"
            : week.risk_factor === "LOW"
              ? "Low"
              : "Medium",
      }))
    : [
        { week: "Week 1", forecastedVolume: 1820, riskFactor: "Medium" },
        { week: "Week 2", forecastedVolume: 1985, riskFactor: "High" },
        { week: "Week 3", forecastedVolume: 1735, riskFactor: "Low" },
      ];

  return (
    <div className="relative min-h-full">
      <div
        className={`min-h-full bg-[#F4FFF8] px-6 py-6 -m-8 ${
          shouldShowColdStart ? "pointer-events-none select-none grayscale saturate-0" : ""
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
              Forecast & Actions
            </h1>
            <p className="mt-1 text-[14px] text-slate-600">
              Projected booking demand, risk outlook, and recommended actions for
              the next 2 weeks.{" "}
              <span className="font-medium text-slate-700">
                Model {effectiveModelVersion} (ID {effectiveModelId})
              </span>
            </p>
          </div>

        </div>

        {isLoading && (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-600 shadow-sm">
            Loading forecast stats from backend...
          </p>
        )}

        {loadError && (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 shadow-sm">
            {loadError} Showing fallback data where needed.
          </p>
        )}

        <div className="mt-6 space-y-8">
          {shouldShowColdStart ? (
            <SkeletonDashboard />
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2">
                <StatCard
                  label="Forecasted Bookings"
                  value={(
                    forecastOutlook?.forecasted_bookings_2w ?? 2847
                  ).toLocaleString("en-US")}
                  helper="Next 2 weeks total projected bookings."
                />
                <StatCard
                  label="Highest Forecast Week"
                  value={
                    forecastOutlook?.highest_forecast_week_date
                      ? new Date(
                          forecastOutlook.highest_forecast_week_date
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : highestForecastWeek.week
                  }
                  helper={`${(
                    forecastOutlook?.highest_forecast_week_value ??
                    highestForecastWeek.predicted
                  ).toLocaleString("en-US")} projected bookings`}
                />
              </section>

              <section className="grid gap-4">
                <PlaceholderPanel
                  title="Weekly Booking Demand Graph"
                  description="Placeholder for Forecast vs Actual weekly demand graph."
                  forecastVolumes={riskWeeks.map((week) => week.forecastedVolume)}
                  forecastLabels={riskWeeks.map((week) => week.week)}
                />
              </section>

              <section className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Critical Forecast Weeks
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Weeks with elevated demand risk in the near-term forecast horizon.
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-slate-600">
                            Week
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-600">
                            Forecasted Volume
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-600">
                            Risk Factor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {riskWeeks.map((row) => (
                          <tr key={row.week}>
                            <td className="px-4 py-2 text-slate-700">{row.week}</td>
                            <td className="px-4 py-2 text-slate-700">
                              {row.forecastedVolume.toLocaleString("en-US")}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  row.riskFactor === "High"
                                    ? "bg-red-100 text-red-700"
                                    : row.riskFactor === "Medium"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {row.riskFactor}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </section>
            </>
          )}
        </div>
      </div>

      {shouldShowColdStart && (
        <>
          <div className="pointer-events-none fixed inset-0 z-30 bg-white/35 backdrop-blur-2xl" />
          <div className="relative z-50">
            <SavesModal
              open={true}
              lockOpen={true}
              title="Upload your first KJS booking dataset"
              description="XoCompass is ready. Upload a dataset to generate your first model, then we will unlock live KPI cards, forecasts, and dashboard insights."
              actionLabel="Go to Saves and Upload"
              onAction={() => navigate("/saves")}
            />
          </div>
        </>
      )}
    </div>
  );
};
