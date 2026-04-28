import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Label,
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceLine,
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
  id: string;
  label: string;
  value: string;
  helper: string;
  implication: string;
  isFlipped: boolean;
  onToggle: (id: string) => void;
}

interface RiskWeekRow {
  week: string;
  forecastedVolume: number;
  riskFactor: "High" | "Medium" | "Low";
}

interface DemandSeriesPoint {
  week: string;
  historical: number | null;
  forecast: number | null;
  lowerCI: number | null;
  upperCI: number | null;
}

const toWeekOrdinal = (dayOfMonth: number) => {
  const weekIndex = Math.max(1, Math.min(5, Math.ceil(dayOfMonth / 7)));
  if (weekIndex === 1) return "1st";
  if (weekIndex === 2) return "2nd";
  if (weekIndex === 3) return "3rd";
  return `${weekIndex}th`;
};

const formatWeekLabel = (date: Date) => {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${month} W${Math.max(1, Math.min(5, Math.ceil(date.getDate() / 7)))}`;
};

const fallbackForecastData: ForecastPoint[] = [
  { month: "Jan", actual: 280, predicted: 295, lowerCI: 260, upperCI: 330 },
  { month: "Feb", actual: 310, predicted: 320, lowerCI: 290, upperCI: 350 },
  { month: "Mar", actual: 340, predicted: 355, lowerCI: 320, upperCI: 390 },
  { month: "Apr", actual: 360, predicted: 380, lowerCI: 345, upperCI: 420 },
];

const StatCard: React.FC<StatCardProps> = ({
  id,
  label,
  value,
  helper,
  implication,
  isFlipped,
  onToggle,
}) => (
  <button
    type="button"
    onClick={() => onToggle(id)}
    className="group perspective h-56 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 xl:h-52"
    aria-pressed={isFlipped}
    aria-label={`Flip ${label} KPI card`}
  >
    <div
      className={`relative h-full w-full transform-style-preserve-3d rounded-2xl transition-transform duration-500 ${
        isFlipped ? "rotate-y-180" : ""
      }`}
    >
      <div className="backface-hidden absolute inset-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        <p className="mt-4 text-xs font-medium text-teal-700">Click card to view implication.</p>
      </div>
      <div className="backface-hidden rotate-y-180 absolute inset-0 flex min-h-0 flex-col rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{label}</p>
        <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          <p className="text-sm text-teal-900">{helper}</p>
          <p className="text-sm leading-relaxed text-teal-900">{implication}</p>
        </div>
        <p className="mt-3 text-xs font-medium text-teal-700">Click card to return.</p>
      </div>
    </div>
  </button>
);

const WeeklyDemandChart: React.FC<{
  data: DemandSeriesPoint[];
  splitIndex: number;
}> = ({ data, splitIndex }) => (
  <div className="mt-4 h-[21rem] rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 18, right: 12, left: 2, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#6B7280" }}
          interval={1}
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
          formatter={(value: number | null, name: string) =>
            value == null ? ["—", name] : [value.toLocaleString("en-US"), name]
          }
        />
        <ReferenceLine
          x={data[Math.max(splitIndex - 1, 0)]?.week}
          stroke="#64748B"
          strokeDasharray="6 4"
          strokeWidth={1.5}
        >
          <Label
            position="top"
            value="Forecast starts"
            fill="#334155"
            fontSize={11}
            offset={10}
          />
        </ReferenceLine>
        <Area
          type="monotone"
          dataKey="upperCI"
          stroke="none"
          fill="#99F6E4"
          fillOpacity={0.35}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="lowerCI"
          stroke="none"
          fill="#ffffff"
          fillOpacity={1}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="historical"
          name="Historical"
          stroke="#0F172A"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
          connectNulls={false}
        />
        <ReferenceLine
          x={data[Math.max(Math.floor(splitIndex / 2), 0)]?.week}
          strokeOpacity={0}
        >
          <Label
            position="insideTop"
            value="Historical"
            fill="#475569"
            fontSize={11}
            offset={6}
          />
        </ReferenceLine>
        <Line
          type="monotone"
          dataKey="forecast"
          name="Forecasted"
          stroke="#0D9488"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="upperCI"
          name="Upper CI"
          stroke="#14B8A6"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="lowerCI"
          name="Lower CI"
          stroke="#14B8A6"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          dot={false}
          connectNulls={false}
        />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 shrink-0 pt-1">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            Historical
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2 py-0.5 font-semibold text-teal-700">
            <span className="h-2 w-2 rounded-full bg-teal-600" />
            Forecasted (Next 2 Weeks)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-700">
            <span className="h-[2px] w-3 border-t-2 border-dashed border-teal-500" />
            Upper CI
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-700">
            <span className="h-[2px] w-3 border-t-2 border-dashed border-teal-500" />
            Lower CI
          </span>
        </div>
      </div>
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
  const [flippedKpis, setFlippedKpis] = useState<Record<string, boolean>>({});

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
  const historicalHorizonWeeks = 16;
  const forecastHorizonWeeks = 2;
  const totalForecastedBookings = forecastOutlook?.forecasted_bookings_2w ?? 2847;
  const averageWeeklyForecast = totalForecastedBookings / forecastHorizonWeeks;

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
  const demandSeries = useMemo<DemandSeriesPoint[]>(() => {
    const historicalSeed = [8, 9, 10, 10, 9, 11, 11, 10, 9, 10, 9, 8, 9, 11, 12, 12];
    const firstForecastDate =
      forecastOutlook?.critical_weeks?.[0]?.week_start != null
        ? new Date(forecastOutlook.critical_weeks[0].week_start)
        : new Date();
    const historicalRows = historicalSeed.map((value, index) => {
      const historicalDate = new Date(firstForecastDate);
      historicalDate.setDate(firstForecastDate.getDate() - (historicalSeed.length - index) * 7);
      return {
        week: formatWeekLabel(historicalDate),
      historical: value,
      forecast: null,
      lowerCI: null,
      upperCI: null,
      };
    });
    const forecastRows = forecastData.map((item, index) => {
      const forecastDate =
        forecastOutlook?.critical_weeks?.[index]?.week_start != null
          ? new Date(forecastOutlook.critical_weeks[index].week_start)
          : (() => {
              const derived = new Date(firstForecastDate);
              derived.setDate(firstForecastDate.getDate() + index * 7);
              return derived;
            })();
      return {
      week: formatWeekLabel(forecastDate),
      historical: null,
      forecast: item.predicted,
      lowerCI: item.lowerCI,
      upperCI: item.upperCI,
      };
    });
    return [...historicalRows, ...forecastRows];
  }, [forecastData, forecastOutlook?.critical_weeks, historicalHorizonWeeks]);
  const actionableInsights = useMemo(() => {
    const insights: string[] = [];
    const highRiskCount = riskWeeks.filter((week) => week.riskFactor === "High").length;
    const mediumRiskCount = riskWeeks.filter((week) => week.riskFactor === "Medium").length;
    if (highRiskCount > 0) {
      insights.push(
        `Allocate surge capacity for ${highRiskCount} high-risk week${highRiskCount > 1 ? "s" : ""} to prevent booking spillover.`
      );
    }
    if (mediumRiskCount > 0) {
      insights.push(
        `Launch targeted promos and staffing adjustments for ${mediumRiskCount} medium-risk week${mediumRiskCount > 1 ? "s" : ""}.`
      );
    }
    const forecastValues = forecastData.map((item) => item.predicted);
    if (forecastValues.length >= 2 && forecastValues[forecastValues.length - 1] > forecastValues[0]) {
      insights.push("Demand trend is rising across the horizon; increase seat allocation and support coverage.");
    } else if (forecastValues.length >= 2) {
      insights.push("Demand trend is flattening; prioritize margin optimization and route-level efficiency.");
    }
    if (insights.length === 0) {
      insights.push("Current forecast is stable; maintain baseline operations and monitor weekly variance.");
    }
    return [
      ...insights,
      "Coordinate with partner agencies two weeks ahead to secure surge booking support.",
      "Prepare standby marketing creatives for rapid campaign activation during demand spikes.",
      "Set a weekly forecast variance review cadence with operations and commercial teams.",
    ];
  }, [forecastData, riskWeeks]);
  const toggleKpiCard = (cardId: string) => {
    setFlippedKpis((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  return (
    <div className="relative min-h-full">
      <div
        className={`min-h-full bg-[#F9FAFB] px-6 py-6 -m-8 ${
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
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  id="forecast-horizon"
                  label="Forecast Horizon"
                  value={`${forecastHorizonWeeks} weeks`}
                  helper="Default planning window for short-term demand."
                  implication="Defines the operational planning window and staffing cadence for short-term execution."
                  isFlipped={Boolean(flippedKpis["forecast-horizon"])}
                  onToggle={toggleKpiCard}
                />
                <StatCard
                  id="total-forecasted-bookings"
                  label="Total Forecasted Bookings"
                  value={totalForecastedBookings.toLocaleString("en-US")}
                  helper="Projected bookings across the horizon."
                  implication="Represents expected booking load to guide seat allocation and revenue planning."
                  isFlipped={Boolean(flippedKpis["total-forecasted-bookings"])}
                  onToggle={toggleKpiCard}
                />
                <StatCard
                  id="average-weekly-forecast"
                  label="Average Weekly Forecast"
                  value={averageWeeklyForecast.toFixed(1)}
                  helper="Mean projected bookings per forecast week."
                  implication="Provides a baseline weekly demand level for staffing and campaign pacing decisions."
                  isFlipped={Boolean(flippedKpis["average-weekly-forecast"])}
                  onToggle={toggleKpiCard}
                />
                <StatCard
                  id="peak-forecast-week"
                  label="Peak Forecast Week"
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
                  implication="Highlights the most capacity-sensitive week where pre-emptive actions have the highest impact."
                  isFlipped={Boolean(flippedKpis["peak-forecast-week"])}
                  onToggle={toggleKpiCard}
                />
              </section>

              <section className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Weekly Booking Demand Graph
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Historical trend and forecast outlook with confidence band.
                  </p>
                  <WeeklyDemandChart data={demandSeries} splitIndex={historicalHorizonWeeks} />
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
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
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Actionable Insights
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Recommended actions based on demand trend and critical weeks.
                  </p>
                  <ul className="mt-4 space-y-3">
                    {actionableInsights.map((insight) => (
                      <li key={insight} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
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
