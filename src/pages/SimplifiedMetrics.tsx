import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ComposedChart,
  Area,
} from "recharts";
import { Download } from "lucide-react";
import { useLocation } from "react-router-dom";
import { MetricCard } from "../components/ui/MetricCard";
import { ChartContainer } from "../components/ui/ChartContainer";
import { StatusBadge } from "../components/ui/StatusBadge";

// ─── Constants ────────────────────────────────────────────────────────────────

const BACKEND_BASE_URL =
  "https://xocompass-backend-572370238000.asia-southeast1.run.app";

const fallbackForecastData = [
  { month: "Jan", actual: 280, predicted: 295, lowerCI: 260, upperCI: 330 },
  { month: "Feb", actual: 310, predicted: 320, lowerCI: 290, upperCI: 350 },
  { month: "Mar", actual: 340, predicted: 355, lowerCI: 320, upperCI: 390 },
  { month: "Apr", actual: 360, predicted: 380, lowerCI: 345, upperCI: 420 },
  { month: "May", actual: 395, predicted: 410, lowerCI: 370, upperCI: 450 },
  { month: "Jun", actual: 420, predicted: 435, lowerCI: 395, upperCI: 470 },
  { month: "Jul", actual: 405, predicted: 420, lowerCI: 380, upperCI: 455 },
  { month: "Aug", actual: 390, predicted: 410, lowerCI: 370, upperCI: 445 },
  { month: "Sep", actual: 375, predicted: 400, lowerCI: 360, upperCI: 435 },
];

const fallbackBookingsByYearData = [
  { year: 2013, bookings: 11240 },
  { year: 2014, bookings: 12890 },
  { year: 2015, bookings: 14120 },
  { year: 2016, bookings: 15670 },
  { year: 2017, bookings: 17430 },
  { year: 2018, bookings: 19210 },
  { year: 2019, bookings: 21480 },
  { year: 2020, bookings: 13150 },
  { year: 2021, bookings: 24150 },
  { year: 2022, bookings: 26840 },
  { year: 2023, bookings: 30210 },
  { year: 2024, bookings: 33190 },
  { year: 2025, bookings: 34582 },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForecastPoint {
  month: string;
  actual: number;
  predicted: number;
  lowerCI: number;
  upperCI: number;
}

interface BookingsByYearPoint {
  year: string | number; // API returns year as a string e.g. "2013"
  bookings: number;
}

interface DashboardStatsResponse {
  total_records: number;
  data_quality_pct: number;
  revenue_total: number;
  growth_rate: number;
  expected_bookings: number;
  peak_travel_period: string;
  bookings_forecast: ForecastPoint[];
  yearly_bookings?: BookingsByYearPoint[]; // actual API field name
}

interface MetricsRouteState {
  selectedModelId?: number;
  selectedModelVersion?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCompactRevenue = (value: number) => {
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return `₱${compact.toUpperCase()}`;
};

const readLocalStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocalStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore in restricted environments.
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SimplifiedMetrics: React.FC = () => {
  const location = useLocation();
  const routeState = (location.state as MetricsRouteState | null) ?? null;

  const storedModelId = (() => {
    const raw = readLocalStorage("xocompass:selectedModelId");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  })();

  const storedModelVersion = readLocalStorage("xocompass:selectedModelVersion");

  const selectedModelId = routeState?.selectedModelId ?? storedModelId ?? 2;
  const selectedModelVersion =
    routeState?.selectedModelVersion ?? storedModelVersion ?? "v10.1";

  const [dashboardStats, setDashboardStats] =
    useState<DashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Persist resolved model selection
  useEffect(() => {
    writeLocalStorage("xocompass:selectedModelId", String(selectedModelId));
    writeLocalStorage("xocompass:selectedModelVersion", selectedModelVersion);
  }, [selectedModelId, selectedModelVersion]);

  // Fetch dashboard stats from backend
  useEffect(() => {
    let cancelled = false;

    const fetchDashboardStats = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const url = `${BACKEND_BASE_URL}/api/dashboard-stats/${selectedModelId}`;
        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(
            `Server returned ${response.status} ${response.statusText}`
          );
        }

        const data: DashboardStatsResponse = await response.json();
        if (!cancelled) setDashboardStats(data);
      } catch (error) {
        console.error("[SimplifiedMetrics] Failed to fetch dashboard stats:", error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load model dashboard stats."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchDashboardStats();
    return () => {
      cancelled = true;
    };
  }, [selectedModelId]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const growthRate = dashboardStats?.growth_rate ?? 15.3;
  const growthDirection = growthRate >= 0 ? "up" : "down";
  const growthLabel = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%`;

  // Use backend forecast data when available, otherwise fall back
  const chartData: ForecastPoint[] =
    dashboardStats?.bookings_forecast &&
    dashboardStats.bookings_forecast.length > 0
      ? dashboardStats.bookings_forecast
      : fallbackForecastData;

  const expectedBookingsTrendLabel = useMemo(() => {
    if (!chartData || chartData.length < 2) return "Baseline forecast available";
    const first = chartData[0].predicted;
    const last = chartData[chartData.length - 1].predicted;
    if (first === 0) return "Forecast trend unavailable";
    const pct = ((last - first) / first) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% across forecast window`;
  }, [chartData]);

  const bookingsByYearData = useMemo(() => {
    const raw = dashboardStats?.yearly_bookings; // correct API field name
    if (raw && raw.length > 0) {
      return raw
        .map((p) => ({
          year: Number(p.year), // API returns year as string — coerce to number
          bookings: p.bookings,
        }))
        .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.bookings))
        .sort((a, b) => a.year - b.year);
    }
    return fallbackBookingsByYearData;
  }, [dashboardStats]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[#F4FFF8] px-6 py-6 -m-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-[14px] text-slate-600">
            High-level performance overview for KJS POS and travel demand
            analytics.{" "}
            <span className="font-medium text-slate-700">
              Model {selectedModelVersion} (ID {selectedModelId})
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <button className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <Download className="h-4 w-4" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Status banners */}
      {isLoading && (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-600 shadow-sm">
          Loading dashboard stats…
        </p>
      )}

      {!isLoading && loadError && (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 shadow-sm">
          ⚠ {loadError} — showing fallback data where needed.
        </p>
      )}

      {!isLoading && !loadError && dashboardStats && (
        <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] text-emerald-700 shadow-sm">
          ✓ Live data loaded from Model {selectedModelVersion} (ID {selectedModelId}).
        </p>
      )}

      <div className="mt-6 space-y-8">
        {/* ── Booking Forecast Chart ─────────────────────────────────────────── */}
        <ChartContainer
          title="Booking Forecast"
          description="Forecast comparison with confidence intervals."
          headerMeta={
            <span>Snapshot as of {new Date().toLocaleDateString("en-US")}</span>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            {/*
              Fix: Area components must live inside ComposedChart (or AreaChart),
              NOT inside LineChart. Using ComposedChart allows mixing Area + Line.
            */}
            <ComposedChart data={chartData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#6B7280" }}
              />
              <YAxis
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
              <Legend verticalAlign="top" height={32} />

              {/* CI band — rendered as areas so they layer correctly */}
              <Area
                type="monotone"
                dataKey="upperCI"
                name="Upper CI"
                stroke="none"
                fill="rgba(13, 148, 136, 0.12)"
                activeDot={false}
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="lowerCI"
                name="Lower CI"
                stroke="none"
                fill="#FFFFFF"
                activeDot={false}
                legendType="none"
              />

              {/* Primary lines */}
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#0F172A"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted"
                stroke="#0D9488"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* ── Expected Bookings + Peak Period ───────────────────────────────── */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Expected Bookings
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {(dashboardStats?.expected_bookings ?? 2847).toLocaleString(
                "en-US"
              )}
            </p>
            <p
              className={`mt-1 text-sm font-medium ${
                growthDirection === "up"
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {expectedBookingsTrendLabel}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Forecasted bookings from the selected saved model.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Peak Travel Period
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {dashboardStats?.peak_travel_period ?? "Apr – Jun 2026"}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Peak period detected from the currently selected model run.
            </p>
          </div>
        </section>

        {/* ── Strategic Actions ──────────────────────────────────────────────── */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Strategic Actions
              </h2>
              <span className="text-sm text-slate-500">
                Suggested by XoCompass
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  n: 1,
                  title: "Launch Early Bird Campaign",
                  badge: { label: "Peak Season", tone: "success" as const },
                  body: "Offer tiered discounts for bookings made 60+ days before travel to smooth demand spikes in Apr–Jun.",
                },
                {
                  n: 2,
                  title: "Optimize Channel Mix",
                  badge: { label: "Digital Focus", tone: "warning" as const },
                  body: "Shift 8–10% of offline spend into high-performing digital channels with better cost-per-booking.",
                },
                {
                  n: 3,
                  title: "Build Family Value Packs",
                  badge: { label: "Revenue Uplift", tone: "success" as const },
                  body: "Bundle accommodations, activities, and transfers with dynamic pricing rules for 3–5 member family groups.",
                },
                {
                  n: 4,
                  title: "Strengthen Ancillary Upsell at Checkout",
                  badge: { label: "Cross-Sell", tone: "warning" as const },
                  body: "Surface insurance, transfers, and activity add-ons with personalized recommendations to lift attach rates.",
                },
                {
                  n: 5,
                  title: "Improve Repeat-Booker Loyalty Program",
                  badge: { label: "Retention", tone: "success" as const },
                  body: "Reward advance bookers and multi-trip families with tiered benefits to lock in the 23% high-value segment.",
                },
                {
                  n: 6,
                  title: "Proactive Capacity & Contracting",
                  badge: { label: "Operations", tone: "default" as const },
                  body: "Secure additional capacity and supplier contracts ahead of Apr–Jun peak to avoid shortfalls and last-minute premiums.",
                },
              ].map(({ n, title, badge, body }) => (
                <div key={n} className="flex gap-3 rounded-lg bg-slate-50 p-4">
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                    {n}
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {title}
                      </p>
                      <StatusBadge label={badge.label} tone={badge.tone} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Historical Data Overview ───────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Historical Data Overview
            </h2>
            {dashboardStats && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Live
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Total Records"
              value={(dashboardStats?.total_records ?? 34582).toLocaleString(
                "en-US"
              )}
              helper="Transactions in model-ready dataset"
              trendLabel="Loaded from deployed model stats"
              trendDirection="up"
            />
            <MetricCard
              label="Revenue (₱)"
              value={formatCompactRevenue(
                dashboardStats?.revenue_total ?? 38200000
              )}
              helper="Total recognized revenue"
              trendLabel={`${growthLabel} YoY`}
              trendDirection={growthDirection}
            />
            <MetricCard
              label="Growth Rate"
              value={growthLabel}
              helper="Bookings & revenue"
              trendLabel={
                growthDirection === "up"
                  ? "Accelerating growth trajectory"
                  : "Demand is cooling vs prior period"
              }
              trendDirection={growthDirection}
              accent="teal"
            />
          </div>

          {/* Bookings Over Time bar chart */}
          <div className="mt-6">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Bookings Over Time
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Total number of bookings per year.
                </p>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsByYearData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                  />
                  <YAxis
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
                  <Bar
                    dataKey="bookings"
                    name="Bookings"
                    fill="#0D9488"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};