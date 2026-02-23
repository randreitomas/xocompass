import React from "react";
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
import { MetricCard } from "../components/ui/MetricCard";

const residualsData = Array.from({ length: 30 }).map((_, i) => ({
  fitted: 100 + i * 3 + (Math.random() - 0.5) * 15,
  residual: (Math.random() - 0.5) * 20,
}));

const acfPacfData = Array.from({ length: 12 }).map((_, i) => ({
  lag: i + 1,
  acf: Math.max(-0.4, Math.min(0.9 - i * 0.06 + (Math.random() - 0.5) * 0.1, 0.9)),
  pacf: Math.max(-0.4, Math.min(0.8 - i * 0.05 + (Math.random() - 0.5) * 0.1, 0.8)),
}));

export const AdvancedMetrics: React.FC = () => {
  return (
    <div className="space-y-8 bg-slate-100 p-6 -m-8 min-h-full">
      {/* Top bar */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Advanced Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Technical performance diagnostics for the time series forecasting
            models.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <Download className="h-4 w-4" />
          <span>Export Technical Report</span>
        </button>
      </div>

      {/* Section A: Performance */}
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="WMAPE"
            value="4.2%"
            helper="Weighted Mean Absolute Percentage Error"
            trendLabel="Target: < 5%"
            trendDirection="up"
            accent="teal"
          />
          <MetricCard
            label="RMSE"
            value="12.4"
            helper="Root Mean Squared Error"
            trendLabel="Lower is better"
            trendDirection="up"
          />
          <MetricCard
            label="MAE"
            value="9.8"
            helper="Mean Absolute Error"
            trendLabel="Lower is better"
            trendDirection="up"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
          <div className="border-b border-slate-200 px-6 py-3 bg-slate-50/80">
            <h2 className="text-sm font-semibold text-slate-900">
              Model Parameters
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Final selected model: SARIMAX with exogenous marketing and macro
              features.
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
                  <td className="px-6 py-3 text-sm text-slate-800">(2, 1, 2)</td>
                  <td className="px-6 py-3 text-sm text-slate-500">
                    Captures short-term persistence and noise.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="px-6 py-3 text-sm font-medium text-slate-700">
                    Seasonal (P, D, Q, s)
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-800">(1, 1, 1, 12)</td>
                  <td className="px-6 py-3 text-sm text-slate-500">
                    Annual seasonality aligned with travel cycles.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="px-6 py-3 text-sm font-medium text-slate-700">
                    Exogenous Features
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-800">
                    Typhoon, Rainfall Index, Temperature, Wind Speed, Holiday
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
                <td className="px-6 py-3 text-slate-700">-4.23</td>
                <td className="px-6 py-3 text-emerald-600">0.001</td>
                <td className="px-6 py-3 text-slate-700">
                  Series is{" "}
                  <span className="font-semibold text-emerald-700">
                    stationary after differencing
                  </span>
                  .
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">
                  Ljung-Box Q(20)
                </td>
                <td className="px-6 py-3 text-slate-700">18.7</td>
                <td className="px-6 py-3 text-emerald-600">0.29</td>
                <td className="px-6 py-3 text-slate-700">
                  Residuals show{" "}
                  <span className="font-semibold text-emerald-700">
                    no significant autocorrelation
                  </span>
                  .
                </td>
              </tr>
              <tr className="bg-slate-50/40 hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">
                  Jarque-Bera
                </td>
                <td className="px-6 py-3 text-slate-700">1.87</td>
                <td className="px-6 py-3 text-emerald-600">0.39</td>
                <td className="px-6 py-3 text-slate-700">
                  Residuals are{" "}
                  <span className="font-semibold text-emerald-700">
                    approximately normal
                  </span>{" "}
                  around zero.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

