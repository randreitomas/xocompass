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

interface HolidayBreakdown {
  holiday_weeks: number;
  non_holiday_weeks: number;
  holiday_pct: number;
}

interface BusinessAnalyticsResponse {
  generated_at: string;
  total_transaction_count: number;
  total_weekly_records: number;
  total_revenue: number | null;
  avg_weekly_bookings: number;
  peak_week_date: string;
  peak_week_bookings: number;
  growth_rate: number;
  avg_lead_time_days: number | null;
  date_coverage: {
    start_date: string;
    end_date: string;
    span_weeks: number;
  };
  bookings_by_year: BookingsByYearPoint[];
  bookings_by_month: { month: string; bookings: number }[];
  revenue_by_month?: { month: string; revenue: number }[];
  /** Pre-aggregated yearly totals; preferred source for Net Revenue “By year” in Overall view. */
  revenue_by_year?: { year: string; revenue: number }[];
  top_airlines?: AirlineCount[];
  lead_time_distribution?: LeadTimeBucket[];
  top_routes?: { route: string; count: number; pct: number }[];
  holiday_breakdown: HolidayBreakdown;
  data_quality?: {
    total_rows: number;
    duplicate_rows: number;
    missing_route: number;
    missing_airline: number;
    missing_travel_date: number;
    invalid_travel_date: number;
    missing_revenue: number;
    quality_score_pct: number;
  } | null;
  available_years?: string[];
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
  const [overallBusinessAnalytics, setOverallBusinessAnalytics] =
    useState<BusinessAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [models, setModels] = useState<BackendModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [selectedYearView, setSelectedYearView] = useState<string>("overall");
  const [netRevenueGranularity, setNetRevenueGranularity] = useState<"month" | "year">("month");
  const [flippedKpis, setFlippedKpis] = useState<Record<string, boolean>>({});
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    if (selectedYearView !== "overall") {
      setNetRevenueGranularity("month");
    }
  }, [selectedYearView]);

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
          apiRoutes.businessAnalytics(effectiveModelId, selectedYearView)
        );
        setBusinessAnalytics(data);
        if (data.available_years?.length) {
          const parsed = data.available_years
            .map((year) => Number(year))
            .filter((year) => Number.isFinite(year));
          if (parsed.length) {
            setAvailableYears((previous) =>
              Array.from(new Set([...previous, ...parsed])).sort((a, b) => a - b)
            );
          }
        }
      } catch (error) {
        console.error("Unable to load business analytics:", error);
        setLoadError("Unable to load business analytics.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessAnalytics();
  }, [effectiveModelId, selectedYearView, shouldShowColdStart]);

  useEffect(() => {
    if (shouldShowColdStart) {
      setOverallBusinessAnalytics(null);
      return;
    }

    const fetchOverallBusinessAnalytics = async () => {
      try {
        const data = await fetchJson<BusinessAnalyticsResponse>(
          apiRoutes.businessAnalytics(effectiveModelId, "overall")
        );
        setOverallBusinessAnalytics(data);
      } catch (error) {
        console.error("Unable to load overall business analytics:", error);
        setOverallBusinessAnalytics(null);
      }
    };

    fetchOverallBusinessAnalytics();
  }, [effectiveModelId, shouldShowColdStart]);

  useEffect(() => {
    try {
      localStorage.setItem("xocompass:selectedModelId", String(effectiveModelId));
      localStorage.setItem("xocompass:selectedModelVersion", effectiveModelVersion);
    } catch {
      // Ignore localStorage errors in restricted environments.
    }
  }, [effectiveModelId, effectiveModelVersion]);

  const growthRate = businessAnalytics?.growth_rate ?? 0;
  const growthLabel = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%`;
  const bookingsByYearData = businessAnalytics?.bookings_by_year ?? [];
  const yearOptions = useMemo(
    () => {
      if (availableYears.length) return availableYears;
      return bookingsByYearData
        .map((point) => Number(point.year))
        .filter((year) => Number.isFinite(year))
        .sort((a, b) => a - b);
    },
    [availableYears, bookingsByYearData]
  );
  const firstYear = businessAnalytics?.date_coverage?.start_date
    ? new Date(businessAnalytics.date_coverage.start_date).getFullYear()
    : Number(bookingsByYearData[0]?.year ?? 0);
  const lastYear = businessAnalytics?.date_coverage?.end_date
    ? new Date(businessAnalytics.date_coverage.end_date).getFullYear()
    : Number(bookingsByYearData[bookingsByYearData.length - 1]?.year ?? 0);
  const isOverallView = selectedYearView === "overall";
  const selectedYear = isOverallView ? null : Number(selectedYearView);
  const canonicalAnalytics = isOverallView
    ? businessAnalytics
    : overallBusinessAnalytics ?? businessAnalytics;
  const selectedYearBookingsByMonth = useMemo(() => {
    if (selectedYear == null || !Number.isFinite(selectedYear)) return [];
    return (canonicalAnalytics?.bookings_by_month ?? []).filter((point) =>
      point.month.startsWith(`${selectedYear}-`)
    );
  }, [canonicalAnalytics?.bookings_by_month, selectedYear]);
  const selectedYearRevenueByMonth = useMemo(() => {
    if (selectedYear == null || !Number.isFinite(selectedYear)) return [];
    return (canonicalAnalytics?.revenue_by_month ?? []).filter((point) =>
      point.month.startsWith(`${selectedYear}-`)
    );
  }, [canonicalAnalytics?.revenue_by_month, selectedYear]);
  const bookingsOverTimeDisplayData = useMemo(() => {
    if (isOverallView || selectedYear == null || !Number.isFinite(selectedYear)) {
      return bookingsByYearData;
    }

    if (businessAnalytics?.bookings_by_month?.length) {
      return businessAnalytics.bookings_by_month.map((point) => ({
        year: point.month,
        bookings: point.bookings,
      }));
    }

    return bookingsByYearData;
  }, [bookingsByYearData, businessAnalytics?.bookings_by_month, isOverallView, selectedYear]);

  const avgLeadDays = businessAnalytics?.avg_lead_time_days;
  const averageLeadTimeDisplay =
    avgLeadDays != null && Number.isFinite(avgLeadDays) ? `${avgLeadDays.toFixed(1)} days` : "—";
  const averageLeadTimeHelper =
    avgLeadDays != null && Number.isFinite(avgLeadDays)
      ? "Mean booking lead time before travel date (from linked dataset)."
      : "Lead time summary not available for this model snapshot (retrain or relink dataset if needed).";
  const totalRecordsDisplay = (
    isOverallView
      ? businessAnalytics?.total_transaction_count ?? 0
      : selectedYearBookingsByMonth.reduce((sum, point) => sum + point.bookings, 0)
  ).toLocaleString("en-US");
  const totalRevenueDisplay = formatCompactRevenue(
    isOverallView
      ? businessAnalytics?.total_revenue != null && Number.isFinite(businessAnalytics.total_revenue)
        ? businessAnalytics.total_revenue
        : 0
      : selectedYearRevenueByMonth.reduce((sum, point) => sum + point.revenue, 0)
  );
  const dateCoverageDisplay = !isOverallView && selectedYear != null
    ? `${selectedYear} - ${selectedYear}`
    : firstYear > 0 && lastYear > 0
    ? `${firstYear} - ${lastYear}`
    : "—";
  const avgWeeklyBookingsDisplay = (
    isOverallView
      ? businessAnalytics?.avg_weekly_bookings ?? 0
      : selectedYearBookingsByMonth.reduce((sum, point) => sum + point.bookings, 0) / 52
  ).toFixed(2);
  const weeklyObservationsDisplay = (
    isOverallView
      ? businessAnalytics?.total_weekly_records ?? 0
      : selectedYearBookingsByMonth.length * 4
  ).toLocaleString("en-US");
  const topAirlinesDisplay = businessAnalytics?.top_airlines ?? [];
  const leadTimeDistributionDisplay = businessAnalytics?.lead_time_distribution ?? [];
  const topRoutesDisplay = useMemo<RouteVolume[]>(
    () =>
      (businessAnalytics?.top_routes ?? []).map((route) => ({
        route: route.route,
        bookings: route.count,
      })),
    [businessAnalytics?.top_routes]
  );
  const netAmountsMonthlyOverall = useMemo<NetAmountPoint[]>(() => {
    if (!businessAnalytics) return [];
    return (businessAnalytics.revenue_by_month ?? []).map((point) => ({
      period: point.month,
      amount: Number((point.revenue / 1000).toFixed(2)),
    }));
  }, [businessAnalytics]);

  const hasBackendRevenueByYear = useMemo(
    () =>
      Boolean(
        businessAnalytics?.revenue_by_year &&
          Array.isArray(businessAnalytics.revenue_by_year) &&
          businessAnalytics.revenue_by_year.length > 0
      ),
    [businessAnalytics?.revenue_by_year]
  );

  /** Overall “By year”: always uses `revenue_by_year` when the API sends it; otherwise sums `revenue_by_month`. */
  const netAmountsYearlyOverall = useMemo<NetAmountPoint[]>(() => {
    if (!businessAnalytics) return [];

    const apiYearRows = businessAnalytics.revenue_by_year;
    if (Array.isArray(apiYearRows) && apiYearRows.length > 0) {
      return [...apiYearRows]
        .sort((a, b) => Number(a.year) - Number(b.year))
        .map((row) => ({
          period: String(row.year),
          amount: Number((row.revenue / 1000).toFixed(2)),
        }));
    }

    const totals = new Map<string, number>();
    for (const point of businessAnalytics.revenue_by_month ?? []) {
      const yearKey = point.month.slice(0, 4);
      totals.set(yearKey, (totals.get(yearKey) ?? 0) + point.revenue);
    }
    return [...totals.entries()]
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([period, revenue]) => ({
        period,
        amount: Number((revenue / 1000).toFixed(2)),
      }));
  }, [businessAnalytics]);

  const netAmountsDisplay = useMemo<NetAmountPoint[]>(() => {
    if (!businessAnalytics) return [];
    if (!isOverallView && selectedYear != null && Number.isFinite(selectedYear)) {
      return netAmountsMonthlyOverall.filter((point) =>
        point.period.startsWith(`${selectedYear}-`)
      );
    }
    if (isOverallView && netRevenueGranularity === "year") {
      return netAmountsYearlyOverall;
    }
    return netAmountsMonthlyOverall;
  }, [
    businessAnalytics,
    isOverallView,
    selectedYear,
    netRevenueGranularity,
    netAmountsMonthlyOverall,
    netAmountsYearlyOverall,
  ]);
  const dataQualityDisplay = useMemo<DataQualityItem[]>(() => {
    if (!businessAnalytics?.data_quality) return [];
    return [
      {
        label: "Total Rows",
        count: businessAnalytics.data_quality.total_rows,
        descriptiveOnly: true,
      },
      { label: "Duplicate Rows", count: businessAnalytics.data_quality.duplicate_rows },
      { label: "Missing Route", count: businessAnalytics.data_quality.missing_route },
      { label: "Missing Airline", count: businessAnalytics.data_quality.missing_airline },
      {
        label: "Missing Travel Date",
        count: businessAnalytics.data_quality.missing_travel_date,
      },
      {
        label: "Invalid Travel Date",
        count: businessAnalytics.data_quality.invalid_travel_date,
      },
      { label: "Missing Revenue", count: businessAnalytics.data_quality.missing_revenue },
    ];
  }, [businessAnalytics?.data_quality]);
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
              : "Records for the selected year from backend year-sliced analytics."
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
              : `Growth signal for selected year context: ${growthLabel}`
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
              : "Weekly records in the selected year from backend aggregation."
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
              : "Mean bookings per week for the selected year."
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
            : `Monthly bookings for ${selectedYear} from backend year-filtered analytics.`
        }
        netRevenuePeriodLabel={
          isOverallView ? (netRevenueGranularity === "year" ? "Year" : "Month") : "Month"
        }
        netRevenueChartDescription={
          isOverallView
            ? netRevenueGranularity === "year"
              ? hasBackendRevenueByYear
                ? "Net revenue in thousands by calendar year — values from API field revenue_by_year."
                : "Net revenue in thousands by calendar year — summed from revenue_by_month (revenue_by_year not returned)."
              : "Net revenue in thousands by month from revenue_by_month (overall dataset)."
            : "Net revenue in thousands by month for the selected year."
        }
        showNetRevenueGranularityToggle={isOverallView}
        netRevenueGranularity={netRevenueGranularity}
        onNetRevenueGranularityChange={setNetRevenueGranularity}
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
