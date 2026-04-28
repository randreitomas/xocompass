import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BookingsByYearPoint {
  year: number | string;
  bookings: number;
}

export interface AirlineCount {
  airline_code: string;
  count: number;
  pct: number;
}

export interface LeadTimeBucket {
  bucket: string;
  count: number;
}

export interface RouteVolume {
  route: string;
  bookings: number;
}

export interface BusinessAnalyticsTabProps {
  bookingsByYear: BookingsByYearPoint[];
  topAirlines?: AirlineCount[] | null;
  leadTimeDistribution?: LeadTimeBucket[] | null;
  topRoutes?: RouteVolume[] | null;
  showBookingsOverTime?: boolean;
  showBreakdownCharts?: boolean;
  bookingsOverTimeDescription?: string;
  bookingsPeriodLabel?: string;
}

/** Segment colors (teal → blues → warm → grey), aligned with typical dashboard palette */
const PIE_COLORS = [
  "#0D9488",
  "#38BDF8",
  "#1D4ED8",
  "#D4A574",
  "#94A3B8",
  "#8B5CF6",
  "#22C55E",
  "#EC4899",
];

const AIRLINE_DISPLAY_NAMES: Record<string, string> = {
  "5J": "Cebu Pacific",
  Z2: "ZIPAIR Tokyo",
  PR: "Philippine Airlines",
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  BR: "EVA Air",
  NH: "ANA",
  JL: "Japan Airlines",
  KE: "Korean Air",
  OZ: "Asiana Airlines",
  TR: "Scoot",
  AK: "AirAsia",
  DG: "Cebgo",
  OTHER: "Other Airlines",
  OTHER_AIRLINES: "Other Airlines",
};

const displayAirlineName = (code: string) => {
  const upper = code.trim().toUpperCase();
  return AIRLINE_DISPLAY_NAMES[upper] ?? AIRLINE_DISPLAY_NAMES[code] ?? null;
};

const legendLabel = (code: string) => {
  const name = displayAirlineName(code);
  return name ? `${code} (${name})` : code;
};

const ChartShell: React.FC<{
  title: string;
  description: string;
  heightClassName?: string;
  children: React.ReactNode;
}> = ({ title, description, heightClassName = "h-64", children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
    <div className={heightClassName}>{children}</div>
  </div>
);

const BookingsOverTimeChart: React.FC<{
  data: BookingsByYearPoint[];
  periodLabel?: string;
}> = ({ data, periodLabel = "Year" }) => {
  const yearlySeries = useMemo(
    () =>
      data
        .map((point) => ({
          year: String(point.year),
          bookings: point.bookings,
        }))
        .sort((a, b) => Number(a.year) - Number(b.year)),
    [data]
  );

  return (
    <div className="mt-4 h-full rounded-xl border border-slate-200 bg-slate-50 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={yearlySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
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
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(13, 148, 136, 0.08)" }}
            contentStyle={{
              borderRadius: 10,
              borderColor: "#E5E7EB",
              fontSize: 12,
            }}
            formatter={(value: number) => [value.toLocaleString("en-US"), "Total Bookings"]}
            labelFormatter={(label) => `${periodLabel}: ${label}`}
          />
          <Bar dataKey="bookings" name="Total Bookings" fill="#0D9488" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const TopAirlinesChart: React.FC<{ airlines: AirlineCount[] }> = ({ airlines }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const sortedRows = useMemo(
    () => [...airlines].sort((a, b) => b.count - a.count),
    [airlines]
  );

  const pieData = useMemo(
    () =>
      sortedRows.map((row) => ({
        name: row.airline_code,
        value: row.pct,
        count: row.count,
      })),
    [sortedRows]
  );

  const totalBookings = useMemo(
    () => sortedRows.reduce((sum, row) => sum + row.count, 0),
    [sortedRows]
  );

  return (
    <div className="mt-4 flex h-full min-h-[14rem] flex-col rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative mx-auto flex h-[200px] w-[200px] shrink-0 sm:h-[220px] sm:w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2.5}
              startAngle={90}
              endAngle={-270}
              stroke="#ffffff"
              strokeWidth={2}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {pieData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                  style={{ transition: "opacity 0.15s ease" }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                borderColor: "#E5E7EB",
                fontSize: 12,
              }}
              formatter={(value: number, _name, item) => {
                const payload = item?.payload as {
                  name: string;
                  value: number;
                  count: number;
                };
                const pct = typeof value === "number" ? value : Number(value);
                return [
                  `${payload.count.toLocaleString("en-US")} bookings · ${pct.toFixed(1)}%`,
                  legendLabel(payload.name),
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-0.5">
          <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-[1.65rem]">
            {totalBookings.toLocaleString("en-US")}
          </span>
          <span className="mt-0.5 text-xs font-medium text-slate-500">Total</span>
        </div>
      </div>

      <div className="mt-6 min-w-0 flex-1 space-y-2.5 sm:mt-0">
        {sortedRows.map((row, index) => (
          <div
            key={row.airline_code}
            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 gap-y-0.5 text-sm"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
              aria-hidden
            />
            <span className="min-w-0 truncate font-medium text-slate-800">
              {legendLabel(row.airline_code)}
            </span>
            <span className="shrink-0 tabular-nums text-right font-semibold text-slate-900">
              {row.count.toLocaleString("en-US")}
            </span>
            <span className="w-[3.25rem] shrink-0 tabular-nums text-right text-slate-500">
              {row.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const LeadTimeDistributionChart: React.FC<{ buckets: LeadTimeBucket[] }> = ({ buckets }) => {
  const chartData = useMemo(
    () =>
      buckets.map((b) => ({
        bucket: b.bucket,
        count: b.count,
      })),
    [buckets]
  );

  return (
    <div className="mt-4 h-full rounded-xl border border-slate-200 bg-slate-50 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="bucket"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#6B7280" }}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={52}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(13, 148, 136, 0.08)" }}
            contentStyle={{
              borderRadius: 10,
              borderColor: "#E5E7EB",
              fontSize: 12,
            }}
            formatter={(value: number) => [value.toLocaleString("en-US"), "Bookings"]}
            labelFormatter={(label) => `Lead time: ${label}`}
          />
          <Bar dataKey="count" name="Bookings" fill="#0D9488" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const TopRoutesChart: React.FC<{ routes: RouteVolume[] }> = ({ routes }) => {
  const sortedRoutes = useMemo(
    () => [...routes].sort((a, b) => b.bookings - a.bookings).slice(0, 8),
    [routes]
  );

  return (
    <div className="mt-4 h-[17rem] rounded-xl border border-slate-200 bg-slate-50 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedRoutes}
          layout="vertical"
          margin={{ top: 8, right: 18, left: 16, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="route"
            width={68}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#374151" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(13, 148, 136, 0.08)" }}
            contentStyle={{
              borderRadius: 10,
              borderColor: "#E5E7EB",
              fontSize: 12,
            }}
            formatter={(value: number) => [value.toLocaleString("en-US"), "Bookings"]}
            labelFormatter={(label) => `Route: ${label}`}
          />
          <Bar dataKey="bookings" name="Bookings" fill="#0D9488" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const BusinessAnalyticsTab: React.FC<BusinessAnalyticsTabProps> = ({
  bookingsByYear,
  topAirlines,
  leadTimeDistribution,
  topRoutes,
  showBookingsOverTime = true,
  showBreakdownCharts = true,
  bookingsOverTimeDescription = "Total bookings by year from the linked dataset.",
  bookingsPeriodLabel = "Year",
}) => {
  const hasAirlines = Boolean(topAirlines && topAirlines.length > 0);
  const hasLeadBuckets = Boolean(leadTimeDistribution && leadTimeDistribution.length > 0);
  const hasTopRoutes = Boolean(topRoutes && topRoutes.length > 0);

  return (
    <>
      {showBookingsOverTime && (
        <section className="grid gap-4">
          <ChartShell
            title="Bookings Over Time"
            description={bookingsOverTimeDescription}
            heightClassName="h-72"
          >
            <BookingsOverTimeChart data={bookingsByYear} periodLabel={bookingsPeriodLabel} />
          </ChartShell>
        </section>
      )}

      {showBreakdownCharts && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <ChartShell
              title="Top Airlines"
              description="Share of total bookings"
              heightClassName="h-80 min-h-[18rem] sm:min-h-[20rem]"
            >
              {hasAirlines ? (
                <TopAirlinesChart airlines={topAirlines!} />
              ) : (
                <div className="mt-4 flex h-full min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  No airline breakdown available for this model snapshot.
                </div>
              )}
            </ChartShell>

            <ChartShell
              title="Top Routes by Booking Volume"
              description="Total bookings by route"
              heightClassName="h-80 min-h-[18rem]"
            >
              {hasTopRoutes ? (
                <TopRoutesChart routes={topRoutes!} />
              ) : (
                <div className="mt-4 flex h-full min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  No route breakdown available for this model snapshot.
                </div>
              )}
            </ChartShell>
          </div>

          <ChartShell
            title="Lead Time Distribution"
            description="Booking volume by lead-time bucket (from backend lead_time_distribution)."
            heightClassName="h-[40.5rem]"
          >
            {hasLeadBuckets ? (
              <LeadTimeDistributionChart buckets={leadTimeDistribution!} />
            ) : (
              <div className="mt-4 flex h-full min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                No lead-time histogram available for this model snapshot.
              </div>
            )}
          </ChartShell>
        </section>
      )}
    </>
  );
};
