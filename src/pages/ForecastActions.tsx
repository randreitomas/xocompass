import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  Clock3,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Label,
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRoutes, fetchJson } from "../lib/apiRoutes";
import { SkeletonDashboard } from "../components/dashboard/SkeletonDashboard";
import { SavesModal } from "../components/modals/SavesModal";

interface CriticalForecastWeek {
  week_start: string;
  week_end: string;
  forecasted_volume: number;
  risk_factor: string;
  confidence_tier: string;
}

interface ForecastOutlookResponse {
  forecasted_bookings_2w: number;
  highest_forecast_week_date: string;
  highest_forecast_week_value: number;
  critical_weeks: CriticalForecastWeek[];
}

interface ForecastGraphPoint {
  date: string;
  actual: number | null;
  predicted: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  confidence_tier: string | null;
}

interface ForecastGraphResponse {
  data: ForecastGraphPoint[];
}

interface StrategicAction {
  priority: string;
  category: string;
  action: string;
  trigger: string;
}

interface StrategicActionsResponse {
  actions: StrategicAction[];
  generated_for_period: string;
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

/** Maps backend risk_flag strings (e.g. HIGH/MEDIUM/LOW) to UI sentence-case labels. */
const normalizeRiskFactorLabel = (risk: string): "High" | "Medium" | "Low" => {
  const upper = risk.trim().toUpperCase();
  if (upper === "HIGH") return "High";
  if (upper === "LOW") return "Low";
  return "Medium";
};

interface StatCardProps {
  id: string;
  label: string;
  value: string;
  helper: string;
  implication: string;
  icon: React.ReactNode;
  isFlipped: boolean;
  onToggle: (id: string) => void;
}

type CriticalWeekHorizonLabel =
  | "Forecast History"
  | "Forecasted 2 Weeks"
  | "Forecasted Beyond 2 Weeks"
  | "—";

interface RiskWeekRow {
  week: string;
  horizonStatus: CriticalWeekHorizonLabel;
  forecastedVolume: number;
  riskFactor: "High" | "Medium" | "Low";
}

const normalizeGraphDateKey = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const weekIntervalsOverlap = (
  critStartIso: string,
  critEndIso: string,
  graphWeekStartIso: string
): boolean => {
  const cs = new Date(critStartIso).getTime();
  const ce = new Date(critEndIso).getTime();
  const rs = new Date(graphWeekStartIso).getTime();
  if (Number.isNaN(cs) || Number.isNaN(ce) || Number.isNaN(rs)) return false;
  const re = rs + 7 * 24 * 60 * 60 * 1000;
  return cs < re && ce > rs;
};

/** Aligns a critical week with the same history / near / beyond slices as the demand chart. */
const classifyCriticalWeekHorizon = (
  week: CriticalForecastWeek,
  graphRows: ForecastGraphPoint[],
  historicalHorizonWeeks: number,
  nearForecastHorizonWeeks: number
): CriticalWeekHorizonLabel => {
  if (graphRows.length === 0) return "—";

  const backtestRows = graphRows.filter(
    (row) => row.actual != null && row.predicted != null
  );
  const forwardRows = graphRows.filter(
    (row) => row.actual == null && row.predicted != null
  );
  const histSlice = backtestRows.slice(-historicalHorizonWeeks);
  const nearCap = Math.min(nearForecastHorizonWeeks, forwardRows.length);

  const startKey = normalizeGraphDateKey(week.week_start);
  const endKey = normalizeGraphDateKey(week.week_end);

  for (const row of histSlice) {
    const k = normalizeGraphDateKey(row.date);
    if (k && (k === startKey || k === endKey)) return "Forecast History";
  }
  for (let i = 0; i < forwardRows.length; i++) {
    const k = normalizeGraphDateKey(forwardRows[i].date);
    if (k && (k === startKey || k === endKey)) {
      return i < nearCap ? "Forecasted 2 Weeks" : "Forecasted Beyond 2 Weeks";
    }
  }

  for (const row of histSlice) {
    if (weekIntervalsOverlap(week.week_start, week.week_end, row.date)) {
      return "Forecast History";
    }
  }
  for (let i = 0; i < forwardRows.length; i++) {
    if (weekIntervalsOverlap(week.week_start, week.week_end, forwardRows[i].date)) {
      return i < nearCap ? "Forecasted 2 Weeks" : "Forecasted Beyond 2 Weeks";
    }
  }

  return "—";
};

const horizonStatusBadgeClass = (status: CriticalWeekHorizonLabel) => {
  switch (status) {
    case "Forecast History":
      return "bg-slate-100 text-slate-700";
    case "Forecasted 2 Weeks":
      return "bg-emerald-100 text-emerald-800";
    case "Forecasted Beyond 2 Weeks":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-50 text-slate-500";
  }
};

interface DemandSeriesPoint {
  week: string;
  forecastHistory: number | null;
  forecastNear: number | null;
  forecastBeyond: number | null;
  lowerCI: number | null;
  upperCI: number | null;
  transition: number | null;
  zoneBase?: number;
  historyTopBand?: number | null;
  nearTopBand?: number | null;
  beyondTopBand?: number | null;
}

const formatWeekLabel = (date: Date) => {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();
  const weekOfMonth = Math.max(1, Math.min(5, Math.ceil(date.getDate() / 7)));
  return `${month} W${weekOfMonth} ${year}`;
};

const StatCard: React.FC<StatCardProps> = ({
  id,
  label,
  value,
  helper,
  implication,
  icon,
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
        <span className="absolute bottom-4 right-4 inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-teal-600">
          {icon}
        </span>
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
  historyWeeks: number;
  nearForecastWeeks: number;
}> = ({ data, historyWeeks, nearForecastWeeks }) => {
  const historyEndIndex = historyWeeks > 0 ? Math.min(historyWeeks - 1, Math.max(data.length - 1, 0)) : -1;
  const nearForecastStartIndex = historyWeeks;
  const nearForecastEndIndex =
    nearForecastWeeks > 0
      ? Math.min(historyWeeks + nearForecastWeeks - 1, Math.max(data.length - 1, 0))
      : Math.max(historyWeeks - 1, 0);
  const beyondForecastStartIndex = historyWeeks + nearForecastWeeks;
  const maxUpperCi = data.reduce((max, point) => Math.max(max, point.upperCI ?? 0), 0);
  const chartCeiling = Math.max(12, Number((maxUpperCi * 1.14).toFixed(1)));
  const chartData = data.map((point, index) => {
    const zoneBase = point.upperCI ?? 0;
    const headroom = Math.max(Number((chartCeiling - zoneBase).toFixed(2)), 0);
    return {
      ...point,
      zoneBase,
      historyTopBand: index <= historyEndIndex ? headroom : null,
      nearTopBand:
        index >= nearForecastStartIndex && index <= nearForecastEndIndex ? headroom : null,
      beyondTopBand: index >= beyondForecastStartIndex ? headroom : null,
    };
  });

  return (
    <div className="mt-4 h-[21rem] rounded-xl border border-slate-200 bg-white p-3">
      <div className="relative flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 18, right: 12, left: 2, bottom: 52 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "#6B7280" }}
          interval={0}
          angle={-32}
          textAnchor="end"
          height={56}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#6B7280" }}
          allowDecimals={false}
          domain={[0, chartCeiling]}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            borderColor: "#E5E7EB",
            fontSize: 12,
          }}
          formatter={(value, name) => {
            if (
              name === "__zone-base" ||
              name === "__history-top-band" ||
              name === "__near-top-band" ||
              name === "__beyond-top-band"
            ) {
              return null;
            }
            const numericValue = typeof value === "number" ? value : Number(value);
            return Number.isFinite(numericValue)
              ? [numericValue.toLocaleString("en-US"), name]
              : ["—", name];
          }}
        />
        <Area
          type="monotone"
          dataKey="zoneBase"
          name="__zone-base"
          stackId="zone-cap"
          stroke="none"
          fill="transparent"
          legendType="none"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="historyTopBand"
          name="__history-top-band"
          stackId="zone-cap"
          stroke="none"
          fill="#E5E7EB"
          fillOpacity={0.8}
          legendType="none"
          isAnimationActive={false}
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="nearTopBand"
          name="__near-top-band"
          stackId="zone-cap"
          stroke="none"
          fill="#CCFBF1"
          fillOpacity={0.75}
          legendType="none"
          isAnimationActive={false}
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="beyondTopBand"
          name="__beyond-top-band"
          stackId="zone-cap"
          stroke="none"
          fill="#FFFBEB"
          fillOpacity={0.85}
          legendType="none"
          isAnimationActive={false}
          connectNulls={false}
        />
        {historyWeeks > 0 && data[historyEndIndex]?.week != null ? (
          <ReferenceLine
            x={data[historyEndIndex].week}
            stroke="#475569"
            strokeDasharray="6 4"
            strokeWidth={2}
          >
            <Label
              position="top"
              value="Forecast start"
              fill="#334155"
              fontSize={11}
              offset={10}
            />
          </ReferenceLine>
        ) : null}
        {nearForecastWeeks > 0 &&
        data[nearForecastEndIndex]?.week != null &&
        nearForecastEndIndex !== historyEndIndex ? (
          <ReferenceLine
            x={data[nearForecastEndIndex].week}
            stroke="#475569"
            strokeDasharray="6 4"
            strokeWidth={2}
          >
            <Label
              position="top"
              value="Weather API confidence"
              fill="#334155"
              fontSize={11}
              offset={10}
            />
          </ReferenceLine>
        ) : null}
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
          dataKey="forecastHistory"
          name="Forecasted (History)"
          stroke="#0D9488"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
          connectNulls={false}
        />
        {historyWeeks > 0 ? (
          <ReferenceLine
            x={data[Math.max(Math.floor(historyWeeks / 2), 0)]?.week}
            strokeOpacity={0}
          >
            <Label
              position="insideTop"
              value="Forecast History"
              fill="#475569"
              fontSize={11}
              offset={6}
            />
          </ReferenceLine>
        ) : null}
        <Line
          type="monotone"
          dataKey="forecastNear"
          name="Forecasted (Next 2 Weeks)"
          stroke="#14B8A6"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="forecastBeyond"
          name="Forecasted (Beyond 2 Weeks)"
          stroke="#06B6D4"
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
          dataKey="transition"
          name="Transition"
          stroke="#0D9488"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          legendType="none"
          isAnimationActive={false}
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2 py-0.5 font-semibold text-teal-700">
              <span className="h-2 w-2 rounded-full bg-teal-600" />
            Forecasted (History)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2 py-0.5 font-semibold text-teal-700">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              Forecasted (Next 2 Weeks)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-2 py-0.5 font-semibold text-cyan-700">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              Forecasted (Beyond 2 Weeks)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Higher confidence (weather-backed)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Lower confidence (beyond weather window)
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
};

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
  const [forecastGraph, setForecastGraph] = useState<ForecastGraphResponse | null>(null);
  const [strategicActions, setStrategicActions] =
    useState<StrategicActionsResponse | null>(null);
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
      setForecastGraph(null);
      setStrategicActions(null);
      setIsLoading(false);
      setLoadError("");
      return;
    }

    const fetchForecastOutlook = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const [outlookData, graphData] = await Promise.all([
          fetchJson<ForecastOutlookResponse>(apiRoutes.forecastKpis(effectiveModelId)),
          fetchJson<ForecastGraphResponse>(apiRoutes.forecastGraph(effectiveModelId)),
        ]);

        setForecastOutlook(outlookData);
        setForecastGraph(graphData);

        try {
          const strategicData = await fetchJson<StrategicActionsResponse>(
            apiRoutes.strategicActions(effectiveModelId)
          );
          setStrategicActions(strategicData);
        } catch (strategicError) {
          console.error("Unable to load strategic actions:", strategicError);
          setStrategicActions({ actions: [], generated_for_period: "" });
        }
      } catch (error) {
        console.error("Unable to load forecast outlook:", error);
        setLoadError("Unable to load forecast outlook.");
        setStrategicActions(null);
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

  const historicalHorizonWeeks = 4;
  const nearForecastHorizonWeeks = 2;
  const forecastHorizonWeeks = 2;

  const hasOutlook = Boolean(forecastOutlook);
  const totalForecastedBookings = forecastOutlook?.forecasted_bookings_2w;
  const averageWeeklyForecast =
    hasOutlook && totalForecastedBookings != null
      ? totalForecastedBookings / forecastHorizonWeeks
      : null;

  const riskWeeks: RiskWeekRow[] = useMemo(() => {
    const critical = forecastOutlook?.critical_weeks ?? [];
    const graphRows = forecastGraph?.data ?? [];
    return critical.map((week) => ({
      week: `${new Date(week.week_start).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} – ${new Date(week.week_end).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`,
      horizonStatus: classifyCriticalWeekHorizon(
        week,
        graphRows,
        historicalHorizonWeeks,
        nearForecastHorizonWeeks
      ),
      forecastedVolume: week.forecasted_volume,
      riskFactor: normalizeRiskFactorLabel(week.risk_factor),
    }));
  }, [
    forecastOutlook?.critical_weeks,
    forecastGraph?.data,
    historicalHorizonWeeks,
    nearForecastHorizonWeeks,
  ]);

  const demandSeriesBundle = useMemo(() => {
    const graphRows = forecastGraph?.data ?? [];
    if (graphRows.length === 0) {
      return {
        series: [] as DemandSeriesPoint[],
        historyPointCount: 0,
        nearForecastPointCount: 0,
      };
    }

    const backtestRows = graphRows.filter(
      (row) => row.actual != null && row.predicted != null
    );
    const forwardRows = graphRows.filter(
      (row) => row.actual == null && row.predicted != null
    );
    const histSlice = backtestRows.slice(-historicalHorizonWeeks);
    const nearCap = Math.min(nearForecastHorizonWeeks, forwardRows.length);

    const historicalRows: DemandSeriesPoint[] = histSlice.map((row, index) => {
      const historicalDate = new Date(row.date);
      const predictedValue = row.predicted as number;
      const lowerCI = row.lower_bound ?? predictedValue;
      const upperCI = row.upper_bound ?? predictedValue;
      return {
        week: formatWeekLabel(historicalDate),
        forecastHistory: predictedValue,
        forecastNear: null,
        forecastBeyond: null,
        lowerCI,
        upperCI,
        transition: index === histSlice.length - 1 ? predictedValue : null,
      };
    });

    const forecastRows: DemandSeriesPoint[] = forwardRows.map((graphRow, index) => {
      const forecastDate = new Date(graphRow.date);
      const predictedValue = graphRow.predicted as number;
      const lowerCI = graphRow.lower_bound ?? predictedValue;
      const upperCI = graphRow.upper_bound ?? predictedValue;
      const isNear = index < nearCap;
      return {
        week: formatWeekLabel(forecastDate),
        forecastHistory: null,
        forecastNear: isNear ? predictedValue : null,
        forecastBeyond: !isNear ? predictedValue : null,
        lowerCI,
        upperCI,
        transition: index === 0 ? predictedValue : null,
      };
    });

    return {
      series: [...historicalRows, ...forecastRows],
      historyPointCount: histSlice.length,
      nearForecastPointCount: nearCap,
    };
  }, [forecastGraph?.data, historicalHorizonWeeks, nearForecastHorizonWeeks]);

  const demandSeries = demandSeriesBundle.series;

  const actionableInsights = useMemo(() => {
    const backendActions = strategicActions?.actions ?? [];
    if (backendActions.length > 0) {
      const lines = backendActions.map((item) => item.action.trim()).filter(Boolean);
      return [...new Set(lines)];
    }

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
    const criticalVolumes =
      forecastOutlook?.critical_weeks?.map((week) => week.forecasted_volume) ?? [];
    if (criticalVolumes.length >= 2) {
      const first = criticalVolumes[0];
      const last = criticalVolumes[criticalVolumes.length - 1];
      if (last > first) {
        insights.push(
          "Demand trend is rising across critical forecast weeks; increase seat allocation and support coverage."
        );
      } else if (last < first) {
        insights.push(
          "Demand trend is softening across critical forecast weeks; prioritize margin optimization and route-level efficiency."
        );
      }
    }
    if (insights.length === 0) {
      insights.push(
        "No strategic actions were returned for this forecast snapshot."
      );
    }
    return insights;
  }, [forecastOutlook?.critical_weeks, riskWeeks, strategicActions?.actions]);
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
            {loadError}
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
                  icon={<CalendarRange className="h-4 w-4" />}
                  isFlipped={Boolean(flippedKpis["forecast-horizon"])}
                  onToggle={toggleKpiCard}
                />
                <StatCard
                  id="total-forecasted-bookings"
                  label="Total Forecasted Bookings"
                  value={
                    hasOutlook && totalForecastedBookings != null
                      ? totalForecastedBookings.toLocaleString("en-US")
                      : "—"
                  }
                  helper="Projected bookings across the horizon."
                  implication="Represents expected booking load to guide seat allocation and revenue planning."
                  icon={<TrendingUp className="h-4 w-4" />}
                  isFlipped={Boolean(flippedKpis["total-forecasted-bookings"])}
                  onToggle={toggleKpiCard}
                />
                <StatCard
                  id="average-weekly-forecast"
                  label="Average Weekly Forecast"
                  value={
                    averageWeeklyForecast != null ? averageWeeklyForecast.toFixed(1) : "—"
                  }
                  helper="Mean projected bookings per forecast week."
                  implication="Provides a baseline weekly demand level for staffing and campaign pacing decisions."
                  icon={<Clock3 className="h-4 w-4" />}
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
                          year: "numeric",
                        })
                      : "—"
                  }
                  helper={
                    forecastOutlook
                      ? `${forecastOutlook.highest_forecast_week_value.toLocaleString(
                          "en-US"
                        )} projected bookings`
                      : "Peak forecast week not returned for this model."
                  }
                  implication="Highlights the most capacity-sensitive week where pre-emptive actions have the highest impact."
                  icon={<Zap className="h-4 w-4" />}
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
                    4-week forecasted history, 2-week near forecast, and 10-week extended forecast with confidence band.
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <p className="font-semibold text-slate-900">Forecasted (History)</p>
                      <p className="mt-1">Backtest window to show how prior forecasts performed versus realized demand.</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      <p className="font-semibold text-emerald-900">Next 2 Weeks - Higher Confidence</p>
                      <p className="mt-1">Uses near-term exogenous signals including OpenMeteo weather (more reliable horizon).</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <p className="font-semibold text-amber-900">Beyond 2 Weeks - Lower Confidence</p>
                      <p className="mt-1">Extended using historical weather proxy patterns; uncertainty band is intentionally wider.</p>
                    </div>
                  </div>
                  {demandSeries.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      No forecast graph points returned from the API for this model.
                    </p>
                  ) : (
                    <WeeklyDemandChart
                      data={demandSeries}
                      historyWeeks={demandSeriesBundle.historyPointCount}
                      nearForecastWeeks={demandSeriesBundle.nearForecastPointCount}
                    />
                  )}
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Critical Forecast Weeks
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Weeks with elevated demand risk in the near-term forecast horizon. Status matches
                    the weekly demand chart: forecast history (backtest window), next two weeks, or
                    beyond two weeks.
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-slate-600">
                            Week
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-600">
                            Status
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
                        {riskWeeks.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-6 text-center text-slate-500"
                            >
                              No critical forecast weeks returned from the API.
                            </td>
                          </tr>
                        ) : null}
                        {riskWeeks.map((row, rowIndex) => (
                          <tr key={`${row.week}-${rowIndex}`}>
                            <td className="px-4 py-2 text-slate-700">{row.week}</td>
                            <td className="px-4 py-2">
                              <span
                                className={`inline-block max-w-[14rem] rounded-full px-2 py-1 text-xs font-semibold ${horizonStatusBadgeClass(
                                  row.horizonStatus
                                )}`}
                              >
                                {row.horizonStatus}
                              </span>
                            </td>
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
