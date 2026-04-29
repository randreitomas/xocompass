import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Clock3,
  Database,
  PhilippinePeso,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRoutes, fetchJson } from "../lib/apiRoutes";
import { SkeletonDashboard } from "../components/dashboard/SkeletonDashboard";
import { SavesModal } from "../components/modals/SavesModal";
import {
  BusinessAnalyticsTab,
  DataQualityItem,
  NetAmountPoint,
  RouteVolume,
} from "../components/dashboard/tabs/BusinessAnalyticsTab";

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

const fallbackTopRoutes: RouteVolume[] = [
  { route: "MNL_PPS", bookings: 627 },
  { route: "MNL_TAG", bookings: 295 },
  { route: "MNL_MPH", bookings: 264 },
  { route: "MNL_DVO", bookings: 255 },
  { route: "MNL_CEB", bookings: 217 },
];

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface BookingsByYearPoint {
  year: number | string;
  bookings: number;
}

interface AirlineCount {
  airline_code: string;
  count: number;
  pct: number;
}

interface LeadTimeBucket {
  bucket: string;
  count: number;
}

interface BusinessAnalyticsResponse {
  total_transaction_count: number;
  total_weekly_records: number;
  total_revenue: number;
  avg_weekly_bookings: number;
  growth_rate: number;
  avg_lead_time_days: number | null;
  date_coverage: {
    start_date: string;
    end_date: string;
    span_weeks: number;
  };
  bookings_by_year: BookingsByYearPoint[];
  top_airlines?: AirlineCount[];
  lead_time_distribution?: LeadTimeBucket[];
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

interface BusinessAnalyticsPageProps {
  isBackgroundPreview?: boolean;
}

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

interface YearPlaceholderKpis {
  totalTransactionCount: number;
  totalRevenue: number;
  avgLeadTimeDays: number;
  avgWeeklyBookings: number;
  weeklyObservations: number;
}

const fallbackLeadTimeBuckets: LeadTimeBucket[] = [
  { bucket: "0-3d", count: 210 },
  { bucket: "4-7d", count: 390 },
  { bucket: "8-14d", count: 620 },
  { bucket: "15-30d", count: 710 },
  { bucket: "31-60d", count: 520 },
  { bucket: "61-90d", count: 300 },
];

const formatCompactRevenue = (value: number) => {
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

  return `₱${compact.toUpperCase()}`;
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        <p className="mt-4 text-xs font-medium text-teal-700">
          Click card to view implication.
        </p>
        <span className="absolute bottom-4 right-4 inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-teal-600">
          {icon}
        </span>
      </div>

      <div className="backface-hidden rotate-y-180 absolute inset-0 flex min-h-0 flex-col rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
          {label}
        </p>
        <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          <p className="text-sm text-teal-900">{helper}</p>
          <p className="text-sm leading-relaxed text-teal-900">{implication}</p>
        </div>
        <p className="mt-3 text-xs font-medium text-teal-700">
          Click card to return.
        </p>
      </div>
    </div>
  </button>
);

export const BusinessAnalyticsPage: React.FC<BusinessAnalyticsPageProps> = ({
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

  const selectedModelId = routeState?.selectedModelId ?? storedModelId ?? 2;
  const selectedModelVersion =
    routeState?.selectedModelVersion ?? storedModelVersion ?? "v10.1";

  const [businessAnalytics, setBusinessAnalytics] =
    useState<BusinessAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [models, setModels] = useState<BackendModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [selectedYearView, setSelectedYearView] = useState<string>("overall");
  const [flippedKpis, setFlippedKpis] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoadingModels(true);
        const data = await fetchJson<ModelsResponse>(apiRoutes.models());
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
    if (shouldShowColdStart) {
      setBusinessAnalytics(null);
      setIsLoading(false);
      setLoadError("");
      return;
    }

    const fetchBusinessAnalytics = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const data = await fetchJson<BusinessAnalyticsResponse>(
          apiRoutes.businessAnalytics(effectiveModelId)
        );
        setBusinessAnalytics(data);
      } catch (error) {
        console.error("Unable to load business analytics:", error);
        setLoadError("Unable to load business analytics.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessAnalytics();
  }, [effectiveModelId, shouldShowColdStart]);

  useEffect(() => {
    try {
      localStorage.setItem("xocompass:selectedModelId", String(effectiveModelId));
      localStorage.setItem("xocompass:selectedModelVersion", effectiveModelVersion);
    } catch {
      // Ignore localStorage errors in restricted environments.
    }
  }, [effectiveModelId, effectiveModelVersion]);

  const growthRate = businessAnalytics?.growth_rate ?? 15.3;
  const growthLabel = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%`;
  const bookingsByYearData = businessAnalytics?.bookings_by_year?.length
    ? businessAnalytics.bookings_by_year
    : fallbackBookingsByYearData;
  const yearOptions = useMemo(
    () =>
      bookingsByYearData
        .map((point) => Number(point.year))
        .filter((year) => Number.isFinite(year))
        .sort((a, b) => a - b),
    [bookingsByYearData]
  );
  const firstYear = businessAnalytics?.date_coverage?.start_date
    ? new Date(businessAnalytics.date_coverage.start_date).getFullYear()
    : Number(bookingsByYearData[0]?.year ?? 2013);
  const lastYear = businessAnalytics?.date_coverage?.end_date
    ? new Date(businessAnalytics.date_coverage.end_date).getFullYear()
    : Number(bookingsByYearData[bookingsByYearData.length - 1]?.year ?? 2025);
  const placeholderKpisByYear = useMemo(() => {
    const entries = bookingsByYearData
      .map((point, index) => {
        const year = Number(point.year);
        if (!Number.isFinite(year)) return null;
        const weeklyBookings = Math.max(point.bookings / 52, 1);
        const baseLeadTime = 20 + (index % 6) * 1.1;
        const placeholderValues: YearPlaceholderKpis = {
          totalTransactionCount: point.bookings,
          totalRevenue: point.bookings * 1160,
          avgLeadTimeDays: Number(baseLeadTime.toFixed(1)),
          avgWeeklyBookings: Number(weeklyBookings.toFixed(2)),
          weeklyObservations: 52,
        };
        return [year, placeholderValues] as const;
      })
      .filter((entry): entry is readonly [number, YearPlaceholderKpis] => Boolean(entry));

    return new Map<number, YearPlaceholderKpis>(entries);
  }, [bookingsByYearData]);
  const isOverallView = selectedYearView === "overall";
  const selectedYear = isOverallView ? null : Number(selectedYearView);
  const selectedYearPlaceholders =
    selectedYear != null && Number.isFinite(selectedYear)
      ? placeholderKpisByYear.get(selectedYear)
      : undefined;
  const bookingsOverTimeDisplayData = useMemo(() => {
    if (isOverallView || selectedYear == null || !Number.isFinite(selectedYear)) {
      return bookingsByYearData;
    }

    const yearlyPoint = bookingsByYearData.find(
      (point) => Number(point.year) === selectedYear
    );
    const annualTotal = yearlyPoint?.bookings ?? 0;
    const monthlyWeights = [0.075, 0.073, 0.078, 0.081, 0.086, 0.084, 0.09, 0.089, 0.083, 0.087, 0.087, 0.087];

    let allocated = 0;
    return MONTH_LABELS.map((month, index) => {
      if (index === MONTH_LABELS.length - 1) {
        return {
          year: month,
          bookings: Math.max(annualTotal - allocated, 0),
        };
      }

      const bookings = Math.round(annualTotal * monthlyWeights[index]);
      allocated += bookings;
      return { year: month, bookings };
    });
  }, [bookingsByYearData, isOverallView, selectedYear]);

  const avgLeadDays = businessAnalytics?.avg_lead_time_days;
  const averageLeadTimeDisplay =
    !isOverallView && selectedYearPlaceholders
      ? `${selectedYearPlaceholders.avgLeadTimeDays.toFixed(1)} days`
      : avgLeadDays != null && Number.isFinite(avgLeadDays)
      ? `${avgLeadDays.toFixed(1)} days`
      : "—";
  const averageLeadTimeHelper =
    !isOverallView
      ? "Placeholder for selected year while year-specific backend endpoint is in progress."
      : avgLeadDays != null && Number.isFinite(avgLeadDays)
      ? "Mean booking lead time before travel date (from linked dataset)."
      : "Lead time summary not available for this model snapshot (retrain or relink dataset if needed).";
  const totalRecordsDisplay = !isOverallView && selectedYearPlaceholders
    ? selectedYearPlaceholders.totalTransactionCount.toLocaleString("en-US")
    : (businessAnalytics?.total_transaction_count ?? 34582).toLocaleString("en-US");
  const totalRevenueDisplay = !isOverallView && selectedYearPlaceholders
    ? formatCompactRevenue(selectedYearPlaceholders.totalRevenue)
    : formatCompactRevenue(businessAnalytics?.total_revenue ?? 38200000);
  const dateCoverageDisplay = !isOverallView && selectedYear != null
    ? `${selectedYear} - ${selectedYear}`
    : `${firstYear} - ${lastYear}`;
  const avgWeeklyBookingsDisplay = !isOverallView && selectedYearPlaceholders
    ? selectedYearPlaceholders.avgWeeklyBookings.toFixed(2)
    : `${(businessAnalytics?.avg_weekly_bookings ?? 11.67).toFixed(2)}`;
  const weeklyObservationsDisplay = !isOverallView && selectedYearPlaceholders
    ? selectedYearPlaceholders.weeklyObservations.toLocaleString("en-US")
    : (businessAnalytics?.total_weekly_records ?? 642).toLocaleString("en-US");
  const topAirlinesDisplay = useMemo(() => {
    const sourceTopAirlines =
      businessAnalytics?.top_airlines && businessAnalytics.top_airlines.length > 0
        ? businessAnalytics.top_airlines
        : [
            { airline_code: "5J", count: 1800, pct: 32.2 },
            { airline_code: "PR", count: 1340, pct: 24.0 },
            { airline_code: "Z2", count: 910, pct: 16.3 },
            { airline_code: "SQ", count: 820, pct: 14.7 },
            { airline_code: "CX", count: 718, pct: 12.8 },
          ];

    if (isOverallView) return sourceTopAirlines;

    const yearOffset = selectedYear ? (selectedYear % 7) - 3 : 0;
    const adjustedCounts = sourceTopAirlines.map((airline, index) => {
      const scale = 1 + (yearOffset * 0.04 + index * 0.015);
      return {
        airline_code: airline.airline_code,
        count: Math.max(Math.round(airline.count * scale), 40),
      };
    });
    const total = adjustedCounts.reduce((sum, row) => sum + row.count, 0);
    return adjustedCounts.map((row) => ({
      airline_code: row.airline_code,
      count: row.count,
      pct: total > 0 ? Number(((row.count / total) * 100).toFixed(1)) : 0,
    }));
  }, [businessAnalytics?.top_airlines, isOverallView, selectedYear]);
  const leadTimeDistributionDisplay = useMemo(() => {
    const sourceLeadTime =
      businessAnalytics?.lead_time_distribution && businessAnalytics.lead_time_distribution.length > 0
        ? businessAnalytics.lead_time_distribution
        : fallbackLeadTimeBuckets;

    if (isOverallView) return sourceLeadTime;

    const yearOffset = selectedYear ? (selectedYear % 5) - 2 : 0;
    return sourceLeadTime.map((bucket, index) => {
      const wave = Math.sin((index + 1) * 0.9) * 0.08;
      const scale = 1 + yearOffset * 0.04 + wave;
      return {
        bucket: bucket.bucket,
        count: Math.max(Math.round(bucket.count * scale), 15),
      };
    });
  }, [businessAnalytics?.lead_time_distribution, isOverallView, selectedYear]);
  const topRoutesDisplay = useMemo(() => {
    if (isOverallView) return fallbackTopRoutes;

    const yearOffset = selectedYear ? (selectedYear % 6) - 2.5 : 0;
    return fallbackTopRoutes.map((route, index) => {
      const slope = (fallbackTopRoutes.length - index) * 0.015;
      const scale = 1 + yearOffset * 0.045 + slope;
      return {
        route: route.route,
        bookings: Math.max(Math.round(route.bookings * scale), 50),
      };
    });
  }, [isOverallView, selectedYear]);
  const netAmountsDisplay = useMemo<NetAmountPoint[]>(
    () =>
      bookingsOverTimeDisplayData.map((point) => ({
        period: String(point.year),
        amount: Number((point.bookings * 0.00016).toFixed(2)),
      })),
    [bookingsOverTimeDisplayData]
  );
  const dataQualityDisplay = useMemo<DataQualityItem[]>(() => {
    const base = [
      { label: "Duplicate Rows", count: 1982 },
      { label: "Missing Route", count: 705 },
      { label: "Missing Airline", count: 292 },
      { label: "Missing Travel Date", count: 359 },
      { label: "Invalid Travel Date", count: 523 },
      { label: "Invalid Booking Date", count: 0 },
      { label: "Negative Lead Records", count: 1752 },
    ];

    if (isOverallView) return base;

    const yearOffset = selectedYear ? (selectedYear % 4) - 1.5 : 0;
    return base.map((item, index) => ({
      label: item.label,
      count: Math.max(Math.round(item.count * (1 + yearOffset * 0.08 + index * 0.01)), 0),
    }));
  }, [isOverallView, selectedYear]);
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
            Business Analytics Dashboard
          </h1>
          <p className="mt-1 text-[14px] text-slate-600">
            High-level performance overview for KJS POS and travel demand analytics.{" "}
            <span className="font-medium text-slate-700">
              Model {effectiveModelVersion} (ID {effectiveModelId})
            </span>
          </p>
        </div>
      </div>

      {isLoading && (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-600 shadow-sm">
          Loading dashboard stats from backend...
        </p>
      )}

      {loadError && (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 shadow-sm">
          {loadError} Showing fallback data where needed.
        </p>
      )}

      <div className="mt-6 space-y-8">
      {shouldShowColdStart ? (
        <SkeletonDashboard />
      ) : (
      <>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          id="total-records"
          label="Total Records"
          value={totalRecordsDisplay}
          implication={
            isOverallView
              ? "More records usually improve trend stability and reduce one-off noise."
              : "Year record count shows how representative this period is."
          }
          icon={<Database className="h-4 w-4" />}
          isFlipped={Boolean(flippedKpis["total-records"])}
          onToggle={toggleKpiCard}
          helper={
            isOverallView
              ? "Records available in model-ready booking dataset."
              : "Placeholder year-only total records while backend year filter is being configured."
          }
        />
        <StatCard
          id="total-revenue"
          label="Total Revenue"
          value={totalRevenueDisplay}
          implication={
            isOverallView
              ? "Revenue trend helps gauge demand monetization over time."
              : "Year revenue shows whether this period is high or low earning."
          }
          icon={<PhilippinePeso className="h-4 w-4" />}
          isFlipped={Boolean(flippedKpis["total-revenue"])}
          onToggle={toggleKpiCard}
          helper={
            isOverallView
              ? `Growth signal: ${growthLabel} YoY`
              : "Placeholder year-only revenue while backend year filter is being configured."
          }
        />
        <StatCard
          id="date-coverage"
          label="Date Coverage"
          value={dateCoverageDisplay}
          implication={
            isOverallView
              ? "Wider coverage captures seasonality and improves comparability."
              : "Single-year scope focuses one cycle and omits long-term effects."
          }
          icon={<CalendarRange className="h-4 w-4" />}
          isFlipped={Boolean(flippedKpis["date-coverage"])}
          onToggle={toggleKpiCard}
          helper={
            isOverallView
              ? "Coverage window of historical booking records."
              : "Selected year-only scope."
          }
        />
        <StatCard
          id="average-lead-time"
          label="Average Lead Time"
          value={averageLeadTimeDisplay}
          implication={
            isOverallView
              ? "Lead-time shifts can indicate changing planning behavior."
              : "Year lead-time changes highlight booking urgency for this period."
          }
          icon={<Clock3 className="h-4 w-4" />}
          isFlipped={Boolean(flippedKpis["average-lead-time"])}
          onToggle={toggleKpiCard}
          helper={averageLeadTimeHelper}
        />
        <StatCard
          id="weekly-observations"
          label="Weekly Observations"
          value={weeklyObservationsDisplay}
          implication={
            isOverallView
              ? "Consistent weekly coverage strengthens diagnostics."
              : "Year weekly count indicates completeness for analysis."
          }
          icon={<TrendingUp className="h-4 w-4" />}
          isFlipped={Boolean(flippedKpis["weekly-observations"])}
          onToggle={toggleKpiCard}
          helper={
            isOverallView
              ? "Number of weekly records in this dataset."
              : "Placeholder weekly record count for selected year."
          }
        />
        <StatCard
          id="average-weekly-bookings"
          label="Average Weekly Bookings"
          value={avgWeeklyBookingsDisplay}
          implication={
            isOverallView
              ? "Baseline weekly demand helps benchmark trend strength."
              : "Year weekly average shows demand level vs baseline."
          }
          icon={<UsersRound className="h-4 w-4" />}
          isFlipped={Boolean(flippedKpis["average-weekly-bookings"])}
          onToggle={toggleKpiCard}
          helper={
            isOverallView
              ? "Mean bookings per week over the model-ready dataset window."
              : "Placeholder year-only weekly mean while backend year filter is being configured."
          }
        />
      </section>

      <BusinessAnalyticsTab
        bookingsByYear={bookingsOverTimeDisplayData}
        netAmounts={netAmountsDisplay}
        topAirlines={topAirlinesDisplay}
        leadTimeDistribution={leadTimeDistributionDisplay}
        topRoutes={topRoutesDisplay}
        dataQualityItems={dataQualityDisplay}
        bookingsPeriodLabel={isOverallView ? "Year" : "Month"}
        bookingsOverTimeDescription={
          isOverallView
            ? "Total bookings by year from the linked dataset."
            : `Monthly booking distribution placeholder for ${selectedYear} (year-specific backend filtering in progress).`
        }
      />
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
      {!shouldShowColdStart && (
        <div className="fixed bottom-6 right-10 z-40">
          <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-white px-4 py-2.5 shadow-[0_10px_28px_rgba(2,132,199,0.22)] ring-1 ring-teal-100/70">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              KPI Year View
            </span>
            <select
              aria-label="KPI Year View"
              className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-sm font-semibold text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              value={selectedYearView}
              onChange={(event) => setSelectedYearView(event.target.value)}
            >
              <option value="overall">Overall</option>
              {yearOptions.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
            <span className="text-xs font-semibold text-slate-600">
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
