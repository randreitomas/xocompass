import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiRoutes, fetchJson } from "../lib/apiRoutes";

interface FlipCardProps {
  id: string;
  label: string;
  value: string;
  expandedLabel?: string;
  description: string;
  isFlipped: boolean;
  onToggle: (id: string) => void;
}

interface PlaceholderPanelProps {
  title: string;
  description: string;
  residuals?: { fitted: number; residual: number }[];
  heatmap?: { variable: string; correlation: number }[];
}

interface FlipMetric {
  id: string;
  label: string;
  value: string;
  expandedLabel?: string;
  description: string;
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

interface AdvancedMetricsResponse {
  model_params: {
    order: number[];
    seasonal_order: number[];
    exogenous_features: string[];
  };
  statistics: {
    rmse: number;
    mae: number;
    wmape: number;
  };
  statistical_tests: {
    ljungbox_pvalue: number;
  };
  charts: {
    residuals: { fitted: number; residual: number }[];
    correlation_heatmap: { variable: string; correlation: number }[];
  };
}

const FLIP_METRICS: FlipMetric[] = [
  {
    id: "wmape",
    label: "WMAPE",
    value: "4.62%",
    expandedLabel: "Weighted Mean Absolute Percentage Error",
    description:
      "WMAPE measures weighted forecast error across booking volumes, so it reflects business impact better than plain percentage error in SARIMAX tourism demand forecasting. Optimal: Lower is better.",
  },
  {
    id: "mae",
    label: "MAE",
    value: "112.30",
    expandedLabel: "Mean Absolute Error",
    description:
      "MAE captures the average absolute deviation between predicted and actual weekly bookings and is easy to interpret in booking units. Optimal: Lower is better.",
  },
  {
    id: "rmse",
    label: "RMSE",
    value: "158.47",
    expandedLabel: "Root Mean Squared Error",
    description:
      "RMSE penalizes larger misses more heavily, which helps detect costly peak-season forecast errors in SARIMAX tourism demand models. Optimal: Lower is better.",
  },
  {
    id: "ljung-box",
    label: "Ljung-Box p-value",
    value: "0.0812",
    description:
      "The Ljung-Box p-value checks if residual autocorrelation remains after SARIMAX fitting, indicating whether patterns were left unexplained. Optimal: Higher is better, typically above 0.05.",
  },
  {
    id: "selected-order",
    label: "Selected Order (p,d,q)",
    value: "(2,1,1)",
    description:
      "Selected Order defines the non-seasonal SARIMAX structure controlling autoregression, differencing, and moving-average behavior for weekly bookings. Optimal: Best-performing parsimonious order, not strictly higher or lower.",
  },
  {
    id: "seasonal-order",
    label: "Seasonal Order (P,D,Q,s)",
    value: "(1,0,1,52)",
    description:
      "Seasonal Order models recurring weekly tourism demand cycles and seasonal shocks, with s representing seasonal period length. Optimal: Best-fitting stable seasonal structure, not strictly higher or lower.",
  },
];

const FlipCard: React.FC<FlipCardProps> = ({
  id,
  label,
  value,
  expandedLabel,
  description,
  isFlipped,
  onToggle,
}) => (
  <button
    type="button"
    onClick={() => onToggle(id)}
    className="group perspective h-52 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
    aria-pressed={isFlipped}
    aria-label={`Flip ${label} card`}
  >
    <div
      className={`relative h-full w-full transform-style-preserve-3d rounded-2xl transition-transform duration-500 ${
        isFlipped ? "rotate-y-180" : ""
      }`}
    >
      <div className="backface-hidden absolute inset-0 flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-3 text-3xl font-bold leading-none text-slate-900">{value}</p>
        {expandedLabel && (
          <p className="mt-3 min-h-10 text-sm font-medium text-slate-600">
            {expandedLabel}
          </p>
        )}
        <p className="mt-auto text-sm text-slate-500">
          Click card to view metric definition.
        </p>
      </div>

      <div className="backface-hidden rotate-y-180 absolute inset-0 rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
          {label}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-teal-900">{description}</p>
      </div>
    </div>
  </button>
);

const PlaceholderChart: React.FC<{ residuals?: { fitted: number; residual: number }[] }> = ({
  residuals,
}) => {
  const histogramBars =
    residuals && residuals.length > 0
      ? (() => {
          const values = residuals.map((point) => point.residual);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const bucketCount = 9;
          const range = Math.max(max - min, 1);
          const buckets = Array.from({ length: bucketCount }, () => 0);
          values.forEach((value) => {
            const idx = Math.min(
              Math.floor(((value - min) / range) * bucketCount),
              bucketCount - 1
            );
            buckets[idx] += 1;
          });
          const maxBucket = Math.max(...buckets, 1);
          return buckets.map((bucket) => Math.max((bucket / maxBucket) * 100, 12));
        })()
      : [20, 34, 52, 71, 83, 74, 58, 37, 24];

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="flex min-h-[7rem] flex-1 items-end gap-1.5 sm:min-h-[8rem] sm:gap-2">
        {histogramBars.map((height, idx) => (
          <div
            key={`residual-${idx}`}
            className="min-w-0 flex-1 rounded-t bg-teal-500/75"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex shrink-0 justify-between gap-1 text-[10px] text-slate-500 sm:mt-3 sm:text-[11px]">
        <span>-3σ</span>
        <span>-1σ</span>
        <span>0</span>
        <span>+1σ</span>
        <span>+3σ</span>
      </div>
    </div>
  );
};

const HeatmapChart: React.FC<{
  heatmap?: { variable: string; correlation: number }[];
}> = ({ heatmap }) => {
  const variables = [
    "Bookings",
    "typhoon_msw",
    "holiday_lead_5",
    "holiday_intensity",
    "is_long_weekend",
  ];
  const correlationMap = new Map(
    (heatmap ?? []).map((point) => [point.variable, point.correlation])
  );
  const bookingCorrelations = {
    typhoon_msw: correlationMap.get("typhoon_msw") ?? -0.078,
    holiday_lead_5: correlationMap.get("holiday_lead_5") ?? 0.039,
    holiday_intensity: correlationMap.get("holiday_intensity") ?? -0.035,
    is_long_weekend: correlationMap.get("is_long_weekend") ?? -0.02,
  };

  const pairwiseFallback: Record<string, number> = {
    "typhoon_msw|holiday_lead_5": -0.034,
    "typhoon_msw|holiday_intensity": -0.11,
    "typhoon_msw|is_long_weekend": 0.006,
    "holiday_lead_5|holiday_intensity": 0.21,
    "holiday_lead_5|is_long_weekend": 0.031,
    "holiday_intensity|is_long_weekend": -0.22,
  };

  const getPairwiseValue = (a: string, b: string) => {
    if (a === b) return 1;
    if (a === "Bookings") return bookingCorrelations[b as keyof typeof bookingCorrelations];
    if (b === "Bookings") return bookingCorrelations[a as keyof typeof bookingCorrelations];

    const direct = `${a}|${b}`;
    const reverse = `${b}|${a}`;
    return pairwiseFallback[direct] ?? pairwiseFallback[reverse] ?? 0;
  };

  const toCellColor = (value: number) => {
    const clamped = Math.max(-1, Math.min(1, value));
    if (clamped < 0) {
      const intensity = Math.abs(clamped);
      return `rgba(59, 130, 246, ${0.15 + intensity * 0.8})`;
    }
    return `rgba(220, 38, 38, ${0.15 + clamped * 0.8})`;
  };

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
                      className="flex aspect-square min-h-[2.75rem] w-full max-w-[4.25rem] items-center justify-center justify-self-center rounded-md text-[11px] font-semibold tabular-nums text-slate-900 shadow-sm ring-1 ring-black/5 sm:min-h-[3.25rem] sm:max-w-[4.75rem] sm:text-xs"
                      style={{ backgroundColor: toCellColor(value) }}
                      title={`${rowLabel} vs ${colLabel}: ${value.toFixed(4)}`}
                    >
                      {value.toFixed(3)}
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
  const isHeatmap = title === "Exogenous Variables Heatmap";
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
            <PlaceholderChart residuals={residuals} />
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

  const selectedModelId = routeState?.selectedModelId ?? storedModelId ?? 2;
  const selectedModelVersion =
    routeState?.selectedModelVersion ?? storedModelVersion ?? "v10.1";

  const [models, setModels] = useState<BackendModel[]>([]);
  const [advancedMetrics, setAdvancedMetrics] =
    useState<AdvancedMetricsResponse | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await fetchJson<ModelsResponse>(apiRoutes.models());
        setModels(data.available_models ?? []);
      } catch (error) {
        console.error("Unable to load models:", error);
        setModels([]);
      }
    };

    fetchModels();
  }, []);

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
    const fetchAdvancedMetrics = async () => {
      try {
        setIsLoading(true);
        setLoadError("");
        const data = await fetchJson<AdvancedMetricsResponse>(
          apiRoutes.advancedMetrics(effectiveModelId)
        );
        setAdvancedMetrics(data);
      } catch (error) {
        console.error("Unable to load advanced metrics:", error);
        setLoadError("Unable to load advanced metrics.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvancedMetrics();
  }, [effectiveModelId]);

  useEffect(() => {
    try {
      localStorage.setItem("xocompass:selectedModelId", String(effectiveModelId));
      localStorage.setItem("xocompass:selectedModelVersion", effectiveModelVersion);
    } catch {
      // Ignore localStorage errors in restricted environments.
    }
  }, [effectiveModelId, effectiveModelVersion]);

  const toggleCard = (cardId: string) => {
    setFlippedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  return (
    <div className="min-h-full w-full space-y-8 bg-[#F4FFF8]">
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
              Model {effectiveModelVersion} (ID {effectiveModelId})
            </span>
          </p>
        </div>
      </div>

      {isLoading && (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-600 shadow-sm">
          Loading advanced metrics from backend...
        </p>
      )}

      {loadError && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 shadow-sm">
          {loadError} Showing fallback data where needed.
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {FLIP_METRICS.map((metric) => {
          const value =
            metric.id === "wmape"
              ? `${(advancedMetrics?.statistics.wmape ?? Number(metric.value.replace("%", ""))).toFixed(2)}%`
              : metric.id === "mae"
                ? (advancedMetrics?.statistics.mae ?? Number(metric.value)).toFixed(2)
                : metric.id === "rmse"
                  ? (advancedMetrics?.statistics.rmse ?? Number(metric.value)).toFixed(2)
                  : metric.id === "ljung-box"
                    ? (advancedMetrics?.statistical_tests.ljungbox_pvalue ?? Number(metric.value)).toFixed(4)
                    : metric.id === "selected-order"
                      ? `(${(advancedMetrics?.model_params.order ?? [2, 1, 1]).join(",")})`
                      : `(${(advancedMetrics?.model_params.seasonal_order ?? [1, 0, 1, 52]).join(",")})`;

          return (
          <FlipCard
            key={metric.id}
            id={metric.id}
            label={metric.label}
            value={value}
            expandedLabel={metric.expandedLabel}
            description={metric.description}
            isFlipped={Boolean(flippedCards[metric.id])}
            onToggle={toggleCard}
          />
          );
        })}
      </section>

      <section className="grid min-h-0 w-full max-w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,11fr)_minmax(0,14fr)] lg:items-stretch">
        <PlaceholderPanel
          title="Residual Distribution Graph"
          description="Placeholder for residual diagnostics distribution."
          residuals={advancedMetrics?.charts.residuals}
        />

        <PlaceholderPanel
          title="Exogenous Variables Heatmap"
          description="Correlation analysis for exogenous drivers from advanced metrics API."
          heatmap={advancedMetrics?.charts.correlation_heatmap}
        />

        <div className="col-span-1 w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900">
            SARIMAX Exogenous Variables
          </h3>
          <p className="mt-1 max-w-none text-sm text-slate-500">
            Target variable and exogenous drivers for KJS weekly bookings
            forecasting.
          </p>
          <div
            className="mt-4 grid w-full gap-2 sm:gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 10.5rem), 1fr))",
            }}
          >
            {[
              "target: weekly_bookings",
              ...(advancedMetrics?.model_params.exogenous_features ?? [
                "holiday_lead",
                "is_long_weekend",
                "storm_flag",
              ]),
            ].map((tag) => (
              <div key={tag} className="min-w-0">
                <span className="flex min-h-[2.25rem] w-full items-center justify-center truncate rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-center text-xs font-semibold text-teal-700">
                  {tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

