import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  Legend,
} from "recharts";
import { Download } from "lucide-react";
import { MetricCard } from "../components/ui/MetricCard";
import { ChartContainer } from "../components/ui/ChartContainer";
import { StatusBadge } from "../components/ui/StatusBadge";

const bookingsForecastData = [
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

export const SimplifiedMetrics: React.FC = () => {
  return (
    <div className="space-y-8 bg-slate-100 p-6 -m-8 min-h-full">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Business Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            High-level performance overview for KJS POS and travel demand
            analytics.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <Download className="h-4 w-4" />
          <span>Export PDF Report</span>
        </button>
      </div>

      <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Data Overview
          </h2>
          <span className="text-sm text-slate-500">
            Snapshot as of Jan 27, 2026
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Total Records"
            value="34,582"
            helper="Transactions 2023–2025"
            trendLabel="+2,140 vs last refresh"
            trendDirection="up"
          />
          <MetricCard
            label="Data Quality"
            value="96.3%"
            helper="Post-cleaning completeness"
            trendLabel="+1.1 pts vs last cycle"
            trendDirection="up"
            accent="teal"
          />
          <MetricCard
            label="Revenue (₱)"
            value="38.2M"
            helper="Total recognized revenue"
            trendLabel="+15.3% YoY"
            trendDirection="up"
          />
          <MetricCard
            label="Growth Rate"
            value="+15.3%"
            helper="Bookings & revenue"
            trendLabel="Accelerating growth trajectory"
            trendDirection="up"
            accent="teal"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-md">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Expected Bookings
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">2,847</p>
          <p className="mt-1 text-sm font-medium text-emerald-600">
            +12.5% vs last quarter
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Conversion uplift from digital campaigns and cross-sell offers.
          </p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-md">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Peak Travel Period
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            Apr – Jun 2026
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Target segment:{" "}
            <span className="font-semibold text-teal-700">Families</span>
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Highest sensitivity to bundled experiences and early-bird
            discounts.
          </p>
        </div>
      </section>

      <ChartContainer
        title="Actual vs Predicted Bookings"
        description="Forecast comparison for Jan–Sep 2026 with 95% confidence interval."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={bookingsForecastData} margin={{ left: -20 }}>
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
              stroke="none"
              fill="rgba(45, 212, 191, 0.15)"
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="lowerCI"
              stroke="none"
              fill="rgba(15, 118, 110, 0.15)"
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
    </div>
  );
};

