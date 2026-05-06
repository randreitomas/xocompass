import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronDown,
  ChevronUp,
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
import { formatApiErrorForUi } from "../lib/formatApiError";
import { resolveEffectiveModelId } from "../lib/resolveDashboardModel";
import * as dashboardService from "../services/dashboardService";
import type { components } from "../types/api";
import { SkeletonDashboard } from "../components/dashboard/SkeletonDashboard";
import { SavesModal } from "../components/modals/SavesModal";

type ForecastOutlookResponse = components["schemas"]["ForecastOutlookResponse"];
type ForecastGraphResponse = components["schemas"]["ForecastGraphResponse"];
type StrategicActionsResponse = components["schemas"]["StrategicActionsResponse"];
type ModelDropdownItem = components["schemas"]["ModelDropdownItem"];
type CriticalForecastWeek = components["schemas"]["CriticalForecastWeek"];
type ForecastGraphPoint = components["schemas"]["ForecastGraphPoint"];

interface MetricsRouteState {
  selectedModelId?: number;
  selectedModelVersion?: string;
}

interface ForecastActionsProps {
  isBackgroundPreview?: boolean;
}

type RiskFactorLabel = "Critical" | "High" | "Medium" | "Low";

/** Maps backend risk_flag strings (e.g. HIGH/MEDIUM/LOW/CRITICAL) to UI sentence-case labels. */
const normalizeRiskFactorLabel = (risk: string): RiskFactorLabel => {
  const upper = risk.trim().toUpperCase();
  if (upper === "CRITICAL") return "Critical";
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
  ciRatio: number | null;
  ciGap: number | null;
  riskFactor: RiskFactorLabel;
}

const readNumericField = (row: ForecastGraphPoint, keys: string[]): number | null => {
  const record = row as Record<string, unknown>;
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const readStringField = (row: ForecastGraphPoint, keys: string[]): string | null => {
  const record = row as Record<string, unknown>;
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  }
  return null;
};

const findMatchingCriticalWeekGraphPoint = (
  week: CriticalForecastWeek,
  graphRows: ForecastGraphPoint[]
): ForecastGraphPoint | null => {
  const startKey = normalizeGraphDateKey(week.week_start);
  const endKey = normalizeGraphDateKey(week.week_end ?? week.week_start);

  const exactStart = graphRows.find((row) => normalizeGraphDateKey(row.date) === startKey);
  if (exactStart) return exactStart;

  const exactEnd = graphRows.find((row) => normalizeGraphDateKey(row.date) === endKey);
  if (exactEnd) return exactEnd;

  const weekEndIso = week.week_end ?? week.week_start;
  const overlapping = graphRows.filter((row) =>
    weekIntervalsOverlap(week.week_start, weekEndIso, row.date)
  );
  if (overlapping.length === 0) return null;

  const forwardOverlap = overlapping.find((row) => row.actual == null && row.predicted != null);
  return forwardOverlap ?? overlapping[0];
};

const deriveCriticalWeekBackendMetrics = (
  week: CriticalForecastWeek,
  graphRows: ForecastGraphPoint[]
): { ciRatio: number | null; ciGap: number | null; riskFactor: RiskFactorLabel | null } => {
  const matchedRow = findMatchingCriticalWeekGraphPoint(week, graphRows);
  if (!matchedRow) {
    return { ciRatio: null, ciGap: null, riskFactor: null };
  }

  const ciRatio = readNumericField(matchedRow, ["ci_ratio", "ciRatio"]);
  const ciGap = readNumericField(matchedRow, ["ci_gap", "ciGap"]);
  const riskFactorRaw = readStringField(matchedRow, [
    "risk_factor",
    "riskFactor",
    "confidence_tier",
  ]);
  const riskFactor = riskFactorRaw ? normalizeRiskFactorLabel(riskFactorRaw) : null;

  return {
    ciRatio: ciRatio != null && Number.isFinite(ciRatio) ? Number(ciRatio.toFixed(2)) : null,
    ciGap: ciGap != null && Number.isFinite(ciGap) ? Number(ciGap.toFixed(2)) : null,
    riskFactor,
  };
};

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
  const weekEndIso = week.week_end ?? week.week_start;
  const endKey = normalizeGraphDateKey(weekEndIso);

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
    if (weekIntervalsOverlap(week.week_start, weekEndIso, row.date)) {
      return "Forecast History";
    }
  }
  for (let i = 0; i < forwardRows.length; i++) {
    if (weekIntervalsOverlap(week.week_start, weekEndIso, forwardRows[i].date)) {
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

/** Row injected on chart points for the unified forward line */
type DemandChartDatum = DemandSeriesPoint & {
  forecastForwardUnified?: number | null;
};

const DEMAND_TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  boxShadow:
    "0 12px 28px -8px rgb(15 23 42 / 0.22), 0 4px 12px -4px rgb(15 23 42 / 0.14)",
  fontSize: 13,
  fontWeight: 500,
  color: "#0f172a",
  padding: "10px 14px",
} as const;

const DemandChartTooltip: React.FC<{
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: DemandChartDatum }>;
  label?: string | number;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const rows: { label: string; value: number }[] = [];

  const pushIfFinite = (lbl: string, raw: number | null | undefined) => {
    if (raw == null) return;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return;
    rows.push({ label: lbl, value: n });
  };

  pushIfFinite("Forecasted (History)", d.forecastHistory);
  pushIfFinite("Forecasted (forward)", d.forecastForwardUnified);
  pushIfFinite("Upper CI", d.upperCI);
  pushIfFinite("Lower CI", d.lowerCI);

  if (rows.length === 0) return null;

  return (
    <div style={DEMAND_TOOLTIP_STYLE}>
      <p
        style={{
          color: "#1e293b",
          fontWeight: 700,
          marginBottom: 6,
          marginTop: 0,
        }}
      >
        {label != null ? String(label) : ""}
      </p>
      {rows.map((row) => (
        <p
          key={row.label}
          style={{ color: "#0f172a", paddingTop: 2, paddingBottom: 2, margin: 0 }}
        >
          <span className="text-slate-500">{row.label}: </span>
          <span className="font-semibold tabular-nums">
            {row.value.toLocaleString("en-US")}
          </span>
        </p>
      ))}
    </div>
  );
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
    /** One series for all forward predictions — avoids a gap between near vs beyond Recharts lines. */
    const forecastForwardUnified = point.forecastNear ?? point.forecastBeyond ?? null;
    return {
      ...point,
      forecastForwardUnified,
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
          wrapperStyle={{ outline: "none", zIndex: 40 }}
          cursor={{ stroke: "#64748b", strokeWidth: 1, strokeDasharray: "4 3" }}
          content={DemandChartTooltip}
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
          name="__upper-ci-band"
          stroke="#14B8A6"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="#99F6E4"
          fillOpacity={0.35}
          legendType="none"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="lowerCI"
          name="__lower-ci-band"
          stroke="#14B8A6"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="#ffffff"
          fillOpacity={1}
          legendType="none"
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
          dataKey="forecastForwardUnified"
          name="Forecasted (forward)"
          stroke="#14B8A6"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
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
              Forecasted (forward, continuous)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Higher confidence (weather-backed)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Lower confidence (beyond weather window)
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

  const preferredModelId =
    routeState?.selectedModelId ?? storedModelId ?? null;
  const preferredModelVersion =
    routeState?.selectedModelVersion ?? storedModelVersion ?? "";

  const [forecastOutlook, setForecastOutlook] =
    useState<ForecastOutlookResponse | null>(null);
  const [forecastGraph, setForecastGraph] = useState<ForecastGraphResponse | null>(null);
  const [strategicActions, setStrategicActions] =
    useState<StrategicActionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [models, setModels] = useState<ModelDropdownItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [flippedKpis, setFlippedKpis] = useState<Record<string, boolean>>({});
  const [expandedRiskLegends, setExpandedRiskLegends] = useState<
    Record<RiskFactorLabel, boolean>
  >({
    Low: false,
    Medium: false,
    High: false,
    Critical: false,
  });

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoadingModels(true);
        const data = await dashboardService.getModels();
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
  const effectiveModelId = useMemo(
    () => resolveEffectiveModelId(models, preferredModelId),
    [models, preferredModelId]
  );
  const effectiveModelVersion = useMemo(() => {
    if (effectiveModelId == null) return preferredModelVersion;
    const selectedModel = models.find((model) => model.id === effectiveModelId);
    return selectedModel?.version ?? preferredModelVersion;
  }, [effectiveModelId, models, preferredModelVersion]);

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
      if (effectiveModelId == null) return;
      try {
        setIsLoading(true);
        setLoadError("");

        const [outlookData, graphData] = await Promise.all([
          dashboardService.getForecastOutlook(effectiveModelId),
          dashboardService.getForecastGraph(effectiveModelId),
        ]);

        setForecastOutlook(outlookData);
        setForecastGraph(graphData);

        try {
          const strategicData = await dashboardService.getStrategicActions(
            effectiveModelId
          );
          setStrategicActions(strategicData);
        } catch (strategicError) {
          console.error("Unable to load strategic actions:", strategicError);
          setStrategicActions({ actions: [], generated_for_period: "" });
        }
      } catch (error) {
        console.error("Unable to load forecast outlook:", error);
        setLoadError(formatApiErrorForUi(error));
        setStrategicActions(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForecastOutlook();
  }, [effectiveModelId, shouldShowColdStart]);

  useEffect(() => {
    if (effectiveModelId == null) return;
    try {
      localStorage.setItem("xocompass:selectedModelId", String(effectiveModelId));
      localStorage.setItem("xocompass:selectedModelVersion", effectiveModelVersion);
    } catch {
      // Ignore localStorage errors in restricted environments.
    }
  }, [effectiveModelId, effectiveModelVersion]);

  const historicalHorizonWeeks = 4;
  const nearForecastHorizonWeeks = 2;

  /** Forward-only rows from the forecast graph (actual null, predicted set). */
  const forwardForecastMetrics = useMemo(() => {
    const rows = forecastGraph?.data ?? [];
    const forward = rows.filter((r) => r.actual == null && r.predicted != null);
    const weekCount = forward.length;
    const total = forward.reduce((sum, r) => sum + Number(r.predicted ?? 0), 0);
    return { weekCount, total };
  }, [forecastGraph?.data]);

  const usesGraphForwardHorizon = forwardForecastMetrics.weekCount > 0;
  const forecastHorizonWeeks = usesGraphForwardHorizon
    ? forwardForecastMetrics.weekCount
    : forecastOutlook != null
      ? 2
      : 0;

  const totalForecastedBookings = usesGraphForwardHorizon
    ? forwardForecastMetrics.total
    : forecastOutlook?.forecasted_bookings_2w ?? null;

  const averageWeeklyForecast =
    forecastHorizonWeeks > 0 && totalForecastedBookings != null
      ? totalForecastedBookings / forecastHorizonWeeks
      : null;

  const criticalWeeksRaw = forecastOutlook?.critical_weeks;

  const riskWeeksAll: RiskWeekRow[] = useMemo(() => {
    const critical = criticalWeeksRaw ?? [];
    const graphRows = forecastGraph?.data ?? [];
    return critical.map((week) => {
      const forecastedVolume = week.forecasted_volume;
      const backendMetrics = deriveCriticalWeekBackendMetrics(week, graphRows);
      return {
        riskFactor:
          backendMetrics.riskFactor ?? normalizeRiskFactorLabel(week.risk_factor),
        week: `${new Date(week.week_start).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} – ${new Date(week.week_end ?? week.week_start).toLocaleDateString("en-US", {
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
        forecastedVolume,
        ciRatio: backendMetrics.ciRatio,
        ciGap: backendMetrics.ciGap,
      };
    });
  }, [
    criticalWeeksRaw,
    forecastGraph?.data,
    historicalHorizonWeeks,
    nearForecastHorizonWeeks,
  ]);

  /** Table lists forward/near-term risk only; backtest "Forecast History" weeks are omitted. */
  const riskWeeks = useMemo(
    () => riskWeeksAll.filter((row) => row.horizonStatus !== "Forecast History"),
    [riskWeeksAll]
  );

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

  const riskLegendItems: Array<{
    id: RiskFactorLabel;
    title: "Critical CI Gap" | "High CI Gap" | "Medium CI Gap" | "Low CI Gap";
    insight: string;
    details: string[];
    badgeClass: string;
  }> = useMemo(
    () => [
      {
        id: "Low",
        title: "Low CI Gap",
        insight:
          "This week's forecast is relatively stable, so use it for routine weekly planning.",
        details: [
          "Use the forecasted booking count as the main reference for this week's routine planning.",
          "Track actual bookings against forecast on the normal review schedule.",
          "Keep standard turnaround for quotations, confirmations, and follow-ups.",
          "No special escalation is needed unless actual bookings start moving outside the usual range.",
          "This is the best tier for using forecast figures in weekly status reporting.",
        ],
        badgeClass: "bg-emerald-100 text-emerald-700",
      },
      {
        id: "Medium",
        title: "Medium CI Gap",
        insight:
          "This week's forecast is usable, but monitor actual bookings before making small adjustments.",
        details: [
          "Use the forecast as a guide, but recheck actual bookings before making small planning adjustments.",
          "Review booking movement at least once before the week begins and again during the week.",
          "Watch whether bookings are building faster or slower than expected.",
          "Prepare for minor deviation from the forecasted count without treating it as a planning issue yet.",
          "Use this tier for closer observation, not for strong intervention.",
        ],
        badgeClass: "bg-amber-100 text-amber-700",
      },
      {
        id: "High",
        title: "High CI Gap",
        insight:
          "This week is more uncertain than usual, so keep plans flexible and avoid depending on the exact forecast count.",
        details: [
          "Do not rely on the exact forecasted volume alone when planning this week.",
          "Compare actual bookings against forecast more frequently than usual.",
          "Keep booking-related plans adjustable in case demand moves above or below the displayed forecast.",
          "Delay firm assumptions based only on the point forecast until more actual bookings are observed.",
          "Treat this week as a higher-attention period in monitoring and internal review.",
        ],
        badgeClass: "bg-red-100 text-red-700",
      },
      {
        id: "Critical",
        title: "Critical CI Gap",
        insight:
          "This week has very high uncertainty, so treat the forecast as directional only and confirm with real incoming bookings before making firm decisions.",
        details: [
          "Treat the forecast as directional only, not as a firm expected count.",
          "Verify actual incoming bookings first before making commitment-sensitive decisions.",
          "Recheck booking movement as close to the week as possible instead of relying on the forecast early.",
          "Avoid locking plans too tightly around the displayed number because uncertainty is highest here.",
          "Escalate this week for active review if actual bookings begin diverging further from forecast expectations.",
        ],
        badgeClass: "bg-fuchsia-100 text-fuchsia-700",
      },
    ],
    []
  );

  const toggleRiskLegend = (risk: RiskFactorLabel) => {
    setExpandedRiskLegends((prev) => ({ ...prev, [risk]: !prev[risk] }));
  };
  const areAllRiskLegendsExpanded = useMemo(
    () => Object.values(expandedRiskLegends).every(Boolean),
    [expandedRiskLegends]
  );
  const toggleAllRiskLegends = () => {
    const nextValue = !areAllRiskLegendsExpanded;
    setExpandedRiskLegends({
      Low: nextValue,
      Medium: nextValue,
      High: nextValue,
      Critical: nextValue,
    });
  };
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
              Projected booking demand, risk outlook, and recommended actions
              {forecastHorizonWeeks > 0
                ? ` across the ${forecastHorizonWeeks}-week forward horizon.`
                : "."}{" "}
              <span className="font-medium text-slate-700">
                {effectiveModelId != null
                  ? `Model ${effectiveModelVersion} (ID ${effectiveModelId})`
                  : "Selecting latest trained model…"}
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

        {isLoadingModels && !isBackgroundPreview ? (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-600 shadow-sm">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent align-middle" />{" "}
            Loading model registry…
          </p>
        ) : null}

        <div className="mt-6 space-y-8">
          {shouldShowColdStart ? (
            <SkeletonDashboard />
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  id="forecast-horizon"
                  label="Forecast Horizon"
                  value={forecastHorizonWeeks > 0 ? `${forecastHorizonWeeks} weeks` : "—"}
                  helper={
                    usesGraphForwardHorizon
                      ? `Forward weeks counted from the forecast graph (${forwardForecastMetrics.weekCount} predicted-only points).`
                      : "Horizon falls back to the outlook API default (2 weeks) when the graph has no forward points."
                  }
                  implication="Defines the operational planning window and staffing cadence for short-term execution."
                  icon={<CalendarRange className="h-4 w-4" />}
                  isFlipped={Boolean(flippedKpis["forecast-horizon"])}
                  onToggle={toggleKpiCard}
                />
                <StatCard
                  id="total-forecasted-bookings"
                  label="Total Forecasted Bookings"
                  value={
                    totalForecastedBookings != null
                      ? totalForecastedBookings.toLocaleString("en-US")
                      : "—"
                  }
                  helper={
                    usesGraphForwardHorizon
                      ? `Sum of predicted bookings across all ${forwardForecastMetrics.weekCount} forward weeks in the graph.`
                      : "Projected bookings across the outlook horizon (API aggregate)."
                  }
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
                  helper={
                    forecastHorizonWeeks > 0 && totalForecastedBookings != null
                      ? `Total forecast (${totalForecastedBookings.toLocaleString("en-US")}) divided by ${forecastHorizonWeeks} weeks.`
                      : "Mean projected bookings per forecast week once horizon and total are available."
                  }
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
                    {forwardForecastMetrics.weekCount > 0
                      ? `${historicalHorizonWeeks}-week forecasted history, ${nearForecastHorizonWeeks}-week near forecast (higher confidence), and ${Math.max(
                          0,
                          forwardForecastMetrics.weekCount - nearForecastHorizonWeeks
                        )} additional forward weeks with confidence band.`
                      : `${historicalHorizonWeeks}-week forecasted history and forward forecast with confidence band.`}{" "}
                    The teal forecast line runs continuously across all forward weeks; emerald vs amber background shading still separates higher vs lower confidence horizons.
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

              <section className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Critical Forecast Weeks
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Weeks with elevated demand risk in the forward forecast horizon. Status matches
                    the demand chart regions for the next two weeks or beyond (backtest history rows
                    are excluded here).
                  </p>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
                      <colgroup>
                        <col className="w-[34%]" />
                        <col className="w-[18%]" />
                        <col className="w-[14%]" />
                        <col className="w-[14%]" />
                        <col className="w-[20%]" />
                      </colgroup>
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-left font-semibold text-slate-600">
                            Week
                          </th>
                          <th className="bg-teal-50 px-5 py-3 text-center font-semibold text-teal-800">
                            Forecasted Volume
                          </th>
                          <th className="px-5 py-3 text-center font-semibold text-slate-600">
                            CI Ratio
                          </th>
                          <th className="px-5 py-3 text-center font-semibold text-slate-600">
                            CI Gap
                          </th>
                          <th className="px-5 py-3 text-center font-semibold text-slate-600">
                            Risk Factor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {riskWeeks.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-6 text-center text-slate-500"
                            >
                              {(criticalWeeksRaw?.length ?? 0) === 0
                                ? "No critical forecast weeks returned from the API."
                                : "No forward-looking critical weeks for this snapshot (forecast-history rows are omitted)."}
                            </td>
                          </tr>
                        ) : null}
                        {riskWeeks.map((row, rowIndex) => (
                          <tr key={`${row.week}-${rowIndex}`}>
                            <td className="px-5 py-3 text-slate-700">{row.week}</td>
                            <td className="bg-teal-50 px-5 py-3 text-center text-base font-bold text-teal-900 tabular-nums">
                              {row.forecastedVolume.toLocaleString("en-US")}
                            </td>
                            <td className="px-5 py-3 text-center text-slate-700 tabular-nums whitespace-nowrap">
                              {row.ciRatio != null ? row.ciRatio.toLocaleString("en-US") : "—"}
                            </td>
                            <td className="px-5 py-3 text-center text-slate-700 tabular-nums whitespace-nowrap">
                              {row.ciGap != null
                                ? `${row.ciGap.toLocaleString("en-US")}`
                                : "—"}
                            </td>
                            <td className="px-5 py-3 text-center whitespace-nowrap">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  row.riskFactor === "Critical"
                                    ? "bg-fuchsia-100 text-fuchsia-700"
                                    : row.riskFactor === "High"
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
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-500">
                      Click each CI gap level to view detailed planning actions.
                    </p>
                    <button
                      type="button"
                      onClick={toggleAllRiskLegends}
                      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {areAllRiskLegendsExpanded ? "Collapse all" : "Show all"}
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {riskLegendItems.map((legendItem) => {
                      const isExpanded = Boolean(expandedRiskLegends[legendItem.id]);
                      return (
                        <div
                          key={legendItem.id}
                          className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <button
                            type="button"
                            onClick={() => toggleRiskLegend(legendItem.id)}
                            className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                            aria-expanded={isExpanded}
                            aria-controls={`risk-legend-${legendItem.id}`}
                          >
                            <div className="space-y-1">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${legendItem.badgeClass}`}
                              >
                                {legendItem.title}
                              </span>
                              <p className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">Insight: </span>
                                {legendItem.insight}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                            ) : (
                              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                            )}
                          </button>
                          {isExpanded ? (
                            <ul
                              id={`risk-legend-${legendItem.id}`}
                              className="space-y-2 border-t border-slate-200 bg-white px-4 py-3"
                            >
                              {legendItem.details.map((detail) => (
                                <li
                                  key={`${legendItem.id}-${detail}`}
                                  className="flex items-start gap-2.5 text-sm text-slate-700"
                                >
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })}
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
