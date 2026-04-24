import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type TrendDirection = "up" | "down" | "neutral";

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
  trendLabel?: string;
  trendDirection?: TrendDirection;
  accent?: "teal" | "slate";
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  helper,
  trendLabel,
  trendDirection = "neutral",
  accent = "slate",
}) => {
  const accentClasses =
    accent === "teal"
      ? "bg-teal-50 text-teal-700"
      : "bg-slate-50 text-slate-700";

  const trendColor =
    trendDirection === "up"
      ? "text-emerald-600"
      : trendDirection === "down"
      ? "text-red-500"
      : "text-slate-500";

  const TrendIcon =
    trendDirection === "up"
      ? ArrowUpRight
      : trendDirection === "down"
      ? ArrowDownRight
      : null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <p className="text-[15px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[28px] font-semibold leading-none tracking-tight text-slate-900">
          {value}
        </p>
        {helper && (
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-medium ${accentClasses}`}
          >
            {helper}
          </span>
        )}
      </div>

      {trendLabel && (
        <div
          className={`mt-1 inline-flex items-center gap-1 text-[12px] font-medium ${trendColor}`}
        >
          {TrendIcon && <TrendIcon className="h-3 w-3" />}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

