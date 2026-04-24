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
  Area,
  Legend,
} from "recharts";
import { Download } from "lucide-react";
import { useLocation } from "react-router-dom";
import { MetricCard } from "../components/ui/MetricCard";
import { ChartContainer } from "../components/ui/ChartContainer";
import { StatusBadge } from "../components/ui/StatusBadge";
import { apiUrl } from "../lib/api";

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
  { year: 2021, bookings: 24150 },
  { year: 2022, bookings: 26840 },
  { year: 2023, bookings: 30210 },
  { year: 2024, bookings: 33190 },
  { year: 2025, bookings: 34582 },
];

interface ForecastPoint {
  month: string;
  actual: number;
  predicted: number;
  lowerCI: number;
  upperCI: number;
}

interface BookingsByYearPoint {
  year: number;
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
  bookings_by_year?: BookingsByYearPoint[];
}

interface MetricsRouteState {
  selectedModelId?: number;
  selectedModelVersion?: string;
}

const formatCompactRevenue = (value: number) => {
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

  return `₱${compact.toUpperCase()}`;
};

export const SimplifiedMetrics: React.FC = () => {
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

  const [dashboardStats, setDashboardStats] =
    useState<DashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const response = await fetch(
          apiUrl(`/api/dashboard-stats/${selectedModelId}`)
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data: DashboardStatsResponse = await response.json();
        setDashboardStats(data);
      } catch (error) {
        console.error("Unable to load dashboard stats:", error);
        setLoadError("Unable to load model dashboard stats.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [selectedModelId]);

  useEffect(() => {
    try {
      localStorage.setItem("xocompass:selectedModelId", String(selectedModelId));
      localStorage.setItem("xocompass:selectedModelVersion", selectedModelVersion);
    } catch {
      // Ignore localStorage errors in restricted environments.
    }
  }, [selectedModelId, selectedModelVersion]);

  const growthRate = dashboardStats?.growth_rate ?? 15.3;
  const growthDirection = growthRate >= 0 ? "up" : "down";
  const growthLabel = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%`;
  const chartData =
    dashboardStats?.bookings_forecast?.length &&
    dashboardStats.bookings_forecast.length > 0
      ? dashboardStats.bookings_forecast
      : fallbackForecastData;

  const expectedBookingsTrendLabel = useMemo(() => {
    if (!chartData || chartData.length < 2) {
      return "Baseline forecast available";
    }

    const first = chartData[0].predicted;
    const last = chartData[chartData.length - 1].predicted;
    if (first === 0) return "Forecast trend unavailable";

    const pct = ((last - first) / first) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% across forecast window`;
  }, [chartData]);

  const bookingsByYearData = useMemo(() => {
    const raw = dashboardStats?.bookings_by_year;
    if (raw && raw.length > 0) {
      return raw
        .filter((point) => Number.isFinite(point.year) && Number.isFinite(point.bookings))
        .slice()
        .sort((a, b) => a.year - b.year);
    }

    return fallbackBookingsByYearData;
  }, [dashboardStats]);

  return (
    <div className="space-y-8 bg-slate-100 p-6 -m-8 min-h-full">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Business Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            High-level performance overview for KJS POS and travel demand analytics.
            {" "}
            <span className="font-medium text-slate-700">
              Model {selectedModelVersion} (ID {selectedModelId})
            </span>
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <Download className="h-4 w-4" />
          <span>Export PDF Report</span>
        </button>
      </div>

      {isLoading && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Loading dashboard stats from backend...
        </p>
      )}

      {loadError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {loadError} Showing fallback data where needed.
        </p>
      )}

      <ChartContainer
        title="Booking Forecast"
        description="Forecast comparison for Jan–Sep 2026 with 95% confidence interval."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: -20 }}>
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
            <Area
              type="monotone"
              dataKey="upperCI"
              name="Upper CI"
              stroke="none"
              fill="rgba(107, 114, 128, 0.25)"
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="lowerCI"
              name="Lower CI"
              stroke="none"
              fill="#FFFFFF"
              activeDot={false}
            />
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
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-md">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Expected Bookings
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {(dashboardStats?.expected_bookings ?? 2847).toLocaleString("en-US")}
          </p>
          <p
            className={`mt-1 text-sm font-medium ${
              growthDirection === "up" ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {expectedBookingsTrendLabel}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Forecasted bookings from the selected saved model.
          </p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-md">
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

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-md lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Strategic Actions
            </h2>
            <span className="text-sm text-slate-500">
              Suggested by XoCompass
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3 rounded-lg bg-slate-50 p-4">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                1
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Launch Early Bird Campaign
                  </p>
                  <StatusBadge label="Peak Season" tone="success" />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Offer tiered discounts for bookings made 60+ days before
                  travel to smooth demand spikes in Apr–Jun.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg bg-slate-50 p-4">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                2
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Optimize Channel Mix
                  </p>
                  <StatusBadge label="Digital Focus" tone="warning" />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Shift 8–10% of offline spend into high-performing digital
                  channels with better cost-per-booking.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg bg-slate-50 p-4">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                3
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Build Family Value Packs
                  </p>
                  <StatusBadge label="Revenue Uplift" tone="success" />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Bundle accommodations, activities, and transfers with dynamic
                  pricing rules for 3–5 member family groups.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg bg-slate-50 p-4">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                4
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Strengthen Ancillary Upsell at Checkout
                  </p>
                  <StatusBadge label="Cross-Sell" tone="warning" />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Surface insurance, transfers, and activity add-ons with
                  personalized recommendations to lift attach rates.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg bg-slate-50 p-4">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                5
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Improve Repeat-Booker Loyalty Program
                  </p>
                  <StatusBadge label="Retention" tone="success" />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Reward advance bookers and multi-trip families with tiered
                  benefits to lock in the 23% high-value segment.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg bg-slate-50 p-4">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                6
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Proactive Capacity & Contracting
                  </p>
                  <StatusBadge label="Operations" tone="default" />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Secure additional capacity and supplier contracts ahead of
                  Apr–Jun peak to avoid shortfalls and last-minute premiums.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Historical Data Overview
          </h2>
          <span className="text-sm text-slate-500">
            Snapshot as of {new Date().toLocaleDateString("en-US")}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total Records"
            value={(dashboardStats?.total_records ?? 34582).toLocaleString("en-US")}
            helper="Transactions in model-ready dataset"
            trendLabel="Loaded from deployed model stats"
            trendDirection="up"
          />
          <MetricCard
            label="Revenue (₱)"
            value={formatCompactRevenue(dashboardStats?.revenue_total ?? 38200000)}
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
                <Bar dataKey="bookings" name="Bookings" fill="#0D9488" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
};

