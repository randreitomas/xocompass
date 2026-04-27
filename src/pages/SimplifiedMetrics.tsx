import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRoutes, fetchJson } from "../lib/apiRoutes";
import { SkeletonDashboard } from "../components/dashboard/SkeletonDashboard";
import { SavesModal } from "../components/modals/SavesModal";
import { BusinessAnalyticsTab } from "../components/dashboard/tabs/BusinessAnalyticsTab";

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

interface SimplifiedMetricsProps {
  isBackgroundPreview?: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
}

const formatCompactRevenue = (value: number) => {
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

  return `₱${compact.toUpperCase()}`;
};

const StatCard: React.FC<StatCardProps> = ({ label, value, helper }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{helper}</p>
  </div>
);

export const SimplifiedMetrics: React.FC<SimplifiedMetricsProps> = ({
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
  const firstYear = businessAnalytics?.date_coverage?.start_date
    ? new Date(businessAnalytics.date_coverage.start_date).getFullYear()
    : Number(bookingsByYearData[0]?.year ?? 2013);
  const lastYear = businessAnalytics?.date_coverage?.end_date
    ? new Date(businessAnalytics.date_coverage.end_date).getFullYear()
    : Number(bookingsByYearData[bookingsByYearData.length - 1]?.year ?? 2025);

  const avgLeadDays = businessAnalytics?.avg_lead_time_days;
  const averageLeadTimeDisplay =
    avgLeadDays != null && Number.isFinite(avgLeadDays)
      ? `${avgLeadDays.toFixed(1)} days`
      : "—";
  const averageLeadTimeHelper =
    avgLeadDays != null && Number.isFinite(avgLeadDays)
      ? "Mean booking lead time before travel date (from linked dataset)."
      : "Lead time summary not available for this model snapshot (retrain or relink dataset if needed).";

  return (
    <div className="relative min-h-full">
      <div
        className={`min-h-full bg-[#F4FFF8] px-6 py-6 -m-8 ${
          shouldShowColdStart ? "pointer-events-none select-none grayscale saturate-0" : ""
        }`}
      >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-[14px] text-slate-600">
            High-level performance overview for KJS POS and travel demand analytics.{" "}
            <span className="font-medium text-slate-700">
              Model {effectiveModelVersion} (ID {effectiveModelId})
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
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Business Analytics
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Comprehensive overview of booking performance and data quality for KJS.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Records"
          value={(
            businessAnalytics?.total_transaction_count ?? 34582
          ).toLocaleString("en-US")}
          helper="Records available in model-ready booking dataset."
        />
        <StatCard
          label="Total Revenue"
          value={formatCompactRevenue(businessAnalytics?.total_revenue ?? 38200000)}
          helper={`Growth signal: ${growthLabel} YoY`}
        />
        <StatCard
          label="Date Coverage"
          value={`${firstYear} - ${lastYear}`}
          helper="Coverage window of historical booking records."
        />
        <StatCard
          label="Average Lead Time"
          value={averageLeadTimeDisplay}
          helper={averageLeadTimeHelper}
        />
        <StatCard
          label="Average Weekly Bookings"
          value={`${(businessAnalytics?.avg_weekly_bookings ?? 11.67).toFixed(2)}`}
          helper="Mean bookings per week over the model-ready dataset window."
        />
      </section>

      <BusinessAnalyticsTab
        bookingsByYear={bookingsByYearData}
        topAirlines={businessAnalytics?.top_airlines ?? null}
        leadTimeDistribution={businessAnalytics?.lead_time_distribution ?? null}
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
    </div>
  );
};
