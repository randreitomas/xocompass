import React, { useEffect, useMemo, useState } from "react";
import { Activity, Percent, Sigma, Sparkles } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocation } from "react-router-dom";
import { formatApiErrorForUi } from "../lib/formatApiError";
import { resolveEffectiveModelId } from "../lib/resolveDashboardModel";
import * as dashboardService from "../services/dashboardService";
import type { components } from "../types/api";

type AdvancedMetricsResponse = components["schemas"]["AdvancedMetricsResponse"];
type ModelDropdownItem = components["schemas"]["ModelDropdownItem"];

interface MetricCardProps {
  id: string;
  label: string;
  value: string;
  helper: string;
  implication: string;
  icon: React.ReactNode;
  isFlipped: boolean;
  onToggle: (id: string) => void;
}

interface PlaceholderPanelProps {
  title: string;
  description: string;
  residuals?: { fitted: number; residual: number }[];
  heatmap?: { variable: string; correlation: number }[];
}

interface MetricsRouteState {
  selectedModelId?: number;
  selectedModelVersion?: string;
}

const seasonalOrderHeading = (coefficientCount: number) => {
  if (coefficientCount === 4) return "Seasonal Order (P,D,Q,s)";
  if (coefficientCount === 3) return "Seasonal Order (P,D,Q)";
  return "Seasonal Order";
};

/** Visible weeks per frame when the validation series is long; slider pans the window. */
const VALIDATION_CHART_WINDOW = 22;

const MetricCard: React.FC<MetricCardProps> = ({
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
        <p className="mt-3 text-3xl font-bold leading-none text-slate-900">{value}</p>
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

const ValidationGraph: React.FC<{
  validationGraph?: {
    date_label: string;
    actual: number;
    forecasted: number;
    lower_ci: number;
    upper_ci: number;
  }[];
}> = ({ validationGraph }) => {
  const lineData = useMemo(() => {
    if (!validationGraph?.length) return [];
    return validationGraph.map((point) => ({
      weekLabel: point.date_label,
      actual: point.actual,
      forecasted: point.forecasted,
      upperCI: point.upper_ci,
      lowerCI: point.lower_ci,
    }));
  }, [validationGraph]);

  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    setWindowStart(0);
  }, [validationGraph]);

  const windowLen = Math.min(VALIDATION_CHART_WINDOW, lineData.length);
  const maxStart = Math.max(0, lineData.length - windowLen);
  const effectiveStart = Math.min(windowStart, maxStart);

  const slicedData = useMemo(
    () => lineData.slice(effectiveStart, effectiveStart + windowLen),
    [lineData, effectiveStart, windowLen]
  );

  if (lineData.length === 0) {
    return (
      <div className="mt-4 flex min-h-[21rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No validation graph points returned from the API for this model.
      </div>
    );
  }

  const showSlider = maxStart > 0;
  const tiltLabels = slicedData.length > 11;
  const chartBottom = tiltLabels ? 44 : 10;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3">
        {showSlider ? (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800">Browse timeline</span>
              <span className="tabular-nums text-slate-600">
                <span className="font-medium text-slate-800">{slicedData[0]?.weekLabel}</span>
                <span className="mx-1.5 text-slate-400">→</span>
                <span className="font-medium text-slate-800">
                  {slicedData[slicedData.length - 1]?.weekLabel}
                </span>
                <span className="ml-2 text-slate-400">
                  ({effectiveStart + 1}–{effectiveStart + slicedData.length} of {lineData.length})
                </span>
              </span>
            </div>
            <label className="mt-2 block">
              <span className="sr-only">Pan validation chart window</span>
              <input
                type="range"
                min={0}
                max={maxStart}
                step={1}
                value={effectiveStart}
                onChange={(e) => setWindowStart(Number(e.target.value))}
                className="mt-1 h-2 w-full cursor-pointer rounded-full bg-slate-200 accent-teal-600"
              />
            </label>
            <p className="mt-1 text-[11px] text-slate-500">
              Drag to slide across weeks; each frame shows up to {VALIDATION_CHART_WINDOW} points.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Showing all {lineData.length} validation week
            {lineData.length === 1 ? "" : "s"}.
          </p>
        )}

        <div className="h-[17rem] min-h-[14rem] w-full shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={slicedData}
              margin={{ top: 10, right: 16, left: 2, bottom: chartBottom }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="weekLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#6B7280" }}
                interval={0}
                angle={tiltLabels ? -36 : 0}
                textAnchor={tiltLabels ? "end" : "middle"}
                height={tiltLabels ? 52 : 28}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, borderColor: "#E5E7EB", fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  const label =
                    name === "actual"
                      ? "Actual"
                      : name === "forecasted"
                        ? "Forecasted"
                        : name === "upperCI"
                          ? "Upper CI"
                          : name === "lowerCI"
                            ? "Lower CI"
                            : name;
                  const n = typeof value === "number" ? value : Number(value);
                  return [Number.isFinite(n) ? n.toFixed(1) : "—", label];
                }}
                labelFormatter={(label) => `Week: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="upperCI"
                stroke="none"
                fill="#99F6E4"
                fillOpacity={0.3}
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
                dataKey="actual"
                name="Actual"
                stroke="#0F172A"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="forecasted"
                name="Forecasted"
                stroke="#0D9488"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="upperCI"
                name="Upper CI"
                stroke="#14B8A6"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lowerCI"
                name="Lower CI"
                stroke="#14B8A6"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="shrink-0 pt-1">
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-slate-900" />
              Actual
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2 py-0.5 font-semibold text-teal-700">
              <span className="h-2 w-2 rounded-full bg-teal-600" />
              Forecasted
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StemCheckChart: React.FC<{
  title: string;
  subtitle: string;
  /** Full series from API (includes lag 0 = 1); stem plot uses lag ≥ 1 only. */
  points: { lag: number; value: number }[];
}> = ({ title, subtitle, points }) => {
  const chartData = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.lag - b.lag);
    return sorted.filter((p) => p.lag > 0).map((p) => ({ lag: p.lag, value: p.value }));
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <p className="mt-6 text-center text-sm text-slate-500">
          No {title.includes("PACF") ? "PACF" : "ACF"} series returned from the API.
        </p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <p className="mt-6 text-center text-sm text-slate-500">
          ACF/PACF payload only contained lag 0; no stems to plot.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-3 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="lag" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} />
            <YAxis domain={[-1, 1]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} />
            <ReferenceLine y={0.35} stroke="#3B82F6" strokeDasharray="4 3" />
            <ReferenceLine y={-0.35} stroke="#3B82F6" strokeDasharray="4 3" />
            <ReferenceLine y={0} stroke="#94A3B8" />
            <Bar dataKey="value" fill="#10B981" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

type ResidualHistogramRow = {
  binStart: number;
  binEnd: number;
  binMid: number;
  count: number;
};

const ResidualDistributionTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload?: ResidualHistogramRow }>;
}> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-900">Residual bin</p>
      <p className="mt-1 tabular-nums text-slate-600">
        Range:{" "}
        <span className="font-medium text-slate-800">
          {row.binStart.toFixed(5)} → {row.binEnd.toFixed(5)}
        </span>
      </p>
      <p className="mt-0.5 tabular-nums text-slate-600">
        Center: <span className="font-medium text-slate-800">{row.binMid.toFixed(5)}</span>
      </p>
      <p className="mt-1 font-semibold tabular-nums text-teal-800">
        Count: {row.count.toLocaleString("en-US")}
      </p>
    </div>
  );
};

const ResidualDistributionChart: React.FC<{
  residuals?: { fitted: number; residual: number }[];
}> = ({ residuals }) => {
  const chartData = useMemo((): ResidualHistogramRow[] => {
    if (!residuals?.length) return [];
    const values = residuals.map((point) => point.residual);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
    if (min === max) {
      const pad = Math.abs(min) > 1e-12 ? Math.abs(min) * 0.05 : 0.05;
      min -= pad;
      max += pad;
    }
    const bucketCount = Math.min(24, Math.max(8, Math.ceil(Math.sqrt(values.length))));
    const range = Math.max(max - min, Number.EPSILON);
    const binWidth = range / bucketCount;

    const rows: ResidualHistogramRow[] = Array.from({ length: bucketCount }, (_, i) => {
      const binStart = min + i * binWidth;
      const binEnd = i === bucketCount - 1 ? max : min + (i + 1) * binWidth;
      return {
        binStart,
        binEnd,
        binMid: (binStart + binEnd) / 2,
        count: 0,
      };
    });

    for (const value of values) {
      let idx = Math.floor(((value - min) / range) * bucketCount);
      idx = Math.min(Math.max(idx, 0), bucketCount - 1);
      rows[idx].count += 1;
    }

    return rows;
  }, [residuals]);

  const maxCount = useMemo(
    () => chartData.reduce((m, r) => Math.max(m, r.count), 0),
    [chartData]
  );

  if (!residuals?.length) {
    return (
      <div className="flex min-h-[10rem] flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
        No residual series returned from the API.
      </div>
    );
  }

  if (chartData.length === 0 || maxCount === 0) {
    return (
      <div className="flex min-h-[10rem] flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
        Could not build a histogram from residual values.
      </div>
    );
  }

  return (
    <div className="h-72 min-h-[14rem] w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 28, right: 12, left: 8, bottom: 36 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="binMid"
            type="number"
            domain={[chartData[0].binStart, chartData[chartData.length - 1].binEnd]}
            ticks={chartData.map((d) => d.binMid)}
            tickFormatter={(v: number) =>
              Number(v).toLocaleString("en-US", {
                maximumFractionDigits: 3,
                notation: Math.abs(v) >= 1000 || (Math.abs(v) > 0 && Math.abs(v) < 1e-2) ? "scientific" : "standard",
              })
            }
            tick={{ fontSize: 10, fill: "#6B7280" }}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
            label={{
              value: "Residual (bin center)",
              position: "insideBottom",
              offset: -28,
              fill: "#64748B",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <YAxis
            dataKey="count"
            width={44}
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(dataMax * 1.15, 1)]}
            tickFormatter={(v: number) => v.toLocaleString("en-US")}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
            label={{
              value: "Frequency (count)",
              angle: -90,
              position: "insideLeft",
              offset: 4,
              fill: "#64748B",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <Tooltip
            cursor={{ fill: "rgba(13, 148, 136, 0.08)" }}
            content={<ResidualDistributionTooltip />}
          />
          <Bar
            dataKey="count"
            name="Count"
            fill="#0D9488"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="count"
              position="top"
              formatter={(v: number) => (v > 0 ? String(v) : "")}
              className="fill-slate-600 text-[10px] font-semibold"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const HeatmapChart: React.FC<{
  heatmap?: { variable: string; correlation: number }[];
}> = ({ heatmap }) => {
  const correlationMap = new Map(
    (heatmap ?? []).map((point) => [point.variable, point.correlation])
  );
  const driverLabels = Array.from(correlationMap.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  const variables = ["Bookings", ...driverLabels];

  const getPairwiseValue = (a: string, b: string): number | null => {
    if (a === b) return 1;
    if (a === "Bookings" && b !== "Bookings") {
      return correlationMap.has(b) ? correlationMap.get(b)! : null;
    }
    if (b === "Bookings" && a !== "Bookings") {
      return correlationMap.has(a) ? correlationMap.get(a)! : null;
    }
    return null;
  };

  const toCellColor = (value: number) => {
    const clamped = Math.max(-1, Math.min(1, value));
    if (clamped < 0) {
      const intensity = Math.abs(clamped);
      return `rgba(59, 130, 246, ${0.15 + intensity * 0.8})`;
    }
    return `rgba(220, 38, 38, ${0.15 + clamped * 0.8})`;
  };

  if (driverLabels.length === 0) {
    return (
      <div className="mt-4 flex min-h-[14rem] flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No correlation heatmap points returned from the API.
      </div>
    );
  }

  return (
    <div className="mt-4 flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 lg:min-h-[18rem]">
      <p className="mb-3 shrink-0 text-center text-xs font-semibold text-slate-600 sm:text-sm">
        Correlation matrix (Pearson r)
      </p>
      <div className="flex min-h-0 flex-1 gap-4 sm:gap-5">
        <div className="min-h-0 min-w-0 flex-1 overflow-x-auto">
          <div
            className="mx-auto grid w-full max-w-full gap-2 sm:gap-2.5"
            style={{
              gridTemplateColumns: `minmax(6.5rem, 8.5rem) repeat(${variables.length}, minmax(2.75rem, 1fr))`,
              gridAutoRows: "minmax(3rem, auto)",
            }}
          >
            <div />
            {variables.map((label) => (
              <div
                key={`x-${label}`}
                className="flex min-h-[2.5rem] items-end justify-center px-0.5 pb-1 text-center text-[10px] font-semibold leading-tight text-slate-600 sm:text-xs"
                title={label}
              >
                <span className="line-clamp-2 break-words">{label}</span>
              </div>
            ))}

            {variables.map((rowLabel) => (
              <React.Fragment key={`row-${rowLabel}`}>
                <div
                  className="flex min-h-[3rem] items-center justify-end pr-2 text-right text-[10px] font-semibold leading-snug text-slate-600 sm:text-xs"
                  title={rowLabel}
                >
                  <span className="line-clamp-2 break-words">{rowLabel}</span>
                </div>
                {variables.map((colLabel) => {
                  const value = getPairwiseValue(rowLabel, colLabel);
                  return (
                    <div
                      key={`cell-${rowLabel}-${colLabel}`}
                      className={`flex aspect-square min-h-[2.75rem] w-full max-w-[4.25rem] items-center justify-center justify-self-center rounded-md text-[11px] font-semibold tabular-nums shadow-sm ring-1 ring-black/5 sm:min-h-[3.25rem] sm:max-w-[4.75rem] sm:text-xs ${
                        value === null ? "bg-slate-100 text-slate-400" : "text-slate-900"
                      }`}
                      style={
                        value === null ? undefined : { backgroundColor: toCellColor(value) }
                      }
                      title={
                        value === null
                          ? `${rowLabel} vs ${colLabel}: not provided by API`
                          : `${rowLabel} vs ${colLabel}: ${value.toFixed(4)}`
                      }
                    >
                      {value === null ? "—" : value.toFixed(3)}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex w-10 shrink-0 flex-col items-center justify-center gap-1 self-stretch py-1 sm:w-11">
          <span className="text-[10px] font-semibold text-slate-500">1</span>
          <div
            className="min-h-[8rem] w-3 flex-1 max-h-full rounded-full sm:w-3.5"
            style={{
              background:
                "linear-gradient(to top, rgba(59,130,246,0.92) 0%, rgba(226,232,240,0.95) 50%, rgba(220,38,38,0.92) 100%)",
            }}
            aria-hidden
          />
          <span className="text-[10px] font-semibold text-slate-500">−1</span>
        </div>
      </div>
    </div>
  );
};

const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({
  title,
  description,
  residuals,
  heatmap,
}) => {
  const isHeatmap = title.includes("Heatmap");
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="shrink-0 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 shrink-0 text-sm text-slate-500">{description}</p>
      <div
        className={
          isHeatmap
            ? "mt-4 flex min-h-[17rem] flex-1 flex-col sm:min-h-[19rem] lg:min-h-[20rem]"
            : "mt-4 flex min-h-0 flex-1 flex-col"
        }
      >
        {isHeatmap ? (
          <HeatmapChart heatmap={heatmap} />
        ) : (
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
            <ResidualDistributionChart residuals={residuals} />
          </div>
        )}
      </div>
    </div>
  );
};

export const AdvancedMetrics: React.FC = () => {
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

  const [models, setModels] = useState<ModelDropdownItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [advancedMetrics, setAdvancedMetrics] =
    useState<AdvancedMetricsResponse | null>(null);
  const [flippedKpis, setFlippedKpis] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
    if (!isLoadingModels && models.length === 0) {
      setAdvancedMetrics(null);
      setLoadError("");
      setIsLoading(false);
      return;
    }
    if (effectiveModelId == null) {
      if (isLoadingModels) {
        setIsLoading(false);
      }
      return;
    }

    const fetchAdvancedMetrics = async () => {
      try {
        setIsLoading(true);
        setLoadError("");
        const data = await dashboardService.getAdvancedMetrics(effectiveModelId);
        setAdvancedMetrics(data);
      } catch (error) {
        console.error("Unable to load advanced metrics:", error);
        setLoadError(formatApiErrorForUi(error));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvancedMetrics();
  }, [effectiveModelId, isLoadingModels, models.length]);

  useEffect(() => {
    if (effectiveModelId == null) return;
    try {
      localStorage.setItem("xocompass:selectedModelId", String(effectiveModelId));
      localStorage.setItem("xocompass:selectedModelVersion", effectiveModelVersion);
    } catch {
      // Ignore localStorage errors in restricted environments.
    }
  }, [effectiveModelId, effectiveModelVersion]);

  const acfPoints = useMemo(
    () => advancedMetrics?.charts.acf ?? [],
    [advancedMetrics?.charts.acf]
  );
  const pacfPoints = useMemo(
    () => advancedMetrics?.charts.pacf ?? [],
    [advancedMetrics?.charts.pacf]
  );
  const validationSummary = useMemo(() => {
    if (!advancedMetrics) return [];
    const t = advancedMetrics.statistical_tests;
    return [t.adf_conclusion, t.ljungbox_conclusion, t.jarquebera_conclusion].filter(
      (line) => line.trim().length > 0
    );
  }, [advancedMetrics]);
  const toggleKpiCard = (cardId: string) => {
    setFlippedKpis((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  return (
    <div className="min-h-full w-full space-y-8 bg-[#F9FAFB]">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
            Advanced Metrics
          </h1>
          <p className="mt-1 text-[14px] text-slate-600">
            Model validation, residual diagnostics, and SARIMAX configuration with
            the target variable being Weekly Bookings overview for KJS demand
            forecasting.{" "}
            <span className="font-medium text-slate-700">
              {effectiveModelId != null
                ? `Model ${effectiveModelVersion} (ID ${effectiveModelId})`
                : "Selecting latest trained model…"}
            </span>
          </p>
        </div>
      </div>

      {isLoadingModels ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-600 shadow-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent align-middle" />{" "}
          Loading model registry…
        </p>
      ) : null}

      {isLoading && (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-600 shadow-sm">
          Loading advanced metrics from backend...
        </p>
      )}

      {loadError && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 shadow-sm">
          {loadError}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          id="wmape"
          label="WMAPE"
          value={
            advancedMetrics != null
              ? `${advancedMetrics.statistics.wmape.toFixed(2)}%`
              : "—"
          }
          helper="Weighted mean absolute percentage error."
          implication="Lower WMAPE indicates proportionally smaller demand forecast misses across varying booking volumes."
          icon={<Percent className="h-4 w-4" />}
          isFlipped={Boolean(flippedKpis["wmape"])}
          onToggle={toggleKpiCard}
        />
        <MetricCard
          id="mae"
          label="MAE"
          value={
            advancedMetrics != null ? advancedMetrics.statistics.mae.toFixed(2) : "—"
          }
          helper="Mean absolute prediction error."
          implication="MAE shows average absolute miss in booking units; lower values improve operational planning precision."
          icon={<Activity className="h-4 w-4" />}
          isFlipped={Boolean(flippedKpis["mae"])}
          onToggle={toggleKpiCard}
        />
        <MetricCard
          id="rmse"
          label="RMSE"
          value={
            advancedMetrics != null ? advancedMetrics.statistics.rmse.toFixed(2) : "—"
          }
          helper="Root mean squared error."
          implication="RMSE emphasizes larger misses; high values can indicate risk during peak-demand weeks."
          icon={<Sigma className="h-4 w-4" />}
          isFlipped={Boolean(flippedKpis["rmse"])}
          onToggle={toggleKpiCard}
        />
        <MetricCard
          id="ljung-box-pvalue"
          label="Ljung-Box p-value"
          value={
            advancedMetrics != null
              ? advancedMetrics.statistical_tests.ljungbox_pvalue.toFixed(4)
              : "—"
          }
          helper="Ljung–Box test on residuals (null: no serial correlation)."
          implication={
            advancedMetrics?.statistical_tests.ljungbox_conclusion ??
            "Backend conclusion for the Ljung–Box test appears here when metrics load."
          }
          icon={<Sparkles className="h-4 w-4" />}
          isFlipped={Boolean(flippedKpis["ljung-box-pvalue"])}
          onToggle={toggleKpiCard}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          Validation Graph (Actual vs Predicted)
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Historical validation comparison showing model accuracy behavior.
        </p>
        <ValidationGraph validationGraph={advancedMetrics?.charts.validation_graph} />
      </section>

      <section className="grid min-h-0 w-full max-w-full grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        <PlaceholderPanel
          title="Residual Distribution Graph"
          description="Distribution of model residuals from the backend diagnostics payload."
          residuals={advancedMetrics?.charts.residuals}
        />

        <PlaceholderPanel
          title="Correlation Matrix (Heatmap)"
          description="Correlation analysis for exogenous drivers."
          heatmap={advancedMetrics?.charts.correlation_heatmap}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <StemCheckChart
            title="Pattern Check (ACF)"
            subtitle="Residual autocorrelation (lags ≥ 1; lag 0 omitted)."
            points={acfPoints}
          />
          <StemCheckChart
            title="Signal Check (PACF)"
            subtitle="Partial autocorrelation (lags ≥ 1; lag 0 omitted)."
            points={pacfPoints}
          />
        </div>

        <div className="w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Model Setup</h3>
          <p className="mt-1 max-w-none text-sm text-slate-500">
            Algorithm, variables, orders, and validation test values.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Algorithm
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">SARIMAX</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Order (p,d,q)
              </p>
              <p className="mt-2 font-mono text-base font-semibold text-slate-900">
                {advancedMetrics != null && advancedMetrics.model_params.order.length > 0
                  ? `(${advancedMetrics.model_params.order.join(", ")})`
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2 lg:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {advancedMetrics != null
                  ? seasonalOrderHeading(advancedMetrics.model_params.seasonal_order.length)
                  : "Seasonal order"}
              </p>
              <p className="mt-2 font-mono text-base font-semibold text-slate-900">
                {advancedMetrics != null && advancedMetrics.model_params.seasonal_order.length > 0
                  ? `(${advancedMetrics.model_params.seasonal_order.join(", ")})`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Exogenous variables
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {advancedMetrics == null ? (
                <span className="text-sm text-slate-500">—</span>
              ) : advancedMetrics.model_params.exogenous_features.length === 0 ? (
                <span className="text-sm text-slate-500">None listed for this model.</span>
              ) : (
                advancedMetrics.model_params.exogenous_features.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700"
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Validation tests</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Ljung-Box
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {advancedMetrics != null
                    ? advancedMetrics.statistical_tests.ljungbox_pvalue.toFixed(4)
                    : "—"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {advancedMetrics?.statistical_tests.ljungbox_conclusion ??
                    "Residual autocorrelation check"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Jarque-Bera
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {advancedMetrics != null
                    ? advancedMetrics.statistical_tests.jarquebera_stat.toFixed(2)
                    : "—"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {advancedMetrics?.statistical_tests.jarquebera_conclusion ??
                    "Residual normality signal"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  ADF Test
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {advancedMetrics != null
                    ? advancedMetrics.statistical_tests.adf_pvalue.toFixed(4)
                    : "—"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {advancedMetrics?.statistical_tests.adf_conclusion ??
                    "Stationarity significance level"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

