import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { Download } from "lucide-react";
import { useLocation } from "react-router-dom";
import { MetricCard } from "../components/ui/MetricCard";

interface ModelParams {
  order: number[];
  seasonal_order: number[];
  exogenous_features: string[];
}

interface Statistics {
  rmse: number;
  mae: number;
  wmape: number;
}

interface StatisticalTests {
  adf_stat: number;
  adf_pvalue: number;
  adf_conclusion: string;
  ljungbox_stat: number;
  ljungbox_pvalue: number;
  ljungbox_conclusion: string;
  jarquebera_stat: number;
  jarquebera_pvalue: number;
  jarquebera_conclusion: string;
}

interface ResidualPoint {
  fitted: number;
  residual: number;
}

interface CorrPoint {
  lag: number;
  value: number;
}

interface AdvancedMetricsResponse {
  model_params: ModelParams;
  statistics: Statistics;
  statistical_tests: StatisticalTests;
  charts: {
    residuals: ResidualPoint[];
    acf: CorrPoint[];
    pacf: CorrPoint[];
  };
}

interface MetricsRouteState {
  selectedModelId?: number;
  selectedModelVersion?: string;
}

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

  const [advancedMetrics, setAdvancedMetrics] =
    useState<AdvancedMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchAdvancedMetrics = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const response = await fetch(
          `https://xocompass-backend.onrender.com/api/advanced-metrics/${selectedModelId}`
        );
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data: AdvancedMetricsResponse = await response.json();
        setAdvancedMetrics(data);
      } catch (error) {
        console.error("Unable to load advanced metrics:", error);
        setLoadError("Unable to load advanced metrics from backend.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvancedMetrics();
  }, [selectedModelId]);

  useEffect(() => {
    try {
      localStorage.setItem("xocompass:selectedModelId", String(selectedModelId));
      localStorage.setItem("xocompass:selectedModelVersion", selectedModelVersion);
    } catch {
      // Ignore localStorage errors in restricted environments.
    }
  }, [selectedModelId, selectedModelVersion]);

  const acfPacfData = useMemo(() => {
    const acf = advancedMetrics?.charts.acf ?? [];
    const pacf = advancedMetrics?.charts.pacf ?? [];
    const maxLength = Math.max(acf.length, pacf.length);
    const merged: { lag: number; acf: number; pacf: number }[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      merged.push({
        lag: acf[index]?.lag ?? pacf[index]?.lag ?? index,
        acf: acf[index]?.value ?? 0,
        pacf: pacf[index]?.value ?? 0,
      });
    }

    return merged;
  }, [advancedMetrics]);

  const residualsData = advancedMetrics?.charts.residuals ?? [];
  const modelParams = advancedMetrics?.model_params;
  const stats = advancedMetrics?.statistics;
  const tests = advancedMetrics?.statistical_tests;

  return (
    <div className="space-y-8 bg-slate-100 p-6 -m-8 min-h-full">
      {/* Top bar */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Advanced Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Technical performance diagnostics for the time series forecasting models.
            {" "}
            <span className="font-medium text-slate-700">
              Model {selectedModelVersion} (ID {selectedModelId})
            </span>
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <Download className="h-4 w-4" />
          <span>Export Technical Report</span>
        </button>
      </div>

      {isLoading && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Loading advanced metrics from backend...
        </p>
      )}

      {loadError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {loadError}
        </p>
      )}

      {/* Section A: Performance */}
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="WMAPE"
            value={`${(stats?.wmape ?? 0).toFixed(2)}%`}
            helper="Weighted Mean Absolute Percentage Error"
            trendLabel="Target: < 5%"
            trendDirection={(stats?.wmape ?? 100) <= 5 ? "up" : "down"}
            accent="teal"
          />
          <MetricCard
            label="RMSE"
            value={(stats?.rmse ?? 0).toFixed(2)}
            helper="Root Mean Squared Error"
            trendLabel="Lower is better"
            trendDirection="neutral"
          />
          <MetricCard
            label="MAE"
            value={(stats?.mae ?? 0).toFixed(2)}
            helper="Mean Absolute Error"
            trendLabel="Lower is better"
            trendDirection="neutral"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
          <div className="border-b border-slate-200 px-6 py-3 bg-slate-50/80">
            <h2 className="text-sm font-semibold text-slate-900">
              Model Parameters
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Final selected model parameters from the deployed backend response.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Component
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr className="hover:bg-slate-50/60">
                  <td className="px-6 py-3 text-sm font-medium text-slate-700">
                    ARIMA Order (p, d, q)
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-800">
                    ({(modelParams?.order ?? []).join(", ") || "N/A"})
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">
                    Captures short-term persistence and noise.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="px-6 py-3 text-sm font-medium text-slate-700">
                    Seasonal (P, D, Q, s)
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-800">
                    ({(modelParams?.seasonal_order ?? []).join(", ") || "N/A"})
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">
                    Annual seasonality aligned with travel cycles.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="px-6 py-3 text-sm font-medium text-slate-700">
                    Exogenous Features
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-800">
                    {modelParams?.exogenous_features?.length
                      ? modelParams.exogenous_features.join(", ")
                      : "None"}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">
                    Improves response to demand shocks and campaigns.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section B: Diagnostics */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Residuals vs Fitted */}
        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Residuals vs Fitted
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Random scatter around zero indicates good fit and homoscedasticity.
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  dataKey="fitted"
                  name="Fitted"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                />
                <YAxis
                  type="number"
                  dataKey="residual"
                  name="Residual"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#E5E7EB",
                    fontSize: 12,
                  }}
                />
                <Scatter data={residualsData} fill="#0F766E" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ACF / PACF */}
        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                ACF / PACF Analysis
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Autocorrelation structure across lags to validate differencing and
                AR/MA terms.
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acfPacfData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="lag"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                />
                <YAxis
                  domain={[-1, 1]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#E5E7EB",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="acf" name="ACF" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pacf" name="PACF" fill="#0F766E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Section C: Statistical Tests */}
      <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
        <div className="border-b border-slate-200 px-6 py-3 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-slate-900">
            Statistical Diagnostics
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Stationarity, autocorrelation, and normality tests on residuals.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Test
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Statistic
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                  p-value
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Conclusion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              <tr className="bg-slate-50/40 hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">
                  Augmented Dickey-Fuller (ADF)
                </td>
                <td className="px-6 py-3 text-slate-700">
                  {(tests?.adf_stat ?? 0).toFixed(4)}
                </td>
                <td className="px-6 py-3 text-emerald-600">
                  {(tests?.adf_pvalue ?? 0).toFixed(4)}
                </td>
                <td className="px-6 py-3 text-slate-700">
                  <span className="font-semibold text-emerald-700">
                    {tests?.adf_conclusion ?? "N/A"}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">
                  Ljung-Box Q(20)
                </td>
                <td className="px-6 py-3 text-slate-700">
                  {(tests?.ljungbox_stat ?? 0).toFixed(4)}
                </td>
                <td className="px-6 py-3 text-emerald-600">
                  {(tests?.ljungbox_pvalue ?? 0).toFixed(4)}
                </td>
                <td className="px-6 py-3 text-slate-700">
                  <span className="font-semibold text-emerald-700">
                    {tests?.ljungbox_conclusion ?? "N/A"}
                  </span>
                </td>
              </tr>
              <tr className="bg-slate-50/40 hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">
                  Jarque-Bera
                </td>
                <td className="px-6 py-3 text-slate-700">
                  {(tests?.jarquebera_stat ?? 0).toFixed(4)}
                </td>
                <td className="px-6 py-3 text-emerald-600">
                  {(tests?.jarquebera_pvalue ?? 0).toFixed(4)}
                </td>
                <td className="px-6 py-3 text-slate-700">
                  <span className="font-semibold text-emerald-700">
                    {tests?.jarquebera_conclusion ?? "N/A"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

