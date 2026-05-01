import React, { useMemo } from "react";
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

export interface NetAmountPoint {
  period: string;
  amount: number;
}

export interface DataQualityItem {
  label: string;
  count: number;
  /** Dataset volume / context — not an issue; omit severity styling. */
  descriptiveOnly?: boolean;
}

export interface BusinessAnalyticsTabProps {
  bookingsByYear: BookingsByYearPoint[];
  netAmounts: NetAmountPoint[];
  topAirlines?: AirlineCount[] | null;
  leadTimeDistribution?: LeadTimeBucket[] | null;
  topRoutes?: RouteVolume[] | null;
  dataQualityItems?: DataQualityItem[] | null;
  bookingsOverTimeDescription?: string;
  bookingsPeriodLabel?: string;
}

const AIRLINE_LOGO_DOMAIN_BY_CODE: Record<string, string> = {
  "5J": "cebupacificair.com",
  DG: "cebupacificair.com",
  PR: "philippineairlines.com",
  Z2: "zipair.net",
  SQ: "singaporeair.com",
  CX: "cathaypacific.com",
  BR: "evaair.com",
  NH: "ana.co.jp",
  JL: "jal.co.jp",
  KE: "koreanair.com",
  OZ: "flyasiana.com",
  TR: "flyscoot.com",
  AK: "airasia.com",
};

const AIRLINE_DISPLAY_NAMES: Record<string, string> = {
  "5J": "Cebu Pacific",
  DG: "Cebgo",
  PR: "Philippine Airlines",
  Z2: "ZIPAIR Tokyo",
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  BR: "EVA Air",
  NH: "All Nippon Airways",
  JL: "Japan Airlines",
  KE: "Korean Air",
  OZ: "Asiana Airlines",
  TR: "Scoot",
  AK: "AirAsia",
};

const formatAirlineLabel = (code: string) => {
  const normalized = code.toUpperCase();
  const name = AIRLINE_DISPLAY_NAMES[normalized];
  return name ? `${normalized} (${name})` : normalized;
};

const getAirlineLogoUrl = (airlineCode: string) => {
  const domain = AIRLINE_LOGO_DOMAIN_BY_CODE[airlineCode.toUpperCase()];
  return domain ? `https://logo.clearbit.com/${domain}` : null;
};

const getAirlineFaviconUrl = (airlineCode: string) => {
  const domain = AIRLINE_LOGO_DOMAIN_BY_CODE[airlineCode.toUpperCase()];
  return domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null;
};

const AirlineLogo: React.FC<{ code: string; className?: string }> = ({ code, className }) => {
  const primaryLogo = getAirlineLogoUrl(code);
  const fallbackLogo = getAirlineFaviconUrl(code);
  const [useFallback, setUseFallback] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  if (failed || (!primaryLogo && !fallbackLogo)) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-sm bg-slate-100 text-[9px] font-semibold text-slate-600 ${
          className ?? "h-5 w-5"
        }`}
      >
        {code.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={useFallback && fallbackLogo ? fallbackLogo : primaryLogo ?? fallbackLogo ?? ""}
      alt={`${code} logo`}
      className={className ?? "h-5 w-5 rounded-sm border border-slate-200 bg-white object-contain p-0.5"}
      loading="lazy"
      onError={() => {
        if (!useFallback && fallbackLogo) {
          setUseFallback(true);
          return;
        }
        setFailed(true);
      }}
    />
  );
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

const TopAirlinesTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { airline?: string; count?: number } }>;
  label?: string | number;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const code = point?.airline ?? String(label ?? "");
  const count = Number(point?.count ?? payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="flex items-center gap-2">
        <AirlineLogo
          code={code}
          className="h-4 w-4 rounded-sm border border-slate-200 bg-white object-contain p-0.5"
        />
        <span className="text-xs font-semibold leading-tight text-slate-700">
          {formatAirlineLabel(code)}
        </span>
      </div>
      <p className="mt-1 text-slate-600">{count.toLocaleString("en-US")} bookings</p>
    </div>
  );
};

const TopAirlinesChart: React.FC<{ airlines: AirlineCount[] }> = ({ airlines }) => {
  const sortedRows = useMemo(() => [...airlines].sort((a, b) => b.count - a.count), [airlines]);
  const pieRows = useMemo(
    () =>
      sortedRows.map((row) => ({
        airline: row.airline_code,
        count: row.count,
      })),
    [sortedRows]
  );
  const totalBookings = useMemo(
    () => sortedRows.reduce((sum, row) => sum + row.count, 0),
    [sortedRows]
  );
  const piePalette = ["#0D9488", "#14B8A6", "#22D3EE", "#60A5FA", "#818CF8", "#A78BFA"];

  return (
    <div className="mt-4 grid h-full min-h-0 grid-rows-[auto_1fr] gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[44%_1fr] xl:grid-rows-1">
      <div className="relative mx-auto h-40 w-40 sm:h-44 sm:w-44 xl:mx-0 xl:h-full xl:w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieRows}
              dataKey="count"
              nameKey="airline"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {pieRows.map((_, index) => (
                <Cell key={`top-airline-${index}`} fill={piePalette[index % piePalette.length]} />
              ))}
            </Pie>
            <Tooltip content={<TopAirlinesTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-slate-900">
            {totalBookings.toLocaleString("en-US")}
          </span>
          <span className="text-xs text-slate-500">Total</span>
        </div>
      </div>

      <div className="flex h-full min-h-0 items-center pr-1">
        <div className="max-h-full w-full space-y-2 overflow-y-auto">
          {sortedRows.map((row, index) => {
            const pct = totalBookings > 0 ? (row.count / totalBookings) * 100 : 0;
            return (
              <div key={row.airline_code} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-sm">
                <AirlineLogo
                  code={row.airline_code}
                  className="h-5 w-5 rounded-sm border border-slate-200 bg-white object-contain p-0.5"
                />
                <span className="min-w-0 text-xs font-medium leading-tight text-slate-700">
                  {formatAirlineLabel(row.airline_code)}
                </span>
                <span className="text-[11px] tabular-nums text-right text-slate-600">
                  {row.count.toLocaleString("en-US")} ({pct.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
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

const NetAmountsChart: React.FC<{
  data: NetAmountPoint[];
  periodLabel: string;
}> = ({ data, periodLabel }) => {
  return (
    <div className="mt-4 h-full rounded-xl border border-slate-200 bg-slate-50 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="period"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            allowDecimals={true}
          />
          <Tooltip
            cursor={{ fill: "rgba(13, 148, 136, 0.08)" }}
            contentStyle={{
              borderRadius: 10,
              borderColor: "#E5E7EB",
              fontSize: 12,
            }}
            formatter={(value: number) => [`₱${value.toFixed(2)}K`, "Net Revenue"]}
            labelFormatter={(label) => `${periodLabel}: ${label}`}
          />
          <Bar dataKey="amount" name="Net Revenue (₱K)" fill="#14B8A6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const DataQualityPanel: React.FC<{ items: DataQualityItem[] }> = ({ items }) => (
  <div className="mt-4 h-full min-h-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="h-full min-h-0 space-y-2.5 overflow-y-auto pr-1">
      {items.slice(0, 5).map((item) => {
        if (item.descriptiveOnly) {
          return (
            <div
              key={item.label}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <span className="text-sm font-semibold tabular-nums text-slate-700">
                  {item.count.toLocaleString("en-US")}
                </span>
              </div>
            </div>
          );
        }

        const severity =
          item.count >= 1000 ? "High" : item.count >= 300 ? "Medium" : item.count > 0 ? "Low" : "None";
        const severityClass =
          severity === "High"
            ? "bg-rose-100 text-rose-700"
            : severity === "Medium"
              ? "bg-amber-100 text-amber-700"
              : severity === "Low"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-emerald-100 text-emerald-700";
        const widthPct = Math.min(100, Math.max(6, (item.count / 2000) * 100));

        return (
          <div
            key={item.label}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
          >
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <span className="min-w-0 truncate text-sm font-medium text-slate-700">{item.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityClass}`}>
                {severity}
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-700">
                {item.count.toLocaleString("en-US")}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  severity === "High"
                    ? "bg-rose-500"
                    : severity === "Medium"
                      ? "bg-amber-500"
                      : severity === "Low"
                        ? "bg-yellow-500"
                        : "bg-emerald-500"
                }`}
                style={{ width: `${item.count === 0 ? 4 : widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
      {items.length > 5 && (
        <p className="pt-1 text-xs font-medium text-slate-500">
          Showing first 5 rows for compact view.
        </p>
      )}
    </div>
  </div>
);

export const BusinessAnalyticsTab: React.FC<BusinessAnalyticsTabProps> = ({
  bookingsByYear,
  netAmounts,
  topAirlines,
  leadTimeDistribution,
  topRoutes,
  dataQualityItems,
  bookingsOverTimeDescription = "Total bookings by year from the linked dataset.",
  bookingsPeriodLabel = "Year",
}) => {
  const hasAirlines = Boolean(topAirlines && topAirlines.length > 0);
  const hasLeadBuckets = Boolean(leadTimeDistribution && leadTimeDistribution.length > 0);
  const hasTopRoutes = Boolean(topRoutes && topRoutes.length > 0);
  const qualityRows = dataQualityItems ?? [];
  const hasQualityRows = qualityRows.length > 0;

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartShell
          title="Bookings Over Time"
          description={bookingsOverTimeDescription}
          heightClassName="h-72"
        >
          <BookingsOverTimeChart data={bookingsByYear} periodLabel={bookingsPeriodLabel} />
        </ChartShell>
        <ChartShell
          title="Net Revenue"
          description="Net revenue in thousands by month."
          heightClassName="h-72"
        >
          <NetAmountsChart data={netAmounts} periodLabel="Month" />
        </ChartShell>
      </section>

      <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <ChartShell
          title="Top Routes by Booking Count"
          description="Most booked routes in the selected period."
          heightClassName="h-72 2xl:h-80"
        >
          {hasTopRoutes ? (
            <TopRoutesChart routes={topRoutes!} />
          ) : (
            <div className="mt-4 flex h-full min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              No route breakdown available for this model snapshot.
            </div>
          )}
        </ChartShell>
        <ChartShell
          title="Top Airlines by Booking Count"
          description="Airlines ranked by booking count."
          heightClassName="h-72 2xl:h-80"
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
          title="Lead Time Distribution"
          description="Booking volume by lead-time bucket."
          heightClassName="h-72 2xl:h-80"
        >
          {hasLeadBuckets ? (
            <LeadTimeDistributionChart buckets={leadTimeDistribution!} />
          ) : (
            <div className="mt-4 flex h-full min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              No lead-time histogram available for this model snapshot.
            </div>
          )}
        </ChartShell>
        <ChartShell
          title="Data Quality"
          description="Summary of data issues found in the ingested dataset."
          heightClassName="h-72 2xl:h-80"
        >
          {hasQualityRows ? (
            <DataQualityPanel items={qualityRows} />
          ) : (
            <div className="mt-4 flex h-full min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              No data quality report available for this model snapshot.
            </div>
          )}
        </ChartShell>
      </section>
    </>
  );
};
